import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const prototypeDir = resolve(scriptDir, '..');
const repositoryDir = resolve(prototypeDir, '..');
const publicAssets = resolve(prototypeDir, 'public/assets');
const sourceData = await readFile(resolve(repositoryDir, 'js/sprite-data.js'), 'utf8');
const serializedSprites = sourceData.match(/window\.FF_SPRITES\s*=\s*(\{.*\});\s*$/s)?.[1];

if (!serializedSprites) throw new Error('Não foi possível ler FF_SPRITES em js/sprite-data.js.');
const spriteData = JSON.parse(serializedSprites);
const fighterAnimations = {
  pedro: ['idle', 'walk', 'run', 'jump', 'light', 'heavy', 'guard', 'hulk', 'hulkPower', 'hulkBlast', 'crouch'],
  paula: ['idle', 'walk', 'run', 'jump', 'light', 'heavy', 'guard', 'special']
};
const frames = [];

for (const [fighter, animations] of Object.entries(fighterAnimations)) {
  for (const animation of animations) {
    const sourceFrames = spriteData[fighter]?.[animation];
    if (!Array.isArray(sourceFrames)) {
      throw new Error(`Animação ausente no atlas original: ${fighter}/${animation}`);
    }
    sourceFrames.forEach(([x, y, w, h, pivotX, pivotY], index) => {
      frames.push({
        filename: `${fighter}/${animation}_${index}`,
        frame: { x, y, w, h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w, h },
        sourceSize: { w, h },
        pivot: { x: pivotX / w, y: pivotY / h }
      });
    });
  }
}

const fx = spriteData.fx?.beerBlast?.[0];
if (!fx) throw new Error('Frame fx/beerBlast ausente no atlas original.');
const [x, y, w, h, pivotX, pivotY] = fx;
frames.push({
  filename: 'fx/beerBlast_0',
  frame: { x, y, w, h },
  rotated: false,
  trimmed: false,
  spriteSourceSize: { x: 0, y: 0, w, h },
  sourceSize: { w, h },
  pivot: { x: pivotX / w, y: pivotY / h }
});

const png = await readFile(resolve(repositoryDir, 'assets/sprites/fighters.png'));
if (png.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error('Atlas PNG original inválido.');
const atlasWidth = png.readUInt32BE(16);
const atlasHeight = png.readUInt32BE(20);

const outputFiles = [
  ...['pedro', 'paula', 'juraci', 'carlos', 'daniel', 'franciely', 'gabi', 'tainara']
    .map(name => [`assets/portraits/${name}.png`, `portraits/${name}.png`]),
  ['assets/sprites/fighters.webp', 'fighters.webp'],
  ['assets/stages/bar.webp', 'bar.webp'],
  ['assets/stages/praia.webp', 'praia.webp'],
  ['assets/music/family-fighter-2.mp3', 'music/family-fighter-2.mp3'],
  ['assets/music/family-fighter-3.mp3', 'music/family-fighter-3.mp3'],
  ['assets/voice/arcade/round_1.ogg', 'voice/round_1.ogg'],
  ['assets/voice/arcade/fight.ogg', 'voice/fight.ogg'],
  ...['round_1', 'round_2', 'round_3', 'final_round', 'fight', 'time', 'you_win', 'you_lose', 'tie', 'combo']
    .map(name => [`assets/voice/arcade/${name}.ogg`, `voice/arcade/${name}.ogg`]),
  ...[
    'pedro-domingo',
    'pedro-cerveja',
    'pedro-fuma-bebe-vence',
    'paula-bar-simone',
    'paula-super-almoco',
    'juraci-mandando-na-cozinha',
    'carlos-pedido-de-pizza-com-amor',
    'daniel-praia',
    'daniel-preparativos-praia',
    'franciely-isso',
    'franciely-ferrinho',
    'franciely-desarma',
    'franciely-montar',
    'franciely-cuidar-e-lutar',
    'gabi-canto',
    'gabi-amor-e-luta',
    'dada-aviso-chao-molhado',
    'cao-lambida-poderosa',
    'cao-amigo-protetor',
    'tainara-trabalho',
    'tainara-poder-do-arroz',
    'tainara-cuidado-em-dobro',
    'tainara-daniel-indo-trabalhar'
  ].map(name => {
    const generated = [
      'pedro-fuma-bebe-vence',
      'paula-bar-simone',
      'paula-super-almoco',
      'juraci-mandando-na-cozinha',
      'carlos-pedido-de-pizza-com-amor',
      'daniel-preparativos-praia',
      'franciely-cuidar-e-lutar',
      'gabi-amor-e-luta',
      'dada-aviso-chao-molhado',
      'cao-lambida-poderosa',
      'cao-amigo-protetor',
      'tainara-poder-do-arroz',
      'tainara-cuidado-em-dobro',
      'tainara-daniel-indo-trabalhar'
    ].includes(name);
    return [
      `assets/voice/${generated ? 'generated/' : ''}${name}.mp3`,
      `voice/characters/${name}.mp3`
    ];
  })
];

for (const [source, destination] of outputFiles) {
  const outputPath = resolve(publicAssets, destination);
  await mkdir(dirname(outputPath), { recursive: true });
  await copyFile(resolve(repositoryDir, source), outputPath);
}

await writeFile(resolve(publicAssets, 'fighters.json'), JSON.stringify({
  frames,
  meta: {
    app: 'Família Fighter prototype asset sync',
    version: '1.0',
    image: 'fighters.webp',
    format: 'RGBA8888',
    size: { w: atlasWidth, h: atlasHeight },
    scale: '1'
  }
}, null, 2));

console.log(`Copiados ${outputFiles.length} assets e ${frames.length} frames exatos do atlas original.`);
