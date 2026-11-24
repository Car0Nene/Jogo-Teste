class_name Projectile
extends Node3D
## Golpe à distância (bolo, bola, energia, notas, leite, pratos, fumaça, onda).

var owner_fighter: Fighter
var move: MoveData
var dir := 1
var life := 3.0
var hits_left := 1
var _cool := 0
var _visual: Node3D


func setup(f: Fighter, m: MoveData) -> void:
	owner_fighter = f
	move = m
	dir = f.facing
	hits_left = m.projectile_hits
	var h := f.model.height_scale / 1.7
	var y := 1.05 * h
	if m.projectile_kind in [&"wave"]: y = 0.12
	if m.projectile_kind == &"ball": y = 0.25
	position = Vector3(f.pos.x + dir * 0.55 * h, f.pos.y + y, 0.0)
	_visual = _build(m.projectile_kind, m.projectile_color)
	add_child(_visual)


func _physics_process(dt: float) -> void:
	position.x += dir * move.projectile_speed * dt
	life -= dt
	_cool = maxi(0, _cool - 1)
	_animate(dt)
	if life <= 0.0 or absf(position.x) > Fighter.STAGE_HALF + 2.0:
		queue_free()
		return
	var target := owner_fighter.opponent
	if target == null or _cool > 0:
		return
	var r := 0.35 if move.projectile_kind != &"smoke" else 0.6
	if target.hurt_test(Vector2(position.x, position.y), r):
		target.take_hit(owner_fighter, move, position)
		hits_left -= 1
		_cool = 10
		if hits_left <= 0:
			queue_free()


func _animate(dt: float) -> void:
	match move.projectile_kind:
		&"cake", &"plates", &"ball": _visual.rotate_z(-dir * 9.0 * dt)
		&"smoke": _visual.scale = _visual.scale.lerp(Vector3.ONE * 1.8, dt * 0.8)
		&"notes": _visual.position.y = sin(Time.get_ticks_msec() * 0.01) * 0.15
		_: _visual.rotate_y(6.0 * dt)


func _mat(c: Color, emit := 0.0, alpha := 1.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(c, alpha)
	m.roughness = 0.55
	if alpha < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if emit > 0.0:
		m.emission_enabled = true
		m.emission = c
		m.emission_energy_multiplier = emit
	return m


func _mesh(mesh: Mesh, mat: Material, at := Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = at
	return mi


func _build(kind: StringName, c: Color) -> Node3D:
	var n := Node3D.new()
	match kind:
		&"cake":
			for i in 3:
				var cy := CylinderMesh.new()
				cy.top_radius = 0.26 - i * 0.06
				cy.bottom_radius = cy.top_radius
				cy.height = 0.13
				n.add_child(_mesh(cy, _mat(Color("f5d0a9") if i % 2 == 0 else Color("7c3f1d")), Vector3(0, -0.1 + i * 0.13, 0)))
			var cherry := SphereMesh.new()
			cherry.radius = 0.05
			cherry.height = 0.1
			n.add_child(_mesh(cherry, _mat(Color("dc2626"), 0.4), Vector3(0, 0.33, 0)))
			n.rotation_degrees.x = 90
		&"ball":
			var s := SphereMesh.new()
			s.radius = 0.16
			s.height = 0.32
			var m := _mat(Color.WHITE)
			n.add_child(_mesh(s, m))
			var ring := TorusMesh.new()
			ring.inner_radius = 0.15
			ring.outer_radius = 0.17
			n.add_child(_mesh(ring, _mat(c)))
			n.add_child(_trail(c, 0.12))
		&"plates":
			for i in 3:
				var cy := CylinderMesh.new()
				cy.top_radius = 0.22
				cy.bottom_radius = 0.16
				cy.height = 0.03
				var p := _mesh(cy, _mat(Color("f8fafc")), Vector3(-i * 0.45 * dir, sin(i) * 0.2, 0))
				p.rotation_degrees.x = 90
				n.add_child(p)
				var food := SphereMesh.new()
				food.radius = 0.1
				food.height = 0.1
				n.add_child(_mesh(food, _mat(c), p.position + Vector3(0, 0, 0.03)))
		&"smoke":
			for i in 6:
				var s := SphereMesh.new()
				s.radius = randf_range(0.2, 0.35)
				s.height = s.radius * 2
				n.add_child(_mesh(s, _mat(c, 0.0, 0.55), Vector3(randf_range(-0.3, 0.3), randf_range(-0.2, 0.3), randf_range(-0.2, 0.2))))
		&"wave":
			var b := BoxMesh.new()
			b.size = Vector3(0.9, 0.22, 0.6)
			n.add_child(_mesh(b, _mat(c, 1.2, 0.7)))
			n.add_child(_trail(c, 0.25))
		&"notes":
			for i in 3:
				var s := SphereMesh.new()
				s.radius = 0.08
				s.height = 0.16
				n.add_child(_mesh(s, _mat(c, 2.0), Vector3(-i * 0.3 * dir, i * 0.12, 0)))
				var st := CylinderMesh.new()
				st.top_radius = 0.015
				st.bottom_radius = 0.015
				st.height = 0.22
				n.add_child(_mesh(st, _mat(c, 2.0), Vector3(-i * 0.3 * dir + 0.07, i * 0.12 + 0.11, 0)))
			n.add_child(_trail(c, 0.1))
		&"milk":
			var cy := CapsuleMesh.new()
			cy.radius = 0.09
			cy.height = 0.7
			var m := _mesh(cy, _mat(Color.WHITE, 0.6))
			m.rotation_degrees.z = 90
			n.add_child(m)
			n.add_child(_trail(Color.WHITE, 0.1))
		_:
			var s := SphereMesh.new()
			s.radius = 0.24
			s.height = 0.48
			n.add_child(_mesh(s, _mat(c, 4.0, 0.9)))
			var core := SphereMesh.new()
			core.radius = 0.13
			core.height = 0.26
			n.add_child(_mesh(core, _mat(Color.WHITE, 3.0)))
			var light := OmniLight3D.new()
			light.light_color = c
			light.light_energy = 2.0
			light.omni_range = 2.5
			n.add_child(light)
			n.add_child(_trail(c, 0.2))
	return n


func _trail(c: Color, size: float) -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.amount = 40
	p.lifetime = 0.45
	p.local_coords = false
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(-dir, 0, 0)
	pm.spread = 25.0
	pm.initial_velocity_min = 0.5
	pm.initial_velocity_max = 1.5
	pm.gravity = Vector3.ZERO
	pm.scale_min = 0.5
	pm.scale_max = 1.0
	var curve := CurveTexture.new()
	curve.curve = Curve.new()
	curve.curve.add_point(Vector2(0, 1))
	curve.curve.add_point(Vector2(1, 0))
	pm.scale_curve = curve
	p.process_material = pm
	var q := SphereMesh.new()
	q.radius = size * 0.5
	q.height = size
	q.radial_segments = 8
	q.rings = 4
	q.material = _mat(c, 2.5, 0.8)
	p.draw_pass_1 = q
	return p
