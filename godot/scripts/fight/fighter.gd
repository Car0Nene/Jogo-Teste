class_name Fighter
extends Node3D
## Lógica de um lutador. Roda a 60 quadros por segundo, em 2D (eixo X = chão, Y = altura);
## o modelo 3D apenas acompanha. Hitboxes vêm dos ossos da animação.

signal hit_landed(attacker: Fighter, target: Fighter, move: MoveData, blocked: bool, at: Vector3)
signal knocked_out(f: Fighter)
signal spawn_projectile(f: Fighter, move: MoveData)
signal form_changed(f: Fighter, form: StringName)
signal combo(f: Fighter, hits: int, damage: float)

enum S { IDLE, WALK, CROUCH, JUMP, ATTACK, BLOCKSTUN, HITSTUN, AIR_HIT, DOWN, GETUP, KO, WIN, INTRO }

const GROUND := 0.0
const PUSH_W := 0.34
const STAGE_HALF := 7.0
const META_PATH := "res://assets/animations/anim_meta.json"
static var META := {}

var data: FighterData
var controller: FighterController
var opponent: Fighter
var player_index := 1
var controls_enabled := false

var pos := Vector2.ZERO          # x no chão, y altura (m)
var vel := Vector2.ZERO
var facing := 1
var state: S = S.IDLE
var state_frame := 0
var hp := 1000.0
var meter := 0.0
var form: StringName = &""
var form_frames := 0
var training_infinite := false

var move: MoveData
var move_name: StringName
var move_hit := false             # golpe atual já acertou alguém
var move_blocked := false
var _stun := 0
var _hitstop := 0
var _juggle := 0
var combo_hits := 0
var combo_damage := 0.0
var _flash := 0
var _crouching := false
var _blocking_low := false
var _special_cd := 0
var _landed_on_ground := true
var _down_kind := 0               # 0 knockdown normal, 1 KO

var model: FighterModel
var _shadow: MeshInstance3D


func _ready() -> void:
	if META.is_empty() and FileAccess.file_exists(META_PATH):
		META = JSON.parse_string(FileAccess.get_file_as_string(META_PATH))


func setup(d: FighterData, ctrl: FighterController, index: int, x: float) -> void:
	data = d
	player_index = index
	controller = ctrl
	add_child(ctrl)
	model = FighterModel.new()
	add_child(model)
	model.setup(d.model, d.height_m)
	_make_shadow()
	reset(x, 1 if index == 1 else -1)


func reset(x: float, face: int) -> void:
	pos = Vector2(x, 0)
	vel = Vector2.ZERO
	facing = face
	hp = data.max_hp
	meter = 0.0 if Game.mode != Game.Mode.TRAINING else 100.0
	_set_form(&"")
	_enter(S.IDLE)
	combo_hits = 0
	_sync_visual()


# =================================================================== loop
func _physics_process(_dt: float) -> void:
	if _hitstop > 0:
		_hitstop -= 1
		model.anim.speed_scale = 0.0
		return
	if model.anim.speed_scale == 0.0:
		model.anim.speed_scale = 1.0
	var it := controller.read(self) if controls_enabled and controller else FighterController.EMPTY
	state_frame += 1
	_special_cd = maxi(0, _special_cd - 1)
	_tick_form()
	match state:
		S.IDLE, S.WALK, S.CROUCH: _neutral(it)
		S.JUMP: _jump(it)
		S.ATTACK: _attack(it)
		S.BLOCKSTUN: _stunned(true)
		S.HITSTUN: _stunned(false)
		S.AIR_HIT: _air_hit()
		S.DOWN: _down()
		S.GETUP: _getup()
		S.KO, S.WIN, S.INTRO: pass
	_physics()
	_sync_visual()


# =================================================================== estados
func _neutral(it: Dictionary) -> void:
	var dx := _rel_x(it)
	if _try_attack(it, false):
		return
	if it.up:
		var jx := 0.0 if absf(dx) < 0.3 else signf(dx) * data.walk_speed * 1.35
		vel = Vector2(jx * facing, data.jump_velocity * _form_mult("speed", 0.5))
		pos.y = 0.001
		_enter(S.JUMP)
		Audio.sfx(&"jump")
		model.play("jump", 1.35, 0.06, true)
		model.seek(0.35)
		return
	_crouching = it.down
	if it.down:
		vel.x = 0.0
		if state != S.CROUCH:
			_enter(S.CROUCH)
		model.play("block_low" if (it.guard or dx < -0.3) else "crouch")
		return
	if it.guard:
		vel.x = 0.0
		_enter_if(S.IDLE)
		model.play("block_high")
		return
	if absf(dx) > 0.3:
		var spd := (data.walk_speed if dx > 0 else data.back_speed) * _form_mult("speed")
		vel.x = signf(dx) * spd * facing
		_enter_if(S.WALK)
		model.play("walk_fwd" if dx > 0 else "walk_back", spd / 1.6)
	else:
		vel.x = 0.0
		_enter_if(S.IDLE)
		model.play("idle")


func _jump(it: Dictionary) -> void:
	if _try_attack(it, true):
		return
	if pos.y <= 0.0 and vel.y <= 0.0:
		_land()


func _land() -> void:
	pos.y = 0.0
	vel = Vector2.ZERO
	Audio.sfx(&"land")
	_enter(S.IDLE)
	model.play("idle", 1.0, 0.12)


func _attack(it: Dictionary) -> void:
	var m := move
	var f := state_frame
	# cancelamento (combo) ao acertar ou bloquear
	if (move_hit or move_blocked) and f > m.startup and not m.cancel_into.is_empty():
		var next := _pick_from_input(it, pos.y > 0.0)
		if next != &"" and next in m.cancel_into:
			_start_move(next)
			return
	if f <= m.startup + m.active and m.lunge != 0.0 and pos.y <= 0.0:
		vel.x = m.lunge * facing
	elif pos.y <= 0.0:
		vel.x = move_toward(vel.x, 0.0, 0.6)
	if f == m.startup:
		match m.kind:
			MoveData.Kind.PROJECTILE: spawn_projectile.emit(self, m)
			MoveData.Kind.BUFF: _set_form(m.buff_form)
	if m.kind == MoveData.Kind.MELEE and f > m.startup and f <= m.startup + m.active and not move_hit:
		_check_hit()
	if m.air:
		if pos.y <= 0.0 and vel.y <= 0.0:
			_land()
		return
	if f >= m.total():
		_enter(S.CROUCH if _crouching else S.IDLE)
		model.play("crouch" if _crouching else "idle", 1.0, 0.14)


func _stunned(blocking: bool) -> void:
	vel.x = move_toward(vel.x, 0.0, 0.35)
	if state_frame >= _stun:
		_enter(S.CROUCH if (blocking and _blocking_low) else S.IDLE)
		model.play("crouch" if (blocking and _blocking_low) else "idle", 1.0, 0.12)
		if not blocking:
			_end_combo_on_opponent()


func _air_hit() -> void:
	if pos.y <= 0.0 and vel.y <= 0.0 and state_frame > 3:
		pos.y = 0.0
		vel = Vector2.ZERO
		Audio.sfx(&"fall")
		_enter(S.DOWN)


func _down() -> void:
	vel.x = move_toward(vel.x, 0.0, 0.4)
	if state_frame == 1:
		model.play("ko_fall" if _down_kind == 1 else "knockdown", 1.4, 0.06, true)
		if _down_kind != 1:
			model.seek(0.55)
	if _down_kind == 1:
		if state_frame == 1:
			knocked_out.emit(self)
		return
	if state_frame >= 46:
		_enter(S.GETUP)
		model.play("getup", 3.2, 0.1, true)
		model.seek(1.0)


func _getup() -> void:
	if state_frame >= 36:
		_end_combo_on_opponent()
		_enter(S.IDLE)
		model.play("idle", 1.0, 0.15)


# =================================================================== golpes
func _try_attack(it: Dictionary, in_air: bool) -> bool:
	var n := _pick_from_input(it, in_air)
	if n == &"":
		return false
	return _start_move(n)


func _pick_from_input(it: Dictionary, in_air: bool) -> StringName:
	var dx := _rel_x(it)
	var pressed: Array = it.pressed
	if pressed.is_empty():
		return &""
	if in_air:
		if &"kick" in pressed: return &"air_kick"
		if &"punch" in pressed: return &"air_punch"
		return &""
	if &"special" in pressed or it.get("motion_special", false):
		return &"sub_special" if (it.down or it.get("motion_sub", false)) else &"special"
	if &"punch" in pressed:
		if it.down: return &"uppercut"
		if dx > 0.3: return &"cross"
		if state == S.ATTACK and move_name == &"jab": return &"cross"
		if state == S.ATTACK and move_name == &"cross": return &"hook"
		return &"jab"
	if &"kick" in pressed:
		if it.down: return &"sweep"
		if dx > 0.3: return &"high_kick"
		if dx < -0.3: return &"low_kick"
		if state == S.ATTACK and move_name == &"kick": return &"high_kick"
		return &"kick"
	return &""


func _start_move(n: StringName) -> bool:
	if form != &"" and data.moves.has(StringName("%s@%s" % [n, form])):
		n = StringName("%s@%s" % [n, form])
	var m := data.move(n)
	if m == null:
		return false
	if m.meter_cost > 0.0:
		if meter < m.meter_cost or _special_cd > 0:
			Audio.sfx(&"back")
			return false
		meter -= m.meter_cost
		_special_cd = 40
	controller.consume()
	move = m
	move_name = n
	move_hit = false
	move_blocked = false
	_enter(S.ATTACK)
	if not m.air:
		vel.x = 0.0
	Audio.sfx(m.sfx)
	if m.voice != &"" and data.voices.has(m.voice):
		Audio.voice(data.voices[m.voice])
	# sincroniza a animação: o "impacto" medido cai no 1º quadro ativo
	var meta: Dictionary = META.get(String(m.anim), {})
	var impact: float = meta.get("impact", 0.25)
	var speed := clampf(impact / maxf(0.05, (m.startup + 1) / 60.0), 0.6, 3.2) * m.anim_speed * _form_mult("speed", 0.6)
	var start_at := 0.0
	if impact / speed > m.startup / 60.0 + 0.02:
		start_at = impact - speed * (m.startup / 60.0)
	model.play(String(m.anim), speed, 0.05, true)
	if start_at > 0.0:
		model.seek(start_at)
	return true


func _check_hit() -> void:
	var m := move
	var bone := m.hitbox_bone
	var meta: Dictionary = META.get(String(m.anim), {})
	if meta.has("bone") and bone == &"auto":
		bone = StringName(meta["bone"])
	var p3 := model.bone_world(bone)
	var hb := Vector2(p3.x, p3.y)
	var r := m.hitbox_radius * model.height_scale / 1.7 * _form_mult("reach", 0.5)
	if opponent.hurt_test(hb, r):
		opponent.take_hit(self, m, Vector3(p3.x, p3.y, 0.25))


## Hurtbox = dois retângulos (tronco/cabeça e pernas) montados a partir dos ossos.
func hurt_test(c: Vector2, r: float) -> bool:
	if state in [S.DOWN, S.GETUP, S.KO]:
		return false
	for rect in hurt_rects():
		var q := Vector2(clampf(c.x, rect.position.x, rect.end.x), clampf(c.y, rect.position.y, rect.end.y))
		if q.distance_to(c) <= r:
			return true
	return false


func hurt_rects() -> Array[Rect2]:
	var head := model.bone_world(&"Head")
	var hips := model.bone_world(&"Hips")
	var w := 0.20 * model.height_scale / 1.7
	var top := head.y + 0.14 * model.height_scale / 1.7
	var mid := hips.y
	var cx := (head.x + hips.x) * 0.5
	return [Rect2(cx - w, mid, w * 2, top - mid), Rect2(hips.x - w * 1.1, 0.0, w * 2.2, mid)]


func take_hit(attacker: Fighter, m: MoveData, at: Vector3) -> void:
	attacker.move_hit = true
	var dmg_mult := attacker._form_mult("atk") * data.defense * _form_mult("taken")
	var can_block := state in [S.IDLE, S.WALK, S.CROUCH, S.BLOCKSTUN] and pos.y <= 0.0
	var holding := controller.is_blocking(self) if controller else false
	var crouch_block := _crouching
	var blocked := can_block and holding and not (
		(m.level == MoveData.Level.LOW and not crouch_block) or
		(m.level == MoveData.Level.OVERHEAD and crouch_block))
	if training_infinite and state == S.IDLE and Game.mode == Game.Mode.TRAINING:
		pass
	if blocked:
		attacker.move_blocked = true
		hp = maxf(1.0, hp - m.damage * 0.12 * dmg_mult)
		_stun = m.blockstun
		_blocking_low = crouch_block
		vel.x = -facing * m.pushback * 0.8
		_enter(S.BLOCKSTUN)
		model.play("block_low" if crouch_block else "block_high", 1.0, 0.03, true)
		meter = minf(100.0, meter + 3.0)
		attacker.meter = minf(100.0, attacker.meter + m.meter_gain * 0.5)
		_hitstop = int(m.hitstop * 0.7)
		attacker._hitstop = _hitstop
		hit_landed.emit(attacker, self, m, true, at)
		return
	# acerto
	var scale := maxf(0.35, 1.0 - 0.1 * float(attacker.combo_hits))
	var dmg := m.damage * dmg_mult * scale
	if training_infinite:
		dmg = m.damage * dmg_mult * scale
	hp = maxf(0.0, hp - dmg)
	if training_infinite and hp <= 1.0:
		hp = data.max_hp
	attacker.combo_hits += 1
	attacker.combo_damage += dmg
	attacker.meter = minf(100.0, attacker.meter + m.meter_gain)
	meter = minf(100.0, meter + m.meter_gain * 0.6)
	combo.emit(attacker, attacker.combo_hits, attacker.combo_damage)
	_flash = 5
	_hitstop = m.hitstop
	attacker._hitstop = m.hitstop
	facing = -attacker.facing
	hit_landed.emit(attacker, self, m, false, at)
	if hp <= 0.0:
		_down_kind = 1
		vel = Vector2(-facing * 3.0, 4.5)
		pos.y = maxf(pos.y, 0.01)
		_enter(S.AIR_HIT)
		model.play("ko_fall", 1.3, 0.04, true)
		return
	var airborne := pos.y > 0.0 or m.launch > 0.0 or m.knockdown
	if airborne:
		_down_kind = 0
		_juggle += 1
		vel = Vector2(-facing * m.pushback, maxf(m.launch, 3.6 if m.knockdown else 4.2) / (1.0 + 0.25 * _juggle))
		pos.y = maxf(pos.y, 0.01)
		_enter(S.AIR_HIT)
		model.play("knockdown", 1.3, 0.04, true)
		return
	_stun = m.hitstun
	vel.x = -facing * m.pushback
	_enter(S.HITSTUN)
	var head_hit := at.y > model.bone_world(&"Spine").y + 0.15
	model.play("hit_head" if head_hit else "hit_body", 1.6, 0.03, true)


func _end_combo_on_opponent() -> void:
	_juggle = 0
	if opponent:
		opponent.combo_hits = 0
		opponent.combo_damage = 0.0


# =================================================================== formas / buffs
func _set_form(f: StringName) -> void:
	var prev := form
	if f == &"cycle":
		var keys: Array = data.forms.keys()
		f = keys[0] if form == &"" or not keys.has(form) else keys[(keys.find(form) + 1) % keys.size()]
	if f != &"" and form == f and data.forms.has(f) and data.forms[f].get("toggle", false):
		f = &""
	form = f
	var info: Dictionary = data.forms.get(f, {})
	form_frames = int(info.get("duration", 8.0) * 60.0) if f != &"" else 0
	var new_model: PackedScene = info.get("model", null)
	if new_model != null or (prev != &"" and data.forms.get(prev, {}).get("model", null) != null):
		model.setup(new_model if new_model else data.model, data.height_m)
		model.set_facing(facing)
	model.scale = Vector3.ONE * float(info.get("scale", 1.0))
	if prev != f:
		form_changed.emit(self, f)


func _tick_form() -> void:
	if form == &"":
		return
	form_frames -= 1
	var regen: float = data.forms[form].get("regen", 0.0)
	if regen > 0.0:
		hp = minf(data.max_hp, hp + regen / 60.0)
	if form_frames <= 0:
		_set_form(&"")


func _form_mult(key: String, weight := 1.0) -> float:
	if form == &"":
		return 1.0
	var v: float = data.forms[form].get(key, 1.0)
	return lerpf(1.0, v, weight)


func form_color() -> Color:
	return data.forms.get(form, {}).get("color", Color.WHITE) if form != &"" else Color.WHITE


# =================================================================== física
func _physics() -> void:
	var dt := 1.0 / 60.0
	if pos.y > 0.0 or vel.y > 0.0:
		vel.y -= data.gravity * dt
		pos.y = maxf(0.0, pos.y + vel.y * dt)
	pos.x = clampf(pos.x + vel.x * dt, -STAGE_HALF, STAGE_HALF)
	# não deixa os lutadores se atravessarem
	if opponent and opponent.state != S.DOWN and state != S.DOWN:
		var d := pos.x - opponent.pos.x
		var minw := PUSH_W * 2.0
		if absf(d) < minw and absf(pos.y - opponent.pos.y) < 1.2:
			var push := (minw - absf(d)) * 0.5 * (signf(d) if d != 0.0 else -float(facing))
			pos.x = clampf(pos.x + push, -STAGE_HALF, STAGE_HALF)
	# vira para o oponente quando livre
	if opponent and state in [S.IDLE, S.WALK, S.CROUCH] and pos.y <= 0.0:
		var want := 1 if opponent.pos.x > pos.x else -1
		if want != facing:
			facing = want


func _sync_visual() -> void:
	position = Vector3(pos.x, pos.y, 0.0)
	model.set_facing(facing)
	if _flash > 0:
		_flash -= 1
		model.set_tint(Color(1, 0.35, 0.3, 0.55) if _flash > 0 else Color.WHITE)
	elif form != &"":
		var c := form_color()
		c.a = 0.10 + 0.06 * sin(Time.get_ticks_msec() * 0.012)
		model.set_tint(c)
	else:
		model.set_tint(Color.WHITE)
	if _shadow:
		_shadow.global_position = Vector3(pos.x, 0.01, 0.0)
		var s := clampf(1.0 - pos.y * 0.25, 0.4, 1.0)
		_shadow.scale = Vector3(s, 1, s)


func _make_shadow() -> void:
	_shadow = MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(0.9, 0.55)
	q.orientation = PlaneMesh.FACE_Y
	_shadow.mesh = q
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	var g := GradientTexture2D.new()
	g.fill = GradientTexture2D.FILL_RADIAL
	g.fill_from = Vector2(0.5, 0.5)
	g.fill_to = Vector2(1, 0.5)
	g.gradient = Gradient.new()
	g.gradient.colors = PackedColorArray([Color(0, 0, 0, 0.55), Color(0, 0, 0, 0)])
	mat.albedo_texture = g
	_shadow.mesh.material = mat
	_shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(_shadow)
	_shadow.top_level = true


# =================================================================== util
func _rel_x(it: Dictionary) -> float:
	return float(it.x) * facing


func _enter(s: S) -> void:
	state = s
	state_frame = 0


func _enter_if(s: S) -> void:
	if state != s:
		_enter(s)


func is_down() -> bool:
	return state in [S.DOWN, S.GETUP, S.KO, S.AIR_HIT]


func set_win() -> void:
	controls_enabled = false
	_enter(S.WIN)
	var victory := "granny_victory" if data.id == &"juraci" else "victory"
	model.play(victory, 1.0, 0.25, true)


func set_lose_time() -> void:
	controls_enabled = false
	_enter(S.WIN)
	model.play("defeated", 1.0, 0.3, true)


func play_intro() -> void:
	_enter(S.INTRO)
	var intro := "granny_taunt" if data.id == &"juraci" else ("taunt" if player_index == 1 else "power_up")
	model.play(intro, 1.0, 0.1, true)
