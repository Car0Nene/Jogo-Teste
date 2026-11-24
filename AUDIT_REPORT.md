# AUDITORIA PROFUNDA — FAMÍLIA FIGHTER 2.5D
**Data:** 2026-11-24  
**Status:** FASE 1 — AUDITORIA COMPLETA SEM ALTERAÇÕES

---

## PROBLEMAS CRÍTICOS IDENTIFICADOS

### 🔴 PROBLEMA 1: CRIAÇÃO DE MATERIAIS DURANTE IMPACTOS
**Localização:** `src/engine/GameEngine.ts:1174`  
**Severidade:** CRÍTICA — Causa travamentos durante golpes

```typescript
private spawnSparks(x: number, y: number, colorHex: number, count = 10, hearts = false) {
  const mat = new THREE.MeshBasicMaterial({ color: colorHex, side: hearts ? THREE.DoubleSide : THREE.FrontSide });
  // ↑ PROBLEMA: Novo material criado a cada frame de impacto
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(hearts ? this.heartGeo : this.sparkGeo, mat);
    m.position.set(x, y, (Math.random() - 0.5) * 0.4);
    this.scene.add(m);
    // ... mais código
  }
}
```

**Impacto:**
- Cada golpe acertado chama `spawnSparks()` com 7-14 partículas
- Cada partícula usa um material **novo**, não reciclado
- Materiais não são dispostos corretamente
- Vazamento de memória GPU + travamento do renderizador

**Frequência:** 
- Normal: ~7-14 materiais por golpe
- Especial: ~20-30 materiais por golpe
- Projéteis: +14 materiais por impacto

---

### 🔴 PROBLEMA 2: CONSTRUÇÃO DE BURST MESH A CADA IMPACTO
**Localização:** `src/engine/propsBuilder.ts:141-158`  
**Severidade:** CRÍTICA — Causa compilação de geometria durante combate

```typescript
export function buildBurstMesh(): THREE.Group {
  const g = new THREE.Group();
  // ... código omitido ...
  const geo = new THREE.PlaneGeometry(w, h);  // ← Geometria NOVA
  applySpriteUv(geo, 'burst');
  
  const mat = new THREE.MeshBasicMaterial({  // ← Material NOVO
    map: tex,
    alphaTest: 0.1,
    transparent: false,
    side: THREE.DoubleSide,
  });
  const quad = new THREE.Mesh(geo, mat);
  // ... retorna
}
```

**Chamadas:**
- `applyHit()` → `spawnBurst()` → `buildBurstMesh()` a cada golpe pesado
- Cada instância cria geometria + material + mesh new

**Impacto:**
- Compilação de shaders/pipeline no renderizador
- Hitstop artificial prolongado
- GPU bottleneck

---

### 🔴 PROBLEMA 3: CARREGAMENTO SÍNCRONO DE ÁUDIO DURANTE COMBATE
**Localização:** `src/engine/audio.ts:318`  
**Severidade:** CRÍTICA — Causa spike de latenência

```typescript
private playVoiceFile(url: string, volume = 0.85, isAnnouncer = false): HTMLAudioElement | null {
  // ...
  const el = new Audio(url);  // ← PROBLEMA: Nova instância, desencadeia load
  el.preload = 'auto';
  el.volume = scaledVol;
  this.activeVoices.add(el);
  // ...
  el.play().catch(cleanup);
  return el;
}
```

**Fluxo:**
1. `applyHit()` chama `soundEngine.playClip('fighter', 'sound', 2500);`
2. Busca `CLIPS[who][key]` (URL é achada)
3. Cria `new Audio(url)`
4. Desencadeia busca HTTP + decodificação de áudio
5. `el.play()` chamado imediatamente (antes de decodificação completa)

**Chamadas no combate:**
- Golpe leve: `playSwing()` (sintetizado, OK) + `playHit()` (sintetizado, OK)
- Golpe pesado: `playSwing()` + `playHit()` + `playClip()` (problema!)
- Especial: múltiplos `playClip()` + `playDaviSpecial()` (sintetizado)
- Vitória: `playClip('narrator', 'victory')` (problema!)

---

### 🟠 PROBLEMA 4: PERDA DE QUALIDADE VISUAL (HD NÃO ATIVA)
**Localização:** Múltiplas — `src/engine/GameEngine.ts`, `src/engine/characterBuilder.ts`  
**Severidade:** ALTA — Reduz qualidade mesmo com GPU capaz

**Análise:**
- Texturas HD existem: `fighters-hd.webp` (713K) vs `fighters.webp` (5.6M)
- Materiais por-personagem HD também existem: `carlos-hd.webp`, `pedro-hd.webp`, etc.
- Mecanismo `atlasTier` foi implementado (0-5)
- **PROBLEMA:** Inicialização sempre em `tier: 0` (qualidade baixa)
- Transição para HD só ocorre se sprite frame indicar (via `hdFlag`)
- Não há configuração inicial baseada em `GraphicsQuality`

**Prova:**
```typescript
// characterBuilder.ts:194
const atlasTex = getAtlasTexture(0, anisotropy);  // ← Sempre tier 0
// ...
atlasTier: 0,  // ← Inicializa baixa qualidade
```

---

### 🟠 PROBLEMA 5: VAZAMENTO DE RECURSOS NOS EFEITOS DE IMPACTO
**Localização:** `src/engine/GameEngine.ts:1176-1192`  
**Severidade:** ALTA — Acumula objetos não dispostos

```typescript
private spawnSparks(x: number, y: number, colorHex: number, count = 10, hearts = false) {
  const mat = new THREE.MeshBasicMaterial({ ... });
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(..., mat);
    m.position.set(x, y, ...);
    this.scene.add(m);  // ← Adiciona à cena
    // ... sem nenhum registro para remoção posterior
    this.sparks.push({ mesh: m, ... });
  }
}
```

**Problema:**
- Materiais criados durante impacto
- Meshes reutilizam o mesmo material (OK)
- MAS quando spark é removido:
  ```typescript
  this.scene.remove(particle.mesh);
  ```
- Mesh é removido, mas material continua em memória
- Sem chamada a `material.dispose()`
- Acumula ao longo do combate

---

### 🟡 PROBLEMA 6: CÂMERA PODE TER HITSTOP REDUNDANTE
**Localização:** `src/engine/GameEngine.ts:1350-1351`  
**Severidade:** MÉDIA — Pode contribuir ao travamento

```typescript
if (this.hitstopTimer > 0) {
  this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
  // ... câmera não atualiza durante hitstop?
}
```

**Necessário verificar:**
- Se a câmera atualiza corretamente durante `hitstopTimer > 0`
- Se há operações pesadas na câmera durante impactos

---

## PROBLEMAS SECUNDÁRIOS

### 🟡 Configurações de Renderização Podem Não Ser Ótimas
**Localização:** `src/engine/GameEngine.ts:240-290`  
**Pontos:**
- Verificar se `PowerPreference` está correto para GPU integrada
- Verificar `antialias` behavior
- Verificar se há desabilitação de features desnecessárias em low-end

---

## RESUMO DAS CAUSAS RAIZ

| # | Problema | Causa | Solução Esperada |
|---|----------|-------|-----------------|
| 1 | Travamento em golpes | Materiais criados a cada impacto | Pool + reciclagem de materiais |
| 2 | Compilação de geometria | `buildBurstMesh()` sempre cria novo | Pré-build única, reutilizar |
| 3 | Spike de áudio | Load síncrono de arquivo | Pré-carregar + pool de Audio |
| 4 | Perda de qualidade | Inicialização em tier 0 | Inicializar baseado em GraphicsQuality |
| 5 | Vazamento de recursos | Sem `dispose()` em materiais | Implementar cleanup seguro |
| 6 | Hitstop impacto? | Pode haver overhead desnecessário | Revisar câmera + renderizador |

---

## PRÓXIMAS FASES

✅ **FASE 1:** Auditoria (COMPLETA)  
⏳ **FASE 2:** Instrumentação (diagnosticar em tempo real)  
⏳ **FASE 3:** Otimização de Golpes (fix materiais + áudio + geometria)  
⏳ **FASE 4:** Recuperação Visual HD (ativar HD no init)  
⏳ **FASE 5:** Testes Multiplataforma  
⏳ **FASE 6:** UI de Seleção  
⏳ **FASE 7:** Validação Final  

---

**Próxima ação:** Implementar instrumentação de diagnóstico (FPS, frame time, contadores de efeitos)
