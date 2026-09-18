"""Build the two account-choice illustrations used by the StrivePay onboarding screen.

Run with Blender in background mode, for example:
  blender -b --python tools/generate-account-icons.py

The script intentionally keeps the .blend sources beside the generated PNGs so the
illustrations can be tuned later without rebuilding them from scratch.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
PNG_DIR = ROOT / "public" / "illustrations"
BLEND_DIR = ROOT / "design"


NAVY = (0.018, 0.067, 0.132, 1.0)
CYAN = (0.012, 0.625, 0.700, 1.0)
CYAN_LIGHT = (0.640, 0.900, 0.920, 1.0)
MIST = (0.890, 0.950, 0.950, 1.0)
WHITE = (0.985, 1.000, 0.990, 1.0)


def material(name: str, color: tuple[float, float, float, float], *, metallic=0.0, roughness=0.32):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
    return mat


def assign(obj, mat):
    obj.data.materials.append(mat)
    return obj


def soften(obj, width=0.06, segments=4):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("Soft bevel", "BEVEL")
    bevel.width = width
    bevel.segments = segments
    bevel.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.select_set(False)
    return obj


def smooth(obj):
    if hasattr(obj.data, "polygons"):
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    return obj


def cube(name, location, dimensions, mat, *, bevel=0.06, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    soften(obj, bevel)
    return assign(obj, mat)


def sphere(name, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth(obj)
    return assign(obj, mat)


def cylinder(name, location, radius, depth, mat, *, bevel=0.04, vertices=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    soften(obj, bevel)
    return assign(obj, mat)


def torus(name, location, major_radius, minor_radius, mat):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=72,
        minor_segments=18,
        location=location,
        rotation=(math.radians(90), 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    smooth(obj)
    return assign(obj, mat)


def point_camera(camera, target=(0, 0, 0)):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def setup_scene():
    scene = bpy.context.scene
    # Blender 5 renamed the realtime engine enum back to BLENDER_EEVEE.
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 768
    scene.render.resolution_y = 768
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.filepath = str(PNG_DIR / "account-icon.png")
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100

    world = scene.world or bpy.data.worlds.new("StrivePay transparent world")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (0.025, 0.055, 0.075, 1.0)
        background.inputs["Strength"].default_value = 0.25

    bpy.ops.object.camera_add(location=(3.75, -6.5, 3.55))
    camera = bpy.context.object
    camera.name = "Icon camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 3.25
    point_camera(camera, (0, 0, 0.12))
    scene.camera = camera

    def area(name, location, energy, size, color):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = color
        point_camera(light, (0, 0, 0.15))

    area("Key softbox", (3.0, -4.0, 5.5), 480, 4.0, (0.84, 0.98, 1.0))
    area("Fill softbox", (-4.0, -1.0, 2.5), 260, 3.2, (0.55, 0.92, 1.0))
    area("Rim softbox", (1.0, 3.5, 4.2), 520, 3.5, (0.36, 0.82, 0.86))
    return scene


def personal_icon():
    navy = material("Personal navy", NAVY, metallic=0.08, roughness=0.24)
    cyan = material("Personal cyan", CYAN, metallic=0.36, roughness=0.19)
    light = material("Personal highlight", CYAN_LIGHT, metallic=0.16, roughness=0.24)
    white = material("Personal white", WHITE, metallic=0.06, roughness=0.22)

    # A halo and floating base make the figure read as a confident, independent user.
    halo = torus("Personal halo", (0.0, 0.24, 0.25), 0.92, 0.075, cyan)
    halo.scale = (1.0, 1.0, 1.04)
    cylinder("Personal pedestal", (0.0, -0.10, -0.50), 0.62, 0.13, white, bevel=0.055)
    cylinder("Personal pedestal accent", (0.0, -0.12, -0.43), 0.52, 0.055, light, bevel=0.025)

    # Rounded bust: the head stays distinct at the small card size.
    sphere("Personal shoulders", (0.0, -0.18, -0.03), (0.62, 0.34, 0.43), navy)
    sphere("Personal head", (0.0, -0.26, 0.67), (0.285, 0.285, 0.285), white)
    cylinder("Personal collar", (0.0, -0.25, 0.32), 0.16, 0.12, cyan, bevel=0.035)
    sphere("Personal chest badge", (0.0, -0.51, -0.08), (0.14, 0.045, 0.14), cyan)


def business_icon():
    navy = material("Business navy", NAVY, metallic=0.12, roughness=0.22)
    cyan = material("Business cyan", CYAN, metallic=0.38, roughness=0.18)
    light = material("Business windows", CYAN_LIGHT, metallic=0.22, roughness=0.18)
    white = material("Business trim", WHITE, metallic=0.04, roughness=0.22)

    halo = torus("Business halo", (0.0, 0.25, 0.25), 0.92, 0.075, cyan)
    halo.scale = (1.0, 1.0, 1.04)
    cylinder("Business pedestal", (0.0, -0.10, -0.50), 0.62, 0.13, white, bevel=0.055)
    cylinder("Business pedestal accent", (0.0, -0.12, -0.43), 0.52, 0.055, light, bevel=0.025)

    cube("Business building", (0.0, -0.08, 0.04), (0.86, 0.62, 1.22), navy, bevel=0.085)
    cube("Business crown", (0.0, -0.08, 0.70), (0.95, 0.70, 0.12), cyan, bevel=0.045)
    cube("Business side spine", (-0.48, -0.10, 0.04), (0.08, 0.67, 1.05), white, bevel=0.028)

    # Windows sit on the camera-facing side (negative Y).
    for row, z in enumerate((0.36, 0.08, -0.20)):
        for col, x in enumerate((-0.24, 0.0, 0.24)):
            cube(f"Business window {row}-{col}", (x, -0.405, z), (0.12, 0.045, 0.13), light, bevel=0.018)

    cube("Business door", (0.0, -0.415, -0.39), (0.20, 0.055, 0.25), cyan, bevel=0.025)
    cube("Business door inset", (0.0, -0.45, -0.40), (0.12, 0.025, 0.17), navy, bevel=0.012)


def setup_journey_icon():
    navy = material("Setup navy", NAVY, metallic=0.14, roughness=0.22)
    cyan = material("Setup cyan", CYAN, metallic=0.42, roughness=0.18)
    light = material("Setup highlight", CYAN_LIGHT, metallic=0.20, roughness=0.18)
    white = material("Setup trim", WHITE, metallic=0.06, roughness=0.22)

    # Two interlocking links give one compact visual language for the two stages:
    # compliance unlocks the money routes, rather than presenting them as separate tasks.
    left_link = torus("Setup compliance link", (-0.38, 0.24, 0.18), 0.48, 0.11, cyan)
    left_link.rotation_euler.rotate_axis("Z", math.radians(-14))
    right_link = torus("Setup route link", (0.38, 0.05, 0.36), 0.48, 0.11, navy)
    right_link.rotation_euler.rotate_axis("Z", math.radians(14))

    cylinder("Setup pedestal", (0.0, -0.10, -0.52), 0.64, 0.13, white, bevel=0.055)
    cylinder("Setup pedestal accent", (0.0, -0.12, -0.45), 0.54, 0.055, light, bevel=0.025)
    sphere("Setup centre node", (0.0, -0.35, 0.24), (0.15, 0.075, 0.15), light)
    cube("Setup centre bridge", (0.0, -0.29, 0.24), (0.28, 0.08, 0.08), white, bevel=0.025, rotation=(0, 0, math.radians(10)))


def destination_account_icon():
    navy = material("Destination navy", NAVY, metallic=0.12, roughness=0.24)
    cyan = material("Destination cyan", CYAN, metallic=0.40, roughness=0.18)
    light = material("Destination highlight", CYAN_LIGHT, metallic=0.18, roughness=0.20)
    white = material("Destination trim", WHITE, metallic=0.05, roughness=0.24)

    halo = torus("Destination halo", (0.0, 0.23, 0.16), 0.82, 0.065, cyan)
    halo.scale = (1.0, 1.0, 1.05)
    cylinder("Destination pedestal", (0.0, -0.10, -0.50), 0.60, 0.13, white, bevel=0.05)
    cylinder("Destination pedestal accent", (0.0, -0.12, -0.43), 0.50, 0.05, light, bevel=0.022)

    # A compact bank silhouette with a floating account token.
    cube("Destination bank base", (0.0, -0.10, -0.08), (0.90, 0.56, 0.16), navy, bevel=0.045)
    cube("Destination bank roof", (0.0, -0.10, 0.66), (1.02, 0.64, 0.13), cyan, bevel=0.04, rotation=(0, 0, math.radians(-2)))
    cube("Destination bank lintel", (0.0, -0.10, 0.48), (0.83, 0.48, 0.10), light, bevel=0.028)
    for index, x in enumerate((-0.29, 0.0, 0.29)):
        cube(f"Destination bank column {index}", (x, -0.33, 0.21), (0.12, 0.10, 0.48), white, bevel=0.025)
    cube("Destination bank counter", (0.0, -0.34, -0.10), (0.78, 0.10, 0.10), cyan, bevel=0.022)
    cylinder("Destination account token", (0.38, -0.48, 0.38), 0.15, 0.06, light, bevel=0.02)


def buy_wallet_icon():
    navy = material("Wallet navy", NAVY, metallic=0.14, roughness=0.22)
    cyan = material("Wallet cyan", CYAN, metallic=0.42, roughness=0.18)
    light = material("Wallet highlight", CYAN_LIGHT, metallic=0.18, roughness=0.20)
    white = material("Wallet trim", WHITE, metallic=0.05, roughness=0.24)

    halo = torus("Wallet halo", (0.0, 0.24, 0.18), 0.82, 0.065, cyan)
    halo.scale = (1.0, 1.0, 1.05)
    cylinder("Wallet pedestal", (0.0, -0.10, -0.50), 0.60, 0.13, white, bevel=0.05)
    cylinder("Wallet pedestal accent", (0.0, -0.12, -0.43), 0.50, 0.05, light, bevel=0.022)

    cube("Wallet body", (0.0, -0.12, 0.02), (1.00, 0.60, 0.58), navy, bevel=0.105, rotation=(0, 0, math.radians(-4)))
    cube("Wallet upper fold", (0.03, -0.20, 0.33), (0.86, 0.22, 0.20), cyan, bevel=0.06, rotation=(0, 0, math.radians(-4)))
    cube("Wallet pocket", (0.08, -0.46, -0.02), (0.57, 0.08, 0.25), light, bevel=0.045, rotation=(0, 0, math.radians(-4)))
    cylinder("Wallet clasp", (0.34, -0.52, 0.06), 0.095, 0.06, white, bevel=0.018)
    cylinder("Wallet coin", (-0.46, -0.27, 0.32), 0.17, 0.08, light, bevel=0.022)


def activity_icon():
    navy = material("Activity navy", NAVY, metallic=0.14, roughness=0.22)
    cyan = material("Activity cyan", CYAN, metallic=0.42, roughness=0.18)
    light = material("Activity highlight", CYAN_LIGHT, metallic=0.18, roughness=0.20)
    white = material("Activity trim", WHITE, metallic=0.05, roughness=0.24)

    halo = torus("Activity halo", (0.0, 0.23, 0.20), 0.82, 0.065, cyan)
    halo.scale = (1.0, 1.0, 1.05)
    cylinder("Activity pedestal", (0.0, -0.10, -0.50), 0.60, 0.13, white, bevel=0.05)
    cylinder("Activity pedestal accent", (0.0, -0.12, -0.43), 0.50, 0.05, light, bevel=0.022)

    cylinder("Activity buy coin", (-0.30, -0.24, 0.16), 0.31, 0.18, cyan, bevel=0.045)
    cylinder("Activity sell coin", (0.30, -0.28, 0.42), 0.31, 0.18, navy, bevel=0.045)
    cube("Activity bridge", (0.0, -0.42, 0.31), (0.44, 0.07, 0.08), white, bevel=0.025, rotation=(0, 0, math.radians(14)))
    cylinder("Activity centre marker", (0.02, -0.48, 0.30), 0.09, 0.06, light, bevel=0.018)


def accounts_icon():
    navy = material("Accounts navy", NAVY, metallic=0.14, roughness=0.22)
    cyan = material("Accounts cyan", CYAN, metallic=0.42, roughness=0.18)
    light = material("Accounts highlight", CYAN_LIGHT, metallic=0.18, roughness=0.20)
    white = material("Accounts trim", WHITE, metallic=0.05, roughness=0.24)

    halo = torus("Accounts halo", (0.0, 0.23, 0.20), 0.82, 0.065, cyan)
    halo.scale = (1.0, 1.0, 1.05)
    cylinder("Accounts pedestal", (0.0, -0.10, -0.50), 0.60, 0.13, white, bevel=0.05)
    cylinder("Accounts pedestal accent", (0.0, -0.12, -0.43), 0.50, 0.05, light, bevel=0.022)

    cube("Accounts bank tile", (-0.25, -0.11, 0.13), (0.62, 0.52, 0.80), navy, bevel=0.08)
    cube("Accounts wallet tile", (0.30, -0.36, 0.20), (0.64, 0.32, 0.42), cyan, bevel=0.07, rotation=(0, 0, math.radians(-5)))
    cube("Accounts wallet pocket", (0.35, -0.55, 0.16), (0.40, 0.06, 0.16), light, bevel=0.03, rotation=(0, 0, math.radians(-5)))
    for index, z in enumerate((0.34, 0.12, -0.10)):
        cube(f"Accounts bank window {index}", (-0.25, -0.40, z), (0.15, 0.04, 0.12), light, bevel=0.018)


def render_one(kind: str, builder):
    clear_scene()
    scene = setup_scene()
    builder()
    png = PNG_DIR / f"account-{kind}-3d.png"
    blend = BLEND_DIR / f"account-{kind}-3d.blend"
    scene.render.filepath = str(png)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.render.render(write_still=True)
    print(f"Generated {png}")
    print(f"Saved editable source {blend}")


def main():
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    BLEND_DIR.mkdir(parents=True, exist_ok=True)
    render_one("personal", personal_icon)
    render_one("business", business_icon)
    render_one("setup-journey", setup_journey_icon)
    render_one("destination-account", destination_account_icon)
    render_one("buy-wallet", buy_wallet_icon)
    render_one("activity", activity_icon)
    render_one("accounts", accounts_icon)


if __name__ == "__main__":
    main()
