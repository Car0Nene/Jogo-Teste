class_name TouchControls
extends CanvasLayer
## Controles de toque (celular/tablet).
##  • 1 jogador: analógico à esquerda e 4 botões à direita (ações "p1_*").
##  • 2 jogadores (mesmo aparelho): cada um usa uma metade da tela — P1 à esquerda,
##    P2 à direita, cada lado com analógico e 4 botões (ações "p1_*" / "p2_*").
##  • Botão de pausa visível no topo, abaixo do cronômetro.

const BTN_1P := [
	{"key": "punch", "label": "SOCO", "color": Color("2563eb"), "off": Vector2(-250, -150)},
	{"key": "kick", "label": "CHUTE", "color": Color("dc2626"), "off": Vector2(-120, -190)},
	{"key": "guard", "label": "DEFESA", "color": Color("16a34a"), "off": Vector2(-280, -30)},
	{"key": "special", "label": "ESPECIAL", "color": Color("f59e0b"), "off": Vector2(-140, -60)},
]
## Layout compacto por metade de tela (offset relativo ao canto inferior do lado).
const BTN_2P := [
	{"key": "punch", "label": "SOCO", "color": Color("2563eb"), "off": Vector2(300, -170)},
	{"key": "kick", "label": "CHUTE", "color": Color("dc2626"), "off": Vector2(400, -230)},
	{"key": "guard", "label": "DEF", "color": Color("16a34a"), "off": Vector2(290, -60)},
	{"key": "special", "label": "ESP", "color": Color("f59e0b"), "off": Vector2(395, -110)},
]
const PAUSE_Y := 108.0
const PAUSE_R := 30.0

var two_players := false
var _canvas: Control
var _active := true
## Estado por jogador: centro do analógico, vetor, toque que o controla
var _pad := [
	{"center": Vector2.ZERO, "vec": Vector2.ZERO, "id": -1},
	{"center": Vector2.ZERO, "vec": Vector2.ZERO, "id": -1},
]
var _btn_ids := {}            # índice do toque -> ação pressionada
var _pause_flash := 0.0


func _ready() -> void:
	layer = 20
	_canvas = Control.new()
	_canvas.set_anchors_preset(Control.PRESET_FULL_RECT)
	_canvas.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_canvas)
	_canvas.draw.connect(_draw)
	Settings.changed.connect(_refresh)
	_refresh()


func _refresh() -> void:
	visible = Settings.touch_visible()


func set_active(on: bool) -> void:
	_active = on
	if not on:
		_release_all()


func _vs() -> Vector2:
	return _canvas.get_viewport_rect().size


func _scale() -> float:
	var base := float(Settings.get_value("touch", "size")) * clampf(_vs().y / 720.0, 0.8, 1.6)
	return base * (0.78 if two_players else 1.0)


func _players() -> int:
	return 2 if two_players else 1


func _buttons(player: int) -> Array:
	var out := []
	var vs := _vs()
	var s := _scale()
	for b in (BTN_2P if two_players else BTN_1P):
		var pos: Vector2
		if not two_players:
			pos = vs + b.off * s
		elif player == 0:
			pos = Vector2(0, vs.y) + b.off * s
		else:
			pos = Vector2(vs.x - b.off.x * s, vs.y + b.off.y * s)
		out.append({"action": "p%d_%s" % [player + 1, b.key], "label": b.label, "color": b.color, "pos": pos})
	return out


func _stick_home(player: int) -> Vector2:
	var vs := _vs()
	var s := _scale()
	if player == 0:
		return Vector2(150 * s + 20, vs.y - 160 * s)
	return Vector2(vs.x - 150 * s - 20, vs.y - 160 * s)


func _pause_pos() -> Vector2:
	return Vector2(_vs().x * 0.5, PAUSE_Y)


func _process(dt: float) -> void:
	_pause_flash = maxf(0.0, _pause_flash - dt * 3.0)
	if visible:
		_canvas.queue_redraw()


func _input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventScreenTouch:
		if event.pressed:
			_press(event.index, event.position)
		else:
			_release(event.index)
	elif event is InputEventScreenDrag:
		for i in _players():
			if _pad[i].id == event.index:
				_update_stick(i, event.position)


func _press(idx: int, p: Vector2) -> void:
	if p.distance_to(_pause_pos()) < PAUSE_R * 1.8:
		_pause_flash = 1.0
		var ev := InputEventAction.new()
		ev.action = "pause"
		ev.pressed = true
		Input.parse_input_event(ev)
		return
	if not _active:
		return
	var r := 62.0 * _scale()
	for pl in _players():
		for b in _buttons(pl):
			if p.distance_to(b.pos) < r:
				_btn_ids[idx] = b.action
				Input.action_press(b.action)
				return
	# analógico: metade esquerda = P1; em 2P, metade direita = P2
	var vs := _vs()
	var pl := 0
	if two_players and p.x > vs.x * 0.5:
		pl = 1
	elif not two_players and p.x > vs.x * 0.45:
		return
	if _pad[pl].id == -1:
		_pad[pl].id = idx
		_pad[pl].center = p
		_update_stick(pl, p)


func _release(idx: int) -> void:
	if _btn_ids.has(idx):
		Input.action_release(_btn_ids[idx])
		_btn_ids.erase(idx)
	for i in 2:
		if _pad[i].id == idx:
			_pad[i].id = -1
			_pad[i].vec = Vector2.ZERO
			_apply_stick(i)


func _release_all() -> void:
	for idx in _btn_ids.keys():
		Input.action_release(_btn_ids[idx])
	_btn_ids.clear()
	for i in 2:
		_pad[i].id = -1
		_pad[i].vec = Vector2.ZERO
		_apply_stick(i)


func _update_stick(i: int, p: Vector2) -> void:
	var rad := 90.0 * _scale()
	_pad[i].vec = ((p - _pad[i].center) / rad).limit_length(1.0)
	_apply_stick(i)


func _apply_stick(i: int) -> void:
	var v: Vector2 = _pad[i].vec
	var pre := "p%d_" % (i + 1)
	_hold(pre + "left", v.x < -0.35)
	_hold(pre + "right", v.x > 0.35)
	_hold(pre + "up", v.y < -0.55)
	_hold(pre + "down", v.y > 0.5)


func _hold(action: String, on: bool) -> void:
	if on and not Input.is_action_pressed(action):
		Input.action_press(action)
	elif not on and Input.is_action_pressed(action):
		Input.action_release(action)


func _exit_tree() -> void:
	_release_all()


func _draw() -> void:
	var a := float(Settings.get_value("touch", "opacity"))
	var s := _scale()
	for i in _players():
		var c: Vector2 = _pad[i].center if _pad[i].id != -1 else _stick_home(i)
		var rad := 90.0 * s
		_canvas.draw_circle(c, rad + 10, Color(1, 1, 1, 0.08 * a))
		_canvas.draw_arc(c, rad + 10, 0, TAU, 48, Color(1, 1, 1, 0.5 * a), 3)
		for d in [Vector2.UP, Vector2.DOWN, Vector2.LEFT, Vector2.RIGHT]:
			var tip: Vector2 = c + d * (rad - 4)
			var side := Vector2(-d.y, d.x)
			_canvas.draw_colored_polygon(PackedVector2Array([tip + d * 6, tip - d * 14 + side * 11, tip - d * 14 - side * 11]), Color(1, 1, 1, 0.4 * a))
		var knob: Vector2 = c + _pad[i].vec * rad * 0.75
		var kc := Color(0.75, 0.05, 0.1, a) if i == 0 else Color(0.1, 0.3, 0.85, a)
		_canvas.draw_circle(knob, 40 * s, kc)
		_canvas.draw_circle(knob - Vector2(10, 12) * s, 12 * s, Color(1, 1, 1, 0.45 * a))
		if two_players:
			var tag := "P%d" % (i + 1)
			_canvas.draw_string_outline(UI.display, c + Vector2(-16, -rad - 22), tag, HORIZONTAL_ALIGNMENT_LEFT, -1, 30, 6, Color(0, 0, 0, a))
			_canvas.draw_string(UI.display, c + Vector2(-16, -rad - 22), tag, HORIZONTAL_ALIGNMENT_LEFT, -1, 30, kc.lightened(0.3))
		for b in _buttons(i):
			var p: Vector2 = b.pos
			var pressed := Input.is_action_pressed(b.action)
			var col: Color = b.color
			_canvas.draw_circle(p, 58 * s, Color(1, 1, 1, 0.9 * a))
			_canvas.draw_circle(p, 53 * s, (col.darkened(0.3) if pressed else col) * Color(1, 1, 1, a))
			_canvas.draw_circle(p - Vector2(14, 16) * s, 16 * s, Color(1, 1, 1, 0.25 * a))
			var f := UI.body_bold
			var fs := int(20 * s)
			var w := f.get_string_size(b.label, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
			_canvas.draw_string_outline(f, p + Vector2(-w * 0.5, fs * 0.35), b.label, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 5, Color(0, 0, 0, a))
			_canvas.draw_string(f, p + Vector2(-w * 0.5, fs * 0.35), b.label, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(1, 1, 1, a))
	# botão de pausa (abaixo do cronômetro)
	var pp := _pause_pos()
	_canvas.draw_circle(pp, PAUSE_R + 3, Color(1, 1, 1, 0.85 * a))
	_canvas.draw_circle(pp, PAUSE_R, Color(0.08, 0.05, 0.15, 0.85 * a).lerp(UI.GOLD, _pause_flash))
	var bw := PAUSE_R * 0.22
	var bh := PAUSE_R * 0.9
	_canvas.draw_rect(Rect2(pp + Vector2(-bw * 2.0, -bh * 0.5), Vector2(bw, bh)), Color(1, 1, 1, a))
	_canvas.draw_rect(Rect2(pp + Vector2(bw, -bh * 0.5), Vector2(bw, bh)), Color(1, 1, 1, a))
