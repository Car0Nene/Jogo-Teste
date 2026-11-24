extends SceneTree
## Cria o BoneMap Mixamo -> perfil humanoide da Godot (usado por modelos e animações).
const MAP := {
	"Root": "", "Hips": "Hips", "Spine": "Spine", "Chest": "Spine1", "UpperChest": "Spine2",
	"Neck": "Neck", "Head": "Head", "LeftEye": "", "RightEye": "", "Jaw": "",
	"LeftShoulder": "LeftShoulder", "LeftUpperArm": "LeftArm", "LeftLowerArm": "LeftForeArm", "LeftHand": "LeftHand",
	"LeftThumbMetacarpal": "LeftHandThumb1", "LeftThumbProximal": "LeftHandThumb2", "LeftThumbDistal": "LeftHandThumb3",
	"LeftIndexProximal": "LeftHandIndex1", "LeftIndexIntermediate": "LeftHandIndex2", "LeftIndexDistal": "LeftHandIndex3",
	"LeftMiddleProximal": "LeftHandMiddle1", "LeftMiddleIntermediate": "LeftHandMiddle2", "LeftMiddleDistal": "LeftHandMiddle3",
	"LeftRingProximal": "LeftHandRing1", "LeftRingIntermediate": "LeftHandRing2", "LeftRingDistal": "LeftHandRing3",
	"LeftLittleProximal": "LeftHandPinky1", "LeftLittleIntermediate": "LeftHandPinky2", "LeftLittleDistal": "LeftHandPinky3",
	"RightShoulder": "RightShoulder", "RightUpperArm": "RightArm", "RightLowerArm": "RightForeArm", "RightHand": "RightHand",
	"RightThumbMetacarpal": "RightHandThumb1", "RightThumbProximal": "RightHandThumb2", "RightThumbDistal": "RightHandThumb3",
	"RightIndexProximal": "RightHandIndex1", "RightIndexIntermediate": "RightHandIndex2", "RightIndexDistal": "RightHandIndex3",
	"RightMiddleProximal": "RightHandMiddle1", "RightMiddleIntermediate": "RightHandMiddle2", "RightMiddleDistal": "RightHandMiddle3",
	"RightRingProximal": "RightHandRing1", "RightRingIntermediate": "RightHandRing2", "RightRingDistal": "RightHandRing3",
	"RightLittleProximal": "RightHandPinky1", "RightLittleIntermediate": "RightHandPinky2", "RightLittleDistal": "RightHandPinky3",
	"LeftUpperLeg": "LeftUpLeg", "LeftLowerLeg": "LeftLeg", "LeftFoot": "LeftFoot", "LeftToes": "LeftToeBase",
	"RightUpperLeg": "RightUpLeg", "RightLowerLeg": "RightLeg", "RightFoot": "RightFoot", "RightToes": "RightToeBase",
}
func _initialize():
	var bm := BoneMap.new()
	bm.profile = SkeletonProfileHumanoid.new()
	for i in bm.profile.bone_size:
		var pn: StringName = bm.profile.get_bone_name(i)
		var m: String = MAP.get(String(pn), "")
		if m != "":
			bm.set_skeleton_bone_name(pn, StringName("mixamorig_" + m))
	print(ResourceSaver.save(bm, "res://assets/characters/mixamo_bone_map.tres"))
	quit()
