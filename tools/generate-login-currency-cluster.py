"""Render StrivePay's small 3D currency cluster used by the login story.

Run with Blender in background mode:
  blender --background --python tools/generate-login-currency-cluster.py -- --output public/illustrations/login-currency-cluster.png
"""

from __future__ import annotations

import math
import os
import sys

import bpy
from mathutils import Vector


def color(hex_value: str) -> tuple[float, float, float, float]:
    value = hex_value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4)) + (1.0,)


def material(name: str, hex_value: str, *, metallic: float = 0.0, roughness: float = 0.34) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color(hex_value)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = color(hex_value)
        principled.inputs["Metallic"].default_value = metallic
        principled.inputs["Roughness"].default_value = roughness
    return mat


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def smooth(obj: bpy.types.Object) -> None:
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def add_coin(
    name: str,
    location: tuple[float, float, float],
    rotation_z: float,
    coin_color: str,
    symbol: str,
    symbol_color: str,
    subtitle: str,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=96,
        radius=1.34,
        depth=0.25,
        location=location,
        rotation=(0.0, 0.0, math.radians(rotation_z)),
    )
    coin = bpy.context.object
    coin.name = name
    coin.data.materials.append(material(f"{name} surface", coin_color, metallic=0.18, roughness=0.25))
    bevel = coin.modifiers.new("soft bevel", "BEVEL")
    bevel.width = 0.11
    bevel.segments = 5
    smooth(coin)

    # A thin inset rim makes each disc read as a designed 3D token rather than a flat badge.
    bpy.ops.mesh.primitive_torus_add(
        major_radius=1.13,
        minor_radius=0.035,
        major_segments=96,
        minor_segments=12,
        location=(location[0], location[1], location[2] + 0.14),
        rotation=(0.0, 0.0, math.radians(rotation_z)),
    )
    rim = bpy.context.object
    rim.name = f"{name} rim"
    rim.data.materials.append(material(f"{name} rim material", "#F8FCFB", metallic=0.72, roughness=0.22))
    smooth(rim)

    bpy.ops.object.text_add(
        location=(location[0], location[1], location[2] + 0.19),
        rotation=(0.0, 0.0, math.radians(rotation_z)),
    )
    text = bpy.context.object
    text.name = f"{name} symbol"
    text.data.body = symbol
    text.data.align_x = "CENTER"
    text.data.align_y = "CENTER"
    text.data.size = 1.06 if len(symbol) == 1 else 0.74
    text.data.extrude = 0.035
    text.data.bevel_depth = 0.012
    text.data.bevel_resolution = 3
    text.data.materials.append(material(f"{name} symbol material", symbol_color, metallic=0.08, roughness=0.24))

    # Tiny label on the lower edge gives the cluster a product-illustration detail.
    bpy.ops.object.text_add(
        location=(location[0], location[1] - 0.62, location[2] + 0.2),
        rotation=(0.0, 0.0, math.radians(rotation_z)),
    )
    label = bpy.context.object
    label.name = f"{name} label"
    label.data.body = subtitle
    label.data.align_x = "CENTER"
    label.data.align_y = "CENTER"
    label.data.size = 0.16
    label.data.extrude = 0.008
    label.data.materials.append(material(f"{name} label material", symbol_color, metallic=0.0, roughness=0.4))

    return coin


def add_link(location: tuple[float, float, float], rotation_z: float, scale: tuple[float, float, float]) -> None:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.63,
        minor_radius=0.095,
        major_segments=64,
        minor_segments=12,
        location=location,
        rotation=(math.radians(8), math.radians(-12), math.radians(rotation_z)),
    )
    ring = bpy.context.object
    ring.name = "link"
    ring.scale = scale
    ring.data.materials.append(material("teal link", "#0DA6B6", metallic=0.62, roughness=0.2))
    smooth(ring)


def main() -> None:
    output = "public/illustrations/login-currency-cluster.png"
    if "--" in sys.argv:
        args = sys.argv[sys.argv.index("--") + 1 :]
        if "--output" in args:
            output = args[args.index("--output") + 1]
    output = os.path.abspath(output)
    os.makedirs(os.path.dirname(output), exist_ok=True)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

    # The links are slightly behind the coins, so the overlap feels clipped together.
    add_link((-0.42, 0.55, -0.02), 24, (1.18, 0.66, 1.0))
    add_link((0.58, -0.26, -0.03), -28, (1.12, 0.6, 1.0))

    add_coin("BTC", (-1.18, 0.42, 0.25), -18, "#F7931A", "₿", "#FFF8EB", "BITCOIN")
    add_coin("ETH", (0.38, 0.84, 0.47), 12, "#667FE7", "◆", "#F5F7FF", "ETHEREUM")
    add_coin("USDC", (0.9, -0.75, 0.2), 22, "#2775CA", "$", "#EEF7FF", "USD COIN")

    # Grounded camera and studio lighting keep the transparent render soft enough for any slide color.
    bpy.ops.object.camera_add(location=(0.0, -8.7, 8.6))
    camera = bpy.context.object
    look_at(camera, Vector((0.0, 0.0, 0.2)))
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 5.7
    bpy.context.scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(-4.0, -4.0, 8.0))
    key = bpy.context.object
    key.data.energy = 780
    key.data.shape = "DISK"
    key.data.size = 5.5
    look_at(key, Vector((0.0, 0.0, 0.0)))

    bpy.ops.object.light_add(type="AREA", location=(4.0, 1.5, 5.5))
    fill = bpy.context.object
    fill.data.energy = 520
    fill.data.size = 4.0
    look_at(fill, Vector((0.0, 0.0, 0.0)))

    bpy.ops.object.light_add(type="AREA", location=(0.0, 4.5, 2.8))
    rim = bpy.context.object
    rim.data.energy = 380
    rim.data.size = 3.0
    look_at(rim, Vector((0.0, 0.0, 0.0)))

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.filepath = output
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = color("#071D27")[:3]
    bpy.ops.wm.save_as_mainfile(filepath=os.path.splitext(output)[0] + ".blend")
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {output}")


if __name__ == "__main__":
    main()
