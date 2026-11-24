extends SceneTree
## Junta as animações do Mixamo (assets/animations/mixamo/*.fbx) numa biblioteca única "fight".
##   godot --headless --path . --script tools/build_anim_library.gd
const LOOP := ["idle", "walk_fwd", "walk_back", "crouch", "block_high", "block_low", "victory",
	"granny_victory", "dance", "smoke", "defeated"]
const LOCK_ROOT := ["idle", "walk_fwd", "walk_back", "jab", "cross", "hook", "uppercut", "kick_mid",
	"roundhouse", "low_kick", "sweep", "jump", "crouch", "block_high", "block_low", "hit_head", "hit_body",
	"taunt", "throw_obj", "cast", "power_up", "drink", "smoke", "dance", "granny_taunt", "punch_combo",
	"hurricane_kick", "victory", "granny_victory", "defeated"]

func _initialize():
	var lib := AnimationLibrary.new()
	var dir := DirAccess.open("res://assets/animations/mixamo")
	for f in dir.get_files():
		if not f.ends_with(".fbx"):
			continue
		var key := f.get_basename()
		var scene: Node = (load("res://assets/animations/mixamo/" + f) as PackedScene).instantiate()
		var ap: AnimationPlayer = scene.find_children("*", "AnimationPlayer", true, false)[0]
		var src: Animation = ap.get_animation(ap.get_animation_list()[0])
		var a: Animation = src.duplicate(true)
		a.loop_mode = Animation.LOOP_LINEAR if key in LOOP else Animation.LOOP_NONE
		if key in LOCK_ROOT:
			_lock_root_xz(a, key == "jump")
		lib.add_animation(key, a)
		scene.free()
		print("%-16s %.2fs tracks=%d" % [key, a.length, a.get_track_count()])
	print(ResourceSaver.save(lib, "res://assets/animations/fight_library.res"))
	quit()

## Remove o deslocamento horizontal do quadril (a física do jogo move o lutador).
func _lock_root_xz(a: Animation, lock_y := false) -> void:
	for t in a.get_track_count():
		if a.track_get_type(t) != Animation.TYPE_POSITION_3D:
			continue
		if not String(a.track_get_path(t)).ends_with(":Hips"):
			continue
		var first: Vector3 = a.track_get_key_value(t, 0)
		for k in a.track_get_key_count(t):
			var v: Vector3 = a.track_get_key_value(t, k)
			a.track_set_key_value(t, k, Vector3(first.x, first.y if lock_y else v.y, first.z))
