extends Node3D
## Menu principal: arena ao fundo com lutadores 3D animados e câmera em movimento lento.

var _ui: Control
var _menu: VBoxContainer
var _cam: Camera3D
var _t := 0.0
var _settings: SettingsPanel


func _ready() -> void:
	var stage := Stage.new()
	stage.stage_id = Game.STAGES[randi() % Game.STAGES.size()]
	add_child(stage)
	var ids := Game.ROSTER.duplicate()
	ids.shuffle()
	for i in 3:
		var fm := FighterModel.new()
		add_child(fm)
		var d := Game.fighter(ids[i])
		fm.setup(d.model, d.height_m)
		fm.position = Vector3(-1.6 + i * 1.6, 0, -0.6 + absf(i - 1) * 0.5)
		fm.rotation_degrees.y = 20 - i * 20
		fm.play(["idle", "taunt", "idle"][i])
	_cam = Camera3D.new()
	add_child(_cam)
	_cam.current = true
	_cam.fov = 40
	Audio.music(load("res://assets/audio/music/family-fighter-2.mp3"))
	_build_ui()


func _process(dt: float) -> void:
	_t += dt
	_cam.position = Vector3(sin(_t * 0.12) * 1.2 + 1.8, 1.5, 5.6)
	_cam.look_at(Vector3(0.6, 1.0, 0))


func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	_ui = Control.new()
	_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(_ui)
	var grad := TextureRect.new()
	var g := GradientTexture2D.new()
	g.gradient = Gradient.new()
	g.gradient.colors = PackedColorArray([Color(0.03, 0.01, 0.08, 0.92), Color(0.03, 0.01, 0.08, 0.0)])
	g.fill_to = Vector2(1, 0)
	grad.texture = g
	grad.set_anchors_preset(Control.PRESET_LEFT_WIDE)
	grad.custom_minimum_size.x = 900
	grad.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_ui.add_child(grad)
	var v := VBoxContainer.new()
	v.position = Vector2(110, 120)
	v.add_theme_constant_override("separation", 10)
	_ui.add_child(v)
	var t1 := UI.title("FAMÍLIA", 120, Color("ffd23f"))
	t1.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	v.add_child(t1)
	var t2 := UI.title("FIGHTER", 150, Color("ff3d81"))
	t2.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	v.add_child(t2)
	v.add_child(UI.label("A maior briga da família — agora em 3D", 26, Color(1, 1, 1, 0.8), UI.body_bold))
	var spacer := Control.new()
	spacer.custom_minimum_size.y = 26
	v.add_child(spacer)
	_menu = VBoxContainer.new()
	_menu.add_theme_constant_override("separation", 10)
	v.add_child(_menu)
	var items := [
		["ARCADE", func(): _go(Game.Mode.ARCADE)],
		["VERSUS CPU", func(): _go(Game.Mode.VERSUS_CPU)],
		["2 JOGADORES", func(): _go(Game.Mode.VERSUS_2P)],
		["TREINO", func(): _go(Game.Mode.TRAINING)],
		["CONFIGURAÇÕES", _open_settings],
		["CRÉDITOS", _credits],
	]
	if not OS.has_feature("web") and not OS.has_feature("mobile"):
		items.append(["SAIR", func(): get_tree().quit()])
	for it in items:
		_menu.add_child(UI.button(it[0], it[1], 420))
	(_menu.get_child(0) as Button).call_deferred("grab_focus")
	var ver := UI.label("v1.0  •  Godot 4", 16, Color(1, 1, 1, 0.4))
	ver.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	ver.position = Vector2(-200, -40)
	_ui.add_child(ver)


func _go(mode: Game.Mode) -> void:
	Game.mode = mode
	Scenes.go("res://scenes/character_select.tscn")


func _open_settings() -> void:
	_menu.visible = false
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_ui.add_child(center)
	_settings = SettingsPanel.new()
	center.add_child(_settings)
	_settings.call_deferred("focus_first")
	_settings.closed.connect(func():
		center.queue_free()
		_menu.visible = true
		(_menu.get_child(4) as Button).grab_focus())


func _credits() -> void:
	_menu.visible = false
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_ui.add_child(center)
	var p := PanelContainer.new()
	p.custom_minimum_size = Vector2(760, 0)
	center.add_child(p)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	p.add_child(v)
	v.add_child(UI.title("CRÉDITOS", 56))
	for line in [
		"Ideia, personagens e direção: Carlos",
		"Personagens 3D: gerados com Tripo AI a partir das artes da família",
		"Animações: Adobe Mixamo",
		"Locução de arena: Kenney (CC0)",
		"Fontes: Bebas Neue e Barlow (SIL Open Font License)",
		"Motor: Godot Engine (MIT)",
	]:
		var l := UI.label(line, 22)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(l)
	var back := UI.button("VOLTAR", func():
		center.queue_free()
		_menu.visible = true
		(_menu.get_child(5) as Button).grab_focus(), 260)
	back.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(back)
	back.call_deferred("grab_focus")
