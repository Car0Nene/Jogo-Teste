extends SceneTree
## Força um especial do P1 e captura o "super flash".
##   xvfb-run godot --path . --rendering-method gl_compatibility --script tools/test_super.gd -- juraci carlos padaria special
var f := 0
var fight: Node
var mv := &"special"
var shots := [4, 10, 18, 30, 45, 60, 80, 110]
var t0 := -1

func _initialize():
	var a := OS.get_cmdline_user_args()
	var game = root.get_node("Game")
	game.mode = 1
	game.p1_fighter = StringName(a[0]) if a.size() > 0 else &"juraci"
	game.p2_fighter = StringName(a[1]) if a.size() > 1 else &"carlos"
	game.stage = StringName(a[2]) if a.size() > 2 else &"padaria"
	mv = StringName(a[3]) if a.size() > 3 else &"special"
	root.get_node("Settings").data["touch"]["mode"] = 2
	fight = load("res://scenes/fight.tscn").instantiate()
	root.add_child(fight)

func _process(_d):
	f += 1
	if t0 < 0:
		if fight.phase == 2:
			fight.p2.controls_enabled = false
			fight.p1.controls_enabled = false
			if fight.p1.state == 0 and fight.p2.state == 0:
				t0 = f + 20
		return false
	if f == t0:
		fight.p1.meter = 100.0
		print("start_move=", fight.p1._start_move(mv))
	var k := f - t0
	if k in shots:
		DirAccess.make_dir_recursive_absolute("/tmp/prev")
		root.get_texture().get_image().save_png("/tmp/prev/super_%04d.png" % k)
	if k >= shots[-1]:
		quit()
	return false
