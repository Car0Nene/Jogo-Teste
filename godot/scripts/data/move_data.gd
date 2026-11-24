class_name MoveData
extends Resource
## Um golpe. Tempos em QUADROS a 60 fps (padrão dos jogos de luta).
## Hitbox: esfera presa a um osso do esqueleto humanoide (ex.: "RightHand", "RightFoot"),
## então o alcance acompanha a animação de verdade.

enum Kind { MELEE, PROJECTILE, BUFF, THROW }
enum Level { HIGH, MID, LOW, OVERHEAD }

@export var display_name := ""
@export var kind: Kind = Kind.MELEE
@export var anim: StringName = &"jab"              ## nome da animação na biblioteca "fight"
@export var anim_speed := 1.0
@export var startup := 6
@export var active := 3
@export var recovery := 10
@export var damage := 6.0
@export var level: Level = Level.HIGH
@export var hitbox_bone: StringName = &"RightHand"
@export var hitbox_radius := 0.16
@export var hitstun := 16
@export var blockstun := 10
@export var hitstop := 6
@export var pushback := 2.2                         ## m/s aplicados no alvo
@export var knockdown := false
@export var launch := 0.0                           ## velocidade vertical ao acertar (m/s)
@export var lunge := 0.0                            ## avanço durante startup/active (m/s)
@export var meter_gain := 6.0
@export var meter_cost := 0.0
@export var cancel_into: Array[StringName] = []     ## golpes que podem emendar ao acertar/bloquear
@export var air := false
@export var sfx: StringName = &"whoosh_light"
@export var hit_fx: StringName = &"spark"
## Projétil / buff
@export var projectile_kind: StringName = &"energy"   ## cake, ball, energy, notes, milk, plates, smoke, wave
@export var projectile_color := Color(0.4, 0.9, 1.0)
@export var projectile_hits := 1
@export var projectile_speed := 7.0
@export var projectile_spawn := Vector2(0.6, 1.1)
@export var buff_form: StringName = &""
@export var voice: StringName = &""


func total() -> int:
	return startup + active + recovery
