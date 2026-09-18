"""Floating currency medallions and sculpted two-way ribbons for login."""
import math
import runpy
from pathlib import Path
import bpy
from mathutils import Vector

root=Path(__file__).resolve().parents[1]
s=runpy.run_path(str(root/'tools/generate-account-icons.py'))
s['clear_scene']()
scene=s['setup_scene']()
scene.render.resolution_x=1500
scene.render.resolution_y=1200
scene.camera.location=(3,-8,4.8)
s['point_camera'](scene.camera,(0,0,.15))
scene.camera.data.ortho_scale=5.8
teal=s['material']('Enamel teal',(.008,.47,.53,1),metallic=.55,roughness=.21)
silver=s['material']('Brushed platinum',(.76,.85,.89,1),metallic=.78,roughness=.23)
gold=s['material']('Champagne gold',(.83,.43,.12,1),metallic=.72,roughness=.23)
navy=s['material']('Midnight enamel',(.015,.055,.09,1),metallic=.32,roughness=.2)
white=s['material']('Porcelain',(.94,.98,1,1),metallic=.25,roughness=.24)

def ribbon(name,start,end,mat,z):
    verts=[]
    n=110
    for i in range(n):
        t=i/(n-1)
        a=start+(end-start)*t
        width=.27 if t<.86 else .55*(1-t)/.14
        for side in [-1,1]:
            r=1.92+side*width/2
            verts.append((r*math.cos(a),r*.72*math.sin(a),z+.22*math.sin(a*2)+side*.09))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],[(i*2,i*2+1,i*2+3,i*2+2) for i in range(n-1)])
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    solid=obj.modifiers.new('Ribbon thickness','SOLIDIFY');solid.thickness=.065
    bevel=obj.modifiers.new('Polished edges','BEVEL');bevel.width=.025;bevel.segments=3
    for p in mesh.polygons:p.use_smooth=True

ribbon('Incoming teal ribbon',-.45,3.1,teal,-.2)
ribbon('Outgoing platinum ribbon',2.7,6.0,silver,-.35)

def coin(name,pos,r,mat,symbol,tilt):
    parent=bpy.data.objects.new(name+' pivot',None)
    bpy.context.collection.objects.link(parent)
    body=s['cylinder'](name,(0,0,0),r,.19,mat,bevel=.065,vertices=128)
    body.parent=parent
    bpy.ops.mesh.primitive_torus_add(major_radius=r-.09,minor_radius=.022,major_segments=96,minor_segments=12,location=(0,0,.106))
    rim=bpy.context.object;rim.data.materials.append(silver);rim.parent=parent
    bpy.ops.object.text_add(location=(0,0,.115))
    text=bpy.context.object;text.data.body=symbol;text.data.align_x='CENTER';text.data.align_y='CENTER'
    text.data.size=r*1.3;text.data.extrude=.018;text.data.bevel_depth=.007;text.data.materials.append(white);text.parent=parent
    parent.location=pos
    parent.rotation_euler=(math.radians(58),math.radians(tilt),math.radians(-12))

coin('Bitcoin',(-.85,-.2,.6),.7,gold,'₿',-15)
coin('Dollar',(.65,.3,.85),.67,teal,'$',15)
coin('Euro',(.65,-.8,-.15),.58,navy,'€',-10)
for i,pos in enumerate([(-1.8,.1,.55),(1.65,.15,.45),(-.3,1.1,.5)]):
    s['sphere']('Polished accent '+str(i),pos,(.09,.09,.09),silver)
scene.render.filepath=str(root/'public/illustrations/login-flow-v2.png')
bpy.ops.wm.save_as_mainfile(filepath=str(root/'design/login-flow-v2.blend'))
bpy.ops.render.render(write_still=True)
