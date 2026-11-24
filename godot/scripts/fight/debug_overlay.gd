class_name DebugOverlay
extends Node3D
## Visualização de depuração (F1): hurtboxes (verde), hitbox do golpe (vermelho quando ativa,
## amarelo fora dos quadros ativos) e painel com estado, golpe, quadro e frame data.

var fighters: Array[Fighter] = []
var _mesh: MeshInstance3D
var _im: ImmediateMesh
var _label: Label
var _layer: CanvasLayer


func _ready() -> void:
	_im = ImmediateMesh.new()
	_mesh = MeshInstance3D.new()
	_mesh.mesh = _im
	_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.vertex_color_use_as_albedo = true
	m.no_depth_test = true
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_mesh.material_override = m
	add_child(_mesh)
	_layer = CanvasLayer.new()
	_layer.layer = 30
	add_child(_layer)
	_label = UI.label("", 18, Color.WHITE, UI.body_bold, 6)
	_label.position = Vector2(20, 150)
	_layer.add_child(_label)


func _process(_dt: float) -> void:
	var on := Game.debug_hitboxes
	_mesh.visible = on
	_label.visible = on
	_im.clear_surfaces()
	if not on or fighters.is_empty():
		return
	_im.surface_begin(Mesh.PRIMITIVE_LINES)
	var lines := []
	for f in fighters:
		if not is_instance_valid(f):
			continue
		for r in f.hurt_rects():
			_rect(r, Color(0.2, 1.0, 0.3, 0.9))
		var hb := f.hitbox()
		if f.state == Fighter.S.ATTACK and hb.radius > 0.0:
			_circle(hb.center, hb.radius, Color(1, 0.15, 0.15, 1) if hb.active else Color(1, 0.85, 0.2, 0.7))
		var mv := f.move
		var fd := "" if mv == null or f.state != Fighter.S.ATTACK else "  %s  quadro %d  (inicio %d / ativo %d / recup %d)  osso %s" % [
			f.move_name, f.state_frame, mv.startup, mv.active, mv.recovery, hb.bone]
		lines.append("P%d %s  estado %s  HP %d  especial %d%s" % [f.player_index, f.data.display_name,
			Fighter.S.keys()[f.state], int(f.hp), int(f.meter), fd])
	if fighters.size() == 2:
		lines.append("distância: %.2f m" % absf(fighters[0].pos.x - fighters[1].pos.x))
	_im.surface_end()
	_label.text = "\n".join(lines)


func _rect(r: Rect2, c: Color) -> void:
	var a := Vector3(r.position.x, r.position.y, 0.3)
	var b := Vector3(r.end.x, r.position.y, 0.3)
	var cc := Vector3(r.end.x, r.end.y, 0.3)
	var d := Vector3(r.position.x, r.end.y, 0.3)
	for seg in [[a, b], [b, cc], [cc, d], [d, a]]:
		_im.surface_set_color(c)
		_im.surface_add_vertex(seg[0])
		_im.surface_set_color(c)
		_im.surface_add_vertex(seg[1])


func _circle(center: Vector2, radius: float, c: Color) -> void:
	var n := 24
	for i in n:
		var a0 := TAU * i / n
		var a1 := TAU * (i + 1) / n
		_im.surface_set_color(c)
		_im.surface_add_vertex(Vector3(center.x + cos(a0) * radius, center.y + sin(a0) * radius, 0.3))
		_im.surface_set_color(c)
		_im.surface_add_vertex(Vector3(center.x + cos(a1) * radius, center.y + sin(a1) * radius, 0.3))
