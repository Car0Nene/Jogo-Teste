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

O workflow executa essas verificações em Chromium com viewports desktop e mobile, incluindo formatos compactos. A seleção de personagem mantém os oito lutadores e a seleção de arena mantém as cinco arenas.

## Assets e evolução visual

A aplicação usa os sprites e cenários existentes e preserva o fluxo de luta, a física e os controles. A evolução visual da interface inclui seleção adaptada à viewport e uma introdução cinematográfica curta antes da luta. Para arte de personagens redesenhada, poses de entrada próprias ou cenários com camadas separadas, ainda são necessários novos assets; as imagens-fonte atuais não fornecem esses elementos separados.

## GitHub Pages

A raiz do branch `main` é a origem do Pages. O workflow compila `prototype-2.5d/` e sincroniza o resultado na raiz após as verificações passarem.
