extends SceneTree
## Luta de teste com entradas aleatórias + capturas.
##   xvfb-run godot --rendering-method gl_compatibility --path . --script tools/test_fight.gd -- carlos pedro padaria
var f := 0
var rng := RandomNumberGenerator.new()
var shots := [200, 330, 420, 520, 640, 780, 900, 1100, 1400]
var fight: Node

func _initialize():
	rng.seed = 3
	var a := OS.get_cmdline_user_args()
	var game = root.get_node("Game")
	game.mode = 1
	game.p1_fighter = StringName(a[0]) if a.size() > 0 else &"carlos"
	game.p2_fighter = StringName(a[1]) if a.size() > 1 else &"pedro"
	game.stage = StringName(a[2]) if a.size() > 2 else &"padaria"
	root.get_node("Settings").data["touch"]["mode"] = 1
	root.get_node("Settings").data["video"]["quality"] = 0
	print("start ", Time.get_ticks_msec())
	fight = load("res://scenes/fight.tscn").instantiate()
	root.add_child(fight)

func _process(_d):
	f += 1
	if f % 50 == 0: print("frame ", f, " t=", Time.get_ticks_msec())
	if f > 300 and f % 6 == 0:
		for a in ["p1_left", "p1_right", "p1_down", "p1_up", "p1_guard"]:
			if rng.randf() < (0.12 if a != "p1_right" else 0.4): Input.action_press(a)
			else: Input.action_release(a)
	if f > 300 and f % 9 == 0:
		for a in ["p1_punch", "p1_kick", "p1_special"]:
			if rng.randf() < 0.4: Input.action_press(a)
			else: Input.action_release(a)
	if f == 600:
		fight.p1.meter = 100.0
	if f in shots:
		root.get_texture().get_image().save_png("/tmp/prev/fight_%04d.png" % f)
		print("f=", f, " phase=", fight.phase, " hp=", int(fight.p1.hp), "/", int(fight.p2.hp), " st=", fight.p1.state, "/", fight.p2.state, " pos=", fight.p1.pos, fight.p2.pos, " meter=", int(fight.p1.meter))
	if f >= shots[-1]:
		quit()
	return false
