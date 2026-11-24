extends SceneTree
## Gera data/fighters/*.tres (ficha + golpes de cada lutador).
##   godot --headless --path . --script tools/build_fighters.gd
## Depois de gerado, ajuste os números direto no Inspetor da Godot.

func mv(d: Dictionary) -> MoveData:
	var m := MoveData.new()
	for k in d:
		m.set(k, d[k])
	return m

func base_moves() -> Dictionary:
	var L := MoveData.Level
	return {
		&"jab": mv({"display_name": "Jab", "anim": &"jab", "startup": 5, "active": 3, "recovery": 9, "damage": 32,
			"level": L.HIGH, "hitbox_bone": &"auto", "hitbox_radius": 0.15, "hitstun": 15, "blockstun": 9, "hitstop": 5,
			"pushback": 1.6, "meter_gain": 5, "cancel_into": [&"cross", &"kick", &"special", &"sub_special"]}),
		&"cross": mv({"display_name": "Direto", "anim": &"cross", "startup": 8, "active": 3, "recovery": 14, "damage": 55,
			"level": L.HIGH, "hitbox_bone": &"auto", "hitbox_radius": 0.16, "hitstun": 18, "blockstun": 11, "hitstop": 7,
			"pushback": 2.2, "lunge": 1.2, "meter_gain": 7, "sfx": &"whoosh_heavy",
			"cancel_into": [&"hook", &"uppercut", &"special", &"sub_special"]}),
		&"hook": mv({"display_name": "Gancho", "anim": &"hook", "startup": 10, "active": 4, "recovery": 18, "damage": 72,
			"level": L.HIGH, "hitbox_bone": &"auto", "hitbox_radius": 0.18, "hitstun": 22, "blockstun": 12, "hitstop": 9,
			"pushback": 3.0, "meter_gain": 9, "sfx": &"whoosh_heavy", "cancel_into": [&"special", &"sub_special"]}),
		&"uppercut": mv({"display_name": "Uppercut", "anim": &"uppercut", "startup": 9, "active": 5, "recovery": 22, "damage": 78,
			"level": L.MID, "hitbox_bone": &"RightHand", "hitbox_radius": 0.2, "hitstun": 24, "blockstun": 12, "hitstop": 9,
			"pushback": 1.2, "launch": 6.4, "knockdown": true, "meter_gain": 9, "sfx": &"whoosh_heavy",
			"cancel_into": [&"special"]}),
		&"kick": mv({"display_name": "Chute", "anim": &"kick_mid", "startup": 9, "active": 4, "recovery": 16, "damage": 58,
			"level": L.MID, "hitbox_bone": &"auto", "hitbox_radius": 0.18, "hitstun": 18, "blockstun": 11, "hitstop": 7,
			"pushback": 2.4, "meter_gain": 7, "cancel_into": [&"high_kick", &"special", &"sub_special"]}),
		&"high_kick": mv({"display_name": "Chute Alto", "anim": &"low_kick", "startup": 13, "active": 4, "recovery": 20, "damage": 80,
			"level": L.HIGH, "hitbox_bone": &"auto", "hitbox_radius": 0.2, "hitstun": 22, "blockstun": 13, "hitstop": 10,
			"pushback": 3.4, "lunge": 0.8, "meter_gain": 10, "sfx": &"whoosh_heavy", "cancel_into": [&"special"]}),
		&"low_kick": mv({"display_name": "Chute Baixo", "anim": &"roundhouse", "startup": 8, "active": 3, "recovery": 15, "damage": 45,
			"level": L.LOW, "hitbox_bone": &"auto", "hitbox_radius": 0.18, "hitstun": 16, "blockstun": 10, "hitstop": 6,
			"pushback": 2.0, "meter_gain": 6, "cancel_into": [&"special", &"sub_special"]}),
		&"sweep": mv({"display_name": "Rasteira", "anim": &"sweep", "startup": 11, "active": 4, "recovery": 24, "damage": 66,
			"level": L.LOW, "hitbox_bone": &"RightFoot", "hitbox_radius": 0.22, "hitstun": 20, "blockstun": 12, "hitstop": 8,
			"pushback": 1.6, "knockdown": true, "launch": 2.2, "meter_gain": 8, "sfx": &"whoosh_heavy"}),
		&"air_punch": mv({"display_name": "Soco Aéreo", "anim": &"jab", "air": true, "startup": 5, "active": 8, "recovery": 0,
			"damage": 46, "level": L.OVERHEAD, "hitbox_bone": &"auto", "hitbox_radius": 0.2, "hitstun": 18, "blockstun": 10,
			"hitstop": 7, "pushback": 1.8, "meter_gain": 6}),
		&"air_kick": mv({"display_name": "Voadora", "anim": &"kick_mid", "air": true, "startup": 6, "active": 10, "recovery": 0,
			"damage": 62, "level": L.OVERHEAD, "hitbox_bone": &"auto", "hitbox_radius": 0.24, "hitstun": 20, "blockstun": 12,
			"hitstop": 8, "pushback": 2.4, "meter_gain": 8, "sfx": &"whoosh_heavy"}),
	}

func proj(name: String, anim: StringName, kind: StringName, color: Color, dmg := 120.0, speed := 7.0, extra := {}) -> MoveData:
	var d := {"display_name": name, "kind": MoveData.Kind.PROJECTILE, "anim": anim, "startup": 18, "active": 1,
		"recovery": 26, "damage": dmg, "level": MoveData.Level.MID, "hitstun": 26, "blockstun": 16, "hitstop": 10,
		"pushback": 3.0, "knockdown": true, "launch": 4.0, "meter_cost": 50.0, "meter_gain": 0, "sfx": &"special",
		"projectile_kind": kind, "projectile_color": color, "projectile_speed": speed, "voice": &"special"}
	d.merge(extra, true)
	return mv(d)

func buff(name: String, anim: StringName, form: StringName) -> MoveData:
	return mv({"display_name": name, "kind": MoveData.Kind.BUFF, "anim": anim, "startup": 24, "active": 1,
		"recovery": 30, "damage": 0, "meter_cost": 50.0, "meter_gain": 0, "sfx": &"special", "buff_form": form,
		"voice": &"special"})

func melee_special(name: String, anim: StringName, dmg: float, extra := {}) -> MoveData:
	var d := {"display_name": name, "anim": anim, "startup": 12, "active": 12, "recovery": 24, "damage": dmg,
		"level": MoveData.Level.MID, "hitbox_bone": &"auto", "hitbox_radius": 0.28, "hitstun": 28, "blockstun": 16,
		"hitstop": 12, "pushback": 3.5, "knockdown": true, "launch": 5.5, "lunge": 2.4, "meter_cost": 50.0,
		"meter_gain": 0, "sfx": &"special", "voice": &"special"}
	d.merge(extra, true)
	return mv(d)

func fighter(id: String, d: Dictionary, specials: Dictionary, forms := {}) -> void:
	var f := FighterData.new()
	f.id = StringName(id)
	for k in d:
		f.set(k, d[k])
	f.model = load("res://assets/characters/%s/%s.glb" % [id, id])
	if ResourceLoader.exists("res://assets/ui/portraits/%s.png" % id):
		f.portrait = load("res://assets/ui/portraits/%s.png" % id)
	var moves := base_moves()
	moves.merge(specials, true)
	for k in moves:
		if String(k).begins_with("sub_special"):
			(moves[k] as MoveData).voice = &"sub_special"
	f.moves = moves
	f.forms = forms
	# vozes: assets/audio/voice/<id>/<evento>.mp3 (select, intro, special, sub_special, win, ko)
	var voices := {}
	for ext in ["ogg", "mp3", "wav"]:
		var legacy := "res://assets/audio/voice/%s.%s" % [id, ext]
		if ResourceLoader.exists(legacy):
			voices[&"special"] = load(legacy)
			voices[&"select"] = load(legacy)
	for ev in ["select", "intro", "special", "sub_special", "win", "ko"]:
		for ext in ["ogg", "mp3", "wav"]:
			var pth := "res://assets/audio/voice/%s/%s.%s" % [id, ev, ext]
			if ResourceLoader.exists(pth):
				voices[StringName(ev)] = load(pth)
	f.voices = voices
	print(id, " ", ResourceSaver.save(f, "res://data/fighters/%s.tres" % id))

func _initialize():
	fighter("juraci", {"display_name": "JURACI", "title": "Mestra da Padaria", "quote": "Bolos são minha vida!",
		"bio": "Rápida e esperta. Dispara o Super Bolo de Cenoura ou chama o Dadá para lavar a louça e molhar a arena.",
		"accent": Color("ec4899"), "height_m": 1.56, "walk_speed": 1.85, "back_speed": 1.5, "max_hp": 950,
		"special_name": "Super Bolo de Cenoura", "special_desc": "Bolo voador com cobertura de chocolate que derruba.",
		"sub_special_name": "Chama o Dadá!", "sub_special_desc": "Uma onda de água rasteira escorrega o rival."}, {
		&"special": proj("Super Bolo de Cenoura", &"throw_obj", &"cake", Color("f59e0b"), 125, 6.5),
		&"sub_special": proj("Chama o Dadá!", &"cast", &"wave", Color("38bdf8"), 90, 5.0, {"level": MoveData.Level.LOW}),
	})
	fighter("carlos", {"display_name": "CARLOS", "title": "Rei do Combo & Pizza", "quote": "Tô firme! Tô forte!",
		"bio": "Forte e versátil. Alterna entre Gordão (+força) e Modo Fé (+defesa) e encaixa o Combo do Chute.",
		"accent": Color("f59e0b"), "height_m": 1.76, "walk_speed": 1.8, "back_speed": 1.45, "max_hp": 1050,
		"special_name": "Gordão / Modo Fé", "special_desc": "Alterna entre Gordão (+força) e Modo Fé, batizado e protegido.",
		"sub_special_name": "Combo do Chute", "sub_special_desc": "Sequência de chutes giratórios que derruba."}, {
		&"special": buff("Gordão / Modo Fé", &"power_up", &"cycle"),
		&"sub_special": melee_special("Combo do Chute", &"hurricane_kick", 130),
	}, {
		&"gordao": {"label": "GORDÃO +FORÇA", "atk": 1.3, "taken": 0.9, "speed": 0.85, "scale": 1.08, "color": Color("fb923c"), "duration": 9.0},
		&"fe": {"label": "MODO FÉ +DEFESA", "atk": 1.05, "taken": 0.55, "speed": 1.05, "color": Color("fef3c7"), "duration": 9.0,
			"model": load("res://assets/characters/carlos_batizado/carlos_batizado.glb")},
	})
	fighter("pedro", {"display_name": "PEDRO", "title": "O Monstrão da Resenha", "quote": "Fuma, bebe e vence!",
		"bio": "Bebe uma Heineken e vira o Monstrão Verde! Transformado, dispara rajada com aura verde.",
		"accent": Color("22c55e"), "height_m": 1.78, "walk_speed": 1.75, "back_speed": 1.4, "max_hp": 1100,
		"special_name": "Monstrão / Aura Verde", "special_desc": "Vira o Monstrão; transformado, dispara a Aura Verde.",
		"sub_special_name": "Fumaça de Cigarro", "sub_special_desc": "Nuvem densa e lenta que deixa o rival tonto."}, {
		&"special": buff("Monstrão Heineken", &"drink", &"hulk"),
		&"special@hulk": proj("Aura Verde", &"cast", &"energy", Color("22c55e"), 140, 8.0),
		&"sub_special": proj("Fumaça de Cigarro", &"throw_obj", &"smoke", Color("d1d5db"), 70, 2.6, {"knockdown": false, "hitstun": 40}),
	}, {
		&"hulk": {"label": "MONSTRÃO HEINEKEN", "atk": 1.34, "taken": 0.8, "speed": 0.92, "scale": 1.15, "color": Color("16a34a"), "duration": 10.0},
	})
	fighter("paula", {"display_name": "PAULA", "title": "Dona da Espátula", "quote": "Aqui em casa quem manda sou eu!",
		"bio": "Dispara uma avalanche de Super Almoço ou desperta a Fúria do Bar Simone.",
		"accent": Color("d946ef"), "height_m": 1.63, "walk_speed": 1.75, "back_speed": 1.45, "max_hp": 1000,
		"special_name": "Super Almoço", "special_desc": "Pratos e comida voando na direção do rival!",
		"sub_special_name": "Fúria do Bar Simone", "sub_special_desc": "+38% de poder por alguns segundos."}, {
		&"special": proj("Super Almoço", &"throw_obj", &"plates", Color("fbbf24"), 120, 7.0, {"projectile_hits": 3, "damage": 50}),
		&"sub_special": buff("Fúria do Bar Simone", &"power_up", &"furia"),
	}, {
		&"furia": {"label": "FÚRIA DO BAR SIMONE", "atk": 1.38, "taken": 0.85, "speed": 1.1, "color": Color("d946ef"), "duration": 9.0},
	})
	fighter("franciely", {"display_name": "FRANCIELY", "title": "Força & Cuidado", "quote": "Cuidar também é lutar!",
		"bio": "Fica irritada e com fome para ganhar dano extremo, ou dispara um Jato de Leite certeiro.",
		"accent": Color("3b82f6"), "height_m": 1.66, "walk_speed": 1.8, "back_speed": 1.45, "max_hp": 1000,
		"special_name": "Irritada + Fome", "special_desc": "Aura de fúria materna: +35% de ataque.",
		"sub_special_name": "Jato de Leite", "sub_special_desc": "Projétil rápido que empurra o adversário."}, {
		&"special": buff("Irritada + Fome", &"power_up", &"brava"),
		&"sub_special": proj("Jato de Leite", &"cast", &"milk", Color("f8fafc"), 95, 11.0, {"knockdown": false, "hitstun": 30}),
	}, {
		&"brava": {"label": "IRRITADA + FOME", "atk": 1.35, "taken": 0.9, "speed": 1.15, "color": Color("ef4444"), "duration": 9.0},
	})
	fighter("gabi", {"display_name": "GABI", "title": "Estrela do Super L", "quote": "Faz o L!",
		"bio": "Dispara um Super L gigante com chuva de brigadeiros, ou encanta com o Canto Musical.",
		"accent": Color("ef4444"), "height_m": 1.62, "walk_speed": 1.85, "back_speed": 1.5, "max_hp": 980,
		"special_name": "Super L + Brigadeiros", "special_desc": "Um L gigante de energia com chuva de brigadeiros!",
		"sub_special_name": "Canto Musical", "sub_special_desc": "Notas musicais luminosas varrem o adversário."}, {
		&"special": proj("Super L + Brigadeiros", &"cast", &"energy", Color("ef4444"), 130, 7.5),
		&"sub_special": proj("Canto Musical", &"taunt", &"notes", Color("f472b6"), 85, 5.0, {"knockdown": false, "hitstun": 34}),
	})
	fighter("davi", {"display_name": "DAVI", "title": "Craque do Videogame", "quote": "Vamos jogar videogame!",
		"bio": "Brincalhão e ágil. Chuta a bola com efeito ou ativa a Transformação Roxa.",
		"accent": Color("22c55e"), "height_m": 1.5, "walk_speed": 2.05, "back_speed": 1.7, "max_hp": 900,
		"special_name": "Craque Alviverde", "special_desc": "Chute de bola com efeito direto no rival.",
		"sub_special_name": "Transformação Roxa", "sub_special_desc": "Aura roxa: força e velocidade por tempo limitado."}, {
		&"special": proj("Craque Alviverde", &"kick_mid", &"ball", Color("16a34a"), 115, 9.0),
		&"sub_special": buff("Transformação Roxa", &"power_up", &"roxa"),
	}, {
		&"roxa": {"label": "TRANSFORMAÇÃO ROXA", "atk": 1.18, "taken": 0.95, "speed": 1.18, "color": Color("a855f7"), "duration": 10.0},
	})
	fighter("daniel", {"display_name": "DANIEL", "title": "Agente Natal Praia", "quote": "Partiu praia?",
		"bio": "Ágil e imprevisível. Ativa o Modo Natal Praia com velocidade máxima ou solta a Dancinha Musical.",
		"accent": Color("ec4899"), "height_m": 1.74, "walk_speed": 2.0, "back_speed": 1.65, "max_hp": 960,
		"special_name": "Modo Natal Praia!", "special_desc": "Velocidade máxima de verão.",
		"sub_special_name": "Dancinha Musical", "sub_special_desc": "Onda rítmica de notas que atinge à distância."}, {
		&"special": buff("Modo Natal Praia!", &"dance", &"praia"),
		&"sub_special": proj("Dancinha Musical", &"dance", &"notes", Color("38bdf8"), 90, 5.5, {"knockdown": false, "hitstun": 34}),
	}, {
		&"praia": {"label": "NATAL PRAIA!", "atk": 1.14, "taken": 0.95, "speed": 1.32, "color": Color("f472b6"), "duration": 10.0},
	})
	fighter("tainara", {"display_name": "TAINARA", "title": "Guardiã do Arroz", "quote": "Com arroz eu fico invencível!",
		"bio": "Ativa o Poder do Arroz dourado ou manda o Cuidado em Dobro pela arena.",
		"accent": Color("38bdf8"), "height_m": 1.64, "walk_speed": 1.85, "back_speed": 1.5, "max_hp": 1000,
		"special_name": "Poder do Arroz", "special_desc": "Aura dourada: +32% de ataque e velocidade.",
		"sub_special_name": "Cuidado em Dobro", "sub_special_desc": "Onda dourada rasteira que atravessa a arena."}, {
		&"special": buff("Poder do Arroz", &"power_up", &"arroz"),
		&"sub_special": proj("Cuidado em Dobro", &"cast", &"wave", Color("facc15"), 100, 5.5, {"level": MoveData.Level.LOW}),
	}, {
		&"arroz": {"label": "PODER DO ARROZ", "atk": 1.32, "taken": 0.88, "speed": 1.1, "color": Color("facc15"), "duration": 10.0},
	})
	quit()
