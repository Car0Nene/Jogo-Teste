class_name Stage
extends Node3D
## Arena 3D montada por código: céu/fundo pintado ao longe, chão 3D com textura,
## objetos 3D de cena, luz com sombras, névoa de profundidade e partículas ambiente.
## Para trocar por cenários modelados: crie uma cena .tscn e aponte em data/stages/<id>.tres.

@export var stage_id: StringName = &"padaria"

const THEMES := {
	&"padaria": {"bg": "padaria", "floor": "tiles", "floor_a": Color("c98a5e"), "floor_b": Color("a8643c"),
		"sun": Color("ffe2b8"), "sun_rot": Vector3(-42, -35, 0), "ambient": Color("f2c9a0"), "fog": Color("f4c79a"),
		"props": "padaria", "particles": "dust"},
	&"quintal": {"bg": "quintal", "floor": "grass", "floor_a": Color("5f8f3a"), "floor_b": Color("4a7a2c"),
		"sun": Color("fff4d6"), "sun_rot": Vector3(-55, 30, 0), "ambient": Color("bfe0ff"), "fog": Color("cfe6c5"),
		"props": "quintal", "particles": "leaves"},
	&"festa": {"bg": "festa", "floor": "dirt", "floor_a": Color("9a6b45"), "floor_b": Color("7d5434"),
		"sun": Color("ffb36b"), "sun_rot": Vector3(-20, 20, 0), "ambient": Color("8a5fbf"), "fog": Color("3b2a5c"),
		"props": "festa", "particles": "sparks", "night": true},
	&"bar": {"bg": "bar", "floor": "wood", "floor_a": Color("7a4b2a"), "floor_b": Color("5e3920"),
		"sun": Color("ffd08a"), "sun_rot": Vector3(-50, -20, 0), "ambient": Color("c0844a"), "fog": Color("5a3a22"),
		"props": "bar", "particles": "dust", "night": true},
	&"praia": {"bg": "praia", "floor": "sand", "floor_a": Color("e9cf9a"), "floor_b": Color("d9b97c"),
		"sun": Color("fff6e0"), "sun_rot": Vector3(-60, 40, 0), "ambient": Color("bde3ff"), "fog": Color("cfeaff"),
		"props": "praia", "particles": "none"},
}

var _theme: Dictionary
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.seed = hash(stage_id)
	_theme = THEMES.get(stage_id, THEMES[&"padaria"])
	var room: Array = {&"padaria": [0.4, 0.16], &"bar": [0.5, 0.2], &"festa": [0.45, 0.14],
		&"quintal": [0.2, 0.07], &"praia": [0.15, 0.05]}.get(stage_id, [0.3, 0.1])
	Audio.set_room(room[0], room[1])
	_environment()
	_backdrop()
	_floor()
	_props()
	_particles()


func _quality() -> int:
	return int(Settings.get_value("video", "quality"))


func _environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = _theme.fog
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = _theme.ambient
	env.ambient_light_energy = 0.55 if not _theme.get("night", false) else 0.45
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.0
	env.glow_enabled = _quality() >= 1
	env.glow_intensity = 0.6
	env.glow_bloom = 0.08
	env.fog_enabled = true
	env.fog_light_color = _theme.fog
	env.fog_density = 0.012
	env.fog_sky_affect = 0.0
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.08
	env.adjustment_contrast = 1.05
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.light_color = _theme.sun
	sun.light_energy = 1.15 if not _theme.get("night", false) else 0.7
	sun.rotation_degrees = _theme.sun_rot
	sun.shadow_enabled = _quality() >= 1
	sun.shadow_blur = 1.5
	sun.directional_shadow_max_distance = 22.0
	add_child(sun)
	var fill := DirectionalLight3D.new()
	fill.light_color = _theme.ambient
	fill.light_energy = 0.35
	fill.rotation_degrees = Vector3(-15, 160, 0)
	add_child(fill)


func _backdrop() -> void:
	var tex: Texture2D = load("res://assets/stages/%s.webp" % _theme.bg)
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_texture = tex
	mat.disable_fog = false
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	var aspect := float(tex.get_width()) / tex.get_height()
	var h := 16.0
	var q := QuadMesh.new()
	q.size = Vector2(h * aspect, h)
	var mi := MeshInstance3D.new()
	mi.mesh = q
	mi.material_override = mat
	mi.position = Vector3(0, h * 0.5 - 4.2, -14.0)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)
	# faixa de transição entre o chão 3D e o fundo pintado
	var band := MeshInstance3D.new()
	var bq := QuadMesh.new()
	bq.size = Vector2(60, 6)
	bq.orientation = PlaneMesh.FACE_Y
	band.mesh = bq
	var bm := StandardMaterial3D.new()
	bm.albedo_color = (_theme.floor_b as Color).darkened(0.1)
	band.material_override = bm
	band.position = Vector3(0, -0.02, -9.5)
	add_child(band)


func _floor() -> void:
	var N := 256
	var img := Image.create(N, N, false, Image.FORMAT_RGB8)
	var a: Color = _theme.floor_a
	var b: Color = _theme.floor_b
	var kind := String(_theme.floor)
	for y in N:
		for x in N:
			var c: Color
			if kind == "tiles":
				c = a if ((x >> 5) + (y >> 5)) % 2 == 0 else b
				if x % 32 < 1 or y % 32 < 1:
					c = c.darkened(0.45)
			elif kind == "wood":
				c = a if ((y / 24) % 2 == 0) else b
				c = c.lerp(c.darkened(0.25), 0.5 + 0.5 * sin(x * 0.11 + y * 0.9))
				if y % 24 < 1:
					c = c.darkened(0.5)
			else:
				var t := 0.5 + 0.5 * sin(x * 0.14 + sin(y * 0.1) * 2.0) * cos(y * 0.18)
				c = a.lerp(b, t * 0.6 + _rng.randf() * 0.4)
			var n := _rng.randf_range(-0.035, 0.035)
			img.set_pixel(x, y, c.lightened(n) if n > 0 else c.darkened(-n))
	img.generate_mipmaps()
	var tex := ImageTexture.create_from_image(img)
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = tex
	mat.roughness = 0.85 if _theme.floor != "wood" else 0.55
	mat.uv1_scale = Vector3(14, 6, 1)
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	var pm := PlaneMesh.new()
	pm.size = Vector2(40, 20)
	var mi := MeshInstance3D.new()
	mi.mesh = pm
	mi.material_override = mat
	mi.position = Vector3(0, 0, -2.5)
	add_child(mi)


# ------------------------------------------------------------------ objetos de cena
func _box(size: Vector3, c: Color, at: Vector3, rough := 0.7) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	mi.material_override = m
	mi.position = at
	add_child(mi)
	return mi


func _cyl(r: float, h: float, c: Color, at: Vector3, r_top := -1.0, emit := 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.bottom_radius = r
	cm.top_radius = r if r_top < 0 else r_top
	cm.height = h
	mi.mesh = cm
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 0.6
	if emit > 0:
		m.emission_enabled = true
		m.emission = c
		m.emission_energy_multiplier = emit
	mi.material_override = m
	mi.position = at
	add_child(mi)
	return mi


func _sphere(r: float, c: Color, at: Vector3, emit := 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = r
	sm.height = r * 2
	mi.mesh = sm
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	if emit > 0:
		m.emission_enabled = true
		m.emission = c
		m.emission_energy_multiplier = emit
	mi.material_override = m
	mi.position = at
	add_child(mi)
	return mi


func _table(at: Vector3, cloth: Color, w := 1.6) -> void:
	_box(Vector3(w, 0.06, 0.9), cloth, at + Vector3(0, 0.78, 0))
	_box(Vector3(w + 0.02, 0.35, 0.92), cloth.darkened(0.1), at + Vector3(0, 0.6, 0))
	for sx in [-1, 1]:
		for sz in [-1, 1]:
			_box(Vector3(0.06, 0.78, 0.06), Color("6b4226"), at + Vector3(sx * (w * 0.5 - 0.1), 0.39, sz * 0.36))


func _pot(at: Vector3, flower: Color) -> void:
	_cyl(0.22, 0.4, Color("b45f3c"), at + Vector3(0, 0.2, 0), 0.28)
	for i in 7:
		_sphere(0.12, flower if i % 3 else Color("3f7d2c"), at + Vector3(_rng.randf_range(-0.2, 0.2), 0.5 + _rng.randf() * 0.25, _rng.randf_range(-0.15, 0.15)))


func _chair(at: Vector3, c: Color) -> void:
	_box(Vector3(0.45, 0.05, 0.45), c, at + Vector3(0, 0.45, 0))
	_box(Vector3(0.45, 0.5, 0.05), c, at + Vector3(0, 0.72, -0.2))
	for sx in [-1, 1]:
		for sz in [-1, 1]:
			_box(Vector3(0.04, 0.45, 0.04), c.darkened(0.2), at + Vector3(sx * 0.19, 0.22, sz * 0.19))


func _props() -> void:
	match String(_theme.props):
		"padaria":
			_table(Vector3(-3.6, 0, -3.2), Color("f472b6"))
			for i in 5:
				_cyl(0.12, 0.14, Color("f5d0a9"), Vector3(-4.2 + i * 0.3, 0.88, -3.2))
				_cyl(0.13, 0.03, Color("7c3f1d"), Vector3(-4.2 + i * 0.3, 0.96, -3.2))
			_chair(Vector3(-2.2, 0, -3.4), Color("8b5a2b"))
			_pot(Vector3(4.2, 0, -3.0), Color("ec4899"))
			_pot(Vector3(5.0, 0, -3.6), Color("f43f5e"))
			_pot(Vector3(-5.6, 0, -2.8), Color("f472b6"))
		"quintal":
			for i in 12:
				_box(Vector3(0.12, 1.2, 0.06), Color("d6c3a3"), Vector3(-7 + i * 1.25, 0.6, -5.0))
			_box(Vector3(15, 0.08, 0.06), Color("bfa98a"), Vector3(0, 1.0, -5.0))
			_box(Vector3(15, 0.08, 0.06), Color("bfa98a"), Vector3(0, 0.4, -5.0))
			_box(Vector3(0.9, 0.9, 0.6), Color("374151"), Vector3(4.0, 0.45, -3.2), 0.4)
			_box(Vector3(1.0, 0.06, 0.7), Color("6b7280"), Vector3(4.0, 0.93, -3.2), 0.3)
			_pot(Vector3(-4.4, 0, -3.2), Color("facc15"))
			_chair(Vector3(-3.4, 0, -3.6), Color("e5e7eb"))
		"festa":
			for row in 2:
				for i in 18:
					var c: Color = [Color("ef4444"), Color("facc15"), Color("22c55e"), Color("3b82f6"), Color("ec4899")][i % 5]
					var x := -8.0 + i * 0.95
					var y := 3.6 + row * 0.6 - 0.25 * sin(i * 0.33 * PI)
					var flag := _box(Vector3(0.4, 0.35, 0.01), c, Vector3(x, y, -4.5 - row * 1.5))
					flag.rotation_degrees.z = 45
			_cyl(0.6, 0.15, Color("44403c"), Vector3(4.6, 0.07, -3.6))
			for i in 6:
				var log := _cyl(0.07, 1.0, Color("78350f"), Vector3(4.6, 0.35, -3.6))
				log.rotation_degrees = Vector3(35, i * 60, 0)
			var fire := OmniLight3D.new()
			fire.light_color = Color("ff8a3d")
			fire.light_energy = 3.0
			fire.omni_range = 6.0
			fire.position = Vector3(4.6, 0.8, -3.6)
			add_child(fire)
			_fire_particles(Vector3(4.6, 0.3, -3.6))
			_table(Vector3(-3.8, 0, -3.4), Color("fde68a"))
		"bar":
			_box(Vector3(5, 1.1, 0.8), Color("5b3a22"), Vector3(-2.5, 0.55, -4.6), 0.5)
			_box(Vector3(5.1, 0.06, 0.9), Color("3f2615"), Vector3(-2.5, 1.12, -4.6), 0.3)
			for i in 6:
				_cyl(0.035, 0.24, Color("166534"), Vector3(-4.4 + i * 0.5, 1.27, -4.6), 0.02)
			for i in 3:
				_box(Vector3(0.5, 0.35, 0.35), Color("dc2626"), Vector3(3.2 + i * 0.55, 0.18, -3.6))
			_table(Vector3(4.0, 0, -2.8), Color("e5e7eb"), 1.0)
			_chair(Vector3(3.2, 0, -2.6), Color("e5e7eb"))
			for i in 4:
				var bulb := _sphere(0.07, Color("ffd27a"), Vector3(-6 + i * 4, 3.4, -3.5), 4.0)
				var l := OmniLight3D.new()
				l.light_color = Color("ffbe6b")
				l.light_energy = 1.4
				l.omni_range = 4.5
				l.position = bulb.position
				add_child(l)
		"praia":
			for x in [-4.5, 4.2]:
				_cyl(0.04, 2.4, Color("e5e7eb"), Vector3(x, 1.2, -3.6))
				var top := _cyl(1.3, 0.35, Color("ef4444") if x < 0 else Color("3b82f6"), Vector3(x, 2.45, -3.6), 0.05)
				top.rotation_degrees.z = 6
			_box(Vector3(0.6, 0.35, 0.4), Color("38bdf8"), Vector3(3.2, 0.18, -3.0), 0.4)
			_sphere(0.18, Color("f8fafc"), Vector3(-3.4, 0.18, -2.6))
			_cyl(0.25, 0.02, Color("fde68a"), Vector3(-2.4, 0.01, -3.5))


func _fire_particles(at: Vector3) -> void:
	var p := GPUParticles3D.new()
	p.amount = 60
	p.lifetime = 0.9
	p.position = at
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3.UP
	pm.spread = 18.0
	pm.initial_velocity_min = 0.8
	pm.initial_velocity_max = 1.6
	pm.gravity = Vector3(0, 0.6, 0)
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	pm.emission_sphere_radius = 0.25
	pm.color = Color("ff9a3c")
	p.process_material = pm
	var s := SphereMesh.new()
	s.radius = 0.08
	s.height = 0.16
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color("ffb347")
	m.vertex_color_use_as_albedo = true
	m.emission_enabled = true
	m.emission = Color("ff7b22")
	m.emission_energy_multiplier = 3.0
	s.material = m
	p.draw_pass_1 = s
	add_child(p)


func _particles() -> void:
	var kind := String(_theme.particles)
	if kind == "none" or _quality() == 0:
		return
	var p := GPUParticles3D.new()
	p.amount = 80
	p.lifetime = 8.0
	p.position = Vector3(0, 3, -2)
	p.visibility_aabb = AABB(Vector3(-12, -4, -6), Vector3(24, 10, 12))
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(10, 3, 3)
	pm.gravity = Vector3(0.15, -0.08, 0) if kind != "sparks" else Vector3(0, 0.25, 0)
	pm.initial_velocity_min = 0.05
	pm.initial_velocity_max = 0.2
	p.process_material = pm
	var s := SphereMesh.new()
	s.radius = 0.02 if kind != "leaves" else 0.04
	s.height = s.radius * 2
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = {"dust": Color(1, 0.95, 0.85, 0.5), "leaves": Color("65a30d"), "sparks": Color("ffb347")}[kind]
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if kind == "sparks":
		m.emission_enabled = true
		m.emission = Color("ff8a3d")
		m.emission_energy_multiplier = 4.0
	s.material = m
	p.draw_pass_1 = s
	add_child(p)
