extends Node3D
## Menu de configurações gráficas

var _ui: Control
var _selected := 0

func _ready() -> void:
	_build_ui()

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	_ui = Control.new()
	_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(_ui)
	
	var title := UI.title("CONFIGURAÇÕES GRÁFICAS", 64)
	title.set_anchors_preset(Control.PRESET_CENTER_TOP)
	title.position = Vector2(-500, 24)
	title.custom_minimum_size.x = 1000
	_ui.add_child(title)
	
	var vbox := VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_CENTER)
	vbox.position = Vector2(-400, -150)
	vbox.custom_minimum_size = Vector2(800, 400)
	vbox.add_theme_constant_override("separation", 20)
	_ui.add_child(vbox)
	
	# Título da seção de qualidade
	var quality_label := UI.label("QUALIDADE DE TEXTURAS", 28, UI.GOLD, UI.body_bold, 12)
	vbox.add_child(quality_label)
	
	# Opções de qualidade
	var qualities = [
		{"name": "ALTA (4K, MSAA 2x, SSAO)", "value": GraphicsQuality.Quality.HIGH},
		{"name": "MÉDIO (2K, MSAA 1x, SSAO)", "value": GraphicsQuality.Quality.MEDIUM},
		{"name": "BAIXA (1K, MSAA 1x)", "value": GraphicsQuality.Quality.LOW},
	]
	
	for i in qualities.size():
		var quality = qualities[i]
		var btn := Button.new()
		btn.text = quality["name"]
		btn.custom_minimum_size = Vector2(0, 60)
		btn.modulate = Color.WHITE if i == _selected else Color(1, 1, 1, 0.6)
		btn.pressed.connect(func():
			GraphicsQuality.set_quality(quality["value"])
			_selected = i
			_refresh_ui())
		vbox.add_child(btn)
	
	# Informação
	var info := UI.label(
		"Qualidade atual: %s\n" % GraphicsQuality.get_quality_name().to_upper() +
		"As mudanças são salvas automaticamente.",
		18, Color(1, 1, 1, 0.7), UI.body, 12)
	info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(info)
	
	# Voltar
	var back := UI.button("VOLTAR", func(): Scenes.go("res://scenes/main_menu.tscn"), 200)
	back.position = Vector2(30, 30)
	back.focus_mode = Control.FOCUS_NONE
	_ui.add_child(back)

func _refresh_ui() -> void:
	# Atualizar seleção visual
	for i in _ui.get_child(1).get_children().size():
		var child = _ui.get_child(1).get_child(i)
		if child is Button:
			child.modulate = Color.WHITE if i == _selected else Color(1, 1, 1, 0.6)

func _unhandled_input(e: InputEvent) -> void:
	if e.is_action_pressed("ui_cancel"):
		Scenes.go("res://scenes/main_menu.tscn")
