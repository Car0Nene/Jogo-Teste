extends Node
## Música e efeitos. Efeitos sem arquivo são sintetizados (troque colocando .ogg/.wav
## em assets/audio/sfx/<nome>.*).

var _music: AudioStreamPlayer
var _sfx: Array[AudioStreamPlayer] = []
var _voice: AudioStreamPlayer
var _next := 0
var _synth := {}
const RATE := 22050


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_music = AudioStreamPlayer.new()
	_music.bus = "Music"
	add_child(_music)
	_voice = AudioStreamPlayer.new()
	_voice.bus = "Voice"
	add_child(_voice)
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


func voice(stream: AudioStream) -> void:
	if stream == null:
		return
	_voice.stream = stream
	_voice.play()


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
