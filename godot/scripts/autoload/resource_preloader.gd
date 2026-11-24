## Pré-carrega modelos e recursos para evitar travamentos
extends Node

var _preloaded_models := {}
var _preloaded_stages := {}

func _ready() -> void:
	preload_all_fighters()
	preload_all_stages()
	print("Recursos pré-carregados: %d personagens, %d cenários" % [_preloaded_models.size(), _preloaded_stages.size()])

func preload_all_fighters() -> void:
	for fighter_id in Game.ROSTER:
		preload_fighter(fighter_id)

func preload_all_stages() -> void:
	for stage_id in Game.STAGES:
		preload_stage(stage_id)

func preload_fighter(fighter_id: StringName) -> void:
	if fighter_id in _preloaded_models:
		return
	var data := Game.fighter(fighter_id)
	if data:
		var model = load(data.model)
		if model:
			_preloaded_models[fighter_id] = model

func preload_stage(stage_id: StringName) -> void:
	if stage_id in _preloaded_stages:
		return
	var data := Game.stage_data(stage_id)
	if data:
		var model = load(data.model)
		if model:
			_preloaded_stages[stage_id] = model

func get_preloaded_fighter(fighter_id: StringName) -> Resource:
	return _preloaded_models.get(fighter_id)

func get_preloaded_stage(stage_id: StringName) -> Resource:
	return _preloaded_stages.get(stage_id)
