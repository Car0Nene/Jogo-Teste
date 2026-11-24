class_name PlayerController
extends FighterController
## Lê teclado / controle / toque (todos viram ações "pN_*" no InputMap).
## Guarda os botões por alguns quadros (buffer) e reconhece meia-lua (↓↘→ e ↓↙←).

const BUFFER := 8
const BUTTONS: Array[StringName] = [&"punch", &"kick", &"special"]

var prefix := "p1_"
var _buffer := {}
var _dirs: Array[int] = []        # histórico em notação numérica (6 = frente)
var _last := EMPTY


func _init(player := 1) -> void:
	prefix = "p%d_" % player


func _physics_process(_dt: float) -> void:
	for b in BUTTONS:
		if Input.is_action_just_pressed(prefix + String(b)):
			_buffer[b] = BUFFER
		elif _buffer.has(b):
			_buffer[b] -= 1
			if _buffer[b] <= 0:
				_buffer.erase(b)


func read(f: Fighter) -> Dictionary:
	var x := Input.get_axis(prefix + "left", prefix + "right")
	var down := Input.is_action_pressed(prefix + "down")
	var up := Input.is_action_pressed(prefix + "up")
	var rel := x * f.facing
	var d := 5
	if down: d = 2 if absf(rel) < 0.3 else (3 if rel > 0 else 1)
	elif absf(rel) >= 0.3: d = 6 if rel > 0 else 4
	if _dirs.is_empty() or _dirs[-1] != d:
		_dirs.append(d)
		if _dirs.size() > 8:
			_dirs.pop_front()
	var it := {
		"x": x, "up": up, "down": down,
		"guard": Input.is_action_pressed(prefix + "guard"),
		"pressed": _buffer.keys(),
	}
	if _buffer.has(&"punch"):
		if _seq([2, 3, 6]):
			it["motion_special"] = true
		elif _seq([2, 1, 4]):
			it["motion_special"] = true
			it["motion_sub"] = true
	_last = it
	return it


func _seq(s: Array) -> bool:
	var j := 0
	for d in _dirs:
		if d == s[j]:
			j += 1
			if j == s.size():
				return true
	return false


func consume() -> void:
	_buffer.clear()
	_dirs.clear()


func is_blocking(f: Fighter) -> bool:
	if Input.is_action_pressed(prefix + "guard"):
		return true
	return Input.get_axis(prefix + "left", prefix + "right") * f.facing < -0.3
