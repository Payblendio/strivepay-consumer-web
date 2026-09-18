"""Render StrivePay empty-state PNGs: not-found and error."""
import math
import os
import bpy

OUT_DIR = os.environ.get(
    "STRIVEPAY_ILLUSTRATION_DIR",
    r"c:\Users\obiek\Documents\strivepay\consumer-web\public\illustrations",
)

TEAL = (0.05, 0.62, 0.68, 1.0)
TEAL_MID = (0.18, 0.58, 0.64, 1.0)
NAVY = (0.05, 0.12, 0.22, 1.0)
PALE = (0.82, 0.90, 0.93, 1.0)
LIGHT = (0.62, 0.80, 0.88, 1.0)
ALERT = (0.85, 0.32, 0.40, 1.0)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def mat(name, color, roughness=0.32, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return m


def bevel(obj, width=0.035, segments=5):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"


def add_cylinder(name, radius, depth, location, material):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=location, vertices=72)
    obj = bpy.context.active_object
    obj.name = name
    bevel(obj, min(0.04, depth * 0.35))
    obj.data.materials.append(material)
    return obj


def add_torus(name, major, minor, location, rotation, material):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=96,
        minor_segments=48,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def add_capsule(name, radius, length, location, rotation, material):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=length, location=location, vertices=36)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = rotation
    bevel(obj, radius * 0.95, 10)
    obj.data.materials.append(material)
    return obj


def setup_world_camera_lights():
    world = bpy.data.worlds.new("World") if "World" not in bpy.data.worlds else bpy.data.worlds["World"]
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0, 0, 0, 1)
    bg.inputs[1].default_value = 1.0

    # Match the activity art framing: more headroom, full pedestal visible
    bpy.ops.object.camera_add(location=(5.4, -5.6, 3.6))
    cam = bpy.context.active_object
    cam.name = "Camera"
    cam.rotation_euler = (math.radians(60), 0, math.radians(43))
    bpy.context.scene.camera = cam
    cam.data.lens = 50

    bpy.ops.object.light_add(type="AREA", location=(3.2, -1.8, 5.8))
    key = bpy.context.active_object
    key.data.energy = 480
    key.data.size = 3.6
    key.rotation_euler = (math.radians(40), math.radians(8), math.radians(18))

    bpy.ops.object.light_add(type="AREA", location=(-3.6, 2.0, 2.8))
    fill = bpy.context.active_object
    fill.data.energy = 140
    fill.data.size = 4.5
    fill.data.color = (0.7, 0.92, 1.0)

    bpy.ops.object.light_add(type="AREA", location=(0.4, 4.0, 1.6))
    rim = bpy.context.active_object
    rim.data.energy = 100
    rim.data.size = 2.8
    rim.data.color = (0.45, 0.88, 0.96)


def configure_render(path):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = path
    try:
        scene.cycles.device = "CPU"
    except Exception:
        pass


def build_shared_stage(m_pale, m_light, m_teal, m_mid, m_navy, ring_yaw= -18):
    add_cylinder("BaseBottom", 1.38, 0.2, (0, 0, 0.1), m_pale)
    add_cylinder("BaseTop", 1.16, 0.12, (0, 0, 0.26), m_light)
    add_torus(
        "Ring",
        1.08,
        0.155,
        (0, 0, 1.28),
        (math.radians(78), math.radians(10), math.radians(ring_yaw)),
        m_teal,
    )
    add_cylinder("PlatformLeft", 0.44, 0.11, (-0.52, 0.08, 0.68), m_mid)
    add_cylinder("PlatformHigh", 0.34, 0.1, (0.18, -0.12, 1.52), m_navy)


def build_not_found():
    clear_scene()
    setup_world_camera_lights()
    m_teal = mat("Teal", TEAL)
    m_mid = mat("TealMid", TEAL_MID)
    m_navy = mat("Navy", NAVY)
    m_pale = mat("Pale", PALE)
    m_light = mat("Light", LIGHT)
    build_shared_stage(m_pale, m_light, m_teal, m_mid, m_navy, ring_yaw=-14)
    # Ghost / missing piece: pale hollow-feeling disc offset from the stage
    ghost = add_cylinder("GhostDisc", 0.28, 0.07, (0.95, -0.55, 1.15), m_pale)
    ghost.rotation_euler = (math.radians(18), math.radians(-12), math.radians(25))
    # Tiny marker on left platform like the activity capsule, but empty slot feel
    add_capsule("SlotMark", 0.05, 0.22, (-0.52, 0.08, 0.8), (math.radians(90), 0, math.radians(20)), m_pale)


def build_error():
    clear_scene()
    setup_world_camera_lights()
    m_teal = mat("Teal", TEAL)
    m_mid = mat("TealMid", TEAL_MID)
    m_navy = mat("Navy", NAVY)
    m_pale = mat("Pale", PALE)
    m_light = mat("Light", LIGHT)
    m_alert = mat("Alert", ALERT, roughness=0.25)
    build_shared_stage(m_pale, m_light, m_teal, m_mid, m_navy, ring_yaw=16)
    # Soft exclamation on the navy platform
    add_capsule("BangBar", 0.08, 0.58, (0.18, -0.12, 1.88), (0, math.radians(8), 0), m_alert)
    add_cylinder("BangDot", 0.09, 0.1, (0.2, -0.1, 1.48), m_alert)


def render_variant(name, builder):
    builder()
    path = os.path.join(OUT_DIR, f"{name}.png")
    os.makedirs(OUT_DIR, exist_ok=True)
    configure_render(path)
    bpy.ops.render.render(write_still=True)
    print(f"WROTE {path}")


def main():
    render_variant("account-not-found-3d", build_not_found)
    render_variant("account-error-3d", build_error)


if __name__ == "__main__":
    main()
