class_name FighterController
extends Node
## Quem controla o lutador. Base para jogador local, CPU (e futuramente online/replay).

const EMPTY := {"x": 0.0, "up": false, "down": false, "guard": false, "pressed": []}


func read(_f: Fighter) -> Dictionary:
	return EMPTY


func consume() -> void:
	pass


## Está segurando defesa? (botão Defesa ou "para trás", como nos jogos clássicos)
func is_blocking(_f: Fighter) -> bool:
	return false
