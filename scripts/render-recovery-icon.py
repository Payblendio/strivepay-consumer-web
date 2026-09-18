"""Original StrivePay recovery envelope, rendered in Blender with transparency."""
import bpy, math, os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def material(name,color,metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=.28
    return m
teal=material('Strive teal',(.015,.55,.61),.18)
white=material('Porcelain',(.86,.96,.95))
navy=material('Deep navy',(.025,.07,.13))
def box(name,loc,scale,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    b=o.modifiers.new('Soft manufactured edges','BEVEL'); b.width=.09; b.segments=5
    o.modifiers.new('Normals','WEIGHTED_NORMAL'); o.data.materials.append(mat)
    return o
def line(name,points,mat,r=.035):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.bevel_depth=r; c.bevel_resolution=5
    s=c.splines.new('POLY'); s.points.add(len(points)-1)
    for p,v in zip(s.points,points): p.co=(*v,1)
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); o.data.materials.append(mat)
box('Envelope',(0,0,0),(2.3,.35,1.5),teal)
line('Fold',[(-1.02,-.205,.59),(0,-.235,-.12),(1.02,-.205,.59)],white,.035)
box('Security badge',(.82,-.40,-.43),(.78,.18,.84),white)
line('Check',[(.59,-.52,-.44),(.75,-.52,-.60),(1.04,-.52,-.23)],teal,.045)
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=48
scene.render.resolution_x=512; scene.render.resolution_y=512; scene.render.resolution_percentage=100
scene.render.film_transparent=True; scene.world.color=(.5,.5,.5)
bpy.ops.object.camera_add(location=(2.4,-7,2.0)); cam=bpy.context.object; cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=3.4; scene.camera=cam
for pos,power,size in [((-3,-4,5),650,4),((4,-2,2),450,3),((0,3,4),700,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos); l=bpy.context.object; l.data.energy=power; l.data.shape='DISK'; l.data.size=size; l.rotation_euler=(-l.location).to_track_quat('-Z','Y').to_euler()
out=os.path.abspath(os.path.join(os.path.dirname(__file__),'../public/illustrations/recovery-envelope.png'))
scene.render.image_settings.file_format='PNG'; scene.render.filepath=out
bpy.ops.wm.save_as_mainfile(filepath=out.replace('.png','.blend'))
bpy.ops.render.render(write_still=True)
