class_name FighterData
extends Resource
## Ficha de um lutador. Duplique um .tres em data/fighters para criar outro.

@export var id: StringName
@export var display_name := ""
@export var title := ""
@export var quote := ""
@export_multiline var bio := ""
@export var model: PackedScene
@export var portrait: Texture2D
@export var accent := Color(1, 0.8, 0.2)
@export var height_m := 1.68                       ## altura real em metros
@export var max_hp := 1000.0
@export var walk_speed := 1.9
@export var back_speed := 1.5
@export var jump_velocity := 6.2
@export var gravity := 19.0
@export var defense := 1.0                          ## multiplicador de dano recebido
@export var special_name := ""
@export_multiline var special_desc := ""
@export var sub_special_name := ""
@export_multiline var sub_special_desc := ""
@export var moves: Dictionary = {}                  ## StringName -> MoveData
@export var forms: Dictionary = {}                  ## StringName -> Dictionary (atk, def, speed, color, label, model, duration)
@export var voices: Dictionary = {}                 ## evento -> AudioStream


func move(n: StringName) -> MoveData:
	return moves.get(n) as MoveData
