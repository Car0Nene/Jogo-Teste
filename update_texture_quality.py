#!/usr/bin/env python3
"""
Script para restaurar qualidade de texturas de personagem
Modifica os arquivos .import para usar melhor qualidade
"""

import os
import re
from pathlib import Path

def update_texture_import(import_file, quality="high"):
    """Atualiza configuração de importação de textura"""
    
    if quality == "high":
        compress_quality = 0.95
        size_limit = 4096
    elif quality == "medium":
        compress_quality = 0.8
        size_limit = 2048
    else:  # low
        compress_quality = 0.6
        size_limit = 1024
    
    with open(import_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Atualiza qualidade lossy
    content = re.sub(
        r'compress/lossy_quality=[\d.]+',
        f'compress/lossy_quality={compress_quality}',
        content
    )
    
    # Atualiza size limit
    content = re.sub(
        r'process/size_limit=\d+',
        f'process/size_limit={size_limit}',
        content
    )
    
    with open(import_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

def process_character_textures(base_path, quality="high"):
    """Processa todas as texturas de personagem"""
    
    characters_dir = Path(base_path) / "assets" / "characters"
    
    if not characters_dir.exists():
        print(f"Diretório não encontrado: {characters_dir}")
        return 0
    
    count = 0
    for import_file in characters_dir.rglob("*.import"):
        # Pula .glb.import (modelos 3D)
        if ".glb.import" in str(import_file):
            continue
        
        try:
            update_texture_import(str(import_file), quality)
            count += 1
            print(f"✓ {import_file.name}")
        except Exception as e:
            print(f"✗ {import_file.name}: {e}")
    
    return count

if __name__ == "__main__":
    import sys
    
    quality = sys.argv[1] if len(sys.argv) > 1 else "high"
    base_path = "/workspaces/Jogo-Teste/godot"
    
    print(f"Restaurando texturas com qualidade: {quality.upper()}")
    print()
    
    count = process_character_textures(base_path, quality)
    
    print()
    print(f"Total de texturas processadas: {count}")
    print("Dica: Reabra o Godot para reconhecer as mudanças")
