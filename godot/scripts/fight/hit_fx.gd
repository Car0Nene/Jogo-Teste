class_name HitFx
extends Node3D
## Faísca de impacto: explosão de partículas + clarão de luz.

static func spawn(parent: Node, at: Vector3, color: Color, big: bool) -> void:
	var fx := HitFx.new()
	parent.add_child(fx)
	fx.global_position = at
	fx._build(color, big)


func _build(color: Color, big: bool) -> void:
	var p := GPUParticles3D.new()
	p.one_shot = true
	p.explosiveness = 1.0
	p.amount = 26 if big else 14
	p.lifetime = 0.35
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(0, 0, 1)
	pm.spread = 180.0
	pm.initial_velocity_min = 2.5
	pm.initial_velocity_max = 6.0 if big else 4.0
	pm.gravity = Vector3(0, -6, 0)
	pm.damping_min = 4.0
	pm.damping_max = 8.0
	var curve := CurveTexture.new()
	curve.curve = Curve.new()
	curve.curve.add_point(Vector2(0, 1))
	curve.curve.add_point(Vector2(1, 0))
	pm.scale_curve = curve
	p.process_material = pm
	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.025, 0.025, 0.16)
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = color
	m.emission_enabled = true
	m.emission = color
	m.emission_energy_multiplier = 6.0
	mesh.material = m
	p.draw_pass_1 = mesh
	pm.particle_flag_align_y = true
	add_child(p)
	p.emitting = true
	var flash := MeshInstance3D.new()
	var s := SphereMesh.new()
	s.radius = 0.18 if big else 0.11
	s.height = s.radius * 2
	var fm := StandardMaterial3D.new()
	fm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	fm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	fm.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	fm.albedo_color = Color(color, 0.9)
	s.material = fm
	flash.mesh = s
	add_child(flash)
	var light := OmniLight3D.new()
	light.light_color = color
	light.light_energy = 3.0 if big else 1.5
	light.omni_range = 2.5
	add_child(light)
	var tw := create_tween().set_parallel(true)
	tw.tween_property(flash, "scale", Vector3.ONE * (3.0 if big else 2.0), 0.14)
	tw.tween_property(fm, "albedo_color:a", 0.0, 0.16)
	tw.tween_property(light, "light_energy", 0.0, 0.2)
	tw.chain().tween_interval(0.3)
	tw.chain().tween_callback(queue_free)
