extends Node
## Música e efeitos. Efeitos sem arquivo são sintetizados (troque colocando .ogg/.wav
## em assets/audio/sfx/<nome>.*).

var _music: AudioStreamPlayer
var _sfx: Array[AudioStreamPlayer] = []
var _voice: AudioStreamPlayer          # locutor (centro)
var _fvoice: Array[AudioStreamPlayer] = []  # lutadores P1/P2 (panorâmica pela posição na tela)
var _reverb: AudioEffectReverb
var _next := 0
var _synth := {}
const RATE := 22050


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_music = AudioStreamPlayer.new()
	_music.bus = "Music"
	add_child(_music)
	_setup_buses()
	_voice = AudioStreamPlayer.new()
	_voice.bus = "Voice"
	add_child(_voice)
	for i in 2:
		var vp := AudioStreamPlayer.new()
		vp.bus = "Voice%d" % (i + 1)
		add_child(vp)
		_fvoice.append(vp)
	for i in 12:
		var p := AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		_sfx.append(p)
	_synth = {
		&"whoosh_light": _tone(520, 180, 0.08, 3, 0.25), &"whoosh_heavy": _tone(300, 90, 0.16, 3, 0.35),
		&"hit_light": _tone(240, 80, 0.10, 3, 0.6), &"hit_heavy": _tone(150, 40, 0.22, 3, 0.85),
		&"block": _tone(900, 600, 0.07, 0, 0.3), &"jump": _tone(260, 520, 0.10, 1, 0.3),
		&"land": _tone(110, 60, 0.08, 3, 0.4), &"ko": _tone(220, 40, 0.9, 4, 0.7),
		&"special": _tone(200, 900, 0.4, 0, 0.35), &"select": _tone(700, 1100, 0.06, 0, 0.3),
		&"move": _tone(500, 500, 0.03, 0, 0.2), &"back": _tone(500, 300, 0.07, 0, 0.25),
		&"bell": _tone(880, 880, 0.5, 1, 0.45), &"fall": _tone(120, 50, 0.25, 3, 0.7),
	}


func music(stream: AudioStream, fade := 0.6) -> void:
	if stream == null or _music.stream == stream and _music.playing:
		return
	var tw := create_tween()
	if _music.playing:
		tw.tween_property(_music, "volume_db", -40.0, fade)
	tw.tween_callback(func():
		_music.stream = stream
		if stream is AudioStreamMP3: stream.loop = true
		elif stream is AudioStreamOggVorbis: stream.loop = true
		_music.volume_db = -40.0
		_music.play())
	tw.tween_property(_music, "volume_db", 0.0, fade)


func stop_music(fade := 0.6) -> void:
	var tw := create_tween()
	tw.tween_property(_music, "volume_db", -40.0, fade)
	tw.tween_callback(_music.stop)


func sfx(name: StringName, pitch := 1.0) -> void:
	var stream: AudioStream = null
	for ext in ["ogg", "wav", "mp3"]:
		var path := "res://assets/audio/sfx/%s.%s" % [name, ext]
		if ResourceLoader.exists(path):
			stream = load(path)
			break
	if stream == null:
		stream = _synth.get(name)
	if stream == null:
		return
	var p := _sfx[_next]
	_next = (_next + 1) % _sfx.size()
	p.stream = stream
	p.pitch_scale = pitch * randf_range(0.94, 1.06)
	p.play()


## Fala do locutor (centro) ou de um lutador. slot 1/2 = P1/P2; pan de -1 (esq.) a 1 (dir.).
func voice(stream: AudioStream, slot := 0, pan := 0.0) -> void:
	if stream == null:
		return
	var p := _voice
	if slot in [1, 2]:
		p = _fvoice[slot - 1]
		var bus := AudioServer.get_bus_index("Voice%d" % slot)
		var fx := AudioServer.get_bus_effect(bus, 0) as AudioEffectPanner
		if fx: fx.pan = clampf(pan, -0.75, 0.75)
	p.stream = stream
	p.play()


## Ambiência da arena: room 0..1 (tamanho), wet 0..1 (quanto de eco). Cola a voz no cenário.
func set_room(room: float, wet: float) -> void:
	if _reverb:
		_reverb.room_size = room
		_reverb.wet = wet
		_reverb.dry = 1.0


func _setup_buses() -> void:
	# Voice: EQ de presença + compressor + reverb curta (a voz "senta" dentro do jogo)
	var vi := _ensure_bus("Voice", "Master")
	if AudioServer.get_bus_effect_count(vi) == 0:
		var eq := AudioEffectEQ6.new()
		eq.set_band_gain_db(0, -6.0)   # 32 Hz
		eq.set_band_gain_db(1, -2.0)   # 100 Hz
		eq.set_band_gain_db(3, 1.5)    # 1 kHz
		eq.set_band_gain_db(4, 2.0)    # 3.2 kHz presença
		eq.set_band_gain_db(5, -1.5)   # 10 kHz chiado
		AudioServer.add_bus_effect(vi, eq)
		var comp := AudioEffectCompressor.new()
		comp.threshold = -16.0
		comp.ratio = 3.0
		comp.attack_us = 3000.0
		comp.release_ms = 120.0
		comp.gain = 2.0
		AudioServer.add_bus_effect(vi, comp)
		_reverb = AudioEffectReverb.new()
		_reverb.room_size = 0.35
		_reverb.damping = 0.6
		_reverb.wet = 0.12
		_reverb.dry = 1.0
		_reverb.hipass = 0.25
		AudioServer.add_bus_effect(vi, _reverb)
		var lim := AudioEffectHardLimiter.new()
		lim.ceiling_db = -1.0
		AudioServer.add_bus_effect(vi, lim)
	for i in [1, 2]:
		var b := _ensure_bus("Voice%d" % i, "Voice")
		if AudioServer.get_bus_effect_count(b) == 0:
			AudioServer.add_bus_effect(b, AudioEffectPanner.new())
	# Música abaixa sozinha quando alguém fala (sidechain)
	var mi := _ensure_bus("Music", "Master")
	if AudioServer.get_bus_effect_count(mi) == 0:
		var duck := AudioEffectCompressor.new()
		duck.sidechain = &"Voice"
		duck.threshold = -32.0
		duck.ratio = 6.0
		duck.attack_us = 8000.0
		duck.release_ms = 350.0
		AudioServer.add_bus_effect(mi, duck)


func _ensure_bus(bus_name: String, send: String) -> int:
	var idx := AudioServer.get_bus_index(bus_name)
	if idx == -1:
		AudioServer.add_bus()
		idx = AudioServer.bus_count - 1
		AudioServer.set_bus_name(idx, bus_name)
	AudioServer.set_bus_send(idx, send)
	return idx


func _tone(f0: float, f1: float, dur: float, wave: int, vol: float) -> AudioStreamWAV:
	var n := int(RATE * dur)
	var bytes := PackedByteArray()
	bytes.resize(n * 2)
	var ph := 0.0
	for i in n:
		var t := float(i) / n
		ph += lerpf(f0, f1, t) / RATE
		var s := 0.0
		match wave:
			0: s = 1.0 if fmod(ph, 1.0) < 0.5 else -1.0
			1: s = sin(ph * TAU)
			3: s = randf_range(-1.0, 1.0) * (0.6 + 0.4 * sin(ph * TAU))
			4: s = fmod(ph, 1.0) * 2.0 - 1.0
		s *= pow(1.0 - t, 2.2) * vol
		bytes.encode_s16(i * 2, int(clampf(s, -1.0, 1.0) * 32000.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = RATE
	w.data = bytes
	return w
