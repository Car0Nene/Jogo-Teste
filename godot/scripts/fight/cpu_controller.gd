class_name CpuController
extends FighterController
## Adversário controlado pelo computador. Dificuldade 0..3 (Fácil, Normal, Difícil, Mestre).

var level := 1
var _plan := "idle"
var _plan_frames := 0
var _press: Array[StringName] = []
var _hold := {}
var _rng := RandomNumberGenerator.new()


func _init(difficulty := 1) -> void:
	level = difficulty
	_rng.randomize()


func read(f: Fighter) -> Dictionary:
	var o := f.opponent
	if o == null:
		return EMPTY
	var skill: float = [0.45, 0.7, 0.9, 1.0][level]
	var react: int = [26, 16, 9, 5][level]
	var dist := absf(o.pos.x - f.pos.x)
	var toward := 1.0 if o.pos.x > f.pos.x else -1.0
	_plan_frames -= 1
	_press.clear()
	# reage a golpes do jogador (defesa)
	if o.state == Fighter.S.ATTACK and dist < 2.2 and o.state_frame < o.move.startup and _rng.randf() < 0.035 * skill * 60.0 / react:
		_plan = "block_low" if o.move.level == MoveData.Level.LOW else "block"
		_plan_frames = o.move.total()
	# anti-aéreo
	elif o.pos.y > 0.5 and dist < 2.0 and _rng.randf() < 0.06 * skill:
		_press = [&"punch"]
		_plan = "crouch"
		_plan_frames = 4
	elif _plan_frames <= 0:
		_choose(f, o, dist, skill)
	var it := {"x": 0.0, "up": false, "down": false, "guard": false, "pressed": _press.duplicate()}
	match _plan:
		"approach": it.x = toward
		"retreat": it.x = -toward
		"block": it.guard = true
		"block_low":
			it.guard = true
			it.down = true
		"crouch": it.down = true
		"jump_in":
			it.up = true
			it.x = toward
	# emenda combos quando acerta
	if f.state == Fighter.S.ATTACK and f.move_hit and not f.move.cancel_into.is_empty() and _rng.randf() < 0.5 * skill:
		it.pressed = [&"punch"] if f.move_name in [&"jab", &"cross"] else [&"kick"]
	return it


func _choose(f: Fighter, o: Fighter, dist: float, skill: float) -> void:
	_plan_frames = _rng.randi_range(12, 30)
	var r := _rng.randf()
	if f.meter >= 50.0 and r < 0.18 * skill:
		_plan = "idle"
		_press = [&"special"]
		if _rng.randf() < 0.4:
			_plan = "crouch"
		_plan_frames = 6
		return
	if dist > 2.6:
		_plan = "approach" if r < 0.8 else ("jump_in" if r < 0.9 * (0.5 + skill * 0.5) else "idle")
		if _plan == "jump_in":
			_plan_frames = 8
		return
	if dist > 1.25:
		if r < 0.55:
			_plan = "approach"
		elif r < 0.7:
			_plan = "idle"
			_press = [&"kick"]
		elif r < 0.8:
			_plan = "jump_in"
			_plan_frames = 8
		else:
			_plan = "block"
		return
	if r < 0.32:
		_plan = "idle"
		_press = [&"punch"]
	elif r < 0.5:
		_plan = "idle"
		_press = [&"kick"]
	elif r < 0.58:
		_plan = "crouch"
		_press = [&"kick"]
	elif r < 0.64:
		_plan = "crouch"
		_press = [&"punch"]
	elif r < 0.78:
		_plan = "block"
		_plan_frames = 18
	elif r < 0.88:
		_plan = "retreat"
	else:
		_plan = "idle"


func consume() -> void:
	_press.clear()


func is_blocking(f: Fighter) -> bool:
	if level == 0:
		return _plan in ["block", "block_low"] and _rng.randf() < 0.6
	return _plan in ["block", "block_low"]
