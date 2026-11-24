class_name FightCamera
extends Camera3D
## Câmera de luta: segue o meio dos lutadores, aproxima/afasta conforme a distância,
## tremor nos golpes fortes e "zoom de impacto".

var a: Fighter
var b: Fighter
var shake := 0.0
var punch := 0.0
var cinematic_target: Node3D = null
var _smooth := Vector3(0, 1.3, 5.0)


func _ready() -> void:
	fov = 36.0
	near = 0.05
	far = 120.0


func _process(dt: float) -> void:
	var target: Vector3
	var look: Vector3
	if cinematic_target:
		var p := cinematic_target.global_position
		target = p + Vector3(0.6, 1.35, 2.4)
		look = p + Vector3(0, 1.1, 0)
	elif a and b:
		var mid := (a.pos.x + b.pos.x) * 0.5
		var sep := absf(a.pos.x - b.pos.x)
		var high := maxf(a.pos.y, b.pos.y)
		var dist := clampf(3.4 + sep * 0.75, 4.2, 8.5) - punch * 0.8
		target = Vector3(mid, 1.35 + high * 0.35, dist)
		look = Vector3(mid, 1.05 + high * 0.3, 0.0)
	else:
		return
	_smooth = _smooth.lerp(target, 1.0 - exp(-dt * 6.0))
	var off := Vector3(randf_range(-1, 1), randf_range(-1, 1), 0) * shake * 0.04
	global_position = _smooth + off
	look_at(look + off * 0.5)
	shake = maxf(0.0, shake - dt * 18.0)
	punch = maxf(0.0, punch - dt * 2.5)


func impact(strength: float) -> void:
	shake = maxf(shake, strength)
	punch = maxf(punch, clampf(strength / 10.0, 0.0, 0.6))
