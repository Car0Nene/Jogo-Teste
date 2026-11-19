# Família Fighter 2.5D

This standalone Vite, React, and Three.js game is kept in `prototype-2.5d/` so it does not replace the existing game or 3D prototype.

## Run locally

Requires Node.js 20.19 or newer.

```sh
npm install
npm run dev
```

Build the static site with `npm run build`. The generated site is in `dist/`.

## Desktop and mobile controls

Desktop play uses the configurable keyboard bindings and supports gamepads. The fight screen also has on-screen controls that accept pointer and touch input. The layout is responsive, and the game renderer resizes with its container.

The app is configured to load assets relative to its own directory so it can run under the repository's GitHub Pages project URL. Mobile browser behavior still needs a real device check after deployment.
