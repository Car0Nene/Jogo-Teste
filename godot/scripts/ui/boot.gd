extends Control
## Tela de carregamento inicial. Na versão Web, baixa o pacote dos cenários (env.pck)
## separado — o GitHub Pages limita arquivos a 100 MB — e carrega antes do menu.

const ENV_PACK := "env_v1.pck"
const PROBE := "res://assets/env/props/bar_balcao.glb"

var _bar: ProgressBar
var _label: Label
var _http: HTTPRequest
var _dest := "user://" + ENV_PACK


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg := ColorRect.new()
	bg.color = Color("0d0a1a")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var v := VBoxContainer.new()
	v.set_anchors_preset(Control.PRESET_CENTER)
	v.grow_horizontal = Control.GROW_DIRECTION_BOTH
	v.grow_vertical = Control.GROW_DIRECTION_BOTH
	v.custom_minimum_size = Vector2(720, 0)
	v.add_theme_constant_override("separation", 18)
	add_child(v)
	var t := UI.title("FAMÍLIA FIGHTER", 96, UI.GOLD)
	v.add_child(t)
	_label = UI.label("Carregando...", 26, Color(1, 1, 1, 0.8), UI.body_bold)
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(_label)
	_bar = ProgressBar.new()
	_bar.custom_minimum_size = Vector2(720, 22)
	_bar.show_percentage = false
	v.add_child(_bar)
	await get_tree().process_frame
	if ResourceLoader.exists(PROBE):
		_done()
		return
	# Web: o index.html já baixou o pacote para /tmp antes de iniciar o motor
	for pre in ["/tmp/" + ENV_PACK]:
		if FileAccess.file_exists(pre) and ProjectSettings.load_resource_pack(pre) and ResourceLoader.exists(PROBE):
			_done()
			return
	if FileAccess.file_exists(_dest) and ProjectSettings.load_resource_pack(_dest) and ResourceLoader.exists(PROBE):
		_done()
		return
	_download()


func _download() -> void:
	_label.text = "Baixando cenários 3D (só na primeira vez)..."
	_http = HTTPRequest.new()
	_http.download_file = _dest
	_http.use_threads = false
	_http.accept_gzip = false  # no navegador o fetch já descompacta
	add_child(_http)
	_http.request_completed.connect(_on_done)
	var base := ""
	if OS.has_feature("web"):
		base = str(JavaScriptBridge.eval("window.location.href.replace(/[^/]*$/, '')"))
	var err := _http.request(base + ENV_PACK)
	if err != OK:
		_label.text = "Erro ao iniciar download (%d). Recarregue a página." % err


func _process(_dt: float) -> void:
	if _http and _http.get_body_size() > 0:
		_bar.value = 100.0 * _http.get_downloaded_bytes() / _http.get_body_size()
		_label.text = "Baixando cenários 3D... %d / %d MB" % [_http.get_downloaded_bytes() / 1048576, _http.get_body_size() / 1048576]


func _on_done(result: int, code: int, _h: PackedStringArray, _b: PackedByteArray) -> void:
	if result != HTTPRequest.RESULT_SUCCESS or code != 200:
		_label.text = "Falha ao baixar os cenários (%d/%d). Recarregue a página." % [result, code]
		return
	if not ProjectSettings.load_resource_pack(_dest):
		_label.text = "Pacote de cenários inválido. Recarregue a página."
		return
	_done()


func _done() -> void:
	_bar.value = 100
	get_tree().change_scene_to_file.call_deferred("res://scenes/main_menu.tscn")
