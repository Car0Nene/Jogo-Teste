class_name FightMenu
extends CanvasLayer
## Menu de pausa, lista de golpes, configurações e tela de resultado.

signal resume
signal restart
signal to_select
signal to_menu
signal next_fight

var _root: Control
var _box: VBoxContainer
var _panel: Control


func _ready() -> void:
	layer = 50
	process_mode = Node.PROCESS_MODE_ALWAYS
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_root)
	var dim := ColorRect.new()
	dim.color = Color(0.02, 0.0, 0.06, 0.72)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(dim)
	_root.visible = false


func close() -> void:
	_root.visible = false
	_clear()


func _clear() -> void:
	for c in _root.get_children():
		if c is not ColorRect:
			c.queue_free()


func _menu(title: String, items: Array) -> void:
	_clear()
	_root.visible = true
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(center)
	_box = VBoxContainer.new()
	_box.add_theme_constant_override("separation", 12)
	center.add_child(_box)
	_box.add_child(UI.title(title, 64))
	for it in items:
		_box.add_child(UI.button(it[0], it[1], 420))
	(_box.get_child(1) as Button).call_deferred("grab_focus")


func open_pause(data: FighterData, _opponent: Fighter) -> void:
	_menu("PAUSA", [
		["Continuar", func(): resume.emit()],
		["Lista de golpes", func(): _moves(data)],
		["Configurações", _settings],
		["Reiniciar luta", func(): restart.emit()],
		["Trocar lutador", func(): to_select.emit()],
		["Menu principal", func(): to_menu.emit()],
	])


func open_results(title: String, arcade_next: bool) -> void:
	var items := []
	if arcade_next:
		items.append(["Próxima luta", func(): next_fight.emit()])
	items.append(["Revanche", func(): restart.emit()])
	items.append(["Trocar lutador", func(): to_select.emit()])
	items.append(["Menu principal", func(): to_menu.emit()])
	await get_tree().create_timer(1.5).timeout
	_menu(title, items)


func _settings() -> void:
	_clear()
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(center)
	var sp := SettingsPanel.new()
	center.add_child(sp)
	sp.closed.connect(func(): resume.emit())
	sp.call_deferred("focus_first")


func _moves(d: FighterData) -> void:
	_clear()
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(center)
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(900, 560)
	center.add_child(panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	panel.add_child(v)
	v.add_child(UI.title("GOLPES DE %s" % d.display_name, 48, d.accent))
	var rows := [
		["Soco  (Soco → Soco → Soco)", "Jab → Direto → Gancho"],
		["Frente + Soco", "Direto"],
		["Baixo + Soco", "Uppercut (lança no ar)"],
		["Chute  (Chute → Chute)", "Chute → Chute Alto"],
		["Frente + Chute", "Chute Alto"],
		["Trás + Chute", "Chute Baixo (defenda agachado)"],
		["Baixo + Chute", "Rasteira (derruba)"],
		["No ar: Soco / Chute", "Golpes aéreos (defenda em pé)"],
		["Especial  (ou ↓↘→ + Soco)", "%s — %s" % [d.special_name, d.special_desc]],
		["Baixo + Especial  (ou ↓↙← + Soco)", "%s — %s" % [d.sub_special_name, d.sub_special_desc]],
		["Defesa ou segurar para trás", "Defende (agachado defende golpes baixos)"],
	]
	for r in rows:
		var h := HBoxContainer.new()
		var a := UI.label(r[0], 22, UI.GOLD, UI.body_bold)
		a.custom_minimum_size.x = 380
		h.add_child(a)
		var b := UI.label(r[1], 21)
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		b.custom_minimum_size.x = 460
		h.add_child(b)
		v.add_child(h)
	v.add_child(UI.label("Especiais gastam meia barra de ESPECIAL (enche batendo e apanhando).", 18, Color(1, 1, 1, 0.7)))
	var back := UI.button("Voltar", func(): open_pause(d, null), 260)
	back.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(back)
	back.call_deferred("grab_focus")
