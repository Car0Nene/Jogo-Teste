extends Node
## Tema visual e utilitários de interface (botões, títulos, painéis).

const GOLD := Color("ffd23f")
const PINK := Color("ff3d81")
const INK := Color("0d0a1a")
const PANEL := Color(0.06, 0.04, 0.12, 0.88)

var display: Font
var title_font: Font
var body: Font
var body_bold: Font
var theme: Theme


func _ready() -> void:
	display = load("res://assets/fonts/BarlowCondensed-ExtraBoldItalic.ttf")
	title_font = load("res://assets/fonts/BebasNeue-Regular.ttf")
	body = load("res://assets/fonts/Barlow-SemiBold.ttf")
	body_bold = load("res://assets/fonts/Barlow-Bold.ttf")
	theme = _make_theme()
	get_tree().root.theme = theme


func _box(bg: Color, border: Color, bw := 2, radius := 10) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(bw)
	s.set_corner_radius_all(radius)
	s.content_margin_left = 18
	s.content_margin_right = 18
	s.content_margin_top = 10
	s.content_margin_bottom = 10
	s.shadow_color = Color(0, 0, 0, 0.35)
	s.shadow_size = 6
	return s


func _make_theme() -> Theme:
	var t := Theme.new()
	t.default_font = body
	t.default_font_size = 22
	t.set_stylebox("normal", "Button", _box(Color(0.12, 0.08, 0.22, 0.92), Color(1, 1, 1, 0.12)))
	t.set_stylebox("hover", "Button", _box(Color(0.2, 0.1, 0.32, 0.95), PINK))
	t.set_stylebox("focus", "Button", _box(Color(0.24, 0.12, 0.36, 0.0), GOLD, 3))
	t.set_stylebox("pressed", "Button", _box(Color(0.35, 0.1, 0.3, 0.95), GOLD))
	t.set_stylebox("disabled", "Button", _box(Color(0.1, 0.1, 0.12, 0.6), Color(1, 1, 1, 0.05)))
	t.set_font("font", "Button", body_bold)
	t.set_font_size("font_size", "Button", 24)
	t.set_color("font_color", "Button", Color(0.95, 0.93, 1))
	t.set_color("font_hover_color", "Button", Color.WHITE)
	t.set_color("font_focus_color", "Button", GOLD)
	t.set_color("font_pressed_color", "Button", GOLD)
	t.set_stylebox("panel", "PanelContainer", _box(PANEL, Color(1, 1, 1, 0.08), 1, 16))
	t.set_stylebox("panel", "Panel", _box(PANEL, Color(1, 1, 1, 0.08), 1, 16))
	t.set_color("font_color", "Label", Color(0.95, 0.94, 1))
	t.set_color("font_outline_color", "Label", INK)
	t.set_constant("outline_size", "Label", 0)
	# sliders / checks / options
	var grab := StyleBoxFlat.new()
	grab.bg_color = PINK
	grab.set_corner_radius_all(6)
	grab.content_margin_top = 6
	grab.content_margin_bottom = 6
	var track := StyleBoxFlat.new()
	track.bg_color = Color(1, 1, 1, 0.15)
	track.set_corner_radius_all(6)
	track.content_margin_top = 6
	track.content_margin_bottom = 6
	t.set_stylebox("slider", "HSlider", track)
	t.set_stylebox("grabber_area", "HSlider", grab)
	t.set_stylebox("grabber_area_highlight", "HSlider", grab)
	t.set_stylebox("normal", "OptionButton", _box(Color(0.12, 0.08, 0.22, 0.92), Color(1, 1, 1, 0.12)))
	t.set_stylebox("hover", "OptionButton", _box(Color(0.2, 0.1, 0.32, 0.95), PINK))
	t.set_stylebox("focus", "OptionButton", _box(Color(0, 0, 0, 0), GOLD, 3))
	t.set_stylebox("pressed", "OptionButton", _box(Color(0.35, 0.1, 0.3, 0.95), GOLD))
	t.set_stylebox("panel", "PopupMenu", _box(Color(0.08, 0.05, 0.15, 0.98), PINK, 1, 8))
	t.set_stylebox("tab_selected", "TabBar", _box(Color(0.3, 0.1, 0.3, 0.95), GOLD, 2, 8))
	t.set_stylebox("tab_unselected", "TabBar", _box(Color(0.1, 0.07, 0.18, 0.9), Color(1, 1, 1, 0.08), 1, 8))
	t.set_stylebox("tab_hovered", "TabBar", _box(Color(0.2, 0.1, 0.3, 0.95), PINK, 1, 8))
	t.set_stylebox("tab_focus", "TabBar", _box(Color(0, 0, 0, 0), GOLD, 2, 8))
	t.set_stylebox("panel", "TabContainer", _box(Color(0.06, 0.04, 0.12, 0.6), Color(1, 1, 1, 0.06), 1, 12))
	t.set_font("font", "TabBar", body_bold)
	t.set_font_size("font_size", "TabBar", 22)
	return t


func label(text: String, size := 24, color := Color.WHITE, font: Font = null, outline := 0) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font if font else body)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if outline > 0:
		l.add_theme_constant_override("outline_size", outline)
		l.add_theme_color_override("font_outline_color", INK)
	return l


func title(text: String, size := 72, color := GOLD) -> Label:
	var l := label(text, size, color, display, 14)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return l


func button(text: String, cb: Callable, min_w := 340) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(min_w, 58)
	b.pressed.connect(func():
		Audio.sfx(&"select")
		cb.call())
	b.focus_entered.connect(func(): Audio.sfx(&"move"))
	b.mouse_entered.connect(func(): b.grab_focus())
	return b


func backdrop(parent: Control, dim := 0.55) -> TextureRect:
	var bg := TextureRect.new()
	bg.texture = load("res://assets/ui/menu_bg.png") if ResourceLoader.exists("res://assets/ui/menu_bg.png") else null
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	parent.add_child(bg)
	var shade := ColorRect.new()
	shade.color = Color(0.03, 0.01, 0.08, dim)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	parent.add_child(shade)
	return bg
