extends SceneTree
const S := {
	"padaria": ["Padaria da Juju", "Bolos da Juju • Pães quentes", "bolo-da-juraci"],
	"quintal": ["Quintal da Família", "Domingo de churrasco", "family-fighter-2"],
	"festa": ["Festa Junina", "Arraiá da família", "family-fighter-3"],
	"bar": ["Bar da Simone", "Cerveja gelada e resenha", "family-fighter-2"],
	"praia": ["Praia • Calçadão", "Natal na praia", "family-fighter-3"],
}
func _initialize():
	for id in S:
		var d := StageData.new()
		d.id = StringName(id)
		d.display_name = S[id][0]
		d.subtitle = S[id][1]
		d.preview = load("res://assets/stages/%s.webp" % id)
		d.music = load("res://assets/audio/music/%s.mp3" % S[id][2])
		print(id, " ", ResourceSaver.save(d, "res://data/stages/%s.tres" % id))
	quit()
