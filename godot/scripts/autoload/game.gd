extends Node
## Estado da partida e catálogo de lutadores/arenas.

enum Mode { ARCADE, VERSUS_CPU, VERSUS_2P, TRAINING }

const ROSTER: Array[StringName] = [&"juraci", &"carlos", &"pedro", &"paula", &"franciely",
	&"gabi", &"davi", &"daniel", &"tainara"]
const STAGES: Array[StringName] = [&"padaria", &"quintal", &"festa", &"bar", &"praia"]

var mode: Mode = Mode.VERSUS_CPU
var p1_fighter: StringName = &"juraci"
var p2_fighter: StringName = &"carlos"
var stage: StringName = &"padaria"
var arcade_ladder: Array[StringName] = []
var arcade_index := 0
var debug_hitboxes := false

var _fighters := {}
var _preload_paths: PackedStringArray = []
var _preloaded: Array = []          # mantém os recursos vivos no cache durante a luta
var _stages := {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


func fighter(id: StringName) -> FighterData:
	if not _fighters.has(id):
		_fighters[id] = load("res://data/fighters/%s.tres" % id)
	return _fighters[id]


func stage_data(id: StringName) -> StageData:
	if not _stages.has(id):
		_stages[id] = load("res://data/stages/%s.tres" % id)
	return _stages[id]


func start_arcade(player: StringName) -> void:
	mode = Mode.ARCADE
	p1_fighter = player
	arcade_ladder = ROSTER.filter(func(f): return f != player)
	arcade_ladder.shuffle()
	arcade_index = 0
	p2_fighter = arcade_ladder[0]
	stage = STAGES[randi() % STAGES.size()]


func arcade_next() -> bool:
	arcade_index += 1
	if arcade_index >= arcade_ladder.size():
		return false
	p2_fighter = arcade_ladder[arcade_index]
	stage = STAGES[arcade_index % STAGES.size()]
	return true


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("debug_hitboxes"):
		debug_hitboxes = not debug_hitboxes


## Começa a carregar em segundo plano tudo que a próxima luta usa (lutadores, formas,
## arena, céu e música), para a troca de tela não travar.
func preload_fight() -> void:
	_preloaded.clear()
	_preload_paths.clear()
	var paths := ["res://scenes/fight.tscn"]
	for id in [p1_fighter, p2_fighter]:
		var d := fighter(id)
		if d.model: paths.append(d.model.resource_path)
		for f in d.forms.values():
			if f.has("model") and f["model"]: paths.append(f["model"].resource_path)
	var lay: Dictionary = Stage.LAYOUTS.get(stage, {})
	for pr in lay.get("props", []):
		paths.append(Stage.ENV + pr[0])
	if lay.has("hdri"):
		paths.append(Stage.ENV + "hdri/%s.hdr" % lay.hdri)
	for p in paths:
		if p != "" and ResourceLoader.exists(p) and not _preload_paths.has(p):
			_preload_paths.append(p)
			ResourceLoader.load_threaded_request(p, "", true)


## 0..1 — quanto da pré-carga já terminou.
func preload_progress() -> float:
	if _preload_paths.is_empty():
		return 1.0
	var done := 0.0
	for p in _preload_paths:
		var st := ResourceLoader.load_threaded_get_status(p)
		if st == ResourceLoader.THREAD_LOAD_LOADED or st == ResourceLoader.THREAD_LOAD_FAILED or st == ResourceLoader.THREAD_LOAD_INVALID_RESOURCE:
			done += 1.0
	return done / _preload_paths.size()


func finish_preload() -> void:
	for p in _preload_paths:
		if ResourceLoader.load_threaded_get_status(p) == ResourceLoader.THREAD_LOAD_LOADED:
			_preloaded.append(ResourceLoader.load_threaded_get(p))
	_preload_paths.clear()
