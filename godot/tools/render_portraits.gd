extends SceneTree
## Gera retratos (busto) e corpo inteiro dos lutadores a partir dos modelos 3D.
##   xvfb-run godot --rendering-method gl_compatibility --path . --script tools/render_portraits.gd
const IDS := ["juraci", "carlos", "pedro", "paula", "franciely", "gabi", "davi", "daniel", "tainara", "carlos_batizado"]
const H := {"juraci": 1.56, "carlos": 1.76, "pedro": 1.78, "paula": 1.63, "franciely": 1.66, "gabi": 1.62,
	"davi": 1.5, "daniel": 1.74, "tainara": 1.64, "carlos_batizado": 1.76}
var sv: SubViewport
var cam: Camera3D
var holder: Node3D
var i := 0
var phase := 0
var fm: FighterModel

func _initialize():
	sv = SubViewport.new()
	sv.size = Vector2i(512, 512)
	sv.transparent_bg = true
	sv.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(sv)
	var env := WorldEnvironment.new()
	env.environment = Environment.new()
	env.environment.background_mode = Environment.BG_CLEAR_COLOR
	env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.environment.ambient_light_color = Color(0.85, 0.8, 0.9)
	env.environment.ambient_light_energy = 0.55
	env.environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	sv.add_child(env)
	var key := DirectionalLight3D.new()
	key.rotation_degrees = Vector3(-25, 35, 0)
	key.light_energy = 1.25
	sv.add_child(key)
	var rim := DirectionalLight3D.new()
	rim.rotation_degrees = Vector3(-10, 200, 0)
	rim.light_energy = 1.4
	rim.light_color = Color("ffb3d9")
	sv.add_child(rim)
	cam = Camera3D.new()
	cam.fov = 26
	sv.add_child(cam)
	cam.current = true

func _process(_d):
	if i >= IDS.size():
		quit()
		return false
	var id: String = IDS[i]
	match phase:
		0:
			if fm: fm.queue_free()
			fm = FighterModel.new()
			sv.add_child(fm)
			fm.setup(load("res://assets/characters/%s/%s.glb" % [id, id]), H[id])
			fm.rotation_degrees.y = 18
			fm.play("granny_victory" if id == "juraci" else "idle")
			fm.seek(0.5)
			fm.anim.pause()
		3:
			var head := fm.bone_world(&"Head")
			cam.position = Vector3(head.x + 0.05, head.y - 0.06, head.z + 1.55)
			cam.look_at(Vector3(head.x, head.y - 0.12, head.z))
		6:
			sv.get_texture().get_image().save_png("res://assets/ui/portraits/%s.png" % id)
			cam.fov = 30
			cam.position = Vector3(0, H[id] * 0.52, 4.6)
			cam.look_at(Vector3(0, H[id] * 0.5, 0))
		9:
			sv.get_texture().get_image().save_png("res://assets/ui/fullbody/%s.png" % id)
			cam.fov = 26
			i += 1
			phase = -1
	phase += 1
	return false
