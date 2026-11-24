extends SceneTree
var f := 0
var m: Node
func _initialize():
	m = load("res://scenes/main_menu.tscn").instantiate()
	root.add_child(m)
func _process(_d):
	f += 1
	if f == 90:
		DirAccess.make_dir_recursive_absolute("/tmp/prev")
		root.get_texture().get_image().save_png("/tmp/prev/menu_title.png")
		var ev := InputEventKey.new(); ev.keycode = KEY_ENTER; ev.pressed = true
		Input.parse_input_event(ev)
	if f == 92:
		var ev := InputEventKey.new(); ev.keycode = KEY_ENTER; ev.pressed = false
		Input.parse_input_event(ev)
	if f == 200:
		root.get_texture().get_image().save_png("/tmp/prev/menu_main.png")
		quit()
	return false
