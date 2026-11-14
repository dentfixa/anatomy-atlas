import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KO } from './ko.js';

const LAYERS = [
  { id:'hair',     ko:'모발',      en:'Hair',                  dot:'#4a3020', on:true  },
  { id:'skin',     ko:'피부',      en:'Skin (Integument)',     dot:'#e3b08f', on:true  },
  { id:'muscle',   ko:'근육',      en:'Muscular system',       dot:'#b8403c', on:true  },
  { id:'lymph',    ko:'림프',      en:'Lymphatic system',      dot:'#7cc04e', on:true  },
  { id:'skeleton', ko:'뼈',        en:'Skeletal system',       dot:'#eadfc6', on:true  },
  { id:'joints',   ko:'인대·연골', en:'Ligaments & cartilage', dot:'#9fb7c4', on:false },
  { id:'vessels',  ko:'혈관',      en:'Cardiovascular system', dot:'#c62e35', on:false },
  { id:'nerves',   ko:'신경',      en:'Nervous system',        dot:'#e8c547', on:false },
  { id:'organs',   ko:'내장',      en:'Visceral organs',       dot:'#d98c8c', on:false },
];
const L = Object.fromEntries(LAYERS.map(l => [l.id, Object.assign(l, { visible:l.on, opacity:1, loaded:false, loading:null, meshes:[], group:null })]));

// ---------- renderer / scene ----------
const viewer = document.getElementById('viewer');
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.localClippingEnabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewer.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, innerWidth/innerHeight, 0.01, 50);
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a4656, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(0.6, 0.8, 1); camera.add(key);
const rim = new THREE.DirectionalLight(0xbfd4ff, 0.8); rim.position.set(-1, 0.3, -1); camera.add(rim);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.12;
controls.minDistance = 0.08; controls.maxDistance = 8;
controls.target.set(0, 0.88, 0);
camera.position.set(0, 0.95, 3.6);

// ---------- materials ----------
function hsl(h,s,l){ return new THREE.Color().setHSL(h,s,l, THREE.SRGBColorSpace); }
function rnd(seed){ let h=2166136261; for (const c of seed) h=Math.imul(h^c.charCodeAt(0),16777619); return ((h>>>0)%1000)/1000; }
function colorFor(layer, mat, name){
  const n = name.toLowerCase(), m = (mat||'').toLowerCase(), r = rnd(name);
  switch(layer){
    case 'hair': return new THREE.Color('#3b2a1e');
    case 'skin': return hsl(0.065, 0.42, 0.68 + (r-0.5)*0.02);
    case 'muscle':
      if (/tendon|aponeuro|retinacul/.test(m) || /tendon|aponeurosis|retinaculum/.test(n)) return hsl(0.11,0.25,0.80);
      if (/fascia/.test(m)||/fascia|sheath/.test(n)) return hsl(0.58,0.15,0.82);
      if (/bursa/.test(m)||/bursa/.test(n)) return hsl(0.55,0.35,0.70);
      if (/capsule|ligament/.test(m)) return hsl(0.12,0.2,0.75);
      return hsl(0.995 + (r-0.5)*0.02, 0.58, 0.40 + (r-0.5)*0.08);
    case 'skeleton':
      if (/incisor|canine|premolar|molar/.test(n)) return new THREE.Color('#f7f4ec');
      if (/cartilage/.test(m)||/cartilage/.test(n)) return hsl(0.53,0.25,0.78);
      return hsl(0.12, 0.35, 0.82 + (r-0.5)*0.04);
    case 'joints':
      if (/cartilage|labrum|meniscus|disc|disk/.test(m+n)) return hsl(0.53,0.28,0.76);
      return hsl(0.13,0.18,0.72);
    case 'lymph':
      if (/spleen/.test(n)) return hsl(0.0,0.45,0.35);
      if (/thymus/.test(n)) return hsl(0.08,0.45,0.70);
      if (/tonsil/.test(n)) return hsl(0.98,0.45,0.60);
      return hsl(0.27 + (r-0.5)*0.03, 0.55, 0.50);
    case 'vessels':
      if (/pulmonary artery/.test(m)) return new THREE.Color('#3a5fbf');
      if (/pulmonary vein/.test(m)) return new THREE.Color('#c8323a');
      if (/vein/.test(m) || /vein|sinus|venous/.test(n)) return new THREE.Color('#2f56b0');
      if (/heart|ventric|atri|myocard|valve/.test(n) && !/artery/.test(n)) return hsl(0.0,0.5,0.45);
      return new THREE.Color('#cf2f36');
    case 'nerves':
      if (/white matter|tract|fascic|lemnisc|commissure|capsule|corpus callosum/.test(m+' '+n)) return hsl(0.1,0.15,0.86);
      if (/brain|lobe|gyrus|cerebel|nucleus|cortex|thalam|pons|medulla|midbrain|sulcus|lcr|ventricle/.test(m+' '+n)) return hsl(0.0,0.35,0.74 + (r-0.5)*0.06);
      return hsl(0.14,0.72,0.58);
    case 'organs':
      if (/liver/.test(n)) return hsl(0.01,0.45,0.32 + r*0.06);
      if (/lung|bronch/.test(n)) return hsl(0.98,0.35,0.72);
      if (/gland|pancrea/.test(n)) return hsl(0.09,0.5,0.66);
      if (/colon|intestin|duoden|jejun|ile|appendix|caecum|cecum|taenia|meso/.test(n)) return hsl(0.03,0.45,0.66);
      if (/gingiva|tongue|palate|uvula|mucosa/.test(n)) return hsl(0.98,0.5,0.62);
      if (/kidney|suprarenal/.test(n)) return hsl(0.01,0.45,0.42);
      return hsl(0.99,0.4,0.62 + (r-0.5)*0.08);
  }
  return new THREE.Color('#cccccc');
}
const clipPlanes = { x:new THREE.Plane(new THREE.Vector3(-1,0,0),0), y:new THREE.Plane(new THREE.Vector3(0,-1,0),0), z:new THREE.Plane(new THREE.Vector3(0,0,-1),0) };
let activePlanes = [];
function makeMaterial(color, vertexColors){
  const mat = new THREE.MeshStandardMaterial({ color, vertexColors: !!vertexColors, roughness:0.62, metalness:0.0, side:THREE.DoubleSide, clippingPlanes:activePlanes });
  mat.onBeforeCompile = (sh) => {
    // 잘린 단면 안쪽(뒷면)을 어둡게 칠해 단면처럼 보이게 함
    sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n if(!gl_FrontFacing){ gl_FragColor.rgb = gl_FragColor.rgb*0.55 + vec3(0.04); }');
  };
  return mat;
}

// ---------- loading ----------
const draco = new DRACOLoader(); draco.setDecoderPath('./vendor/draco/');
const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
const loadingEl = document.getElementById('loading'), loadText = document.getElementById('loadText');
let pending = 0;
function setLoading(d, text){ pending += d; loadingEl.classList.toggle('hide', pending<=0); if (text) loadText.textContent = text; }
const allMeshes = [];
function loadLayer(id){
  const ly = L[id];
  if (ly.loaded) return Promise.resolve(ly);
  if (ly.loading) return ly.loading;
  setLoading(1, `${ly.ko} 모델 불러오는 중…`); updateLayerUI(id);
  ly.loading = new Promise((res, rej) => {
    loader.load(`models/${id}.glb`, (gltf) => {
      const g = gltf.scene; g.name = id;
      g.traverse(o => {
        if (!o.isMesh) return;
        const u = o.userData; u.layer = id;
        // 장기를 덮는 막(흉막·대망 등)은 기본 반투명
        u.defOp = (id === 'organs' && /pleura|omentum|mesocolon|meso-appendix|peritone/i.test(u.zname || o.name)) ? 0.3 : 1; u.op = u.defOp;
        u.zname = u.zname || o.name;
        // 근육을 덮는 근막(fascia) 껍질은 기본 숨김 (검색/초기화로 다시 표시 가능)
        u.defHidden = id === 'muscle' && /fascia/i.test(u.zname); u.hidden = u.defHidden;
        const hasVC = !!o.geometry.attributes.color;
        o.material = makeMaterial(hasVC ? new THREE.Color(1,1,1) : colorFor(id, u.zmat, u.zname), hasVC);
        u.baseColor = o.material.color.clone();
        ly.meshes.push(o); allMeshes.push(o);
      });
      ly.group = g; scene.add(g); ly.loaded = true;
      applyLayer(id); setLoading(-1); updateLayerUI(id); res(ly);
    }, undefined, (e) => { console.error(e); setLoading(-1); ly.loading=null; updateLayerUI(id); rej(e); });
  });
  return ly.loading;
}

// ---------- visibility ----------
function applyMesh(m){
  const ly = L[m.userData.layer];
  const op = ly.opacity * m.userData.op;
  m.visible = ly.visible && !m.userData.hidden && op > 0.02;
  const mat = m.material;
  const tr = op < 0.995;
  if (mat.transparent !== tr) { mat.transparent = tr; mat.needsUpdate = true; }
  mat.opacity = op; mat.depthWrite = !tr || op > 0.6;
  m.renderOrder = tr ? 2 : 0;
}
function applyLayer(id){ const ly=L[id]; if (ly.group) ly.group.visible = ly.visible; ly.meshes.forEach(applyMesh); }
function applyAll(){ LAYERS.forEach(l => applyLayer(l.id)); }

// ---------- undo ----------
const undoStack = [];
function snapshot(){ return { layers: LAYERS.map(l => ({ id:l.id, v:l.visible, o:l.opacity })), meshes: allMeshes.filter(m => m.userData.hidden !== m.userData.defHidden || m.userData.op !== m.userData.defOp).map(m => ({ m, h:m.userData.hidden, o:m.userData.op })) }; }
function pushUndo(){ undoStack.push(snapshot()); if (undoStack.length > 60) undoStack.shift(); }
function restore(s){
  allMeshes.forEach(m => { m.userData.hidden = m.userData.defHidden; m.userData.op = m.userData.defOp; });
  s.meshes.forEach(e => { e.m.userData.hidden = e.h; e.m.userData.op = e.o; });
  s.layers.forEach(e => { L[e.id].visible = e.v; L[e.id].opacity = e.o; if (e.v) loadLayer(e.id); });
  applyAll(); LAYERS.forEach(l => updateLayerUI(l.id));
}
document.getElementById('btnUndo').onclick = () => { const s = undoStack.pop(); if (s) restore(s); };
document.getElementById('btnReset').onclick = () => {
  pushUndo();
  LAYERS.forEach(l => { l.visible = l.on; l.opacity = 1; });
  allMeshes.forEach(m => { m.userData.hidden = m.userData.defHidden; m.userData.op = m.userData.defOp; });
  LAYERS.filter(l=>l.on).forEach(l=>loadLayer(l.id));
  select(null); applyAll(); LAYERS.forEach(l => updateLayerUI(l.id));
  Object.values(clipUI).forEach(c => { c.cb.checked = false; }); updateClip();
  setView('front');
};

// ---------- layer panel ----------
const layersEl = document.getElementById('layers');
const ui = {};
LAYERS.forEach(l => {
  const row = document.createElement('div'); row.className = 'layer';
  row.innerHTML = `<span class="dot" style="background:${l.dot}"></span><span class="nm">${l.ko} <small>${l.en} <span class="st"></span></small></span>
  <button class="eye" title="보이기/숨기기">👁</button><button class="iso" title="이 레이어만 보기 (Isolate)">◎</button>
  <input type="range" min="0" max="100" value="100" title="투명도 (페이드)">`;
  layersEl.appendChild(row);
  const eye = row.querySelector('.eye'), iso = row.querySelector('.iso'), rng = row.querySelector('input'), st = row.querySelector('.st');
  ui[l.id] = { row, eye, iso, rng, st };
  eye.onclick = () => { pushUndo(); l.visible = !l.visible; if (l.visible) { if (l.opacity < 0.05) l.opacity = 1; loadLayer(l.id); } applyLayer(l.id); updateLayerUI(l.id); };
  iso.onclick = () => isolateLayer(l.id);
  rng.addEventListener('pointerdown', () => pushUndo());
  rng.oninput = () => { l.opacity = rng.value/100; if (l.opacity > 0 && !l.visible) { l.visible = true; loadLayer(l.id); } applyLayer(l.id); updateLayerUI(l.id); };
});
function updateLayerUI(id){
  const l = L[id], u = ui[id];
  u.eye.className = 'eye ' + (l.visible ? 'on' : 'off');
  u.rng.value = Math.round(l.opacity*100);
  u.st.textContent = l.loading && !l.loaded ? '불러오는 중…' : (l.loaded ? '' : (l.visible ? '' : '(미로드)'));
  const vis = LAYERS.filter(x => x.visible);
  LAYERS.forEach(x => ui[x.id].iso.classList.toggle('on', vis.length === 1 && vis[0] === x));
}
function isolateLayer(id){
  pushUndo();
  LAYERS.forEach(l => { l.visible = (l.id === id); });
  L[id].opacity = 1; loadLayer(id); applyAll(); LAYERS.forEach(l => updateLayerUI(l.id));
}
document.getElementById('btnPanel').onclick = () => document.getElementById('panel').classList.toggle('closed');
if (innerWidth < 720) document.getElementById('panel').classList.add('closed');

// ---------- names / lexicon ----------
let LEX = {}, INDEX = {};
const norm = n => n.trim().replace(/\.(l|r)$/,'').replace(/^\((.*)\)$/,'$1').trim().toLowerCase();
function prettyName(z){
  let s = z.trim(), side = '';
  if (/\.l$/.test(s)) side = 'L'; else if (/\.r$/.test(s)) side = 'R';
  s = s.replace(/\.(l|r)$/,'').replace(/^\((.*)\)$/,'$1').trim();
  return { en: s, side, sideKo: side==='L'?'왼쪽':side==='R'?'오른쪽':'' };
}
function koName(z){ const k = KO[norm(z)]; return k || ''; }

// ---------- selection ----------
const card = document.getElementById('card'), callout = document.getElementById('callout');
let selected = null, selPoint = null;
const HL = new THREE.Color(0.10, 0.42, 1.0);
function select(m, point){
  if (selected) { selected.material.emissive.setRGB(0,0,0); selected.material.color.copy(selected.userData.baseColor); }
  selected = m; selPoint = point ? point.clone() : null;
  if (!m) { card.hidden = true; callout.hidden = true; return; }
  m.material.color.setRGB(0.45, 0.68, 1.0); m.material.emissive.setRGB(0.04, 0.22, 0.62);
  if (!selPoint) { const b = new THREE.Box3().setFromObject(m); selPoint = b.getCenter(new THREE.Vector3()); }
  const p = prettyName(m.userData.zname), info = LEX[norm(m.userData.zname)] || {};
  document.getElementById('cName').textContent = p.en + (p.side ? (p.side==='L' ? ' (Left)' : ' (Right)') : '');
  document.getElementById('cLatin').textContent = info.la ? info.la : '';
  const ko = koName(m.userData.zname);
  document.getElementById('cKo').textContent = ko ? (p.sideKo ? `${p.sideKo} ${ko}` : ko) : (p.sideKo ? `(${p.sideKo})` : '');
  const ly = L[m.userData.layer];
  document.getElementById('cMeta').textContent = `${ly.ko} · ${ly.en}` + (m.userData.zgroup ? ` · ${m.userData.zgroup}` : '');
  const d = info.def || '';
  document.getElementById('cDef').innerHTML = d ? d.replace(/(https?:\/\/\S+)$/, '<a href="$1" target="_blank" style="color:#7fb8f5">Wikipedia</a>') : '';
  callout.querySelector('span').textContent = (ko || p.en) + (p.side ? ` (${p.side})` : '');
  card.hidden = false; callout.hidden = false;
}
document.getElementById('cClose').onclick = () => select(null);
document.getElementById('aHide').onclick = () => { if (!selected) return; pushUndo(); selected.userData.hidden = true; applyMesh(selected); select(null); };
document.getElementById('aFade').onclick = () => { if (!selected) return; pushUndo(); selected.userData.op = selected.userData.op < 0.5 ? 1 : 0.18; applyMesh(selected); };
document.getElementById('aIsolate').onclick = () => {
  if (!selected) return; pushUndo();
  allMeshes.forEach(m => { if (m !== selected) m.userData.hidden = true; });
  const ly = L[selected.userData.layer]; ly.visible = true; ly.opacity = Math.max(ly.opacity, 0.05); selected.userData.op = 1;
  applyAll(); LAYERS.forEach(l => updateLayerUI(l.id)); focusOn(selected);
};
document.getElementById('aFocus').onclick = () => selected && focusOn(selected);

// picking
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
let downPos = null;
renderer.domElement.addEventListener('pointerdown', e => { downPos = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downPos) return; const d = Math.hypot(e.clientX-downPos[0], e.clientY-downPos[1]); downPos = null;
  if (d > 6) return;
  pick(e.clientX, e.clientY);
});
function pick(x, y){
  ndc.set((x/innerWidth)*2-1, -(y/innerHeight)*2+1);
  ray.setFromCamera(ndc, camera);
  const cands = allMeshes.filter(m => m.visible && m.parent && m.parent.visible !== false && L[m.userData.layer].visible && L[m.userData.layer].opacity*m.userData.op > 0.25);
  const hits = ray.intersectObjects(cands, false).filter(h => activePlanes.every(p => p.distanceToPoint(h.point) >= -1e-4));
  select(hits.length ? hits[0].object : null, hits.length ? hits[0].point : null);
  return hits.length ? hits[0].object.userData.zname : null;
}

// ---------- camera views ----------
let tween = null;
function flyTo(pos, target, ms=650){
  tween = { t0: performance.now(), ms, p0: camera.position.clone(), t0v: controls.target.clone(), p1: pos.clone(), t1: target.clone() };
}
const VIEWS = {
  front: [[0,0.92,3.6],[0,0.88,0]], back: [[0,0.92,-3.6],[0,0.88,0]],
  left:  [[3.6,0.92,0],[0,0.88,0]], right: [[-3.6,0.92,0],[0,0.88,0]],
  top:   [[0,4.2,0.35],[0,0.88,0]], head: [[0.0,1.62,0.75],[0,1.6,0]],
};
function setView(v, ms){ const [p,t] = VIEWS[v]; flyTo(new THREE.Vector3(...p), new THREE.Vector3(...t), ms); }
document.querySelectorAll('#views button').forEach(b => b.onclick = () => setView(b.dataset.view));
function focusOn(m){
  const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()).length();
  const dir = camera.position.clone().sub(controls.target).normalize();
  flyTo(c.clone().add(dir.multiplyScalar(Math.max(s*3.2, 0.3))), c);
}

// ---------- clipping ----------
const BOUNDS = { x:[-0.45,0.45], y:[-0.1,1.82], z:[-0.25,0.25] };
const clipUI = {};
const clipHelpers = new THREE.Group(); scene.add(clipHelpers);
document.querySelectorAll('.cliprow').forEach(row => {
  const a = row.dataset.axis;
  clipUI[a] = { cb: row.querySelector('input[type=checkbox]'), rng: row.querySelector('input[type=range]'), flip: false };
  clipUI[a].cb.onchange = updateClip; clipUI[a].rng.oninput = updateClip;
  row.querySelector('.flip').onclick = () => { clipUI[a].flip = !clipUI[a].flip; updateClip(); };
});
document.getElementById('clipHelpers').onchange = updateClip;
document.getElementById('btnClip').onclick = () => { const p = document.getElementById('clipPanel'); p.hidden = !p.hidden; };
const helperMat = new THREE.MeshBasicMaterial({ color:0xe07a5f, transparent:true, opacity:0.12, side:THREE.DoubleSide, depthWrite:false });
const helperEdge = new THREE.LineBasicMaterial({ color:0xe07a5f });
function updateClip(){
  activePlanes.length = 0; clipHelpers.clear();
  for (const a of ['x','y','z']) {
    const c = clipUI[a]; if (!c.cb.checked) continue;
    const [lo, hi] = BOUNDS[a]; const pos = lo + (hi-lo)*c.rng.value/1000;
    const n = new THREE.Vector3(); n[a] = c.flip ? 1 : -1;
    clipPlanes[a].normal.copy(n); clipPlanes[a].constant = c.flip ? -pos : pos;
    activePlanes.push(clipPlanes[a]);
    if (document.getElementById('clipHelpers').checked) {
      const w = a==='x' ? [0.6,2.0] : a==='y' ? [1.0,0.6] : [1.0,2.0];
      const g = new THREE.PlaneGeometry(w[0], w[1]);
      const mesh = new THREE.Mesh(g, helperMat);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(g), helperEdge);
      const h = new THREE.Group(); h.add(mesh, edge);
      if (a==='x') { h.rotation.y = Math.PI/2; h.position.set(pos, 0.86, 0); }
      if (a==='y') { h.rotation.x = -Math.PI/2; h.position.set(0, pos, 0); }
      if (a==='z') { h.position.set(0, 0.86, pos); }
      clipHelpers.add(h);
    }
  }
  if (selected && selPoint && !activePlanes.every(p => p.distanceToPoint(selPoint) >= 0)) callout.hidden = true;
}

// ---------- search ----------
const sEl = document.getElementById('search'), rEl = document.getElementById('results');
let entries = [];
function buildSearch(){
  const seen = new Set();
  for (const [layer, list] of Object.entries(INDEX)) for (const [z, grp] of list) {
    const k = layer + '|' + z; if (seen.has(k)) continue; seen.add(k);
    const p = prettyName(z), info = LEX[norm(z)] || {};
    entries.push({ z, layer, en:p.en, side:p.side, la: info.la || '', ko: koName(z), hay: (p.en+' '+(info.la||'')+' '+koName(z)+' '+grp).toLowerCase() });
  }
}
let active = -1, shown = [];
function rank(e, q){
  const en = e.en.toLowerCase(), esc = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if (en === q || e.ko === q) return 0;
  if (new RegExp('\\b' + esc + '\\b').test(en) || (e.ko && e.ko.startsWith(q))) return 1;
  if (en.startsWith(q)) return 2;
  return 3;
}
sEl.addEventListener('input', () => {
  const q = sEl.value.trim().toLowerCase(); active = -1;
  if (q.length < 2) { rEl.hidden = true; return; }
  const words = q.split(/\s+/);
  shown = entries.filter(e => words.every(w => e.hay.includes(w)))
    .sort((a,b) => rank(a,q) - rank(b,q) || a.en.length - b.en.length).slice(0, 40);
  rEl.innerHTML = shown.length ? shown.map((e,i) => `<div data-i="${i}">${e.ko ? e.ko+' · ' : ''}${e.en}${e.side?` (${e.side})`:''}<small>${L[e.layer].ko}${e.la?' · '+e.la:''}</small></div>`).join('') : '<div>결과 없음</div>';
  rEl.hidden = false;
});
sEl.addEventListener('keydown', e => {
  const items = rEl.querySelectorAll('div[data-i]'); if (!items.length) return;
  if (e.key === 'ArrowDown') { active = Math.min(active+1, items.length-1); }
  else if (e.key === 'ArrowUp') { active = Math.max(active-1, 0); }
  else if (e.key === 'Enter') { choose(shown[Math.max(active,0)]); return; }
  else return;
  e.preventDefault(); items.forEach((d,i) => d.classList.toggle('active', i===active));
});
rEl.addEventListener('click', e => { const d = e.target.closest('div[data-i]'); if (d) choose(shown[+d.dataset.i]); });
document.addEventListener('click', e => { if (!e.target.closest('.search')) rEl.hidden = true; });
async function choose(e){
  if (!e) return; rEl.hidden = true; sEl.value = e.en + (e.side?` (${e.side})`:'');
  const ly = L[e.layer];
  if (!ly.visible || ly.opacity < 0.3) { pushUndo(); ly.visible = true; ly.opacity = 1; }
  await loadLayer(e.layer); applyLayer(e.layer); updateLayerUI(e.layer);
  const m = ly.meshes.find(x => x.userData.zname === e.z); if (!m) return;
  m.userData.hidden = false; m.userData.op = 1; applyMesh(m);
  select(m); focusOn(m);
}

// ---------- info ----------
document.getElementById('btnInfo').onclick = () => document.getElementById('infoDlg').showModal();

// ---------- loop ----------
addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const tmp = new THREE.Vector3();
function loop(now){
  requestAnimationFrame(loop);
  if (tween) {
    const k = Math.min(1, (now - tween.t0)/tween.ms), e = k<.5 ? 2*k*k : 1-Math.pow(-2*k+2,2)/2;
    camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0v, tween.t1, e);
    if (k >= 1) tween = null;
  }
  controls.update();
  renderer.render(scene, camera);
  if (selected && selPoint && !callout.hidden && selected.visible) {
    tmp.copy(selPoint).project(camera);
    callout.style.left = ((tmp.x+1)/2*innerWidth) + 'px'; callout.style.top = ((1-tmp.y)/2*innerHeight) + 'px';
    callout.style.display = tmp.z < 1 ? '' : 'none';
  } else if (selected && !selected.visible) callout.style.display = 'none';
}
requestAnimationFrame(loop);

// ---------- boot ----------
(async () => {
  setLoading(1, '데이터 불러오는 중…');
  const [idx, lex] = await Promise.all([fetch('data/index.json').then(r=>r.json()), fetch('data/lexicon.json').then(r=>r.json())]);
  INDEX = idx; LEX = lex; buildSearch(); setLoading(-1);
  LAYERS.forEach(l => updateLayerUI(l.id));
  await Promise.all(LAYERS.filter(l => l.on).map(l => loadLayer(l.id)));
  window.__ready = true;
})();

// 테스트/자동화용 훅
window.atlas = { L, LAYERS, loadLayer, applyAll, applyLayer, isolateLayer, setView, select, pick, camera, controls, clipUI, updateClip, allMeshes, focusOn, choose: (q) => choose(entries.find(e => e.en.toLowerCase() === q.toLowerCase())), updateLayerUI };
