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

Desktop play uses the configurable keyboard bindings and supports gamepads. The fight screen also has on-screen controls that accept pointer and touch input. The layout is responsive, and the game renderer resizes with its container.

The app is configured to load assets relative to its own directory so it can run under the repository's GitHub Pages project URL. Mobile browser behavior still needs a real device check after deployment.
