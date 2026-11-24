extends SceneTree
## Renderiza poses de animações em modelos (conferência visual).
## xvfb-run godot --path . --script tools/preview_anims.gd -- juraci jab,kick_mid 0.3,0.6
var chars: PackedStringArray
var anims: PackedStringArray
var times: PackedFloat32Array
var root3d: Node3D
var cam: Camera3D
var step := 0
var jobs := []

func _initialize():
	var a := OS.get_cmdline_user_args()
	chars = a[0].split(",")
	anims = a[1].split(",")
	for t in a[2].split(","): times.append(float(t))
	root3d = Node3D.new()
	root.add_child(root3d)
	var env := WorldEnvironment.new()
	env.environment = Environment.new()
	env.environment.background_mode = Environment.BG_COLOR
	env.environment.background_color = Color(0.25, 0.27, 0.3)
	env.environment.ambient_light_color = Color(0.7, 0.7, 0.75)
	env.environment.ambient_light_energy = 0.6
	root3d.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-40, 30, 0)
	root3d.add_child(sun)
	cam = Camera3D.new()
	cam.position = Vector3(0, 0.9, 3.2)
	cam.fov = 40
	root3d.add_child(cam)
	cam.current = true
	for c in chars:
		for an in anims:
			for t in times:
				jobs.append([c, an, t])


func _process(_d):
	if step >= jobs.size() * 3:
		quit()
		return false
	var j = jobs[step / 3]
	if step % 3 == 0:
		for ch in root3d.get_children():
			if ch.name == "M": ch.free()
		var m: Node3D = (load("res://assets/characters/%s/%s.glb" % [j[0], j[0]]) as PackedScene).instantiate()
		m.name = "M"
		m.scale = Vector3.ONE * 1.7
		m.rotation_degrees.y = 60
		root3d.add_child(m)
		var ap := AnimationPlayer.new()
		m.add_child(ap)
		ap.root_node = NodePath("..")
		ap.add_animation_library("fight", load("res://assets/animations/fight_library.res"))
		ap.play("fight/" + j[1])
		ap.seek(j[2] * ap.current_animation_length, true)
		ap.pause()
	elif step % 3 == 2:
		var img := root.get_texture().get_image()
		img = img.get_region(Rect2i(396, 64, 360, 520))
		img.save_png("/tmp/prev/%s_%s_%02d.png" % [j[0], j[1], int(j[2] * 100)])
	step += 1
	return false
