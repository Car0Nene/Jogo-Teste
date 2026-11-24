class_name Stage
extends Node3D
## Arena 3D de verdade: céu HDRI (Poly Haven, CC0), chão e paredes com materiais PBR,
## construções feitas por código, objetos 3D (Tripo + Poly Haven), luzes práticas,
## névoa de profundidade e partículas. Tudo descrito em LAYOUTS — fácil de ajustar.
##
## Coordenadas: a luta acontece em z = 0 (x de -7 a 7). Câmera em z > 0 olhando para -z.
## Objetos de fundo ficam em z < -2; objetos de canto (primeiro plano) em |x| > 8.

@export var stage_id: StringName = &"padaria"

const ENV := "res://assets/env/"

## Cada arena: céu, luz, chão, paredes/estruturas e lista de objetos.
## props: [modelo, posição, altura em metros (0 = tamanho real), rotação Y em graus]
const LAYOUTS := {
	&"padaria": {
		"hdri": "palermo_sidewalk", "sky_rot": 200.0, "sky_energy": 1.0,
		"sun": Color("ffe7c4"), "sun_rot": Vector3(-38, -32, 0), "sun_energy": 1.6,
		"fog": Color("f2d6b3"), "fog_density": 0.006, "exposure": 1.0,
		"floor": "checkered_pavement_tiles", "floor_tile": 0.9,
		"build": "padaria", "particles": "dust",
		"props": [
			["props/padaria_vitrine.glb", Vector3(-2.2, 0, -4.6), 1.25, 0],
			["props/padaria_pao.glb", Vector3(2.6, 0, -5.4), 2.0, 0],
			["props/padaria_cafe.glb", Vector3(5.2, 0, -4.9), 1.35, -10],
			["props/padaria_mesa.glb", Vector3(-6.0, 0, -4.6), 1.0, 15],
			["props/padaria_mesa.glb", Vector3(7.8, 0, -4.4), 1.0, -20],
			["models/CashRegister_01.glb", Vector3(-0.6, 1.02, -4.7), 0, 180],
			["models/potted_plant_02.glb", Vector3(-9.6, 0, -2.2), 0, 0],
			["models/potted_plant_02.glb", Vector3(8.0, 0, -5.8), 0, 40],
			["models/planter_box_01.glb", Vector3(-4.0, 0, -6.6), 0, 0],
			["models/street_lamp_01.glb", Vector3(-11.0, 0, -4.0), 0, 0],
			["models/street_lamp_01.glb", Vector3(11.0, 0, -4.0), 0, 0],
			["models/wicker_basket_01.glb", Vector3(4.0, 0, -4.4), 0, 0],
		],
	},
	&"quintal": {
		"hdri": "bloem_olive_house", "sky_rot": 120.0, "sky_energy": 1.0,
		"sun": Color("fff3dc"), "sun_rot": Vector3(-52, 28, 0), "sun_energy": 1.7,
		"fog": Color("d7e8d0"), "fog_density": 0.004, "exposure": 1.0,
		"floor": "sparse_grass", "floor_tile": 0.35, "patio": "brick_pavement",
		"build": "quintal", "particles": "leaves",
		"props": [
			["props/quintal_churrasqueira.glb", Vector3(-4.6, 0, -6.4), 2.4, 0],
			["props/quintal_mesa.glb", Vector3(2.2, 0, -5.0), 1.1, 10],
			["props/quintal_piscina.glb", Vector3(6.8, 0, -4.2), 0.55, 0],
			["props/quintal_varal.glb", Vector3(-1.2, 0, -8.6), 2.2, 0],
			["models/jacaranda_tree.glb", Vector3(9.0, 0, -11.0), 0, 0],
			["models/tree_small_02.glb", Vector3(-10.0, 0, -9.0), 0, 0],
			["models/garden_gnome.glb", Vector3(-8.2, 0, -2.4), 0, 30],
			["models/plastic_monobloc_chair_01.glb", Vector3(-9.6, 0, -0.4), 0, 60],
			["models/plastic_monobloc_chair_01.glb", Vector3(9.8, 0, -0.8), 0, -50],
			["models/potted_plant_04.glb", Vector3(4.6, 0, -7.4), 0, 0],
			["models/shrub_01.glb", Vector3(-7.2, 0, -8.0), 0, 0],
			["models/shrub_02.glb", Vector3(-12.0, 0, -6.0), 0, 0],
			["models/shrub_04.glb", Vector3(12.5, 0, -6.5), 0, 0],
			["models/watering_can_metal_01.glb", Vector3(-6.8, 0, -3.0), 0, 0],
			["models/plastic_crate_01.glb", Vector3(0.2, 0, -6.6), 0, 20],
			["models/propane_tank.glb", Vector3(-3.0, 0, -7.0), 0, 0],
		],
	},
	&"festa": {
		"hdri": "cobblestone_street_night", "sky_rot": 40.0, "sky_energy": 0.6, "night": true,
		"sun": Color("9db4ff"), "sun_rot": Vector3(-50, 30, 0), "sun_energy": 0.35,
		"fog": Color("1c1530"), "fog_density": 0.02, "exposure": 1.15,
		"floor": "brick_pavement", "floor_tile": 0.6,
		"build": "festa", "particles": "sparks",
		"props": [
			["props/festa_barraca.glb", Vector3(-5.6, 0, -6.2), 2.8, 10],
			["props/festa_barraca.glb", Vector3(5.8, 0, -6.6), 2.8, -15],
			["props/festa_fogueira.glb", Vector3(0.0, 0, -7.6), 1.4, 0],
			["props/festa_bolo.glb", Vector3(-9.8, 0, -2.0), 1.3, 30],
			["props/festa_baloes.glb", Vector3(10.4, 0, -3.0), 2.6, -30],
			["models/wooden_barrels_01.glb", Vector3(-2.8, 0, -6.8), 0, 0],
			["models/wooden_lantern_01.glb", Vector3(2.6, 0, -6.0), 0, 0],
		],
	},
	&"bar": {
		"hdri": "billiard_hall", "sky_rot": 0.0, "sky_energy": 0.5, "night": true, "indoor": true,
		"sun": Color("ffcf8a"), "sun_rot": Vector3(-60, -20, 0), "sun_energy": 0.25,
		"fog": Color("2a1a10"), "fog_density": 0.015, "exposure": 1.2,
		"floor": "old_wood_floor", "floor_tile": 0.5,
		"build": "bar", "particles": "dust",
		"props": [
			["props/bar_balcao.glb", Vector3(-3.2, 0, -5.4), 2.2, 0],
			["props/bar_sinuca.glb", Vector3(6.4, 0, -5.6), 0.9, 8],
			["props/bar_jukebox.glb", Vector3(8.6, 0, -6.2), 1.6, -20],
			["models/bar_chair_round_01.glb", Vector3(-5.2, 0, -3.9), 0, 0],
			["models/bar_chair_round_01.glb", Vector3(-3.4, 0, -3.8), 0, 30],
			["models/bar_chair_round_01.glb", Vector3(-1.6, 0, -3.9), 0, -20],
			["models/wine_barrel_01.glb", Vector3(-9.8, 0, -3.0), 0, 0],
			["models/wooden_barrels_01.glb", Vector3(-8.0, 0, -6.4), 0, 0],
			["models/dartboard.glb", Vector3(1.4, 1.8, -6.9), 0, 0],
			["models/Television_01.glb", Vector3(-6.6, 2.4, -6.8), 0, 0],
			["models/ceiling_fan.glb", Vector3(0.5, 4.6, -3.0), 0, 0],
			["models/caged_hanging_light.glb", Vector3(-3.2, 4.8, -4.6), 0, 0],
			["models/caged_hanging_light.glb", Vector3(4.2, 4.8, -4.4), 0, 0],
			["models/sofa_02.glb", Vector3(10.4, 0, -1.6), 0, -90],
			["models/wine_bottles_01.glb", Vector3(-9.8, 0.95, -3.0), 0, 0],
		],
	},
	&"praia": {
		"hdri": "secluded_beach", "sky_rot": 250.0, "sky_energy": 1.05,
		"sun": Color("fff4dc"), "sun_rot": Vector3(-58, 38, 0), "sun_energy": 1.9,
		"fog": Color("d6ecff"), "fog_density": 0.003, "exposure": 0.95,
		"floor": "coast_sand_01", "floor_tile": 0.3, "boardwalk": "weathered_planks",
		"build": "praia", "particles": "none",
		"props": [
			["props/praia_quiosque.glb", Vector3(-5.8, 0, -7.4), 3.2, 15],
			["props/praia_vigia.glb", Vector3(6.8, 0, -9.0), 4.2, -20],
			["props/praia_guardasol.glb", Vector3(1.8, 0, -5.6), 2.4, 0],
			["props/praia_natal.glb", Vector3(10.2, 0, -3.4), 3.0, 0],
			["models/island_tree_01.glb", Vector3(-11.0, 0, -6.0), 0, 0],
			["models/island_tree_02.glb", Vector3(-2.6, 0, -11.5), 0, 60],
			["models/island_tree_03.glb", Vector3(12.0, 0, -10.0), 0, 0],
			["models/lifebuoy.glb", Vector3(5.6, 0.0, -7.6), 0, 0],
			["models/lambis_shell.glb", Vector3(-3.6, 0, -2.6), 0, 40],
			["models/folding_wooden_stool.glb", Vector3(-4.0, 0, -5.8), 0, 20],
		],
	},
}

var L: Dictionary
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.seed = hash(stage_id)
	L = LAYOUTS.get(stage_id, LAYOUTS[&"padaria"])
	var room: Array = {&"padaria": [0.35, 0.12], &"bar": [0.55, 0.22], &"festa": [0.3, 0.08],
		&"quintal": [0.2, 0.06], &"praia": [0.12, 0.04]}.get(stage_id, [0.3, 0.1])
	Audio.set_room(room[0], room[1])
	_environment()
	_floor()
	match String(L.build):
		"padaria": _build_padaria()
		"quintal": _build_quintal()
		"festa": _build_festa()
		"bar": _build_bar()
		"praia": _build_praia()
	for p in L.props:
		_prop(p[0], p[1], p[2], p[3])
	_particles()


func _quality() -> int:
	return int(Settings.get_value("video", "quality"))


# ------------------------------------------------------------------ céu e luz
func _environment() -> void:
	var env := Environment.new()
	var hdri_path := ENV + "hdri/%s.hdr" % L.hdri
	if ResourceLoader.exists(hdri_path):
		var sky := Sky.new()
		var pano := PanoramaSkyMaterial.new()
		pano.panorama = load(hdri_path)
		pano.energy_multiplier = L.get("sky_energy", 1.0)
		sky.sky_material = pano
		sky.radiance_size = Sky.RADIANCE_SIZE_128
		env.background_mode = Environment.BG_SKY
		env.sky = sky
		env.sky_rotation = Vector3(0, deg_to_rad(L.get("sky_rot", 0.0)), 0)
		env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
		env.ambient_light_sky_contribution = 0.85
		env.ambient_light_energy = 0.9 if not L.get("night", false) else 0.6
		env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	else:
		env.background_mode = Environment.BG_COLOR
		env.background_color = L.fog
		env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
		env.ambient_light_color = L.fog
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = L.get("exposure", 1.0)
	env.tonemap_white = 6.0
	env.glow_enabled = _quality() >= 1
	env.glow_intensity = 0.55 if not L.get("night", false) else 0.9
	env.glow_bloom = 0.05 if not L.get("night", false) else 0.12
	env.glow_hdr_threshold = 1.1
	env.ssao_enabled = _quality() >= 2
	env.ssao_radius = 0.8
	env.ssao_intensity = 1.4
	env.fog_enabled = true
	env.fog_light_color = L.fog
	env.fog_density = L.get("fog_density", 0.008)
	env.fog_sky_affect = 0.15
	env.fog_aerial_perspective = 0.4
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.06
	env.adjustment_contrast = 1.04
	var we := WorldEnvironment.new()
	we.add_to_group("world_env")
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.light_color = L.sun
	sun.light_energy = L.get("sun_energy", 1.4)
	sun.rotation_degrees = L.sun_rot
	sun.shadow_enabled = _quality() >= 1
	sun.shadow_blur = 1.2
	sun.directional_shadow_max_distance = 26.0
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	add_child(sun)
	# luz de recorte (rim) atrás dos lutadores: separa os personagens do fundo
	var rim := DirectionalLight3D.new()
	rim.light_color = Color("cfe3ff") if not L.get("night", false) else Color("ff9d5c")
	rim.light_energy = 0.55
	rim.rotation_degrees = Vector3(-20, 180, 0)
	add_child(rim)


# ------------------------------------------------------------------ materiais
func _pbr(id: String, tile: float, tint := Color.WHITE) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	var base := ENV + "textures/%s/%s_" % [id, id]
	if ResourceLoader.exists(base + "Diffuse.jpg"):
		m.albedo_texture = load(base + "Diffuse.jpg")
	if ResourceLoader.exists(base + "nor_gl.jpg"):
		m.normal_enabled = true
		m.normal_texture = load(base + "nor_gl.jpg")
		m.normal_scale = 1.0
	if ResourceLoader.exists(base + "Rough.jpg"):
		m.roughness_texture = load(base + "Rough.jpg")
		m.roughness = 1.0
	m.albedo_color = tint
	m.uv1_triplanar = true
	m.uv1_world_triplanar = true
	m.uv1_scale = Vector3.ONE * tile
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	return m


func _solid(c: Color, rough := 0.7, emit := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	if emit > 0.0:
		m.emission_enabled = true
		m.emission = c
		m.emission_energy_multiplier = emit
	return m


func _box(size: Vector3, at: Vector3, mat: Material, shadow := true) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = at
	if not shadow:
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)
	return mi


func _floor() -> void:
	var pm := PlaneMesh.new()
	pm.size = Vector2(90, 60)
	var mi := MeshInstance3D.new()
	mi.mesh = pm
	mi.material_override = _pbr(L.floor, L.get("floor_tile", 0.5))
	mi.position = Vector3(0, 0, -10)
	add_child(mi)
	if L.has("patio"):
		var p := _box(Vector3(30, 0.04, 5.0), Vector3(0, 0.01, 0.6), _pbr(L.patio, 0.6))
		p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if L.has("boardwalk"):
		var b := _box(Vector3(60, 0.06, 2.6), Vector3(0, 0.02, -3.2), _pbr(L.boardwalk, 0.45))
		b.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF


# ------------------------------------------------------------------ objetos 3D
## Carrega um modelo, ajusta a altura (se pedida), apoia no chão e posiciona.
func _prop(path: String, at: Vector3, height: float, rot_y: float) -> Node3D:
	var full := ENV + path
	if not ResourceLoader.exists(full):
		return null
	var ps: PackedScene = load(full)
	if ps == null:
		return null
	var n := ps.instantiate() as Node3D
	var holder := Node3D.new()
	add_child(holder)
	holder.add_child(n)
	var box := _aabb(n)
	if height > 0.0 and box.size.y > 0.001:
		n.scale = Vector3.ONE * (height / box.size.y)
		box = _aabb(n)
	n.position = Vector3(-(box.position.x + box.size.x * 0.5), -box.position.y, -(box.position.z + box.size.z * 0.5))
	holder.position = at
	holder.rotation_degrees.y = rot_y
	for mi in n.find_children("*", "MeshInstance3D", true, false):
		(mi as MeshInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	return holder


func _aabb(n: Node3D) -> AABB:
	var out := AABB()
	var first := true
	for mi in n.find_children("*", "MeshInstance3D", true, false):
		var m := mi as MeshInstance3D
		if m.mesh == null:
			continue
		var xf := _rel_xform(m, n)
		var b := xf * m.mesh.get_aabb()
		out = b if first else out.merge(b)
		first = false
	return out


func _rel_xform(node: Node3D, root: Node3D) -> Transform3D:
	var xf := Transform3D.IDENTITY
	var cur: Node = node
	while cur and cur != root.get_parent():
		if cur is Node3D:
			xf = (cur as Node3D).transform * xf
		cur = cur.get_parent()
	return xf


func _lamp(at: Vector3, color: Color, energy: float, range_m: float, bulb := true) -> OmniLight3D:
	var l := OmniLight3D.new()
	l.light_color = color
	l.light_energy = energy
	l.omni_range = range_m
	l.position = at
	l.shadow_enabled = false
	add_child(l)
	if bulb:
		var s := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.06
		sm.height = 0.12
		s.mesh = sm
		s.material_override = _solid(color, 0.3, 6.0)
		s.position = at
		s.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(s)
	return l


## Varal de lâmpadas/bandeirinhas: catenária entre dois pontos.
func _string(a: Vector3, b: Vector3, sag: float, count: int, colors: Array, flags := false) -> void:
	var path := PackedVector3Array()
	for i in count + 1:
		var t := float(i) / count
		var p := a.lerp(b, t)
		p.y -= sag * 4.0 * t * (1.0 - t)
		path.append(p)
	# fio
	for i in count:
		var seg := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.008
		cm.bottom_radius = 0.008
		var d := path[i + 1] - path[i]
		cm.height = d.length()
		seg.mesh = cm
		seg.material_override = _solid(Color("222222"))
		seg.position = (path[i] + path[i + 1]) * 0.5
		seg.look_at_from_position(seg.position, path[i + 1], Vector3.UP if absf(d.normalized().y) < 0.99 else Vector3.RIGHT)
		seg.rotate_object_local(Vector3.RIGHT, PI * 0.5)
		seg.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(seg)
	for i in range(1, count):
		var c: Color = colors[i % colors.size()]
		if flags:
			var f := MeshInstance3D.new()
			var pm := PrismMesh.new()
			pm.size = Vector3(0.28, 0.34, 0.01)
			f.mesh = pm
			var fm := _solid(c, 0.8)
			fm.cull_mode = BaseMaterial3D.CULL_DISABLED
			f.material_override = fm
			f.position = path[i] - Vector3(0, 0.18, 0)
			f.rotation_degrees.z = 180
			f.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_child(f)
		else:
			var s := MeshInstance3D.new()
			var sm := SphereMesh.new()
			sm.radius = 0.05
			sm.height = 0.1
			s.mesh = sm
			s.material_override = _solid(c, 0.2, 5.0)
			s.position = path[i] - Vector3(0, 0.06, 0)
			s.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_child(s)
			if i % 4 == 0 and _quality() >= 1:
				_lamp(s.position, c, 0.6, 3.0, false)


# ------------------------------------------------------------------ construções
func _build_padaria() -> void:
	var wall := _pbr("painted_plaster_wall", 0.5, Color("fbe3c6"))
	var wood := _pbr("dark_wooden_planks", 0.7)
	# fachada da padaria ao fundo (parede com vitrines e porta)
	_box(Vector3(30, 6.5, 0.4), Vector3(0, 3.25, -7.6), wall)
	_box(Vector3(30, 0.7, 0.5), Vector3(0, 0.35, -7.35), wood)              # rodapé de madeira
	var interior := _solid(Color("8a5a34"), 0.9, 0.35)
	for x in [-6.0, 6.0]:
		_box(Vector3(5.0, 2.2, 0.05), Vector3(x, 1.85, -7.37), interior)       # interior escuro
		_box(Vector3(5.0, 2.2, 0.06), Vector3(x, 1.85, -7.33), _glass())         # vitrine
		_box(Vector3(5.3, 0.14, 0.25), Vector3(x, 3.0, -7.3), wood)
		_box(Vector3(5.3, 0.14, 0.35), Vector3(x, 0.72, -7.25), wood)
		_lamp(Vector3(x, 2.4, -7.6), Color("ffcf8a"), 0.9, 3.0, false)
	_box(Vector3(2.0, 2.8, 0.05), Vector3(0, 1.4, -7.37), interior)
	_box(Vector3(2.0, 2.8, 0.06), Vector3(0, 1.4, -7.33), _glass())             # porta de vidro
	# toldo listrado
	for i in 16:
		var stripe := _box(Vector3(1.0, 0.06, 1.6), Vector3(-7.5 + i * 1.0, 3.3, -6.8),
			_solid(Color("e8473f") if i % 2 == 0 else Color("fff3e0"), 0.8))
		stripe.rotation_degrees.x = 18
	# letreiro neon
	var sign := Label3D.new()
	sign.text = "PADARIA DA JUJU"
	sign.font_size = 160
	sign.outline_size = 24
	sign.modulate = Color("ffe08a")
	sign.outline_modulate = Color("8a3b12")
	sign.position = Vector3(0, 3.62, -7.35)
	sign.pixel_size = 0.0045
	add_child(sign)
	_lamp(Vector3(0, 4.1, -6.4), Color("ffd79a"), 1.4, 7.0, false)
	# calçada da frente e meio-fio
	_box(Vector3(60, 0.12, 0.3), Vector3(0, 0.06, 4.0), _solid(Color("b9b2a8"), 0.9), false)
	_lamp(Vector3(-11.0, 4.2, -4.0), Color("ffcf8a"), 1.2, 6.0)
	_lamp(Vector3(11.0, 4.2, -4.0), Color("ffcf8a"), 1.2, 6.0)


func _build_quintal() -> void:
	var brick := _pbr("red_brick_plaster_patch_02", 0.45)
	var roof := _pbr("clay_roof_tiles", 0.7)
	# muro dos fundos
	_box(Vector3(40, 2.3, 0.3), Vector3(0, 1.15, -10.0), brick)
	_box(Vector3(40, 0.12, 0.42), Vector3(0, 2.36, -10.0), _solid(Color("d9cfc1"), 0.9))
	# casa à esquerda com telhado e janela
	var house := _pbr("painted_plaster_wall", 0.4, Color("f6e7c8"))
	_box(Vector3(8, 3.6, 6), Vector3(-15.5, 1.8, -6.0), house)
	var r1 := _box(Vector3(9, 0.25, 3.6), Vector3(-15.5, 4.1, -7.4), roof)
	r1.rotation_degrees.x = -24
	var r2 := _box(Vector3(9, 0.25, 3.6), Vector3(-15.5, 4.1, -4.6), roof)
	r2.rotation_degrees.x = 24
	_box(Vector3(0.08, 1.2, 1.6), Vector3(-11.45, 1.8, -5.0), _glass())
	# área coberta da churrasqueira
	var wood := _pbr("dark_wooden_planks", 0.6)
	for x in [-7.5, -1.8]:
		_box(Vector3(0.2, 3.0, 0.2), Vector3(x, 1.5, -5.0), wood)
	var cover := _box(Vector3(6.5, 0.12, 3.4), Vector3(-4.65, 3.05, -6.4), roof)
	cover.rotation_degrees.x = -6
	# varal de lâmpadas
	_string(Vector3(-12, 3.2, -4.5), Vector3(12, 3.2, -4.5), 0.6, 24, [Color("ffd27a")])


func _build_festa() -> void:
	# bandeirinhas cruzando a arena
	var cols := [Color("ef4444"), Color("f59e0b"), Color("22c55e"), Color("3b82f6"), Color("a855f7"), Color("ec4899")]
	_string(Vector3(-13, 4.6, -9), Vector3(13, 4.6, -9), 0.9, 30, cols, true)
	_string(Vector3(-12, 4.2, -5), Vector3(12, 4.2, -5), 0.8, 28, cols, true)
	_string(Vector3(-12, 4.4, -2), Vector3(12, 4.4, -2), 0.7, 26, cols, true)
	_string(Vector3(-12, 3.9, -6.5), Vector3(12, 3.9, -6.5), 0.6, 26, [Color("ffd27a"), Color("ff9d5c")])
	# mastros
	for x in [-12.5, 12.5]:
		_box(Vector3(0.18, 5.2, 0.18), Vector3(x, 2.6, -5), _pbr("dark_wooden_planks", 0.6))
	# fogueira acesa
	_fire_particles(Vector3(0, 0.5, -7.6))
	var fire := _lamp(Vector3(0, 1.2, -7.4), Color("ff8a3d"), 3.5, 9.0, false)
	var tw := create_tween().set_loops()
	tw.tween_property(fire, "light_energy", 2.6, 0.18)
	tw.tween_property(fire, "light_energy", 3.8, 0.22)
	# barracas iluminadas
	_lamp(Vector3(-5.6, 2.4, -5.4), Color("ffcf8a"), 1.6, 5.0)
	_lamp(Vector3(5.8, 2.4, -5.8), Color("ffcf8a"), 1.6, 5.0)


func _build_bar() -> void:
	var brick := _pbr("brick_wall_02", 0.45, Color("d9b8a0"))
	var wood := _pbr("dark_wooden_planks", 0.55)
	_box(Vector3(30, 5.5, 0.4), Vector3(0, 2.75, -7.2), brick)                # parede do fundo
	_box(Vector3(0.4, 5.5, 14), Vector3(-13.0, 2.75, -1.0), brick)            # paredes laterais
	_box(Vector3(0.4, 5.5, 14), Vector3(13.0, 2.75, -1.0), brick)
	_box(Vector3(30, 0.3, 14), Vector3(0, 5.6, -1.0), wood, false)             # teto
	_box(Vector3(30, 1.1, 0.12), Vector3(0, 0.55, -6.95), wood)                # lambri
	# letreiros neon
	for s in [["BAR DA SIMONE", Vector3(-3.2, 3.05, -6.95), Color("ff4fd8")], ["CERVEJA GELADA", Vector3(6.4, 2.6, -6.95), Color("4fd1ff")]]:
		var l := Label3D.new()
		l.text = s[0]
		l.font_size = 120
		l.pixel_size = 0.0042
		l.modulate = (s[2] as Color) * 2.2
		l.outline_size = 0
		l.position = s[1]
		add_child(l)
		_lamp(s[1] + Vector3(0, 0, 0.6), s[2], 1.6, 5.0, false)
	_lamp(Vector3(-3.2, 4.2, -4.6), Color("ffc477"), 2.2, 7.0, false)
	_lamp(Vector3(4.2, 4.2, -4.4), Color("ffc477"), 2.2, 7.0, false)
	_lamp(Vector3(0, 4.5, 1.0), Color("ffd9a8"), 1.5, 9.0, false)


func _build_praia() -> void:
	# calçadão de pedras portuguesas (faixa ondulada) e mureta
	var m := _solid(Color("efe8dc"), 0.85)
	_box(Vector3(60, 0.5, 0.4), Vector3(0, 0.25, -4.7), m)
	for i in 30:
		var w := _box(Vector3(1.2, 0.02, 0.18), Vector3(-29 + i * 2.0, 0.07, -3.2 + sin(i * 0.9) * 0.4), _solid(Color("2b2b2b"), 0.9), false)
		w.rotation_degrees.y = 25.0 * sin(i * 0.9)
	# varal de luzes de Natal no quiosque
	_string(Vector3(-9, 3.4, -6.5), Vector3(-2, 3.0, -6.0), 0.4, 14, [Color("ef4444"), Color("22c55e"), Color("fbbf24")])


func _glass() -> StandardMaterial3D:
	var g := StandardMaterial3D.new()
	g.albedo_color = Color(0.75, 0.85, 0.9, 0.18)
	g.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	g.metallic = 0.6
	g.roughness = 0.05
	return g


# ------------------------------------------------------------------ partículas
func _fire_particles(at: Vector3) -> void:
	var p := GPUParticles3D.new()
	p.amount = 90
	p.lifetime = 0.9
	p.position = at
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3.UP
	pm.spread = 14.0
	pm.initial_velocity_min = 1.0
	pm.initial_velocity_max = 2.0
	pm.gravity = Vector3(0, 0.8, 0)
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	pm.emission_sphere_radius = 0.35
	pm.scale_min = 0.7
	pm.scale_max = 1.3
	var ct := CurveTexture.new()
	ct.curve = Curve.new()
	ct.curve.add_point(Vector2(0, 0.6))
	ct.curve.add_point(Vector2(0.3, 1))
	ct.curve.add_point(Vector2(1, 0))
	pm.scale_curve = ct
	var g := Gradient.new()
	g.set_color(0, Color(1.0, 0.85, 0.4, 1))
	g.set_color(1, Color(1.0, 0.25, 0.05, 0))
	var gt := GradientTexture1D.new()
	gt.gradient = g
	pm.color_ramp = gt
	p.process_material = pm
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	mat.vertex_color_use_as_albedo = true
	mat.albedo_texture = Vfx.tex(&"flame")
	mat.albedo_color = Color(2.5, 2.0, 1.6)
	var q := QuadMesh.new()
	q.size = Vector2(0.7, 0.9)
	q.material = mat
	p.draw_pass_1 = q
	add_child(p)


func _particles() -> void:
	var kind := String(L.get("particles", "none"))
	if kind == "none" or _quality() == 0:
		return
	var p := GPUParticles3D.new()
	p.amount = 90
	p.lifetime = 8.0
	p.position = Vector3(0, 3, -2)
	p.visibility_aabb = AABB(Vector3(-14, -4, -8), Vector3(28, 10, 14))
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(12, 3, 4)
	pm.gravity = Vector3(0.15, -0.08, 0) if kind != "sparks" else Vector3(0, 0.3, 0)
	pm.initial_velocity_min = 0.05
	pm.initial_velocity_max = 0.2
	p.process_material = pm
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.albedo_texture = Vfx.tex(&"soft")
	var col: Color = {"dust": Color(1, 0.95, 0.85, 0.35), "leaves": Color(0.45, 0.65, 0.15, 0.9), "sparks": Color(2.5, 1.3, 0.4, 1)}[kind]
	m.albedo_color = col
	if kind == "sparks":
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	var q := QuadMesh.new()
	q.size = Vector2.ONE * (0.06 if kind != "leaves" else 0.1)
	q.material = m
	p.draw_pass_1 = q
	add_child(p)
