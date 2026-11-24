class_name Vfx
extends Node3D
## Efeitos visuais da luta: faíscas de impacto, anel de choque, poeira, aura de especial.
## OTIMIZADO: Object pooling para hit(), material cache, texturas cacheadas.

static var _tex := {}
static var _mat_cache := {}
static var _hit_pool: Array[Vfx] = []
const HIT_POOL_SIZE := 8  # Pré-aloca 8 hit effects


# ------------------------------------------------------------------ texturas
static func tex(kind: StringName) -> Texture2D:
	if _tex.has(kind):
		return _tex[kind]
	var n := 128
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	var c := Vector2(n, n) * 0.5
	for y in n:
		for x in n:
			var d := Vector2(x + 0.5, y + 0.5) - c
			var r := d.length() / (n * 0.5)
			var a := 0.0
			match kind:
				&"soft":
					a = pow(clampf(1.0 - r, 0.0, 1.0), 2.0)
				&"ring":
					a = pow(clampf(1.0 - absf(r - 0.78) / 0.14, 0.0, 1.0), 1.5)
				&"star":
					var ang := atan2(d.y, d.x)
					var spikes := pow(absf(cos(ang * 4.0)), 18.0) * 0.85 + pow(absf(cos(ang * 4.0 + PI / 4.0)), 30.0) * 0.45
					var core := pow(clampf(1.0 - r * 3.2, 0.0, 1.0), 1.4)
					a = clampf(core + spikes * pow(clampf(1.0 - r, 0.0, 1.0), 1.6), 0.0, 1.0)
				&"flame":
					var tall := Vector2(d.x * 1.8, d.y + n * 0.12).length() / (n * 0.5)
					a = pow(clampf(1.0 - tall, 0.0, 1.0), 1.6)
			img.set_pixel(x, y, Color(1, 1, 1, a))
	var t := ImageTexture.create_from_image(img)
	_tex[kind] = t
	return t


# ------------------------------------------------------------------ material cache
static func _billboard_mat(kind: StringName, color: Color, energy := 3.0) -> StandardMaterial3D:
	var cache_key := "%s_%.2f_%.2f_%.2f_%.2f" % [kind, color.r, color.g, color.b, energy]
	if _mat_cache.has(cache_key):
		return _mat_cache[cache_key]
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	m.albedo_texture = tex(kind)
	m.albedo_color = Color(color.r * energy, color.g * energy, color.b * energy, 1.0)
	m.vertex_color_use_as_albedo = true
	m.disable_receive_shadows = true
	m.no_depth_test = false
	_mat_cache[cache_key] = m
	if _mat_cache.size() > 128:  # Limpar cache se ficar muito grande
		var keys = _mat_cache.keys()
		_mat_cache.erase(keys[0])
	return m


static func _quad(size: float, mat: Material) -> QuadMesh:
	var q := QuadMesh.new()
	q.size = Vector2.ONE * size
	q.material = mat
	return q


static func _fade_curve(peak := 0.15) -> CurveTexture:
	var ct := CurveTexture.new()
	ct.curve = Curve.new()
	ct.curve.add_point(Vector2(0, 0.4))
	ct.curve.add_point(Vector2(peak, 1))
	ct.curve.add_point(Vector2(1, 0))
	return ct


static func _alpha_ramp() -> GradientTexture1D:
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	var gt := GradientTexture1D.new()
	gt.gradient = g
	return gt


static func _init_hit_pool() -> void:
	if _hit_pool.size() >= HIT_POOL_SIZE:
		return
	for i in range(HIT_POOL_SIZE - _hit_pool.size()):
		var vfx := Vfx.new()
		_hit_pool.append(vfx)


# ------------------------------------------------------------------ impacto (pooled)
static func hit(parent: Node, at: Vector3, color: Color, heavy: bool, dir := 1) -> void:
	_init_hit_pool()
	var fx: Vfx
	if _hit_pool.size() > 0:
		fx = _hit_pool.pop_back()
		if fx.is_inside_tree():
			fx.get_parent().remove_child(fx)
	else:
		fx = Vfx.new()
	parent.add_child(fx)
	fx.global_position = at
	fx._build_hit(color, heavy, dir)


func _build_hit(color: Color, heavy: bool, dir: int) -> void:
	# Limpa filhos anteriores se reutilizando
	for child in get_children():
		child.queue_free()
	
	var s := 1.0 if not heavy else 1.7
	# estrela central
	var star := MeshInstance3D.new()
	var sm := _billboard_mat(&"star", color.lerp(Color.WHITE, 0.45), 2.5)
	star.mesh = _quad(0.55 * s, sm)
	star.rotation.z = randf() * TAU
	add_child(star)
	# anel de choque
	var ring := MeshInstance3D.new()
	var rm := _billboard_mat(&"ring", color, 2.0)
	ring.mesh = _quad(0.4 * s, rm)
	add_child(ring)
	# fagulhas direcionais (esticadas na velocidade)
	var p := GPUParticles3D.new()
	p.one_shot = true
	p.explosiveness = 1.0
	p.amount = 34 if heavy else 18
	p.lifetime = 0.32
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(dir, 0.25, 0.4)
	pm.spread = 75.0
	pm.initial_velocity_min = 4.0
	pm.initial_velocity_max = 10.0 if heavy else 7.0
	pm.gravity = Vector3(0, -9, 0)
	pm.damping_min = 6.0
	pm.damping_max = 12.0
	pm.scale_curve = _fade_curve(0.05)
	pm.particle_flag_align_y = true
	p.process_material = pm
	var spark := BoxMesh.new()
	spark.size = Vector3(0.02, 0.22 if heavy else 0.16, 0.02)
	var spm := StandardMaterial3D.new()
	spm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	spm.albedo_color = color.lerp(Color.WHITE, 0.3)
	spm.emission_enabled = true
	spm.emission = color
	spm.emission_energy_multiplier = 8.0
	spark.material = spm
	p.draw_pass_1 = spark
	add_child(p)
	p.emitting = true
	if heavy:
		_puffs(color.darkened(0.2), 6, 0.5, 1.5)
	var light := OmniLight3D.new()
	light.light_color = color
	light.light_energy = 4.0 if heavy else 2.0
	light.omni_range = 3.0
	add_child(light)
	var tw := create_tween().set_parallel(true)
	star.scale = Vector3.ONE * 0.4
	tw.tween_property(star, "scale", Vector3.ONE * 1.25, 0.07).set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	tw.tween_property(sm, "albedo_color:a", 0.0, 0.16).set_delay(0.05)
	tw.tween_property(ring, "scale", Vector3.ONE * (3.2 if heavy else 2.4), 0.22).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(rm, "albedo_color:a", 0.0, 0.22)
	tw.tween_property(light, "light_energy", 0.0, 0.25)
	tw.chain().tween_interval(0.5)
	tw.chain().tween_callback(func():
		if is_inside_tree():
			get_parent().remove_child(self)
			_hit_pool.append(self)
	)



func _puffs(color: Color, amount: int, size: float, speed: float) -> void:
	var p := GPUParticles3D.new()
	p.one_shot = true
	p.explosiveness = 0.9
	p.amount = amount
	p.lifetime = 0.7
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(0, 1, 0)
	pm.spread = 80.0
	pm.initial_velocity_min = speed * 0.4
	pm.initial_velocity_max = speed
	pm.gravity = Vector3(0, 0.6, 0)
	pm.damping_min = 2.0
	pm.damping_max = 3.0
	pm.scale_min = 0.6
	pm.scale_max = 1.2
	var ct := CurveTexture.new()
	ct.curve = Curve.new()
	ct.curve.add_point(Vector2(0, 0.5))
	ct.curve.add_point(Vector2(1, 1.6))
	pm.scale_curve = ct
	pm.color_ramp = _alpha_ramp()
	p.process_material = pm
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	m.vertex_color_use_as_albedo = true
	m.albedo_texture = tex(&"soft")
	m.albedo_color = Color(color, 0.55)
	p.draw_pass_1 = _quad(size, m)
	add_child(p)
	p.emitting = true


# ------------------------------------------------------------------ poeira
static func dust(parent: Node, at: Vector3, big := false) -> void:
	var fx := Vfx.new()
	parent.add_child(fx)
	fx.global_position = at
	fx._puffs(Color("d8c3a5"), 14 if big else 7, 0.6 if big else 0.4, 2.2 if big else 1.2)
	fx.get_tree().create_timer(1.2).timeout.connect(fx.queue_free)


# ------------------------------------------------------------------ aura
## Aura de energia presa ao lutador (chamas subindo + luz). Some sozinha após `duration`.
static func aura(target: Node3D, color: Color, duration: float, height := 1.7) -> Node3D:
	var fx := Vfx.new()
	target.add_child(fx)
	fx._build_aura(color, duration, height)
	return fx


func _build_aura(color: Color, duration: float, height: float) -> void:
	var p := GPUParticles3D.new()
	p.amount = 60
	p.lifetime = 0.7
	p.local_coords = false
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(0.28, height * 0.45, 0.2)
	pm.direction = Vector3(0, 1, 0)
	pm.spread = 8.0
	pm.initial_velocity_min = 1.2
	pm.initial_velocity_max = 2.4
	pm.gravity = Vector3.ZERO
	pm.scale_min = 0.6
	pm.scale_max = 1.1
	pm.scale_curve = _fade_curve(0.3)
	pm.color_ramp = _alpha_ramp()
	p.process_material = pm
	p.position.y = height * 0.5
	var m := _billboard_mat(&"flame", color, 1.6)
	m.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	p.draw_pass_1 = _quad(0.45, m)
	add_child(p)
	var light := OmniLight3D.new()
	light.light_color = color
	light.light_energy = 2.2
	light.omni_range = 2.6
	light.position.y = height * 0.6
	add_child(light)
	var tw := create_tween()
	tw.tween_interval(maxf(0.1, duration - 0.4))
	tw.tween_callback(func(): p.emitting = false)
	tw.tween_property(light, "light_energy", 0.0, 0.4)
	tw.tween_interval(0.5)
	tw.tween_callback(queue_free)
