extends Node3D
## Partida: monta arena, lutadores, câmera e interface; controla rounds, tempo e resultado.

enum Phase { INTRO, ROUND_START, FIGHT, ROUND_END, MATCH_END }

const START_X := 1.6

var p1: Fighter
var p2: Fighter
var cam: FightCamera
var hud: FightHud
var touch: TouchControls
var menu: FightMenu
var phase: Phase = Phase.INTRO
var round_no := 1
var wins := [0, 0]
var time_left := 99.0
var _paused := false


func _ready() -> void:
	Engine.physics_ticks_per_second = 60
	var stage := Stage.new()
	stage.stage_id = Game.stage
	add_child(stage)
	var sd := Game.stage_data(Game.stage)
	if sd and sd.music:
		Audio.music(sd.music)
	p1 = _spawn(Game.p1_fighter, 1, -START_X)
	var ctrl2: FighterController
	match Game.mode:
		Game.Mode.VERSUS_2P: ctrl2 = PlayerController.new(2)
		Game.Mode.TRAINING: ctrl2 = DummyController.new()
		_: ctrl2 = CpuController.new(int(Settings.get_value("game", "difficulty")))
	p2 = _spawn(Game.p2_fighter, 2, START_X, ctrl2)
	p1.opponent = p2
	p2.opponent = p1
	if Game.mode == Game.Mode.TRAINING:
		p1.training_infinite = true
		p2.training_infinite = true
	cam = FightCamera.new()
	add_child(cam)
	cam.current = true
	cam.a = p1
	cam.b = p2
	hud = FightHud.new()
	add_child(hud)
	hud.bind(p1, p2)
	touch = TouchControls.new()
	add_child(touch)
	menu = FightMenu.new()
	add_child(menu)
	menu.resume.connect(_toggle_pause)
	menu.restart.connect(func(): Scenes.go("res://scenes/fight.tscn"))
	menu.to_select.connect(func(): Scenes.go("res://scenes/character_select.tscn"))
	menu.to_menu.connect(func(): Scenes.go("res://scenes/main_menu.tscn"))
	menu.next_fight.connect(_arcade_next)
	_intro()


func _spawn(id: StringName, index: int, x: float, ctrl: FighterController = null) -> Fighter:
	var f := Fighter.new()
	add_child(f)
	f.setup(Game.fighter(id), ctrl if ctrl else PlayerController.new(1), index, x)
	f.hit_landed.connect(_on_hit)
	f.super_started.connect(_on_super)
	f.knocked_out.connect(_on_ko)
	f.spawn_projectile.connect(_on_projectile)
	f.form_changed.connect(_on_form)
	f.combo.connect(func(att: Fighter, hits: int, dmg: float): hud.show_combo(att, hits, dmg))
	return f


# ------------------------------------------------------------------ fluxo
func _wait(s: float) -> void:
	await get_tree().create_timer(s, true, false, true).timeout


func _intro() -> void:
	phase = Phase.INTRO
	hud.visible = false
	touch.set_active(false)
	for f in [p1, p2]:
		cam.cinematic_target = f
		f.play_intro()
		hud.banner(f.data.display_name, f.data.accent, f.data.title)
		f.say(&"intro", &"select")
		await _wait(1.6)
		if not is_inside_tree(): return
	cam.cinematic_target = null
	hud.visible = true
	_start_round()


func _start_round() -> void:
	phase = Phase.ROUND_START
	time_left = float(Settings.get_value("game", "timer"))
	p1.reset(-START_X, 1)
	p2.reset(START_X, -1)
	p1.opponent = p2
	p2.opponent = p1
	for p in get_tree().get_nodes_in_group("projectiles"):
		p.queue_free()
	hud.reset_round(round_no, wins, Settings.get_value("game", "rounds"))
	var final_round: bool = wins[0] == wins[1] and wins[0] == int(Settings.get_value("game", "rounds")) - 1 and round_no > 1
	if Game.mode == Game.Mode.TRAINING:
		hud.banner("TREINO", UI.GOLD, "F1 mostra as caixas de acerto")
	else:
		hud.banner("ROUND FINAL" if final_round else "ROUND %d" % round_no, UI.GOLD)
		_announcer("final_round" if final_round else "round_%d" % mini(round_no, 3))
	Audio.sfx(&"bell")
	await _wait(1.3)
	if not is_inside_tree(): return
	hud.banner("LUTE!", UI.PINK)
	_announcer("fight")
	await _wait(0.6)
	if not is_inside_tree(): return
	hud.hide_banner()
	phase = Phase.FIGHT
	p1.controls_enabled = true
	p2.controls_enabled = true
	touch.set_active(true)


func _process(dt: float) -> void:
	if phase == Phase.FIGHT and Game.mode != Game.Mode.TRAINING and time_left < 999:
		time_left = maxf(0.0, time_left - dt)
		if time_left <= 0.0:
			_time_up()
	if Game.mode == Game.Mode.TRAINING:
		for f in [p1, p2]:
			if f.state in [Fighter.S.IDLE, Fighter.S.WALK, Fighter.S.CROUCH] and f.combo_hits == 0:
				f.hp = minf(f.data.max_hp, f.hp + f.data.max_hp * dt * 0.5)
			f.meter = 100.0 if f == p1 else f.meter
	hud.time_text = "∞" if Game.mode == Game.Mode.TRAINING or time_left > 999 else str(int(ceil(time_left)))


func _time_up() -> void:
	phase = Phase.ROUND_END
	hud.banner("TEMPO!", UI.GOLD)
	_announcer("time")
	var winner: Fighter = null
	if p1.hp / p1.data.max_hp > p2.hp / p2.data.max_hp: winner = p1
	elif p2.hp / p2.data.max_hp > p1.hp / p1.data.max_hp: winner = p2
	_end_round(winner)


func _on_ko(loser: Fighter) -> void:
	if phase != Phase.FIGHT or Game.mode == Game.Mode.TRAINING:
		return
	phase = Phase.ROUND_END
	Audio.sfx(&"ko")
	loser.say(&"ko")
	hud.screen_flash(Color(1, 1, 1, 0.7), 0.35)
	hud.banner("K.O.", Color("ff3b30"))
	Engine.time_scale = 0.3
	cam.impact(14.0)
	await _wait(1.2)
	Engine.time_scale = 1.0
	if not is_inside_tree(): return
	_end_round(p1 if loser == p2 else p2)


func _end_round(winner: Fighter) -> void:
	p1.controls_enabled = false
	p2.controls_enabled = false
	touch.set_active(false)
	await _wait(1.0)
	if not is_inside_tree(): return
	if winner == null:
		hud.banner("EMPATE", Color.WHITE)
		_announcer("tie")
		wins[0] += 1
		wins[1] += 1
	else:
		wins[0 if winner == p1 else 1] += 1
		winner.set_win()
		winner.say(&"win")
		var loser := p2 if winner == p1 else p1
		if not loser.is_down():
			loser.set_lose_time()
		cam.cinematic_target = winner
		hud.banner("%s VENCE!" % winner.data.display_name, winner.data.accent)
	hud.reset_round(round_no, wins, Settings.get_value("game", "rounds"))
	await _wait(2.4)
	if not is_inside_tree(): return
	cam.cinematic_target = null
	var need := int(Settings.get_value("game", "rounds"))
	if wins[0] >= need or wins[1] >= need:
		_match_end()
	else:
		round_no += 1
		_start_round()


func _match_end() -> void:
	phase = Phase.MATCH_END
	hud.hide_banner()
	var p1_won: bool = wins[0] > wins[1]
	var winner := p1 if p1_won else p2
	cam.cinematic_target = winner
	if Game.mode == Game.Mode.VERSUS_2P:
		_announcer("you_win")
	else:
		_announcer("you_win" if p1_won else "you_lose")
	var title := "%s VENCE A LUTA!" % winner.data.display_name
	if Game.mode == Game.Mode.ARCADE and p1_won:
		var more := Game.arcade_index + 1 < Game.arcade_ladder.size()
		title = "VITÓRIA! PRÓXIMO: %s" % Game.fighter(Game.arcade_ladder[Game.arcade_index + 1]).display_name if more else "CAMPEÃO DA FAMÍLIA!"
		menu.open_results(title, more)
	else:
		menu.open_results(title, false)


func _arcade_next() -> void:
	if Game.arcade_next():
		Scenes.go("res://scenes/vs_screen.tscn")
	else:
		Scenes.go("res://scenes/main_menu.tscn")


# ------------------------------------------------------------------ eventos
func _on_hit(att: Fighter, target: Fighter, m: MoveData, blocked: bool, at: Vector3) -> void:
	var heavy := m.damage >= 70.0 or m.knockdown
	if blocked:
		HitFx.spawn(self, at, Color("7dd3fc"), false)
		Audio.sfx(&"block")
		cam.impact(2.0)
	else:
		HitFx.spawn(self, at, Color("ffd166") if not heavy else Color("ff6b3d"), heavy, att.facing)
		if heavy:
			_hit_flash(0.18)
		Audio.sfx(&"hit_heavy" if heavy else &"hit_light")
		cam.impact(8.0 if heavy else 3.5)
		if Settings.get_value("game", "vibration") and target.player_index == 1:
			Input.vibrate_handheld(40 if heavy else 20)
	hud.flash_bar(target)


## Super: congela a luta, escurece a arena, câmera fecha no lutador e faixa com o nome do golpe.
func _on_super(f: Fighter, m: MoveData) -> void:
	var col: Color = m.projectile_color if m.kind == MoveData.Kind.PROJECTILE else f.data.accent
	var freeze := 42
	f._hitstop = freeze
	f.opponent._hitstop = maxi(f.opponent._hitstop, freeze)
	for p in get_tree().get_nodes_in_group("projectiles"):
		p.set_physics_process(false)
	Audio.sfx(&"special")
	Vfx.aura(f, col, 1.4, f.model.height_scale)
	HitFx.spawn(self, f.global_position + Vector3(0, f.model.height_scale * 0.6, 0.3), col, true)
	hud.super_cutin(f, m.display_name if m.display_name != "" else f.data.special_name, col)
	stage_dim(0.35, 0.12)
	cam.super_focus(f, freeze / 60.0)
	await _wait(freeze / 60.0)
	if not is_inside_tree(): return
	stage_dim(1.0, 0.25)
	for p in get_tree().get_nodes_in_group("projectiles"):
		if is_instance_valid(p): p.set_physics_process(true)


func stage_dim(v: float, t: float) -> void:
	var we := get_tree().get_first_node_in_group("world_env") as WorldEnvironment
	if we and we.environment:
		create_tween().tween_property(we.environment, "adjustment_brightness", v, t)


func _hit_flash(strength: float) -> void:
	hud.screen_flash(Color(1, 1, 1, strength), 0.12)


func _on_projectile(f: Fighter, m: MoveData) -> void:
	var p := Projectile.new()
	p.add_to_group("projectiles")
	add_child(p)
	p.setup(f, m)


func _on_form(f: Fighter, form: StringName) -> void:
	if form == &"":
		return
	var info: Dictionary = f.data.forms[form]
	hud.form_popup(f, info.get("label", String(form).to_upper()), info.get("color", Color.WHITE))
	HitFx.spawn(self, f.global_position + Vector3(0, 1, 0.3), info.get("color", Color.WHITE), true)
	cam.impact(5.0)


func _announcer(n: String) -> void:
	var path := "res://assets/audio/announcer/%s.ogg" % n
	if ResourceLoader.exists(path):
		Audio.voice(load(path))


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause") and phase in [Phase.FIGHT, Phase.ROUND_START]:
		_toggle_pause()


func _toggle_pause() -> void:
	_paused = not _paused
	get_tree().paused = _paused
	if _paused:
		menu.open_pause(p1.data, p2)
	else:
		menu.close()
