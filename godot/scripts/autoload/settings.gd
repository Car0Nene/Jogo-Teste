extends Node
## Configurações do jogo (salvas em user://settings.cfg) e mapeamento de controles.

signal changed

const PATH := "user://settings.cfg"
const ACTIONS := ["left", "right", "up", "down", "punch", "kick", "guard", "special"]
const ACTION_LABELS := {
	"left": "Esquerda", "right": "Direita", "up": "Pular", "down": "Agachar",
	"punch": "Soco", "kick": "Chute", "guard": "Defesa", "special": "Especial",
}
const DEFAULT_KEYS := {
	1: {"left": KEY_A, "right": KEY_D, "up": KEY_W, "down": KEY_S,
		"punch": KEY_J, "kick": KEY_K, "guard": KEY_I, "special": KEY_L},
	2: {"left": KEY_LEFT, "right": KEY_RIGHT, "up": KEY_UP, "down": KEY_DOWN,
		"punch": KEY_KP_1, "kick": KEY_KP_2, "guard": KEY_KP_5, "special": KEY_KP_3},
}
const DEFAULT_PAD := {
	"punch": JOY_BUTTON_X, "kick": JOY_BUTTON_A, "guard": JOY_BUTTON_RIGHT_SHOULDER,
	"special": JOY_BUTTON_Y, "left": JOY_BUTTON_DPAD_LEFT, "right": JOY_BUTTON_DPAD_RIGHT,
	"up": JOY_BUTTON_DPAD_UP, "down": JOY_BUTTON_DPAD_DOWN,
}

var data := {
	"video": {"fullscreen": false, "vsync": true, "quality": 2, "render_scale": 1.0, "show_fps": false},
	"audio": {"master": 0.9, "music": 0.7, "sfx": 0.9, "voice": 1.0},
	"game": {"difficulty": 1, "rounds": 2, "timer": 99, "vibration": true, "hitboxes": false},
	"touch": {"mode": 0, "opacity": 0.8, "size": 1.0},
}
var key_overrides := {}   # "p1_punch" -> keycode


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_load()
	_register_inputs()
	apply()


func get_value(section: String, key: String) -> Variant:
	return data[section][key]


func set_value(section: String, key: String, value: Variant) -> void:
	data[section][key] = value
	apply()
	save()


func apply() -> void:
	var v: Dictionary = data["video"]
	if not OS.has_feature("mobile") and not OS.has_feature("web"):
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if v["fullscreen"] else DisplayServer.WINDOW_MODE_WINDOWED)
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED if v["vsync"] else DisplayServer.VSYNC_DISABLED)
	var vp := get_viewport()
	vp.scaling_3d_scale = float(v["render_scale"])
	vp.msaa_3d = [Viewport.MSAA_DISABLED, Viewport.MSAA_2X, Viewport.MSAA_4X][int(v["quality"])]
	vp.screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA if int(v["quality"]) >= 1 else Viewport.SCREEN_SPACE_AA_DISABLED
	var a: Dictionary = data["audio"]
	_bus("Master", a["master"])
	_bus("Music", a["music"])
	_bus("SFX", a["sfx"])
	_bus("Voice", a["voice"])
	changed.emit()


func touch_visible() -> bool:
	match int(data["touch"]["mode"]):
		1: return true
		2: return false
	return DisplayServer.is_touchscreen_available() or OS.has_feature("mobile")


func _bus(bus_name: String, linear: float) -> void:
	var idx := AudioServer.get_bus_index(bus_name)
	if idx < 0:
		AudioServer.add_bus()
		idx = AudioServer.bus_count - 1
		AudioServer.set_bus_name(idx, bus_name)
		AudioServer.set_bus_send(idx, "Master")
	AudioServer.set_bus_volume_db(idx, linear_to_db(maxf(linear, 0.0001)))


# ------------------------------------------------------------------ controles
func _register_inputs() -> void:
	for p in [1, 2]:
		for a in ACTIONS:
			var action := "p%d_%s" % [p, a]
			if not InputMap.has_action(action):
				InputMap.add_action(action, 0.35)
			InputMap.action_erase_events(action)
			var key: int = key_overrides.get(action, DEFAULT_KEYS[p][a])
			var ev := InputEventKey.new()
			ev.physical_keycode = key
			InputMap.action_add_event(action, ev)
			var jb := InputEventJoypadButton.new()
			jb.button_index = DEFAULT_PAD[a]
			jb.device = p - 1
			InputMap.action_add_event(action, jb)
		var axes := {"left": [JOY_AXIS_LEFT_X, -1.0], "right": [JOY_AXIS_LEFT_X, 1.0],
			"up": [JOY_AXIS_LEFT_Y, -1.0], "down": [JOY_AXIS_LEFT_Y, 1.0]}
		for a in axes:
			var jm := InputEventJoypadMotion.new()
			jm.axis = axes[a][0]
			jm.axis_value = axes[a][1]
			jm.device = p - 1
			InputMap.action_add_event("p%d_%s" % [p, a], jm)
	var extra := {"pause": [KEY_ESCAPE, KEY_P], "ui_back": [KEY_BACKSPACE], "debug_hitboxes": [KEY_F1]}
	for action in extra:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for k in extra[action]:
			var e := InputEventKey.new()
			e.physical_keycode = k
			InputMap.action_add_event(action, e)
	var sp := InputEventJoypadButton.new()
	sp.button_index = JOY_BUTTON_START
	InputMap.action_add_event("pause", sp)


func key_for(action: String) -> int:
	var p := int(action.substr(1, 1))
	return key_overrides.get(action, DEFAULT_KEYS[p][action.substr(3)])


func remap(action: String, keycode: int) -> void:
	key_overrides[action] = keycode
	_register_inputs()
	save()


func reset_controls() -> void:
	key_overrides.clear()
	_register_inputs()
	save()


# ------------------------------------------------------------------ disco
func save() -> void:
	var cf := ConfigFile.new()
	for s in data:
		for k in data[s]:
			cf.set_value(s, k, data[s][k])
	for a in key_overrides:
		cf.set_value("keys", a, key_overrides[a])
	cf.save(PATH)


func _load() -> void:
	var cf := ConfigFile.new()
	if cf.load(PATH) != OK:
		if OS.has_feature("mobile"):
			data["video"]["quality"] = 1
			data["video"]["render_scale"] = 0.8
		return
	for s in data:
		for k in data[s]:
			data[s][k] = cf.get_value(s, k, data[s][k])
	if cf.has_section("keys"):
		for a in cf.get_section_keys("keys"):
			key_overrides[a] = int(cf.get_value("keys", a))
