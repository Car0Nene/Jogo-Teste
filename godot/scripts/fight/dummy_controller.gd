class_name DummyController
extends FighterController
## Boneco do modo Treino: parado, em pé/agachado, defende tudo ou nada.

var stance := 0       # 0 em pé, 1 agachado, 2 pula
var block := 0        # 0 nunca, 1 sempre, 2 depois do 1º golpe


func read(_f: Fighter) -> Dictionary:
	return {"x": 0.0, "up": stance == 2, "down": stance == 1, "guard": block == 1, "pressed": []}


func is_blocking(f: Fighter) -> bool:
	if block == 1:
		return true
	if block == 2:
		return f.state == Fighter.S.BLOCKSTUN or f.state == Fighter.S.HITSTUN
	return false
