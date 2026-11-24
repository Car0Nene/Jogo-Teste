class_name TouchControls
extends CanvasLayer
## Controles de toque (celular/tablet): analógico virtual à esquerda e 4 botões à direita
## (Soco, Chute, Defesa, Especial), mais botão de pausa. Viram as ações "p1_*".

const BTN := [
	{"action": "p1_punch", "label": "SOCO", "color": Color("2563eb"), "off": Vector2(-250, -150)},
	{"action": "p1_kick", "label": "CHUTE", "color": Color("dc2626"), "off": Vector2(-120, -190)},
	{"action": "p1_guard", "label": "DEFESA", "color": Color("16a34a"), "off": Vector2(-280, -30)},
	{"action": "p1_special", "label": "ESPECIAL", "color": Color("f59e0b"), "off": Vector2(-140, -60)},
]

var _canvas: Control
var _stick_center := Vector2.ZERO
var _stick_vec := Vector2.ZERO
var _stick_id := -1
var _btn_ids := {}
var _active := true


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


func _scale() -> float:
	var vs := _canvas.get_viewport_rect().size
	return float(Settings.get_value("touch", "size")) * clampf(vs.y / 720.0, 0.8, 1.6)


func _btn_pos(b: Dictionary) -> Vector2:
	var vs := _canvas.get_viewport_rect().size
	return vs + b.off * _scale()


func _stick_home() -> Vector2:
	var vs := _canvas.get_viewport_rect().size
	return Vector2(170, vs.y - 170) * Vector2(_scale(), 1.0) + Vector2(0, (1.0 - _scale()) * 0.0)


func _process(_dt: float) -> void:
	if visible:
		_canvas.queue_redraw()


func _input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventScreenTouch:
		var p: Vector2 = event.position
		if event.pressed:
			_press(event.index, p)
		else:
			_release(event.index)
	elif event is InputEventScreenDrag and event.index == _stick_id:
		_update_stick(event.position)


func _press(idx: int, p: Vector2) -> void:
	var vs := _canvas.get_viewport_rect().size
	if p.distance_to(Vector2(vs.x * 0.5, 40)) < 50:
		var ev := InputEventAction.new()
		ev.action = "pause"
		ev.pressed = true
		Input.parse_input_event(ev)
		return
	if not _active:
		return
	var r := 62.0 * _scale()
	for b in BTN:
		if p.distance_to(_btn_pos(b)) < r:
			_btn_ids[idx] = b.action
			Input.action_press(b.action)
			return
	if p.x < vs.x * 0.45 and _stick_id == -1:
		_stick_id = idx
		_stick_center = p
		_update_stick(p)


func _release(idx: int) -> void:
	if _btn_ids.has(idx):
		Input.action_release(_btn_ids[idx])
		_btn_ids.erase(idx)
	if idx == _stick_id:
		_stick_id = -1
		_stick_vec = Vector2.ZERO
		_apply_stick()


func _release_all() -> void:
	for idx in _btn_ids.keys():
		Input.action_release(_btn_ids[idx])
	_btn_ids.clear()
	_stick_id = -1
	_stick_vec = Vector2.ZERO
	_apply_stick()


func _update_stick(p: Vector2) -> void:
	var rad := 90.0 * _scale()
	_stick_vec = ((p - _stick_center) / rad).limit_length(1.0)
	_apply_stick()


func _apply_stick() -> void:
	_hold("p1_left", _stick_vec.x < -0.35)
	_hold("p1_right", _stick_vec.x > 0.35)
	_hold("p1_up", _stick_vec.y < -0.55)
	_hold("p1_down", _stick_vec.y > 0.5)


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
	var vs := _canvas.get_viewport_rect().size
	var c := _stick_center if _stick_id != -1 else _stick_home()
	var rad := 90.0 * s
	_canvas.draw_circle(c, rad + 10, Color(1, 1, 1, 0.08 * a))
	_canvas.draw_arc(c, rad + 10, 0, TAU, 48, Color(1, 1, 1, 0.5 * a), 3)
	for d in [Vector2.UP, Vector2.DOWN, Vector2.LEFT, Vector2.RIGHT]:
		var tip: Vector2 = c + d * (rad - 4)
		var side := Vector2(-d.y, d.x)
		_canvas.draw_colored_polygon(PackedVector2Array([tip + d * 6, tip - d * 14 + side * 11, tip - d * 14 - side * 11]), Color(1, 1, 1, 0.4 * a))
	var knob := c + _stick_vec * rad * 0.75
	_canvas.draw_circle(knob, 40 * s, Color(0.75, 0.05, 0.1, a))
	_canvas.draw_circle(knob - Vector2(10, 12) * s, 12 * s, Color(1, 1, 1, 0.45 * a))
	for b in BTN:
		var p := _btn_pos(b)
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
	# pausa
	var pp := Vector2(vs.x * 0.5, 40)
	_canvas.draw_circle(pp, 0.0, Color.TRANSPARENT)
