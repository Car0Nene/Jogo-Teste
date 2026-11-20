# Família Fighter 2.5D

This is the active Vite, React, and Three.js game published by the repository's GitHub Pages workflow.

## Run locally

Requires Node.js 20.19 or newer.

```sh
npm install
npm run dev
```

Build the static site with `npm run build`. The generated site is in `dist/`.

Run desktop and mobile Chromium checks with `npm run test:e2e` after installing Playwright's Chromium browser with `npx playwright install chromium`.

## Character portraits and victory scene

The selection screens use transparent WebP portraits in `public/assets/portraits/`. Carlos's baptism portrait appears as his alternate “Modo Fé” form. The final match plays `public/assets/videos/daniel-victory-imagined.mp4` when Daniel wins; it starts muted for browser autoplay support and can be unmuted with the on-screen control.

## Desktop and mobile controls

O jogo tem duas experiências planejadas separadamente, escolhidas pelas **capacidades do aparelho** (mouse/trackpad, toque, sistema) e não pela largura da janela. Um notebook pequeno continua computador, e um celular ligado a um monitor continua celular. Em **Settings → Vídeo** o jogador pode escolher manualmente Computador, Celular ou Tablet.

- **Computador:** a interface acompanha a altura do monitor (1366×768 a 4K e ultrawide), o HUD completo fica centralizado e a barra de comandos mostra as teclas atuais, ou os botões do controle quando um gamepad está em uso. Os atalhos também podem ser clicados com o mouse.
- **Celular/Tablet:** HUD compacto, analógico maior, botões em arco (Leve, Forte, Especial, Sub-especial, Defesa e Pulo) com multitoque e deslizar o dedo entre botões. Tamanho, opacidade e modo canhoto são ajustáveis em Settings → Vídeo. Em pé, a luta fica em cima e os controles num painel próprio embaixo; deitado, o menu principal se reorganiza em duas colunas.
- **Mesma jogabilidade:** a câmera enquadra os lutadores na área útil entre o HUD e os controles (`setViewOffset`), sem mudar escala nem regras. Física, hitboxes, dano e IA não leem o perfil.

Arquitetura:

- `src/platform/platform.ts`: detecção do aparelho, perfis `DesktopProfile`, `MobileProfile` e `TabletProfile` (enquadramento, HUD, controles e limite de pixels), entrada ativa (teclado/toque/controle) com histerese, orientação e hook `usePlatform()`. Também marca `html[data-platform|data-ui|data-orientation|data-input]`.
- `src/platform/platform.css`: composição específica de cada ambiente.
- `src/components/TouchControls.tsx`: controles de toque. `FightHud.tsx` escolhe entre a barra de comandos do PC e os controles de toque.
- `GameEngine.setPresentation()`: recebe o enquadramento e o limite de densidade do perfil.
- `scripts/responsive-shots.mjs`: capturas de todas as telas em 15 perfis de tela (com `npm run dev` rodando em 127.0.0.1:4173).

The app is configured to load assets relative to its own directory so it can run under the repository's GitHub Pages project URL. Mobile browser behavior still needs a real device check after deployment.
