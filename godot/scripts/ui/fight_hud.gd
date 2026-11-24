class_name FightHud
extends CanvasLayer
## Interface da luta: retratos, barras de vida (com rastro), tempo, rounds, barra de
## especial em 2 níveis, contador de combo, avisos de forma e faixas de anúncio.

var p1: Fighter
var p2: Fighter
var time_text := "99"
var _root: Control
var _lag := [1.0, 1.0]
var _flash := [0.0, 0.0]
var _wins := [0, 0]
var _rounds_needed := 2
var _banner: Label
var _banner_sub: Label
var _banner_box: Control
var _combo: Array[Label] = []
var _combo_timer := [0.0, 0.0]


func bind(a: Fighter, b: Fighter) -> void:
	p1 = a
	p2 = b


func _ready() -> void:
	layer = 10
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_root)
	_root.draw.connect(_draw_hud)
	_banner_box = VBoxContainer.new()
	_banner_box.set_anchors_preset(Control.PRESET_CENTER)
	_banner_box.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_banner_box.grow_vertical = Control.GROW_DIRECTION_BOTH
	_banner_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_banner_box.alignment = BoxContainer.ALIGNMENT_CENTER
	add_child(_banner_box)
	_banner = UI.title("", 120)
	_banner_box.add_child(_banner)
	_banner_sub = UI.label("", 30, Color.WHITE, UI.body_bold, 8)
	_banner_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner_box.add_child(_banner_sub)
	_banner_box.visible = false
	for i in 2:
		var l := UI.label("", 44, UI.GOLD, UI.display, 10)
		l.position = Vector2(60 if i == 0 else 0, 240)
		l.modulate.a = 0.0
		add_child(l)
		_combo.append(l)


func _process(dt: float) -> void:
	if p1 == null:
		return
	for i in 2:
		var f := p1 if i == 0 else p2
		var v := f.hp / f.data.max_hp
		_lag[i] = maxf(v, _lag[i] - dt * 0.4) if _lag[i] > v else v
		_flash[i] = maxf(0.0, _flash[i] - dt * 4.0)
		_combo_timer[i] = maxf(0.0, _combo_timer[i] - dt)
		_combo[i].modulate.a = clampf(_combo_timer[i] * 2.0, 0.0, 1.0)
	var vw := _root.get_viewport_rect().size.x
	_combo[1].position.x = vw - _combo[1].size.x - 60
	_root.queue_redraw()


func reset_round(_round: int, wins: Array, rounds_needed: Variant) -> void:
	_wins = wins.duplicate()
	_rounds_needed = int(rounds_needed)
	_lag = [1.0, 1.0]


func flash_bar(f: Fighter) -> void:
	_flash[0 if f == p1 else 1] = 1.0


func show_combo(att: Fighter, hits: int, dmg: float) -> void:
	if hits < 2:
		return
	var i := 0 if att == p1 else 1
	_combo[i].text = "%d HITS\n%d DANO" % [hits, int(dmg)]
	_combo_timer[i] = 1.6
	var tw := _combo[i].create_tween()
	_combo[i].scale = Vector2.ONE * 1.3
	tw.tween_property(_combo[i], "scale", Vector2.ONE, 0.12)


func form_popup(f: Fighter, text: String, color: Color) -> void:
	var l := UI.label(text, 40, color, UI.display, 10)
	add_child(l)
	var vw := _root.get_viewport_rect().size
	l.position = Vector2(80 if f == p1 else vw.x - 520, 300)
	var tw := l.create_tween()
	tw.tween_property(l, "position:y", 250.0, 1.2)
	tw.parallel().tween_property(l, "modulate:a", 0.0, 0.6).set_delay(0.8)
	tw.tween_callback(l.queue_free)


func banner(text: String, color: Color, sub := "") -> void:
	_banner.text = text
	_banner.add_theme_color_override("font_color", color)
	_banner_sub.text = sub
	_banner_sub.visible = sub != ""
	_banner_box.visible = true
	_banner_box.pivot_offset = _banner_box.size * 0.5
	_banner_box.scale = Vector2.ONE * 1.5
	_banner_box.modulate.a = 0.0
	var tw := _banner_box.create_tween().set_parallel(true)
	tw.tween_property(_banner_box, "scale", Vector2.ONE, 0.22).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(_banner_box, "modulate:a", 1.0, 0.15)


func hide_banner() -> void:
	var tw := _banner_box.create_tween()
	tw.tween_property(_banner_box, "modulate:a", 0.0, 0.2)
	tw.tween_callback(func(): _banner_box.visible = false)


# ------------------------------------------------------------------ desenho
func _draw_hud() -> void:
	var c := _root
	var vw := c.get_viewport_rect().size.x
	var margin := 24.0
	var bar_w := minf(560.0, vw * 0.36)
	var bar_h := 30.0
	var top := 26.0
	for i in 2:
		var f := p1 if i == 0 else p2
		var left := i == 0
		var px := margin if left else vw - margin - 96
		var bx := margin + 108 if left else vw - margin - 108 - bar_w
		# retrato
		c.draw_rect(Rect2(px - 3, top - 3, 102, 102), f.data.accent)
		c.draw_rect(Rect2(px, top, 96, 96), Color(0.05, 0.03, 0.1))
		if f.data.portrait:
			c.draw_texture_rect(f.data.portrait, Rect2(px, top, 96, 96), false)
		# barra de vida
		var r := Rect2(bx, top + 8, bar_w, bar_h)
		var skew := 14.0
		_slanted(r.grow(4), Color(0, 0, 0, 0.75), skew, left)
		_slanted(r, Color(0.18, 0.04, 0.06), skew, left)
		var v := clampf(f.hp / f.data.max_hp, 0.0, 1.0)
		_fill(r, _lag[i], Color("ff5a36"), skew, left)
		var hp_col := Color("ffe14d").lerp(Color("ff3030"), 1.0 - smoothstep(0.15, 0.5, v))
		if _flash[i] > 0.0:
			hp_col = hp_col.lerp(Color.WHITE, _flash[i] * 0.6)
		_fill(r, v, hp_col, skew, left)
		_fill(Rect2(r.position, Vector2(r.size.x, r.size.y * 0.35)), v, Color(1, 1, 1, 0.25), skew, left)
		# nome
		var name_pos := Vector2(bx, top + bar_h + 40) if left else Vector2(bx + bar_w, top + bar_h + 40)
		_text(f.data.display_name, name_pos, 30, Color.WHITE, UI.display, not left)
		if f.form != &"":
			var info: Dictionary = f.data.forms.get(f.form, {})
			_text(String(info.get("label", "")), name_pos + Vector2(0, 26), 20, info.get("color", Color.WHITE), UI.body_bold, not left)
		# vitórias
		for w in _rounds_needed:
			var cx := bx + bar_w - 14 - w * 26 if left else bx + 14 + w * 26
			var won: bool = _wins[i] > w
			c.draw_circle(Vector2(cx, top + bar_h + 30), 9, Color(0, 0, 0, 0.7))
			c.draw_circle(Vector2(cx, top + bar_h + 30), 7, UI.GOLD if won else Color(1, 1, 1, 0.15))
		# barra de especial (2 níveis de 50)
		var mw := minf(320.0, vw * 0.22)
		var my := c.get_viewport_rect().size.y - 46
		var mx := margin if left else vw - margin - mw
		c.draw_rect(Rect2(mx - 3, my - 3, mw + 6, 24), Color(0, 0, 0, 0.7))
		var full := f.meter >= 50.0
		var mc := Color("38bdf8") if not full else Color(0.35 + 0.25 * sin(Time.get_ticks_msec() * 0.012), 0.9, 1.0)
		var mv := f.meter / 100.0
		if left:
			c.draw_rect(Rect2(mx, my, mw * mv, 18), mc)
		else:
			c.draw_rect(Rect2(mx + mw * (1.0 - mv), my, mw * mv, 18), mc)
		c.draw_line(Vector2(mx + mw * 0.5, my - 3), Vector2(mx + mw * 0.5, my + 21), Color(0, 0, 0, 0.9), 3)
		_text("ESPECIAL x%d" % int(f.meter / 50.0), Vector2(mx if left else mx + mw, my - 8), 20, Color("bae6fd"), UI.body_bold, not left)
	# tempo
	var tc := Vector2(vw * 0.5, top + 52)
	c.draw_rect(Rect2(tc.x - 52, top - 2, 104, 84), Color(0, 0, 0, 0.6))
	c.draw_rect(Rect2(tc.x - 52, top - 2, 104, 84), UI.GOLD, false, 2)
	_text(time_text, tc + Vector2(0, 14), 64, UI.GOLD, UI.title_font, false, true)


func _slanted(r: Rect2, col: Color, skew: float, left: bool) -> void:
	var p := r.position
	var s := r.size
	var pts: PackedVector2Array
	if left:
		pts = [p + Vector2(skew, 0), p + Vector2(s.x, 0), p + Vector2(s.x - skew, s.y), p + Vector2(0, s.y)]
	else:
		pts = [p, p + Vector2(s.x - skew, 0), p + Vector2(s.x, s.y), p + Vector2(skew, s.y)]
	_root.draw_colored_polygon(pts, col)


func _fill(r: Rect2, v: float, col: Color, skew: float, left: bool) -> void:
	if v <= 0.0:
		return
	var w := r.size.x * v
	# a barra esvazia em direção ao centro da tela
	var rr := Rect2(r.position + Vector2(r.size.x - w, 0), Vector2(w, r.size.y)) if left else Rect2(r.position, Vector2(w, r.size.y))
	_slanted(rr, col, minf(skew, w), left)


func _text(t: String, pos: Vector2, size: int, col: Color, font: Font, right := false, center := false) -> void:
	var w := font.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	var p := pos - Vector2(w if right else (w * 0.5 if center else 0.0), 0)
	_root.draw_string_outline(font, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, size, 6, UI.INK)
	_root.draw_string(font, p, t, HORIZONTAL_ALIGNMENT_LEFT, -1, size, col)
