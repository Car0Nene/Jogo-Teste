extends Control
## Escolha da arena.

var _cursor := 0
var _cards: Array[Panel] = []
var _preview: TextureRect
var _name: Label
var _sub: Label


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_preview = TextureRect.new()
	_preview.set_anchors_preset(Control.PRESET_FULL_RECT)
	_preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	add_child(_preview)
	var shade := ColorRect.new()
	shade.color = Color(0.03, 0.01, 0.08, 0.45)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(shade)
	var t := UI.title("ESCOLHA A ARENA", 64)
	t.set_anchors_preset(Control.PRESET_CENTER_TOP)
	t.position = Vector2(-500, 30)
	t.custom_minimum_size.x = 1000
	add_child(t)
	_name = UI.title("", 96, Color.WHITE)
	_name.set_anchors_preset(Control.PRESET_CENTER)
	_name.position = Vector2(-700, -150)
	_name.custom_minimum_size.x = 1400
	add_child(_name)
	_sub = UI.label("", 30, UI.GOLD, UI.body_bold, 8)
	_sub.set_anchors_preset(Control.PRESET_CENTER)
	_sub.position = Vector2(-700, -40)
	_sub.custom_minimum_size.x = 1400
	_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(_sub)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)
	row.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	add_child(row)
	for i in Game.STAGES.size():
		var sd := Game.stage_data(Game.STAGES[i])
		var card := Panel.new()
		card.custom_minimum_size = Vector2(260, 150)
		var tr := TextureRect.new()
		tr.texture = sd.preview
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		tr.set_anchors_preset(Control.PRESET_FULL_RECT)
		tr.offset_left = 4
		tr.offset_top = 4
		tr.offset_right = -4
		tr.offset_bottom = -4
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		card.add_child(tr)
		var idx := i
		card.gui_input.connect(func(e):
			if (e is InputEventMouseButton or e is InputEventScreenTouch) and e.pressed:
				if _cursor == idx: _confirm()
				else:
					_cursor = idx
					_refresh())
		row.add_child(card)
		_cards.append(card)
	row.position = Vector2(-row.get_combined_minimum_size().x * 0.5, -230)
	var hint := UI.label("Soco/Enter: confirmar   •   Especial: aleatória   •   Defesa/Esc: voltar", 20, Color(1, 1, 1, 0.7))
	hint.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	hint.position = Vector2(-380, -50)
	add_child(hint)
	_cursor = maxi(0, Game.STAGES.find(Game.stage))
	_refresh()


func _refresh() -> void:
	var sd := Game.stage_data(Game.STAGES[_cursor])
	_preview.texture = sd.preview
	_name.text = sd.display_name
	_sub.text = sd.subtitle
	for i in _cards.size():
		var sb := StyleBoxFlat.new()
		sb.bg_color = UI.GOLD if i == _cursor else Color(0.1, 0.06, 0.2, 0.9)
		sb.set_corner_radius_all(10)
		_cards[i].add_theme_stylebox_override("panel", sb)
	Audio.sfx(&"move")


func _unhandled_input(e: InputEvent) -> void:
	if e.is_action_pressed("p1_left") or e.is_action_pressed("ui_left"):
		_cursor = wrapi(_cursor - 1, 0, Game.STAGES.size())
		_refresh()
	elif e.is_action_pressed("p1_right") or e.is_action_pressed("ui_right"):
		_cursor = wrapi(_cursor + 1, 0, Game.STAGES.size())
		_refresh()
	elif e.is_action_pressed("p1_punch") or e.is_action_pressed("ui_accept"):
		_confirm()
	elif e.is_action_pressed("p1_special"):
		_cursor = randi() % Game.STAGES.size()
		_refresh()
		_confirm()
	elif e.is_action_pressed("p1_guard") or e.is_action_pressed("ui_cancel"):
		Audio.sfx(&"back")
		Scenes.go("res://scenes/character_select.tscn")


func _confirm() -> void:
	Audio.sfx(&"select")
	Game.stage = Game.STAGES[_cursor]
	Scenes.go("res://scenes/vs_screen.tscn")
