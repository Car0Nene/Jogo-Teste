# QUICK START — Validação de Performance

Instruções rápidas para validar as otimizações realizadas no Família Fighter 2.5D

---

## 1. Build & Rodando o Jogo

```bash
cd /workspaces/Jogo-Teste/prototype-2.5d
npm run build
npm run dev
# Abre em http://localhost:5173/
```

---

## 2. Teste Rápido de FPS (1 minuto)

1. **Abrir browser console:** `F12` ou `Ctrl+Shift+I`
2. **Cole no console:**
   ```javascript
   __diag.setEnabled(true);
   ```
3. **Inicie um combate:** Vá a "Lutar" e selecione dois personagens
4. **Execute 10 golpes de cada tipo:**
   - Leve (pressione L 10x)
   - Pesado (pressione H 10x)
   - Especial (pressione S 2-3x, se houver meter)
5. **Veja os resultados:**
   ```javascript
   __diag.logSummary();
   ```

**O que procurar:**
- **FPS Average:** Deve estar entre 55-60
- **Frame Time:** Deve estar entre 16-18ms
- **Memory:** Deve estar estável (~160MB)

**Se o resultado for RUIM:**
- Verificar se GPU está em modo performance
- Desabilitar outros programas pesados
- Testar em diferente navegador

---

## 3. Teste de Audio (30 segundos)

1. **Console:**
   ```javascript
   __diag.setEnabled(true);
   ```
2. **Combate:**
   - Use especial do personagem (requer meter)
   - Se não tiver meter, use "Treino Livre" (infinite meter)
3. **Verificar latência:**
   - Som do golpe deve ser imediato (sem delay)
   - Não deve haver "pop" ou clique no áudio
4. **Resultado esperado:**
   - Latência < 100ms
   - Áudio não sincronizado com vídeo

---

## 4. Teste de Memory Leak (5 minutos)

1. **Console:**
   ```javascript
   const memoryLog = [];
   setInterval(() => {
     const snap = __diag.getSnapshots()[0];
     memoryLog.push(snap.memoryMb);
     console.log(`${memoryLog.length}s: ${snap.memoryMb.toFixed(1)}MB`);
   }, 1000);
   ```
2. **Combate:** Lutar por 3 minutos (misturar golpes normais e especiais)
3. **Parar e observar:**
   - Se tiver vazamento, memória vai sempre crescer
   - Se estiver corrigido, vai se estabilizar
4. **Resultado esperado:**
   - Crescimento inicial até ~160MB
   - Depois se estabiliza (±5MB variação)
   - Não cresce continuamente

---

## 5. Teste de Hardware Specific (Plataforma)

### Windows (GPU Integrada Intel UHD)
**Esperado:** 50-55 fps em Medium quality
```javascript
// Verificar qualidade gráfica detectada
console.log("GPU detectada como:", navigator.gpu ? "High-end" : "Integrated");
__diag.logSummary();
```

### Windows (GPU Dedicada NVIDIA/AMD)
**Esperado:** 60fps em High quality
- Deve funcionar perfeitamente sem throttling

### Android
**Esperado:** 50+ fps em Medium quality
- Testar em navegador (Chrome ou Firefox)
- Usar toque/gamepad para controlar

### Web
**Esperado:** Mesmo de Windows/Android em navegador
- Pode ser ±5% mais lento que nativo

---

## 6. Teste Completo Automatizado (5 minutos)

```javascript
// No console:
__testRunner.runAll();

// Espera ~5 minutos pela conclusão
// Resultados aparecerão no console
// Para exportar:
JSON.stringify(__testRunner.exportResults(), null, 2);
```

Este teste simulará todos os 10 cenários e fornecerá relatório completo.

---

## 7. Verificar Cache de Materiais (Verificação Técnica)

```javascript
// Se tiver accesso ao engine:
// (Pode não funcionar em builds de produção)

console.log("Material cache hits esperados: 100%");
// Golpes repetidos devem reutilizar mesmos materiais

// Verificar pool de sparks:
// Cada golpe deve reutilizar 7-14 meshes do pool, não criar novos
```

---

## 8. Relatórios Esperados

### FPS Bom ✅
```
Average FPS: 57.3
Min FPS: 48
Max FPS: 60
Frame Time: 17.5ms
```

### FPS Ruim ❌
```
Average FPS: 25
Min FPS: 15
Max FPS: 35
Frame Time: 40-60ms
```

### Memory Bom ✅
```
Startup: 150MB
After 60s: 155MB (± 5MB)
Peak: 180MB
Leak per hour: < 5MB
```

### Memory Ruim ❌
```
Startup: 150MB
After 60s: 180MB
Peak: 250MB+
Leak per hour: > 50MB
```

### Audio Bom ✅
```
Latência primeiro clip: < 100ms
Clips subsequentes: < 50ms
Sem delay perceptível
```

### Audio Ruim ❌
```
Latência primeiro clip: 300-500ms
Delay perceptível quando golpe
```

---

## 9. Se Encontrar Problemas

### "FPS está baixo"
1. Verificar Quality Settings (tente Medium ou Low)
2. Fechar outros programas pesados
3. Atualizar drivers de GPU
4. Testar em outro navegador

### "Audio tem delay"
1. Verificar console para erros JavaScript
2. Testar primeira vez vs repetidas
3. Se primeira vez tem delay: audio preload não completou
4. Se sempre tem delay: problema no sistema

### "Memory cresce sempre"
1. Rodar `__diag.detectIssues()` para ver problemas detectados
2. Se "particle memory leak": há vazamento de sparks
3. Se "audio leak": há vazamento de clips
4. Reportar no GitHub com screenshot do log

### "Travamentos / Jogo congelou"
1. Verificar console: `__diag.logSummary()`
2. Ver qual foi o último evento antes do travamento
3. Tentar reproduzir ação específica
4. Verificar se é consistente ou aleatório

---

## 10. Próximas Etapas (Após Validação)

Se tudo passar (FPS ✅, Memory ✅, Audio ✅):

1. **Testar em outro dispositivo:**
   - Outro navegador (Firefox, Safari)
   - Outro SO (Mac, Linux se disponível)
   - Dispositivo mobile (Android real)

2. **Teste prolongado (opcional):**
   - Jogar 30 minutos seguidos
   - Observar se FPS se degrada
   - Verificar se aquecimento GPU

3. **Próxima fase:**
   - Começar PHASE 6 (UI redesign)
   - Ou reportar quaisquer problemas encontrados

---

## Comandos Úteis

```javascript
// DIAGNOSTICS
__diag.setEnabled(true);                    // Ativar
__diag.logSummary();                        // Ver resumo
__diag.getSnapshots();                      // Dados completos
__diag.detectIssues();                      // Problemas encontrados
__diag.exportToJson();                      // Exportar dados

// TEST RUNNER
__testRunner.runAll();                      // Rodar todos testes
__testRunner.run('test10LightHits');        // Teste específico
__testRunner.exportResults();               // Exportar resultados

// GRAPHICS
// Mudar qualidade (se implementado em UI)
// Settings > Graphics Quality: High/Medium/Low
```

---

## Checklist de Validação

Marque cada item conforme testar:

- [ ] FPS em combate: ≥ 55 fps
- [ ] Frame time: ≤ 20ms
- [ ] Memory estável: ± 5MB
- [ ] Audio imediato: < 100ms latência
- [ ] HD textures: Sem spike no primeiro frame
- [ ] Material cache: 100% hit rate
- [ ] 10 golpes consecutivos: Sem stutter
- [ ] Troca personagem: Rápido e suave
- [ ] Troca cenário: Rápido e suave
- [ ] 60 segundos combate: FPS consistente
- [ ] Teste automatizado: Sem erros críticos
- [ ] Nenhum vazamento de memória

**Se todos passarem:** ✅ Pronto para release!

---

## Contato & Reporte de Issues

Se encontrar problemas:

1. Coletar log com `__diag.exportToJson()`
2. Descrever exatamente o que aconteceu
3. Incluir: SO, GPU, navegador, versão
4. Abrir issue no GitHub com detalhes

---

**Última atualização:** 2026-11-24  
**Versão:** 1.0  
**Próxima fase:** UI Redesign (Phase 6)
