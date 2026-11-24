class_name FighterModel
extends Node3D
## Visual 3D do lutador: modelo da Tripo + biblioteca de animações compartilhada.
## Também fornece posições de ossos (para hitbox/hurtbox) no plano da luta.

const LIB_PATH := "res://assets/animations/fight_library.res"
const BLEND := 0.08

var model: Node3D
var skeleton: Skeleton3D
var anim: AnimationPlayer
var height_scale := 1.0
var _current := ""
var _bone_cache := {}
static var _lib: AnimationLibrary


func setup(scene: PackedScene, height_m: float) -> void:
	if model:
		model.queue_free()
	model = scene.instantiate()
	add_child(model)
	skeleton = model.find_children("*", "Skeleton3D", true, false)[0]
	# a malha da Tripo vem normalizada com ~0,98 m de altura
	height_scale = height_m / 0.98
	model.scale = Vector3.ONE * height_scale
	anim = AnimationPlayer.new()
	anim.name = "Anim"
	model.add_child(anim)
	anim.root_node = NodePath("..")
	if _lib == null:
		_lib = load(LIB_PATH)
	anim.add_animation_library("fight", _lib)
	anim.playback_default_blend_time = BLEND
	_bone_cache.clear()
	_tune_materials(model)
	play("idle")


func play(n: String, speed := 1.0, blend := BLEND, restart := false) -> void:
	var full := "fight/" + n
	if not anim.has_animation(full):
		full = "fight/idle"
	if _current == full and not restart:
		anim.speed_scale = speed
		return
	_current = full
	anim.play(full, blend)
	anim.speed_scale = speed


func seek(t: float) -> void:
	anim.seek(t, true)


func length(n: String) -> float:
	var full := "fight/" + n
	return anim.get_animation(full).length if anim.has_animation(full) else 1.0


func bone_world(bone: StringName) -> Vector3:
	var idx: int = _bone_cache.get(bone, -2)
	if idx == -2:
		idx = skeleton.find_bone(bone)
		_bone_cache[bone] = idx
	if idx < 0:
		return global_position + Vector3(0, 1.0, 0)
	return skeleton.global_transform * skeleton.get_bone_global_pose(idx).origin


func set_facing(dir: int, toward_camera_deg := 22.0) -> void:
	# o modelo olha para +Z; +90° vira para +X (direita)
	rotation_degrees.y = dir * (90.0 - toward_camera_deg)


func set_tint(c: Color) -> void:
	for mi in model.find_children("*", "MeshInstance3D", true, false):
		var g := mi as GeometryInstance3D
		g.material_overlay = null if c == Color.WHITE else _flash_mat(c)


var _flash_cache := {}
func _flash_mat(c: Color) -> StandardMaterial3D:
	if not _flash_cache.has(c):
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.albedo_color = c
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		_flash_cache[c] = m
	return _flash_cache[c]


## A Tripo exporta PBR muito brilhante; deixamos a pele/roupa com aspecto mais natural.
func _tune_materials(n: Node) -> void:
	for mi in n.find_children("*", "MeshInstance3D", true, false):
		var m3 := mi as MeshInstance3D
		for s in m3.mesh.get_surface_count():
			var mat := m3.get_active_material(s)
			if mat is StandardMaterial3D:
				var d: StandardMaterial3D = mat.duplicate()
				d.roughness = maxf(d.roughness, 0.72)
				d.metallic = minf(d.metallic, 0.05)
				d.metallic_specular = 0.3
				# acabamento "HD": luz de borda suave, filtragem anisotrópica e normal map mais marcado
				d.rim_enabled = true
				d.rim = 0.28
				d.rim_tint = 0.65
				d.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
				if d.normal_enabled:
					d.normal_scale = 1.25
				m3.set_surface_override_material(s, d)
		m3.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
