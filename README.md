# Família Fighter 2.5D

Jogo de luta arcade em React, TypeScript e Vite. A versão 2.5D é a aplicação ativa publicada no GitHub Pages.

## Estrutura

- `prototype-2.5d/` — código-fonte ativo: engine, menus, personagens, arenas, serviços e testes de plataforma.
- `prototype-2.5d/public/assets/` — sprites, cenários, música e vozes carregados pelo jogo.
- `art-source/` — originais e materiais de criação usados para produzir os assets.
- `supabase/` — esquema e migrações do banco de dados.
- `index.html`, `assets/`, `manifest.webmanifest` e `sw.js` na raiz — artefatos de publicação do GitHub Pages, gerados pelo workflow.
- `.github/workflows/familia-fighter-2.5d-build.yml` — lint, build, testes desktop/mobile e publicação.

Os diretórios legados `css/`, `js/`, `prototype-3d/` e `prototype-phaser/` foram removidos do repositório; não são usados pela aplicação publicada.

## Desenvolvimento

```sh
cd prototype-2.5d
npm install
npm run dev
```

Verificações locais:

```sh
npm run lint
npm run test:e2e
npm run build
```

O workflow executa essas verificações em Chromium com viewports desktop e mobile, incluindo formatos compactos. A seleção de personagem mantém os nove lutadores e a seleção de arena mantém as cinco arenas.

### Davi

Davi usa especial com 100 de energia para o Super Namorador, ou Paixão Alviverde quando já está transformado; baixo + especial custa 50 e ativa a Transformação Roxa por dez segundos. A forma do Super Namorador dura oito segundos, e os especiais têm intervalo mínimo de 1,2 segundo. As falas são provisórias, sintetizadas em português com eSpeak NG, sem imitar a voz de outra pessoa.

As poses de combate são recortes da arte fornecida, não uma animação completa produzida quadro a quadro. Ainda faltam sprites próprios para a preguiça, convite ao videogame, esquiva, transições suaves, cabelo roxo em todas as poses, sequência cinematográfica dos especiais e admiradoras apropriadas à idade, além de gravações de voz e efeitos sonoros definitivos. Para contas existentes, aplique `supabase/migrations/20261122_add_davi.sql` no Supabase antes de registrar partidas com Davi.

## Assets e evolução visual

A aplicação usa os sprites e cenários existentes e preserva o fluxo de luta, a física e os controles. A evolução visual da interface inclui seleção adaptada à viewport e uma introdução cinematográfica curta antes da luta. Para arte de personagens redesenhada, poses de entrada próprias ou cenários com camadas separadas, ainda são necessários novos assets; as imagens-fonte atuais não fornecem esses elementos separados.

## Diagnóstico e ferramentas

- **Modo diagnóstico:** abra o jogo com `?diag=1` no endereço ou aperte **F3**. Mostra FPS, tempo e picos de frame, draw calls, memória da GPU (geometrias, texturas, shaders) e objetos na cena.
- **Benchmark dos golpes:** com `npm run dev` rodando, `node tools/bench-hits.mjs <rótulo>` mede 10 golpes, 10 especiais, especiais simultâneos e uma luta longa, e aponta vazamentos e compilações de shader durante o combate.
- **Animação dos lutadores:** cada lutador tem 4 folhas com fundo verde em `art-source/<id>-hd/` (movimentação, golpes, pulos/defesa, dano/vitória). `python3 tools/build_fighter_hd.py <id>` recorta, iguala a escala e gera `public/assets/sprites/<id>-anim-hd.webp` e `src/data/hdAnimAtlas.ts`. Para trocar um movimento, substitua a folha e rode de novo.
- **Vozes do elenco:** `public/assets/voice/elenco/<id>/{select,intro,special,sub_special,win,ko}.mp3`, normalizadas em -16 LUFS.
- **Sons de impacto:** `public/assets/sfx/`; sem eles, o jogo volta ao som sintetizado.

## GitHub Pages

A raiz do branch `main` é a origem do Pages. O workflow compila `prototype-2.5d/` e sincroniza o resultado na raiz após as verificações passarem.
