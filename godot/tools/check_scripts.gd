extends SceneTree
func _initialize():
	for d in ["res://scripts/autoload", "res://scripts/data", "res://scripts/fight", "res://scripts/ui"]:
		for f in DirAccess.get_files_at(d):
			if f.ends_with(".gd"):
				var s = load(d + "/" + f)
				print("OK " if s and s.can_instantiate() else "FAIL ", d, "/", f)
	quit()
