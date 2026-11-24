"""Configura o reimport de modelos/animações com retarget para o perfil humanoide.
Uso: python3 tools/set_retarget.py <arquivo.import> <caminho do Skeleton3D na cena> [anim]"""
import sys, re
imp, skel = sys.argv[1], sys.argv[2]
anim = len(sys.argv) > 3
sub = ('_subresources={\n"nodes": {\n"PATH:%s": {\n'
       '"retarget/bone_map": Resource("res://assets/characters/mixamo_bone_map.tres"),\n'
       '"retarget/bone_renamer/rename_bones": true,\n'
       '"retarget/bone_renamer/unique_node/make_unique": true,\n'
       '"retarget/bone_renamer/unique_node/skeleton_name": "GeneralSkeleton",\n'
       '"retarget/rest_fixer/apply_node_transforms": true,\n'
       '"retarget/rest_fixer/normalize_position_tracks": true,\n'
       '"retarget/rest_fixer/overwrite_axis": true,\n'
       '"retarget/rest_fixer/fix_silhouette/enable": %s,\n'
       '"retarget/remove_tracks/except_bone_transform": true,\n'
       '"retarget/remove_tracks/unimportant_positions": true,\n'
       '"retarget/remove_tracks/unmapped_bones": true\n'
       '}\n}\n}') % (skel, 'true' if not anim else 'false')
s = open(imp, encoding='utf-8').read()
s = re.sub(r'_subresources=\{.*?\}\n(?=\S)', sub + '\n', s, flags=re.S) if '_subresources={}' not in s else s.replace('_subresources={}', sub)
open(imp, 'w', encoding='utf-8').write(s)
print('ok', imp)
