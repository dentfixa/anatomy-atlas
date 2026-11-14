import re,hashlib
def h(s): return int(hashlib.md5(s.encode()).hexdigest()[:6],16)/0xffffff
def jit(c,name,amt=0.06):
    r=h(name)-0.5
    return tuple(max(0,min(1,x*(1+r*amt*2))) for x in c)
def srgb_to_lin(c): return tuple((x/12.92) if x<=0.04045 else ((x+0.055)/1.055)**2.4 for x in c)
IVORY=(0.89,0.85,0.74); CART=(0.70,0.82,0.86); WHITE_T=(0.88,0.85,0.76); FASCIA=(0.84,0.87,0.90)
RED=(0.66,0.17,0.15); ART=(0.80,0.13,0.15); VEIN=(0.18,0.32,0.72); NERVE=(0.95,0.80,0.28)
def color(system, mat, name):
    m=(mat or '').lower(); n=name.lower()
    if system=='hair': return (0.17,0.11,0.07)
    if system=='skin':
        if m=='nail': return (0.93,0.80,0.77)
        if m=='black': return (0.17,0.11,0.07)
        if m=='skin-in': return (0.86,0.66,0.55)
        return jit((0.90,0.70,0.58),name,0.02)
    if 'cartilage' in m: return CART
    if m.startswith('bone') or m.startswith('suture'): return jit(IVORY,name,0.03)
    if m.startswith('teeth-roots') or m.startswith('dentine'): return (0.93,0.88,0.74)
    if m.startswith('teeth'): return (0.97,0.96,0.93)
    if 'tendon' in m: return WHITE_T
    if 'fascia' in m or 'peritoneum' in m: return FASCIA
    if 'bursa' in m: return (0.62,0.76,0.86)
    if 'ligament' in m or 'capsule' in m: return (0.80,0.79,0.71)
    if m=='fat': return (0.95,0.84,0.45)
    if system=='muscle': return jit(RED,name,0.10)
    if system=='vessels':
        if m=='pulmonary artery': return (0.26,0.40,0.80)
        if m=='pulmonary vein': return (0.82,0.20,0.22)
        if m=='vein': return VEIN
        if m=='artery': return ART
        return jit(RED,name,0.05)
    if system=='nerves':
        if m.startswith('nerve'): return jit(NERVE,name,0.04)
        if m=='white matter': return (0.93,0.90,0.84)
        if m=='cerebellum': return (0.80,0.58,0.56)
        if m.startswith('nucleus'): return (0.62,0.46,0.66)
        if m=='lcr': return (0.55,0.72,0.92)
        if m=='eye': return (0.95,0.95,0.94)
        if m=='iris': return (0.33,0.48,0.62)
        if m=='cornea': return (0.86,0.92,0.96)
        if 'artery' in m: return ART
        if m=='gland': return (0.88,0.68,0.48)
        if m=='mucosa': return (0.86,0.52,0.52)
        if m=='interlobar sulci': return (0.70,0.50,0.50)
        if 'orbicularis' in m: return RED
        return jit((0.87,0.68,0.66),mat or name,0.05)   # brain lobes
    if system=='organs':
        if m.startswith('bronchi'): return jit((0.86,0.74,0.68),name,0.03)
        if m.startswith('lung'): return jit((0.88,0.63,0.63),mat,0.05)
        if m=='ductus': return (0.55,0.72,0.42)
        if m=='gallbladder': return (0.38,0.60,0.36)
        if m=='gland': return (0.88,0.70,0.46)
        if m=='intestine': return (0.86,0.60,0.54)
        if 'mucosa' in m: return (0.86,0.50,0.50)
        if m.startswith('nucleus'): return (0.62,0.46,0.66)
        if 'liver' in n or 'segment of liver' in n: return jit((0.55,0.22,0.20),name,0.06)
        if 'kidney' in n: return (0.62,0.25,0.22)
        if 'tongue' in n or 'gingiva' in n or 'palate' in n or 'uvula' in n: return (0.86,0.50,0.52)
        return jit((0.80,0.48,0.46),mat or name,0.08)
    if system=='lymph':
        if m.startswith('lymph'): return jit((0.46,0.76,0.30),mat,0.05)
        if m=='gland': return (0.90,0.72,0.52)
        if m=='organ': return (0.52,0.16,0.22)
        return (0.46,0.76,0.30)
    if system=='joints': return (0.80,0.79,0.71)
    return (0.8,0.8,0.8)
