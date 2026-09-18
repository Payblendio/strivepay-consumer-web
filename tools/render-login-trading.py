"""Original trading sculpture; uses the shared StrivePay Blender studio."""
import runpy
from pathlib import Path
import bpy

root=Path(__file__).resolve().parents[1]
s=runpy.run_path(str(root/'tools/generate-account-icons.py'))
s['clear_scene']()
scene=s['setup_scene']()
scene.render.resolution_x=1100
scene.render.resolution_y=1100
scene.camera.data.ortho_scale=4.6
teal=s['material']('Trading teal',s['CYAN'],metallic=.65)
silver=s['material']('Pearl silver',s['WHITE'],metallic=.5)
navy=s['material']('Deep navy',s['NAVY'],metallic=.4)
for i,h in enumerate([.65,1.05,.85,1.55,1.95]):
    x=(i-2)*.5
    s['cube']('Candle body',(x,0,h/2-.65),(.28,.3,h),teal if i%2==0 else silver,bevel=.055)
    s['cube']('Candle wick',(x,0,h/2-.65),(.045,.05,h+.4),silver,bevel=.01)
ring=s['torus']('Orbit',(0,.3,.25),1.65,.085,teal)
s['cylinder']('Trading coin',(-.9,-.6,-.65),.43,.15,navy,bevel=.04)
s['torus']('Coin rim',(-.9,-.69,-.65),.36,.025,silver)
scene.render.filepath=str(root/'public/illustrations/login-trading.png')
bpy.ops.wm.save_as_mainfile(filepath=str(root/'design/login-trading.blend'))
bpy.ops.render.render(write_still=True)
