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
