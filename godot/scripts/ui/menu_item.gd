class_name MenuItem
extends Button
## Item de menu estilo jogo de luta: faixa inclinada, número, título e animação de foco.

var index := 0
var accent := UI.PINK
var _focus_t := 0.0
var _shift := 0.0


func _init(label_text: String, idx: int, color := UI.PINK) -> void:
	text = ""
	index = idx
	accent = color
	set_meta("title", label_text)
	custom_minimum_size = Vector2(520, 62)
	flat = true
	focus_mode = Control.FOCUS_ALL
	mouse_entered.connect(grab_focus)
	focus_entered.connect(func(): Audio.sfx(&"move"))
	add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	add_theme_stylebox_override("normal", StyleBoxEmpty.new())
	add_theme_stylebox_override("hover", StyleBoxEmpty.new())
	add_theme_stylebox_override("pressed", StyleBoxEmpty.new())


func _process(dt: float) -> void:
	var target := 1.0 if has_focus() else 0.0
	_focus_t = move_toward(_focus_t, target, dt * 7.0)
	var ease_t := ease(_focus_t, -2.2)
	_shift = 36.0 * ease_t
	queue_redraw()


func _draw() -> void:
	var w := size.x
	var h := size.y
	var skew := 18.0
	var ft := ease(_focus_t, -2.2)
	var x0 := _shift
	# fundo inclinado
	var bg := Color(0.07, 0.05, 0.13, 0.55 + 0.3 * ft)
	var pts := PackedVector2Array([Vector2(x0 + skew, 0), Vector2(x0 + w * (0.72 + 0.28 * ft), 0),
		Vector2(x0 + w * (0.72 + 0.28 * ft) - skew, h), Vector2(x0, h)])
	draw_colored_polygon(pts, bg)
	# preenchimento de destaque que "varre" ao focar
	if ft > 0.01:
		var fw := (w * 0.98) * ft
		var hl := PackedVector2Array([Vector2(x0 + skew, 0), Vector2(x0 + skew + fw, 0), Vector2(x0 + fw, h), Vector2(x0, h)])
		var g := Color(accent.r, accent.g, accent.b, 0.28 * ft)
		draw_colored_polygon(hl, g)
		# barra lateral
		draw_colored_polygon(PackedVector2Array([Vector2(x0 + skew - 10, 0), Vector2(x0 + skew - 2, 0),
			Vector2(x0 - 2, h), Vector2(x0 - 10, h)]), UI.GOLD)
	# número
	var nfont: Font = UI.display
	draw_string(nfont, Vector2(x0 + 30, h * 0.72), "%02d" % (index + 1), HORIZONTAL_ALIGNMENT_LEFT, -1, 22,
		Color(1, 1, 1, 0.35 + 0.4 * ft))
	# título
	var col := Color(0.92, 0.9, 1.0).lerp(UI.GOLD, ft)
	draw_string(UI.display, Vector2(x0 + 78, h * 0.76), String(get_meta("title")), HORIZONTAL_ALIGNMENT_LEFT, -1, 40, col)
	# linha base
	draw_line(Vector2(x0, h - 1), Vector2(x0 + w * 0.7, h - 1), Color(1, 1, 1, 0.06), 1.0)
