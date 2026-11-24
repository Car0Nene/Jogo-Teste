extends SceneTree
## Mede, para cada animação de ataque, o instante de impacto (máxima extensão do membro)
## e o alcance. Resultado: assets/animations/anim_meta.json (usado pelo Fighter).
const ATTACKS := {
	"jab": "RightHand", "cross": "RightHand", "hook": "RightHand", "uppercut": "RightHand",
	"kick_mid": "RightFoot", "roundhouse": "RightFoot", "low_kick": "RightFoot", "sweep": "RightFoot",
	"punch_combo": "RightHand", "hurricane_kick": "RightFoot", "throw_obj": "RightHand",
	"cast": "RightHand",
}
var m: Node3D
var ap: AnimationPlayer
var sk: Skeleton3D
var out := {}
var queue := []
var f := 0

func _initialize():
	m = (load("res://assets/characters/carlos/carlos.glb") as PackedScene).instantiate()
	root.add_child(m)
	sk = m.find_children("*", "Skeleton3D", true, false)[0]
	ap = AnimationPlayer.new()
	m.add_child(ap)
	ap.root_node = NodePath("..")
	ap.add_animation_library("fight", load("res://assets/animations/fight_library.res"))
	for a in ATTACKS:
		for bone in ["RightHand", "LeftHand", "RightFoot", "LeftFoot"]:
			pass
		queue.append(a)

func _process(_d):
	if queue.is_empty():
		var fa := FileAccess.open("res://assets/animations/anim_meta.json", FileAccess.WRITE)
		fa.store_string(JSON.stringify(out, "  "))
		print(JSON.stringify(out))
		quit()
		return false
	var a: String = queue.pop_front()
	var anim := ap.get_animation("fight/" + a)
	var best := {}
	for bone in ["RightHand", "LeftHand", "RightFoot", "LeftFoot"]:
		best[bone] = {"t": 0.0, "reach": -99.0, "y": 0.0}
	var hips := sk.find_bone("Hips")
	var n := 60
	ap.play("fight/" + a)
	for i in n + 1:
		var t := anim.length * i / n
		ap.seek(t, true)
		# personagem olha para +Z no espaço do modelo: alcance = z da mão/pé à frente do quadril
		var hp := sk.get_bone_global_pose(hips).origin
		for bone in best:
			var p := sk.get_bone_global_pose(sk.find_bone(bone)).origin
			var reach := p.z - hp.z
			if reach > best[bone]["reach"]:
				best[bone] = {"t": t, "reach": reach, "y": p.y}
	var main_bone: String = ATTACKS[a]
	var pick := main_bone
	for bone in best:
		if best[bone]["reach"] > best[pick]["reach"] + 0.05:
			pick = bone
	out[a] = {"bone": pick, "impact": snappedf(best[pick]["t"], 0.001), "length": snappedf(anim.length, 0.001),
		"reach": snappedf(best[pick]["reach"], 0.001), "height": snappedf(best[pick]["y"], 0.001)}
	return false
