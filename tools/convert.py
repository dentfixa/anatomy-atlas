import bpy,sys,re,json,bmesh,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from palette import color,srgb_to_lin
a=sys.argv[sys.argv.index('--')+1:]
src,out,system,ratio,mode=a[0],a[1],a[2],float(a[3]),a[4]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src)
def chain(o):
    c=[];p=o.parent
    while p: c.append(p.name);p=p.parent
    return c
def keep(o):
    n=o.name
    if o.type!='MESH': return False
    if '?' in n or n.startswith('Cross Section'): return False
    if re.search(r'\.(j|i|t|g)$',n): return False
    if mode=='skeleton' and re.search(r'\.(o|e)\d*[lr]?$',n): return False
    if mode=='skin' and 'hair' in n.lower(): return False
    if mode=='hair' and 'hair' not in n.lower(): return False
    if re.match(r'^(Renal pelvis|Intrarenal (arteries|veins)|Cochlea|Vestibule|Take a picture)\b',n): return False  # possibly CC-BY-NC sub-models / junk
    if len(o.data.polygons)==0: return False
    return True
meta=[]
objs=list(bpy.data.objects)
for o in objs:
    if o.type=='MESH' and keep(o):
        o['zname']=o.name
        o['zgroup']=' / '.join(reversed([re.sub(r'\.\w+$','',x) for x in chain(o)][:3]))
        o['zmat']=o.data.materials[0].name if o.data.materials and o.data.materials[0] else ''
        o['zsys']=system
# bake world transforms BEFORE removing parents (empties)
for o in objs:
    if o.type=='MESH' and 'zname' in o:
        mw=o.matrix_world.copy()
        o.data=o.data.copy()
        o.data.transform(mw)
        if mw.determinant()<0: o.data.flip_normals()
        o['baked']=1
for o in objs:
    if o.type=='MESH' and 'zname' in o:
        o.parent=None; o.matrix_world.identity()
# delete non-kept
for o in objs:
    if not (o.type=='MESH' and 'zname' in o):
        bpy.data.objects.remove(o,do_unlink=True)
tot0=tot1=0
for o in list(bpy.data.objects):
    o.modifiers.clear()
    bm=bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.triangulate(bm,faces=bm.faces)
    bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-6)
    bm.to_mesh(o.data); bm.free()
    nf=len(o.data.polygons); tot0+=nf
    r=ratio
    if nf<300: r=1.0
    elif nf<1500: r=max(ratio,0.6)
    if r<1.0:
        m=o.modifiers.new('d','DECIMATE'); m.ratio=r; m.use_collapse_triangulate=True
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
        bpy.ops.object.modifier_apply(modifier='d')
    # per-vertex colour from face material (Z-Anatomy material names -> atlas palette)
    me=o.data; mats=[(mm.name if mm else '') for mm in me.materials]
    for ca in list(me.color_attributes): me.color_attributes.remove(ca)
    attr=me.color_attributes.new('Col','FLOAT_COLOR','POINT')
    vc=[None]*len(me.vertices)
    for p in me.polygons:
        mn=mats[p.material_index] if p.material_index < len(mats) else ''
        c=srgb_to_lin(color(system,mn,o['zname']))
        for vi in p.vertices:
            if vc[vi] is None or ('tendon' in mn.lower())==False: vc[vi]=c
    for i,c in enumerate(vc):
        attr.data[i].color=(*(c or (0.8,0.8,0.8)),1.0)
    me.color_attributes.active_color=attr
    me.color_attributes.render_color_index=me.color_attributes.active_color_index
    o['zmats']=','.join(sorted(set(mats)))
    me.materials.clear()
    # smooth shading by angle
    for p in o.data.polygons: p.use_smooth=True
    tot1+=len(o.data.polygons)
    o.name=re.sub(r'[^\w]+','_',o['zname'])[:60]
print('TRIS',system,len(bpy.data.objects),tot0,tot1)
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_extras=True,export_materials='NONE',
  export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=7,
  export_draco_position_quantization=14,export_draco_normal_quantization=8,export_texcoords=False,export_vertex_color='ACTIVE',export_apply=False,
  export_yup=True)
print('EXPORTED',out)
