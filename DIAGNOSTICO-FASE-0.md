# 📊 DIAGNÓSTICO COMPLETO - FASE 0
**Data:** 26 de Novembro, 2026  
**Commit Base:** 10cc168 (Deploy com Service Worker)  
**Branch de Trabalho:** `codex/fase-1-estabilidade`

---

## 1. ESTRUTURA DO PROJETO

### Localização do Código-Fonte
- **Raiz:** `/workspaces/Jogo-Teste/prototype-2.5d/`
- **Fonte:** `prototype-2.5d/src/`
- **Build output:** `prototype-2.5d/dist/`
- **Publicado em:** Raiz do repositório (GitHub Pages)

### Arquivos Críticos
| Arquivo | Localização | Status |
|---------|-------------|--------|
| index.html | `prototype-2.5d/index.html` | ⚠️ Descrição incorreta |
| vite.config.ts | `prototype-2.5d/vite.config.ts` | ⚠️ Usa `__dirname` |
| sw.js | Raiz + `prototype-2.5d/dist/` | ⚠️ Versão fixa |
| manifest.webmanifest | Raiz | ⚠️ Descrição incorreta |
| workflow | `.github/workflows/familia-fighter-2.5d-build.yml` | ✅ OK |
| package.json | `prototype-2.5d/package.json` | ⚠️ bun.lock vs npm |

---

## 2. INVENTÁRIO DE FUNCIONALIDADES

### 2.1 Personagens
**Status:** ✅ **9 lutadores implementados**

Confirmado em `src/data/fighters.ts`:
1. DAVI
2. JURACI
3. CARLOS
4. PEDRO
5. DANIEL
6. FRANCIELY
7. GABI
8. PAULA
9. TAINARA

**Problemas:**
- ❌ Descrições ainda mencionam "8 lutadores" (index.html, manifest.webmanifest)

### 2.2 Cenários
**Status:** ✅ **5 arenas implementadas**

Confirmado em `src/data/fighters.ts` e estrutura:
1. Padaria
2. Quintal
3. Festa
4. Bar
5. Praia

### 2.3 Modos de Jogo
**Status:** ⚠️ **Parcialmente verificado**

Identificados:
- ✅ Arcade
- ✅ Versus local
- ✅ Treinamento
- ❌ Modo História (indisponível/bloqueado)
- ❌ Online (não implementado)

### 2.4 Funcionalidades Implementadas
- ✅ Sprites e atlas HD
- ✅ Efeitos e golpes especiais
- ✅ Falas de personagens
- ✅ Música e efeitos sonoros
- ✅ Introduções e diálogos
- ✅ Controles: teclado, mouse, toque, gamepad
- ✅ Perfis: desktop, tablet, celular
- ✅ PWA (Service Worker, manifesto)
- ✅ Supabase (contas, histórico - não ativo em produção)

---

## 3. BUILD E PUBLICAÇÃO

### Build
- **Ferramenta:** Vite 8.3.0
- **Linguagem:** TypeScript 7.0.2 + React 19 + Three.js 0.187.0
- **Status:** ✅ Build passa
- **Lint:** ✅ Passa (tsc --noEmit)
- **Testes:** ✅ Playwright (10 aprovados, 20 ignorados)

### Warnings Encontrados

#### ⚠️ **CRÍTICO: `__dirname` em vite.config.ts**
```
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`:
  - `__dirname` (vite.config.ts:24:40). Use `import.meta.dirname` instead
```

**Localização:** Linhas 24, 26, 48 de `vite.config.ts`

**Impacto:** 
- Aviso na compilação
- Incompatibilidade futura com Vite 9+
- Será error em versão nativa do Vite

---

## 4. SERVICE WORKER E CACHE

### Status Atual
- ✅ Service Worker criado (`sw.js`)
- ✅ Lógica de cache inteligente implementada
- ✅ Meta tags de cache-control presentes
- ❌ **PROBLEMA:** Versão fixa `v2.1.0-20261126`

### Problema Identificado (5.1)

**Arquivo:** `/workspaces/Jogo-Teste/sw.js` (linha 12)
```javascript
const CACHE_VERSION = 'v2.1.0-20261126';
const CACHE_NAME = `familia-fighter-${CACHE_VERSION}`;
```

**Esperado:** Usar `GITHUB_RUN_ID` e `GITHUB_RUN_ATTEMPT` para versão única

**Impacto:** 
- Cache não muda a cada deployment
- Usuários podem não receber atualizações
- Caches antigos não são removidos automaticamente

---

## 5. PROBLEMAS IDENTIFICADOS - FASE 1

### P1: Descrição de Personagens Incorreta
| Arquivo | Problema | Solução |
|---------|----------|---------|
| `prototype-2.5d/index.html` | Diz "8 lutadores" | Mudar para "9 lutadores" |
| `manifest.webmanifest` | Diz "8 lutadores" | Mudar para "9 lutadores" |
| `index.html` (raiz) | Pode estar desatualizado | Verificar/sincronizar |

### P2: Service Worker com Versão Dinâmica
- Arquivo: `sw.js` (raiz) + `prototype-2.5d/dist/sw.js`
- Problema: Versão fixa, não atualiza automaticamente
- Solução: Integrar com GitHub Actions para gerar versão dinâmica

### P3: `__dirname` em vite.config.ts
- Arquivo: `prototype-2.5d/vite.config.ts`
- Linhas: 24, 26, 48
- Solução: Usar `import.meta.url` + `fileURLToPath` ou `import.meta.dirname`

### P4: Gerenciador de Dependências Inconsistente
- Arquivo: `prototype-2.5d/`
- Problema: `bun.lock` existe, mas workflow usa `npm install`
- Opções:
  1. Manter npm: gerar `package-lock.json` válido
  2. Adotar Bun: usar `bun install` no workflow

**Recomendação:** Manter npm (mais compatível com GitHub Actions padrão)

### P5: Manifesto PWA Desatualizado
- Arquivo: `manifest.webmanifest`
- Problemas:
  - Descrição ainda menciona "Batalha na Padaria"
  - Deve representar o jogo completo
  - Verificar se ícones 192×192 e 512×512 existem

---

## 6. DEPENDENCIES E VERSIONS

### Node.js
- Configurado: **22** (workflow)
- Suportado: ✅ Estável

### Packages Críticos
| Package | Versão | Status |
|---------|--------|--------|
| vite | ^8.3.0 | ✅ Estável |
| react | ^19.0.1 | ✅ Recente |
| typescript | ^7.0.2 | ✅ Recente |
| three.js | ^0.187.0 | ✅ Recente |
| @supabase/supabase-js | 2.49.4 | ✅ Pinned |
| @playwright/test | ^1.65.0 | ✅ Recente |

### Avisos de Deprecação
- ⚠️ `__dirname`: Será error em Vite 9+
- ⚠️ GitHub Actions v4: Usam Node 20 (descontinuado), mas ainda funcionam

---

## 7. TESTING

### Playwright
- **Config:** `playwright.config.js`
- **Testes:** `10 aprovados`, `20 ignorados`
- **Dispositivos testados:**
  - Desktop Chromium
  - Pixel 7
  - Janela compacta
  - Celular compacto (retrato + paisagem)

**Problema:** Muitos testes ignorados (`test.skip`) reduz cobertura real

---

## 8. ARQUIVO PULL REQUEST ANTIGO

**PR:** `#1 - claude/device-profiles`
- **Status:** Aberto
- **Idade:** Anterior à versão atual
- **Situação:** Divergência com `main`
- **Ação:** Revisar se melhorias já foram incorporadas

---

## 9. CHECKLIST DE CORREÇÕES - FASE 1

### Must-Do (Crítico)
- [ ] Corrigir `__dirname` em `vite.config.ts`
- [ ] Atualizar descrição de lutadores (8 → 9)
- [ ] Atualizar manifesto PWA
- [ ] Implementar Service Worker com versão dinâmica (GITHUB_RUN_ID)
- [ ] Validar workflow GitHub Actions
- [ ] Executar build e confirmar zero warnings

### Should-Do (Importante)
- [ ] Gerar `package-lock.json` válido (ou adotar Bun)
- [ ] Atualizar Actions v4 para versões estáveis mais recentes
- [ ] Verificar sincronização entre `dist/` e raiz

### Nice-To-Have
- [ ] Documentar processo de build
- [ ] Adicionar script para validação pré-commit
- [ ] Criar documentação de deploy

---

## 10. RESUMO

| Categoria | Status | Ações |
|-----------|--------|-------|
| Build | ✅ Passa | Corrigir warning `__dirname` |
| TypeScript | ✅ Sem erros | - |
| Lint | ✅ Passa | - |
| Testes | ⚠️ 50% ignorados | Revisar em Fase 7 |
| PWA | ✅ Implementado | Atualizar versão dinâmica |
| Descrições | ❌ Desatualizadas | Corrigir 8 → 9 lutadores |
| Dependências | ✅ OK | Sincronizar lock files |

---

**Próxima Etapa:** FASE 1 - Corrigir todos os itens acima em commits separados e incrementais.
