extends SceneTree
## Captura cada arena no início do round.  xvfb-run godot --path . --script tools/preview_stages.gd -- padaria,praia
var stages: PackedStringArray
var i := 0
var fight: Node
var wait := 0

func _initialize():
	var a := OS.get_cmdline_user_args()
	stages = (a[0] if a.size() > 0 else "padaria,quintal,festa,bar,praia").split(",")
	root.get_node("Settings").data["touch"]["mode"] = 2
	root.get_node("Settings").data["video"]["quality"] = 2
	_load()

func _load():
	if fight: fight.queue_free()
	var g = root.get_node("Game")
	g.mode = 1
	g.p1_fighter = &"juraci"
	g.p2_fighter = &"carlos"
	g.stage = StringName(stages[i])
	fight = load("res://scenes/fight.tscn").instantiate()
	root.add_child(fight)
	wait = 0

func _process(_d):
	if fight == null: return false
	if fight.phase == 2:
		wait += 1
		if wait == 30:
			DirAccess.make_dir_recursive_absolute("/tmp/prev")
			root.get_texture().get_image().save_png("/tmp/prev/stage_%s.png" % stages[i])
			print("shot ", stages[i])
			i += 1
			if i >= stages.size():
				quit()
			else:
				_load()
	return false
