class_name HitFx
extends Node3D
## Compatibilidade: faísca de impacto agora vem de Vfx.hit (estrela, anel, fagulhas, luz).

static func spawn(parent: Node, at: Vector3, color: Color, big: bool, dir := 1) -> void:
	Vfx.hit(parent, at, color, big, dir)
