extends Node3D
## Menu principal em duas fases:
##  1) Tela de título: logo entra com impacto, brilho passando e "PRESSIONE QUALQUER BOTÃO".
##  2) Menu: itens inclinados estilo jogo de luta, descrição do modo, lutadores 3D ao fundo.

const MODES := [
	["ARCADE", "Enfrente a família inteira em sequência até o chefão.", "arcade"],
	["VERSUS CPU", "Escolha seu lutador e um rival controlado pelo computador.", "cpu"],
	["2 JOGADORES", "Desafie alguém no mesmo teclado, controle ou tela de toque.", "2p"],
	["TREINO", "Treine combos e especiais sem tempo e com barra infinita.", "train"],
	["CONFIGURAÇÕES", "Vídeo, áudio, dificuldade, controles e toque.", "settings"],
	["CRÉDITOS", "Quem fez este jogo.", "credits"],
	["SAIR", "Fechar o jogo.", "quit"],
]

const SHINE := """
shader_type canvas_item;
uniform float t = -1.0;
uniform vec4 shine : source_color = vec4(1.0, 1.0, 1.0, 0.85);
void fragment() {
	vec4 c = texture(TEXTURE, UV) * COLOR;
	float d = abs((UV.x + UV.y * 0.35) - t);
	float s = smoothstep(0.09, 0.0, d);
	c.rgb = mix(c.rgb, shine.rgb, s * shine.a * c.a);
	COLOR = c;
}
"""

var _ui: Control
var _menu: VBoxContainer
var _desc: Label
var _cam: Camera3D
var _t := 0.0
var _phase := 0           # 0 título, 1 menu
var _logo: Control
var _press: Label
var _shine_mats: Array[ShaderMaterial] = []
var _items: Array[MenuItem] = []
var _menu_box: Control
var _hint: Label
var _fighters: Array[FighterModel] = []


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
		fm.position = Vector3(1.0 + i * 1.25, 0, -0.4 - absf(i - 1) * 0.6)
		fm.rotation_degrees.y = -25 + i * 8
		fm.play(["idle", "taunt", "idle"][i])
		_fighters.append(fm)
	# luz de destaque nos lutadores
	var spot := SpotLight3D.new()
	spot.position = Vector3(2.2, 4.5, 2.5)
	spot.light_energy = 2.2
	spot.spot_range = 10.0
	spot.spot_angle = 32.0
	spot.light_color = Color("fff1d6")
	add_child(spot)
	spot.look_at(Vector3(2.2, 0.8, -0.6))
	_cam = Camera3D.new()
	add_child(_cam)
	_cam.current = true
	_cam.fov = 38
	Audio.music(load("res://assets/audio/music/family-fighter-2.mp3"))
	_build_ui()
	_title_intro()


func _process(dt: float) -> void:
	_t += dt
	var target_pos := Vector3(sin(_t * 0.1) * 0.8 + 1.4, 1.45, 6.2) if _phase == 0 else Vector3(sin(_t * 0.12) * 0.5 + 0.2, 1.4, 5.2)
	_cam.position = _cam.position.lerp(target_pos, 1.0 - exp(-dt * 2.0))
	_cam.look_at(Vector3(1.6 if _phase == 1 else 1.4, 1.05, -0.4))
	if _press:
		_press.modulate.a = 0.35 + 0.65 * absf(sin(_t * 2.4))
	for m in _shine_mats:
		m.set_shader_parameter("t", fmod(_t * 0.45, 2.2) - 0.6)


func _unhandled_input(event: InputEvent) -> void:
	if _phase == 0 and (event is InputEventKey or event is InputEventJoypadButton or event is InputEventMouseButton or event is InputEventScreenTouch) and event.is_pressed():
		get_viewport().set_input_as_handled()
		_to_menu()


# ------------------------------------------------------------------ montagem
func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	_ui = Control.new()
	_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	_ui.mouse_filter = Control.MOUSE_FILTER_PASS
	layer.add_child(_ui)
	# vinheta + gradiente lateral
	var vig := TextureRect.new()
	var vg := GradientTexture2D.new()
	vg.fill = GradientTexture2D.FILL_RADIAL
	vg.fill_from = Vector2(0.5, 0.5)
	vg.fill_to = Vector2(1.05, 1.05)
	vg.gradient = Gradient.new()
	vg.gradient.colors = PackedColorArray([Color(0, 0, 0, 0), Color(0.02, 0.0, 0.05, 0.75)])
	vig.texture = vg
	vig.set_anchors_preset(Control.PRESET_FULL_RECT)
	vig.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	vig.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_ui.add_child(vig)
	var side := TextureRect.new()
	var sg := GradientTexture2D.new()
	sg.gradient = Gradient.new()
	sg.gradient.colors = PackedColorArray([Color(0.03, 0.01, 0.08, 0.95), Color(0.03, 0.01, 0.08, 0.0)])
	sg.fill_to = Vector2(1, 0)
	side.texture = sg
	side.set_anchors_preset(Control.PRESET_LEFT_WIDE)
	side.custom_minimum_size.x = 1000
	side.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	side.mouse_filter = Control.MOUSE_FILTER_IGNORE
	side.modulate.a = 0.0
	side.name = "Side"
	_ui.add_child(side)
	# logo
	_logo = VBoxContainer.new()
	_logo.add_theme_constant_override("separation", -38)
	_ui.add_child(_logo)
	for spec in [["FAMÍLIA", 150, Color("ffd23f")], ["FIGHTER", 196, Color("ff3d81")]]:
		var l := UI.title(spec[0], spec[1], spec[2])
		l.add_theme_constant_override("outline_size", 22)
		l.add_theme_color_override("font_outline_color", Color("1a0b24"))
		l.add_theme_constant_override("shadow_offset_x", 8)
		l.add_theme_constant_override("shadow_offset_y", 10)
		l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.55))
		var sm := ShaderMaterial.new()
		var sh := Shader.new()
		sh.code = SHINE
		sm.shader = sh
		l.material = sm
		_shine_mats.append(sm)
		_logo.add_child(l)
	var tag := UI.label("A MAIOR BRIGA DA FAMÍLIA", 30, Color(1, 1, 1, 0.85), UI.body_bold, 6)
	tag.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_logo.add_child(tag)
	_press = UI.label("PRESSIONE QUALQUER BOTÃO", 34, Color.WHITE, UI.display, 10)
	_press.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_press.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_press.position = Vector2(-330, -170)
	_press.custom_minimum_size = Vector2(660, 50)
	_ui.add_child(_press)
	# menu (invisível até sair do título)
	_menu_box = Control.new()
	_menu_box.position = Vector2(70, 360)
	_menu_box.modulate.a = 0.0
	_menu_box.visible = false
	_ui.add_child(_menu_box)
	_menu = VBoxContainer.new()
	_menu.add_theme_constant_override("separation", 4)
	_menu_box.add_child(_menu)
	var idx := 0
	for m in MODES:
		if m[2] == "quit" and (OS.has_feature("web") or OS.has_feature("mobile")):
			continue
		var it := MenuItem.new(m[0], idx, UI.PINK if idx < 4 else Color("7c5cff"))
		var key: String = m[2]
		var desc: String = m[1]
		it.pressed.connect(func():
			Audio.sfx(&"select")
			_choose(key))
		it.focus_entered.connect(func(): _set_desc(desc))
		_menu.add_child(it)
		_items.append(it)
		idx += 1
	_desc = UI.label("", 24, Color(1, 1, 1, 0.8), UI.body)
	_desc.position = Vector2(76, 360 + _items.size() * 66 + 24)
	_desc.modulate.a = 0.0
	_ui.add_child(_desc)
	# rodapé com dicas de controle
	var bar := ColorRect.new()
	bar.color = Color(0, 0, 0, 0.45)
	bar.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	bar.custom_minimum_size.y = 54
	bar.position.y = -54
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_ui.add_child(bar)
	_hint = UI.label("ENTER / A  confirmar      ESC / B  voltar      ↑ ↓  navegar", 20, Color(1, 1, 1, 0.7), UI.body_bold)
	_hint.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	_hint.position = Vector2(40, -42)
	_ui.add_child(_hint)
	var ver := UI.label("v1.1  •  Godot 4", 18, Color(1, 1, 1, 0.4))
	ver.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	ver.position = Vector2(-190, -40)
	_ui.add_child(ver)


func _title_intro() -> void:
	var vw := get_viewport().get_visible_rect().size
	await get_tree().process_frame
	_logo.position = Vector2((vw.x - _logo.size.x) * 0.5, vw.y * 0.2)
	_logo.pivot_offset = _logo.size * 0.5
	_logo.scale = Vector2.ONE * 2.6
	_logo.modulate.a = 0.0
	_press.modulate.a = 0.0
	var tw := create_tween().set_parallel(true)
	tw.tween_property(_logo, "scale", Vector2.ONE, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT).set_delay(0.25)
	tw.tween_property(_logo, "modulate:a", 1.0, 0.2).set_delay(0.25)
	tw.chain().tween_callback(func():
		Audio.sfx(&"hit_heavy")
		_flash())


func _flash() -> void:
	var r := ColorRect.new()
	r.color = Color(1, 1, 1, 0.55)
	r.set_anchors_preset(Control.PRESET_FULL_RECT)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_ui.add_child(r)
	var tw := r.create_tween()
	tw.tween_property(r, "color:a", 0.0, 0.35)
	tw.tween_callback(r.queue_free)


func _to_menu() -> void:
	if _phase == 1:
		return
	_phase = 1
	Audio.sfx(&"select")
	var tw := create_tween().set_parallel(true).set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	tw.tween_property(_logo, "scale", Vector2.ONE * 0.55, 0.45)
	tw.tween_property(_logo, "position", Vector2(-_logo.size.x * 0.2 + 40, 20), 0.45)
	tw.tween_property(_press, "modulate:a", 0.0, 0.15)
	tw.tween_property(_ui.get_node("Side"), "modulate:a", 1.0, 0.4)
	_press.queue_free()
	_press = null
	_menu_box.visible = true
	tw.tween_property(_menu_box, "modulate:a", 1.0, 0.3).set_delay(0.15)
	tw.tween_property(_desc, "modulate:a", 1.0, 0.3).set_delay(0.25)
	for i in _items.size():
		var it := _items[i]
		it.position.x = -600
		tw.tween_property(it, "position:x", 0.0, 0.4).set_delay(0.12 + i * 0.05)
	_items[0].call_deferred("grab_focus")


func _set_desc(t: String) -> void:
	_desc.text = t
	_desc.modulate.a = 0.0
	var tw := _desc.create_tween()
	tw.tween_property(_desc, "modulate:a", 1.0, 0.15)


func _choose(key: String) -> void:
	match key:
		"arcade": _go(Game.Mode.ARCADE)
		"cpu": _go(Game.Mode.VERSUS_CPU)
		"2p": _go(Game.Mode.VERSUS_2P)
		"train": _go(Game.Mode.TRAINING)
		"settings": _open_settings()
		"credits": _credits()
		"quit": get_tree().quit()


func _go(mode: Game.Mode) -> void:
	Game.mode = mode
	Scenes.go("res://scenes/character_select.tscn")


func _open_settings() -> void:
	_menu_box.visible = false
	_desc.visible = false
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_ui.add_child(center)
	var s := SettingsPanel.new()
	center.add_child(s)
	s.call_deferred("focus_first")
	s.closed.connect(func():
		center.queue_free()
		_menu_box.visible = true
		_desc.visible = true
		_items[4].grab_focus())


func _credits() -> void:
	_menu_box.visible = false
	_desc.visible = false
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_ui.add_child(center)
	var p := PanelContainer.new()
	p.custom_minimum_size = Vector2(820, 0)
	center.add_child(p)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	p.add_child(v)
	v.add_child(UI.title("CRÉDITOS", 60))
	for line in [
		"Ideia, personagens e direção: Carlos",
		"Personagens 3D: Tripo AI, a partir das artes da família",
		"Animações: Adobe Mixamo",
		"Vozes: ElevenLabs (clonadas com autorização e criadas)",
		"Cenários: objetos Tripo AI + Poly Haven (CC0)",
		"Locução de arena: Kenney (CC0)",
		"Fontes: Bebas Neue e Barlow (SIL Open Font License)",
		"Motor: Godot Engine (MIT)",
	]:
		var l := UI.label(line, 22)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(l)
	var back := UI.button("VOLTAR", func():
		center.queue_free()
		_menu_box.visible = true
		_desc.visible = true
		_items[5].grab_focus(), 260)
	back.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(back)
	back.call_deferred("grab_focus")
