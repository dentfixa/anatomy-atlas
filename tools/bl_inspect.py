import bpy,sys,json
f=sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=f)
out=[]
import mathutils
for o in bpy.data.objects:
    d={'n':o.name,'t':o.type,'p':o.parent.name if o.parent else None}
    if o.type=='MESH':
        d['v']=len(o.data.vertices); d['f']=len(o.data.polygons)
        bb=[o.matrix_world@mathutils.Vector(c) for c in o.bound_box]
        d['min']=[min(c[i] for c in bb) for i in range(3)]; d['max']=[max(c[i] for c in bb) for i in range(3)]
        d['mat']=[m.name for m in o.data.materials if m]
    out.append(d)
json.dump(out,open(f+'.json','w'))
print('DONE',len(out))
