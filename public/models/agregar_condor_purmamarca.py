import bpy, math, os
from mathutils import Vector

ROOT = r"C:\Users\JUAN009\Desktop\PROPUESTA INMERSIVA"
OUT = os.path.join(ROOT, "outputs")
SRC = os.path.join(OUT, "Purmamarca_prototipo_v02.blend")
DEST = os.path.join(OUT, "Purmamarca_prototipo_v03_condor.blend")
PREVIEW = os.path.join(OUT, "preview_purmamarca_v03_condor.png")
GLB = os.path.join(OUT, "Condor_Andino_Purmamarca.glb")
os.makedirs(OUT, exist_ok=True)

# Abrir la escena existente. Nunca se limpia ni se sobrescribe el original.
bpy.ops.wm.open_mainfile(filepath=SRC)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1152; scene.render.resolution_y = 648; scene.render.resolution_percentage = 70
scene.render.image_settings.file_format = 'PNG'

# Colección independiente
parent = bpy.data.collections.get('PACHAMAMA_PROTO') or scene.collection
coll = bpy.data.collections.get('09_CONDOR_ANDINO') or bpy.data.collections.new('09_CONDOR_ANDINO')
if coll.name not in parent.children.keys(): parent.children.link(coll)
# Si se re-ejecuta, sustituir solo el cóndor anterior.
for o in list(coll.objects): bpy.data.objects.remove(o, do_unlink=True)

# Materiales eficientes

def mat(name, color, rough=.8, metallic=0.0):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*color,1); bs.inputs['Roughness'].default_value=rough; bs.inputs['Metallic'].default_value=metallic
    return m
black=mat('Condor plumaje negro azulado',(0.012,.020,.026),.9)
black2=mat('Condor plumas secundarias',(.045,.060,.068),.88)
black3=mat('Condor plumas iluminadas',(.10,.12,.13),.84)
white=mat('Condor collar blanco marfil',(.82,.78,.67),.9)
red=mat('Condor piel rojiza',(.36,.055,.045),.85)
beak_mat=mat('Condor pico oscuro',(.025,.028,.026),.4)
eye=mat('Condor iris dorado',(.78,.38,.06),.3)
pupil=mat('Condor pupila',(.003,.002,.001),.25)

root=bpy.data.objects.new('CONDOR_ROOT',None); coll.objects.link(root); root.location=(5.5,7.5,11.5); root.scale=(1.65,1.65,1.65)
root['Especie']='Cóndor andino'; root['Uso']='Elemento aéreo animado para Conexión Pachamama'; root['Animacion']='Aleteo cíclico 40 frames'
created=[root]; pivots=[]

def link(o):
    for c in list(o.users_collection): c.objects.unlink(o)
    coll.objects.link(o)

def sphere(name, loc, scale, material, parent=root):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(material); link(o); o.parent=parent
    for p in o.data.polygons: p.use_smooth=True
    created.append(o); return o

def cone(name, loc, r, depth, material, rot=(0,0,0), parent=root):
    bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=r,radius2=0,depth=depth,location=loc,rotation=rot)
    o=bpy.context.object; o.name=name; o.data.materials.append(material); link(o); o.parent=parent
    for p in o.data.polygons: p.use_smooth=True
    created.append(o); return o

def feather(name, a, b, width, material, parent):
    a=Vector(a); b=Vector(b); d=b-a; perp=Vector((-d.y,d.x,0))
    if perp.length<.001: perp=Vector((0,1,0))
    perp.normalize(); mid=a.lerp(b,.55)
    v=[a,a+perp*width*.5,mid+perp*width*.34,b,mid-perp*width*.34,a-perp*width*.5]
    f=[(0,1,2),(0,2,3),(0,3,4),(0,4,5)]
    me=bpy.data.meshes.new(name+'_mesh'); me.from_pydata(v,[],f); me.materials.append(material); me.update()
    o=bpy.data.objects.new(name,me); coll.objects.link(o); o.parent=parent
    sol=o.modifiers.new('Espesor de pluma','SOLIDIFY'); sol.thickness=.015
    created.append(o); return o

# cuerpo, pecho, cuello, cabeza
sphere('Condor cuerpo',(0,0,0),(1.05,.43,.48),black)
sphere('Condor pecho',(.48,0,-.035),(.56,.39,.43),black)
sphere('Condor cuello',(.91,0,.10),(.30,.25,.43),red)
sphere('Condor cabeza',(1.15,0,.37),(.28,.23,.24),red)
# pico y ojos, eje X hacia delante
cone('Condor pico',(1.43,0,.29),.105,.43,beak_mat,(0,math.pi/2,0))
for side in (-1,1):
    sphere('Condor iris',(1.22,side*.205,.405),(.055,.035,.055),eye)
    sphere('Condor pupila',(1.235,side*.234,.41),(.027,.016,.032),pupil)
# collar
bpy.ops.mesh.primitive_torus_add(major_radius=.285,minor_radius=.075,major_segments=32,minor_segments=10,location=(.82,0,.12),rotation=(0,math.pi/2,0))
collar=bpy.context.object; collar.name='Condor collar blanco'; collar.data.materials.append(white); link(collar); collar.parent=root
for p in collar.data.polygons: p.use_smooth=True
created.append(collar)

# alas: pivotes y plumas locales
for side in (1,-1):
    pivot=bpy.data.objects.new('Ala_'+('izquierda' if side==1 else 'derecha'),None); coll.objects.link(pivot); pivot.parent=root; pivot.location=(-.1,side*.28,.20); created.append(pivot); pivots.append((pivot,side))
    verts=[(.32,0,0),(.22,side*.60,.02),(.02,side*1.45,0),(-.52,side*2.25,-.035),(-.94,side*1.50,-.04),(-.68,side*.35,-.025)]
    me=bpy.data.meshes.new('Membrana_ala_mesh'); me.from_pydata(verts,[],[(0,1,2,3,4,5)]); me.materials.append(black); me.update()
    surf=bpy.data.objects.new('Superficie ala',me); coll.objects.link(surf); surf.parent=pivot; sol=surf.modifiers.new('Espesor ala','SOLIDIFY'); sol.thickness=.025; created.append(surf)
    for i in range(11): feather('Pluma secundaria',(-.12,side*(.18+i*.115),-.015),(-.76,side*(.52+i*.115),-.055),.17,black2 if i%2 else black3,pivot)
    for i in range(9): feather('Pluma primaria',(-.48,side*(1.05+i*.105),-.035),(-1.08,side*(1.53+i*.105),-.065),.16,black2 if i%2 else black3,pivot)
# cola en abanico
for i in range(11):
    spread=(i-5)/5; feather('Pluma cola',(-.95,spread*.09,-.08),(-2.00,spread*.35,-.12),.15,black2 if i%2 else black3,root)
# patas retraídas
for side in (-1,1):
    bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=.045,depth=.36,location=(-.42,side*.18,-.49),rotation=(0,-.35,0)); o=bpy.context.object; o.name='Pata condor'; o.data.materials.append(red); link(o); o.parent=root; created.append(o)

# animación de aleteo
scene.frame_start=1; scene.frame_end=40; scene.render.fps=30
for pivot,side in pivots:
    for frame,angle in ((1,.10),(10,.58),(20,.10),(30,-.30),(40,.10)):
        pivot.rotation_euler[0]=side*angle; pivot.keyframe_insert(data_path='rotation_euler',index=0,frame=frame)
scene.frame_set(1)
# Seleccionar el asset y dejarlo activo
bpy.ops.object.select_all(action='DESELECT')
for o in created: o.select_set(True)
bpy.context.view_layer.objects.active=root
# Render y exportación
scene.render.filepath=PREVIEW
bpy.ops.wm.save_as_mainfile(filepath=DEST)
bpy.ops.render.render(write_still=True)
try:
    bpy.ops.export_scene.gltf(filepath=GLB,export_format='GLB',use_selection=True,export_animations=True,export_apply=True)
except Exception as e:
    print('GLB_EXPORT_WARNING',e)
print('CONDOR_BLEND',DEST)
print('CONDOR_PREVIEW',PREVIEW)
print('CONDOR_GLB',GLB)
print('BLENDER',bpy.app.version_string,'OBJECTS',len(created))
