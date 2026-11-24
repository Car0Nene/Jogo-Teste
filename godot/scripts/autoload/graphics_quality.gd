extends Node

enum Quality { HIGH, MEDIUM, LOW }

var current_quality: Quality = Quality.HIGH
var _quality_presets := {
	Quality.HIGH: {
		"compress_lossy_quality": 0.95,
		"size_limit": 4096,
		"msaa_3d": 2,
		"ssao_enabled": true,
		"texture_filter": TextureFilter.FILTER_LINEAR_MIPMAP,
		"anisotropic_filter_level": 16,
		"ssao_radius": 1.0,
	},
	Quality.MEDIUM: {
		"compress_lossy_quality": 0.8,
		"size_limit": 2048,
		"msaa_3d": 1,
		"ssao_enabled": true,
		"texture_filter": TextureFilter.FILTER_LINEAR_MIPMAP,
		"anisotropic_filter_level": 8,
		"ssao_radius": 0.75,
	},
	Quality.LOW: {
		"compress_lossy_quality": 0.6,
		"size_limit": 1024,
		"msaa_3d": 1,
		"ssao_enabled": false,
		"texture_filter": TextureFilter.FILTER_LINEAR,
		"anisotropic_filter_level": 1,
		"ssao_radius": 0.5,
	},
}

func _ready() -> void:
	# Sincronizar com Settings
	var quality_index = Settings.get_value("video", "quality")
	if quality_index >= 0 and quality_index < 3:
		set_quality(quality_index)
	Settings.changed.connect(_on_settings_changed)

func _on_settings_changed() -> void:
	var quality_index = Settings.get_value("video", "quality")
	if quality_index >= 0 and quality_index < 3:
		set_quality(quality_index)

func set_quality(quality: int) -> void:
	if quality < 0 or quality >= 3:
		return
	
	current_quality = quality
	var preset = _quality_presets[quality]
	
	# Aplica MSAA via Settings (já implementado)
	# SSAO se disponível
	var env = get_world_3d().environment
	if env:
		env.ssao_enabled = preset["ssao_enabled"]
		if preset.has("ssao_radius"):
			env.ssao_radius = preset["ssao_radius"]
	
	print("Graphics quality set to: %s" % Quality.keys()[current_quality])

func get_quality_name() -> String:
	return Quality.keys()[current_quality].to_lower()

