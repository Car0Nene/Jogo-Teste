extends Node3D
## Seleção de lutador com os modelos 3D em destaque.

var _cursor := [0, 1]
var _locked := [false, false]
var _picking := 0                # quem está escolhendo (modos contra CPU: 0 e depois 1)
var _models: Array[FighterModel] = [null, null]
var _cards: Array[Panel] = []
var _info: Array[VBoxContainer] = []
var _ui: Control
var _cam: Camera3D
var _two_players := false


func _ready() -> void:
	_two_players = Game.mode == Game.Mode.VERSUS_2P
	_build_studio()
	_build_ui()
	_cursor[0] = maxi(0, Game.ROSTER.find(Game.p1_fighter))
	_cursor[1] = maxi(0, Game.ROSTER.find(Game.p2_fighter))
	_refresh(0)
	_refresh(1)
	_info[1].visible = Game.mode != Game.Mode.ARCADE
	if _models[1]: _models[1].visible = Game.mode != Game.Mode.ARCADE


func _build_studio() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("120a24")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("6b4fa0")
	env.ambient_light_energy = 0.5
	env.glow_enabled = true
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_light_color = Color("1d0f3a")
	env.fog_density = 0.04
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var floor := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(30, 20)
	floor.mesh = pm
	var fm := StandardMaterial3D.new()
	fm.albedo_color = Color("1a1030")
	fm.metallic = 0.6
	fm.roughness = 0.25
	floor.material_override = fm
	add_child(floor)
	for i in 2:
		var spot := SpotLight3D.new()
		spot.position = Vector3(-2.2 if i == 0 else 2.2, 4.5, 2.0)
		spot.look_at_from_position(spot.position, Vector3(spot.position.x, 0, 0))
		spot.spot_angle = 26
		spot.light_energy = 6.0
		spot.light_color = Color("ffd6e8") if i == 0 else Color("cfe3ff")
		spot.shadow_enabled = true
		add_child(spot)
		var fm2 := FighterModel.new()
		add_child(fm2)
		fm2.position = Vector3(-2.2 if i == 0 else 2.2, 0, 0)
		_models[i] = fm2
	var key := DirectionalLight3D.new()
	key.rotation_degrees = Vector3(-30, 10, 0)
	key.light_energy = 0.6
	add_child(key)
	_cam = Camera3D.new()
	_cam.position = Vector3(0, 1.45, 6.4)
	_cam.fov = 38
	add_child(_cam)
	_cam.current = true
	_cam.look_at(Vector3(0, 1.0, 0))


func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	_ui = Control.new()
	_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(_ui)
	var top := UI.title("ESCOLHA SEU LUTADOR", 64)
	top.set_anchors_preset(Control.PRESET_CENTER_TOP)
	top.position = Vector2(-500, 24)
	top.custom_minimum_size.x = 1000
	_ui.add_child(top)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	row.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	_ui.add_child(row)
	for i in Game.ROSTER.size():
		var d := Game.fighter(Game.ROSTER[i])
		var card := Panel.new()
		card.custom_minimum_size = Vector2(132, 150)
		var tr := TextureRect.new()
		tr.texture = d.portrait
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		tr.set_anchors_preset(Control.PRESET_FULL_RECT)
		tr.offset_bottom = -28
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		card.add_child(tr)
		var nm := UI.label(d.display_name, 20, Color.WHITE, UI.body_bold)
		nm.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
		nm.offset_top = -28
		nm.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		card.add_child(nm)
		var idx := i
		card.gui_input.connect(func(e):
			if (e is InputEventMouseButton and e.pressed) or (e is InputEventScreenTouch and e.pressed):
				var who := _picking
				if _cursor[who] == idx:
					_confirm(who)
				else:
					_cursor[who] = idx
					_refresh(who))
		row.add_child(card)
		_cards.append(card)
	row.position = Vector2(-row.get_combined_minimum_size().x * 0.5, -190)
	for p in 2:
		var v := VBoxContainer.new()
		v.position = Vector2(60, 150) if p == 0 else Vector2(0, 150)
		if p == 1:
			v.set_anchors_preset(Control.PRESET_TOP_RIGHT)
			v.position = Vector2(-540, 150)
		v.custom_minimum_size.x = 480
		_ui.add_child(v)
		_info.append(v)
	var hint := UI.label("Setas/analógico: escolher   •   Soco/Enter: confirmar   •   Defesa/Esc: voltar   •   Especial: aleatório", 18, Color(1, 1, 1, 0.6))
	hint.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	hint.position = Vector2(-560, -32)
	_ui.add_child(hint)
	var back := UI.button("VOLTAR", func(): _back(_picking), 200)
	back.position = Vector2(30, 30)
	back.focus_mode = Control.FOCUS_NONE
	_ui.add_child(back)


func _refresh(p: int) -> void:
	var d := Game.fighter(Game.ROSTER[_cursor[p]])
	_models[p].setup(d.model, d.height_m)
	_models[p].rotation_degrees.y = 25 if p == 0 else -25
	_models[p].play("taunt" if not _locked[p] else ("granny_victory" if d.id == &"juraci" else "victory"))
	var v := _info[p]
	for c in v.get_children():
		c.queue_free()
	var who := "JOGADOR %d" % (p + 1) if (_two_players or p == 0) else "CPU"
	var head := UI.label(who + ("  ✔" if _locked[p] else ""), 22, UI.GOLD if p == 0 else Color("7dd3fc"), UI.body_bold, 6)
	v.add_child(head)
	v.add_child(UI.label(d.display_name, 72, d.accent, UI.display, 12))
	v.add_child(UI.label(d.title, 26, Color.WHITE, UI.body_bold, 6))
	var q := UI.label("“%s”" % d.quote, 22, Color(1, 1, 1, 0.85), UI.body, 6)
	q.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(q)
	v.add_child(UI.label("★ " + d.special_name, 22, Color("fde68a"), UI.body_bold, 6))
	v.add_child(UI.label("★ " + d.sub_special_name, 22, Color("fde68a"), UI.body_bold, 6))
	if p == 1:
		for c in v.get_children():
			if c is Label: c.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	for i in _cards.size():
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(0.1, 0.06, 0.2, 0.92)
		sb.set_corner_radius_all(10)
		var c0: bool = _cursor[0] == i
		var c1: bool = _cursor[1] == i and (Game.mode != Game.Mode.ARCADE)
		sb.set_border_width_all(4 if (c0 or c1) else 1)
		sb.border_color = UI.GOLD if c0 and not c1 else (Color("7dd3fc") if c1 and not c0 else (Color("a78bfa") if c0 and c1 else Color(1, 1, 1, 0.12)))
		_cards[i].add_theme_stylebox_override("panel", sb)
		_cards[i].scale = Vector2.ONE * (1.06 if (c0 or c1) else 1.0)
	Audio.sfx(&"move")


func _unhandled_input(e: InputEvent) -> void:
	for p in 2:
		var pre := "p%d_" % (p + 1)
		var who := p
		if not _two_players:
			if p == 1:
				continue
			who = _picking
		if e.is_action_pressed(pre + "left") or (p == 0 and e.is_action_pressed("ui_left")):
			_move(who, -1)
		elif e.is_action_pressed(pre + "right") or (p == 0 and e.is_action_pressed("ui_right")):
			_move(who, 1)
		elif e.is_action_pressed(pre + "punch") or e.is_action_pressed(pre + "kick") or (p == 0 and e.is_action_pressed("ui_accept")):
			_confirm(who)
		elif e.is_action_pressed(pre + "special"):
			_cursor[who] = randi() % Game.ROSTER.size()
			_refresh(who)
			_confirm(who)
		elif e.is_action_pressed(pre + "guard") or (p == 0 and e.is_action_pressed("ui_cancel")):
			_back(who)


func _move(p: int, d: int) -> void:
	if _locked[p]:
		return
	_cursor[p] = wrapi(_cursor[p] + d, 0, Game.ROSTER.size())
	_refresh(p)


func _confirm(p: int) -> void:
	if _locked[p]:
		return
	_locked[p] = true
	Audio.sfx(&"select")
	var d := Game.fighter(Game.ROSTER[_cursor[p]])
	var v: AudioStream = d.voices.get(&"select", d.voices.get(&"special"))
	if v: Audio.voice(v, 1, 0.0, &"select")
	_refresh(p)
	if Game.mode == Game.Mode.ARCADE:
		Game.start_arcade(Game.ROSTER[_cursor[0]])
		await get_tree().create_timer(0.8).timeout
		Scenes.go("res://scenes/vs_screen.tscn")
		return
	if not _two_players and p == 0:
		_picking = 1
		return
	if _locked[0] and _locked[1]:
		Game.p1_fighter = Game.ROSTER[_cursor[0]]
		Game.p2_fighter = Game.ROSTER[_cursor[1]]
		await get_tree().create_timer(0.8).timeout
		Scenes.go("res://scenes/stage_select.tscn")


func _back(p: int) -> void:
	Audio.sfx(&"back")
	if _locked[p]:
		_locked[p] = false
		_refresh(p)
	elif not _two_players and _picking == 1:
		_picking = 0
		_locked[0] = false
		_refresh(0)
	else:
		Scenes.go("res://scenes/main_menu.tscn")
