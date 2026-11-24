extends CanvasLayer
## Troca de telas com transição em fade.

var _rect: ColorRect
var _busy := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	layer = 100
	_rect = ColorRect.new()
	_rect.color = Color(0.02, 0.01, 0.04, 0.0)
	_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_rect)


func go(path: String, duration := 0.35) -> void:
	if _busy:
		return
	_busy = true
	_rect.mouse_filter = Control.MOUSE_FILTER_STOP
	var tw := create_tween()
	tw.tween_property(_rect, "color:a", 1.0, duration)
	await tw.finished
	get_tree().paused = false
	Engine.time_scale = 1.0
	get_tree().change_scene_to_file(path)
	await get_tree().process_frame
	await get_tree().process_frame
	var tw2 := create_tween()
	tw2.tween_property(_rect, "color:a", 0.0, duration)
	await tw2.finished
	_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_busy = false
