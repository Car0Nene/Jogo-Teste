class_name SettingsPanel
extends PanelContainer
## Tela de configurações (usada no menu principal e na pausa).

signal closed

var _tabs: TabContainer
var _waiting_action := ""
var _key_buttons := {}


func _ready() -> void:
	set_anchors_preset(Control.PRESET_CENTER)
	custom_minimum_size = Vector2(980, 600)
	grow_horizontal = Control.GROW_DIRECTION_BOTH
	grow_vertical = Control.GROW_DIRECTION_BOTH
	process_mode = Node.PROCESS_MODE_ALWAYS
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 14)
	add_child(v)
	v.add_child(UI.title("CONFIGURAÇÕES", 56))
	_tabs = TabContainer.new()
	_tabs.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(_tabs)
	_tabs.add_child(_video_tab())
	_tabs.add_child(_audio_tab())
	_tabs.add_child(_game_tab())
	_tabs.add_child(_controls_tab())
	_tabs.add_child(_touch_tab())
	var back := UI.button("VOLTAR", func(): closed.emit(), 260)
	back.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(back)


func _page(title: String) -> ScrollContainer:
	var sc := ScrollContainer.new()
	sc.name = title
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 30)
	g.add_theme_constant_override("v_separation", 14)
	g.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(g)
	return sc


func _grid(p: ScrollContainer) -> GridContainer:
	return p.get_child(0) as GridContainer


func _row(p: ScrollContainer, label: String, ctl: Control) -> void:
	var l := UI.label(label, 24)
	l.custom_minimum_size.x = 360
	_grid(p).add_child(l)
	ctl.custom_minimum_size.x = maxf(ctl.custom_minimum_size.x, 440)
	_grid(p).add_child(ctl)


func _check(section: String, key: String) -> CheckButton:
	var c := CheckButton.new()
	c.button_pressed = bool(Settings.get_value(section, key))
	c.toggled.connect(func(on): Settings.set_value(section, key, on))
	return c


func _slider(section: String, key: String, lo: float, hi: float, step: float) -> HSlider:
	var s := HSlider.new()
	s.min_value = lo
	s.max_value = hi
	s.step = step
	s.value = float(Settings.get_value(section, key))
	s.value_changed.connect(func(v): Settings.set_value(section, key, v))
	return s


func _options(section: String, key: String, labels: Array, values: Array) -> OptionButton:
	var o := OptionButton.new()
	for l in labels:
		o.add_item(l)
	var cur = Settings.get_value(section, key)
	o.selected = maxi(0, values.find(cur))
	o.item_selected.connect(func(i): Settings.set_value(section, key, values[i]))
	return o


func _video_tab() -> Control:
	var p := _page("Vídeo")
	if not OS.has_feature("mobile") and not OS.has_feature("web"):
		_row(p, "Tela cheia", _check("video", "fullscreen"))
	_row(p, "Sincronia vertical (VSync)", _check("video", "vsync"))
	_row(p, "Qualidade gráfica", _options("video", "quality", ["Baixa", "Média", "Alta"], [0, 1, 2]))
	_row(p, "Resolução 3D", _options("video", "render_scale", ["50%", "75%", "85%", "100%"], [0.5, 0.75, 0.85, 1.0]))
	_row(p, "Mostrar FPS", _check("video", "show_fps"))
	return p


func _audio_tab() -> Control:
	var p := _page("Áudio")
	_row(p, "Volume geral", _slider("audio", "master", 0, 1, 0.05))
	_row(p, "Música", _slider("audio", "music", 0, 1, 0.05))
	_row(p, "Efeitos", _slider("audio", "sfx", 0, 1, 0.05))
	_row(p, "Vozes", _slider("audio", "voice", 0, 1, 0.05))
	return p


func _game_tab() -> Control:
	var p := _page("Jogo")
	_row(p, "Dificuldade da CPU", _options("game", "difficulty", ["Fácil", "Normal", "Difícil", "Mestre"], [0, 1, 2, 3]))
	_row(p, "Rounds para vencer", _options("game", "rounds", ["1", "2", "3"], [1, 2, 3]))
	_row(p, "Tempo do round", _options("game", "timer", ["60 s", "99 s", "Infinito"], [60, 99, 9999]))
	_row(p, "Vibração (celular)", _check("game", "vibration"))
	return p


func _controls_tab() -> Control:
	var p := _page("Controles")
	for player in [1, 2]:
		var h := UI.label("JOGADOR %d (teclado)" % player, 26, UI.GOLD, UI.body_bold)
		_grid(p).add_child(h)
		_grid(p).add_child(Control.new())
		for a in Settings.ACTIONS:
			var action := "p%d_%s" % [player, a]
			var b := Button.new()
			b.text = OS.get_keycode_string(Settings.key_for(action))
			b.custom_minimum_size = Vector2(240, 46)
			b.pressed.connect(func(): _wait_key(action, b))
			_key_buttons[action] = b
			_row(p, Settings.ACTION_LABELS[a], b)
	var reset := UI.button("Restaurar padrão", func():
		Settings.reset_controls()
		for act in _key_buttons:
			_key_buttons[act].text = OS.get_keycode_string(Settings.key_for(act)), 300)
	_grid(p).add_child(reset)
	_grid(p).add_child(UI.label("Controles (Xbox/PlayStation) funcionam automaticamente.", 18, Color(1, 1, 1, 0.7)))
	return p


func _touch_tab() -> Control:
	var p := _page("Toque")
	_row(p, "Botões de toque", _options("touch", "mode", ["Automático", "Sempre", "Nunca"], [0, 1, 2]))
	_row(p, "Transparência", _slider("touch", "opacity", 0.3, 1.0, 0.05))
	_row(p, "Tamanho", _slider("touch", "size", 0.7, 1.4, 0.05))
	return p


func _wait_key(action: String, b: Button) -> void:
	_waiting_action = action
	b.text = "Aperte uma tecla..."


func _input(event: InputEvent) -> void:
	if _waiting_action == "" or not (event is InputEventKey) or not event.pressed:
		return
	get_viewport().set_input_as_handled()
	if event.physical_keycode != KEY_ESCAPE:
		Settings.remap(_waiting_action, event.physical_keycode)
	_key_buttons[_waiting_action].text = OS.get_keycode_string(Settings.key_for(_waiting_action))
	_waiting_action = ""


func focus_first() -> void:
	_tabs.get_tab_bar().grab_focus()
