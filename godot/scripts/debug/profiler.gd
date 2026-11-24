class_name Profiler
extends CanvasLayer
## Debug profiler: monitora FPS, tempo de frame, nós ativos, picos de processamento.
## Ativável via Settings.debug_profiler = true

var enabled := false
var _fps := 0.0
var _frame_time := 0.0
var _node_count := 0
var _particle_count := 0
var _frame_times: PackedFloat64Array = []
var _peak_time := 0.0
var _peak_frame := 0
var _label: Label
var _last_time := 0.0

func _ready() -> void:
	if not enabled:
		queue_free()
		return
	process_mode = Node.PROCESS_MODE_ALWAYS
	_label = Label.new()
	add_child(_label)
	_label.anchor_left = 0.0
	_label.anchor_top = 0.0
	_label.offset_left = 10.0
	_label.offset_top = 10.0
	_label.add_theme_font_size_override("font_size", 16)
	var font_color := Color.WHITE
	_label.add_theme_color_override("font_color", font_color)
	var bg_stylebox := StyleBoxFlat.new()
	bg_stylebox.bg_color = Color(0, 0, 0, 0.7)
	bg_stylebox.set_corner_radius_all(4)
	bg_stylebox.set_margin_all(4)
	_label.add_theme_stylebox_override("normal", bg_stylebox)

func _process(dt: float) -> void:
	if not enabled:
		return
	var now := Time.get_ticks_msec()
	if _last_time == 0.0:
		_last_time = now
		return
	_frame_time = (now - _last_time)  # em ms
	_last_time = now
	_fps = 1.0 / dt if dt > 0 else 0.0
	_frame_times.append(_frame_time)
	if _frame_times.size() > 60:
		_frame_times.remove_at(0)
	if _frame_time > _peak_time:
		_peak_time = _frame_time
		_peak_frame = Engine.get_process_frames()
	_count_nodes()
	_update_label()

func _count_nodes() -> void:
	var root := get_tree().root
	_node_count = _count_children(root)
	_particle_count = 0
	for node in get_tree().get_nodes_in_group("*"):
		if node is GPUParticles3D:
			if node.emitting:
				_particle_count += node.amount

func _count_children(node: Node) -> int:
	var count := 1
	for child in node.get_children():
		count += _count_children(child)
	return count

func _update_label() -> void:
	var avg_frame_time := 0.0
	if _frame_times.size() > 0:
		for t in _frame_times:
			avg_frame_time += t
		avg_frame_time /= _frame_times.size()
	var peak_ms := _peak_time
	var text := "FPS: %.1f | Frame: %.1f ms (Avg: %.1f ms)\n" % [_fps, _frame_time, avg_frame_time]
	text += "Nodes: %d | Particles: %d\n" % [_node_count, _particle_count]
	text += "Peak: %.1f ms (frame %d)" % [peak_ms, _peak_frame]
	_label.text = text

func reset_peak() -> void:
	_peak_time = 0.0
	_peak_frame = 0
