extends Control
## Tela "VERSUS" antes da luta.

var _load_bar: ProgressBar


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	Game.preload_fight()
	var a := Game.fighter(Game.p1_fighter)
	var b := Game.fighter(Game.p2_fighter)
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color("0d0720")
	add_child(bg)
	for i in 2:
		var d := a if i == 0 else b
		var half := ColorRect.new()
		half.color = d.accent.darkened(0.55)
		half.set_anchors_preset(Control.PRESET_LEFT_WIDE if i == 0 else Control.PRESET_RIGHT_WIDE)
		half.custom_minimum_size.x = 960
		half.size.x = 960
		if i == 1:
			half.position.x = -960
		add_child(half)
		var img := TextureRect.new()
		img.texture = load("res://assets/ui/fullbody/%s.png" % d.id)
		img.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		img.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		img.size = Vector2(1000, 1000)
		img.position = Vector2(-1000 if i == 0 else 2000, 60)
		img.flip_h = i == 1
		add_child(img)
		var tw := img.create_tween()
		tw.tween_property(img, "position:x", 20.0 if i == 0 else 900.0, 0.45).set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
		var nm := UI.label(d.display_name, 96, d.accent.lightened(0.3), UI.display, 16)
		nm.position = Vector2(80, 900) if i == 0 else Vector2(1180, 900)
		add_child(nm)
		var tt := UI.label(d.title, 30, Color.WHITE, UI.body_bold, 8)
		tt.position = nm.position + Vector2(6, -30)
		add_child(tt)
	var vs := UI.title("VS", 220, UI.GOLD)
	vs.set_anchors_preset(Control.PRESET_CENTER)
	vs.position = Vector2(-200, -160)
	vs.custom_minimum_size.x = 400
	vs.pivot_offset = Vector2(200, 130)
	vs.scale = Vector2.ONE * 3.0
	add_child(vs)
	var tw2 := vs.create_tween()
	tw2.tween_interval(0.35)
	tw2.tween_property(vs, "scale", Vector2.ONE, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	var sd := Game.stage_data(Game.stage)
	var st := UI.label("ARENA: " + sd.display_name.to_upper(), 28, Color.WHITE, UI.body_bold, 8)
	st.set_anchors_preset(Control.PRESET_CENTER_TOP)
	st.position = Vector2(-300, 40)
	st.custom_minimum_size.x = 600
	st.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(st)
	if Game.mode == Game.Mode.ARCADE:
		var lad := UI.label("LUTA %d DE %d" % [Game.arcade_index + 1, Game.arcade_ladder.size()], 26, UI.GOLD, UI.body_bold, 8)
		lad.set_anchors_preset(Control.PRESET_CENTER_TOP)
		lad.position = Vector2(-300, 80)
		lad.custom_minimum_size.x = 600
		lad.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		add_child(lad)
	Audio.sfx(&"special")
	_load_bar = ProgressBar.new()
	_load_bar.show_percentage = false
	_load_bar.custom_minimum_size = Vector2(500, 10)
	_load_bar.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_load_bar.position = Vector2(-250, -40)
	_load_bar.modulate.a = 0.6
	add_child(_load_bar)
	await get_tree().create_timer(2.6).timeout
	# espera a pré-carga (no máximo ~15 s) antes de ir para a luta
	var waited := 0.0
	while Game.preload_progress() < 1.0 and waited < 15.0:
		await get_tree().create_timer(0.1).timeout
		waited += 0.1
	Game.finish_preload()
	Scenes.go("res://scenes/fight.tscn")


func _process(_dt: float) -> void:
	if _load_bar:
		_load_bar.value = Game.preload_progress() * 100.0
