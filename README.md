# Família Fighter — Batalha na Padaria

Jogo de luta arcade em HTML Canvas e JavaScript puro (sem build), com Juraci e Carlos.

## Novidades da v0.5 e v0.6

- **Animações refeitas:** atlas único e limpo (`assets/fighters.png`, 300 KB) gerado a partir das folhas originais. Remove o brilho roxo atrás dos sprites, normaliza a escala e alinha cada quadro pelos pés — sem tremidas, "flutuações" ou troca de tamanho ao atacar.
- **Movimentação nova:** simulação em passo fixo (60 Hz, igual em qualquer tela/FPS), pulo com direção, empurrão sem sair da tela, câmera que acompanha a luta com parallax.
- **Combate:** hitbox/hurtbox reais (agachar desvia de socos altos, pulo desvia de rasteiras), combos encadeados, cancelamento para o especial, defesa só pela frente, dano reduzido na defesa, contador de hits, hitstop e tremor de tela.
- **Partida:** melhor de 3 rounds, 60 s por round, anúncios (ROUND / LUTEM! / K.O. / TEMPO!), vitória perfeita, pose de vitória, estatísticas no final.
- **3 cenários:** Padaria da Juju, Quintal da Família (pôr do sol) e Festa Junina (noite, fogueira animada) + aleatório.
- **Modos:** 1P × CPU (Fácil, Normal, Difícil) e **1P × 2P local** no mesmo teclado. Luta espelhada (mesmo lutador) com roupas em cores alternativas.
- **Controles:** teclado, **gamepad** e, no celular, direcional analógico + botões redondos (o botão Especial mostra a barra carregando).
- **Áudio:** efeitos sintetizados melhores e trilha chiptune por cenário (pode desligar).
- **Configurações salvas:** som, música, voz, conversa, volume, vibração e exibição dos controles de toque.
- **v0.6 — Falas:** balões de fala, conversa antes da luta, Carlos comendo bolo/pizza e sendo batizado, voz do navegador (veja abaixo).

## Falas e conversas

- **Conversa antes da luta** no 1º round (balões de quadrinho; qualquer botão ou toque pula).
- **Juraci** grita "BOLO DE CENOURA!" no especial, dá bronca nos combos e comemora a vitória.
- **Carlos** no especial **Gordão** come um bolo ou uma pizza (com mordidas e farelos) e engorda; no **Modo Fé** é batizado com água e luz do céu e grita "Aleluia!".
- Frases ao derrubar, ser nocauteado e vencer.
- **Voz:** as falas podem ser lidas em voz alta pela voz do próprio navegador (pt-BR). Liga/desliga em Configurações; a qualidade depende do aparelho.

Todas as frases ficam em **`js/dialogue.js`** — dá para editar ou acrescentar sem mexer no resto do código.

## Estrutura

```
├── index.html               telas do jogo
├── manifest.webmanifest     instalação como app (PWA)
├── sw.js                    modo offline (service worker)
├── supabase-config.js       chaves públicas (preenchido no deploy)
├── css/style.css            visual de menus, seleção e controles de toque
├── js/
│   ├── game.js              motor: lutadores, IA, rounds, cenários, HUD
│   ├── dialogue.js          ✏️ FALAS DOS PERSONAGENS (edite aqui)
│   ├── audio.js             efeitos, música e voz
│   ├── account.js           conta Supabase e sincronização
│   └── sprite-data.js       gerado: tabela de quadros do atlas
├── assets/                  tudo que o jogo carrega
│   ├── sprites/fighters.png gerado: atlas dos lutadores e efeitos
│   ├── menu/                arte do menu (menu.png original + menu.webp otimizado)
│   ├── portraits/           retratos juraci.png e carlos.png
│   └── icons/               ícones do app
├── art-source/              artes originais (fonte do atlas; NÃO são publicadas)
├── tools/build_atlas.py     gera o atlas a partir de art-source/
├── supabase/schema.sql      banco de dados (opcional)
└── .github/workflows/       publicação automática no GitHub Pages
```

### Regenerar o atlas

Se alterar as folhas de sprite originais:

```
pip install pillow numpy scipy
python tools/build_atlas.py
```

Os quadros de cada animação são definidos no topo de `tools/build_atlas.py`.

## Executar

Abra `index.html` no navegador. Para testar como no site publicado (service worker, instalação), sirva a pasta:

```
python -m http.server 8080
```

e acesse `http://localhost:8080`.

## Como jogar

**1 jogador (teclado):**

- Mover: `A`/`D` ou `←`/`→` · Pular: `W`, `↑` ou `Espaço` (segure uma direção para pular para o lado) · Agachar: `S`/`↓`
- Soco: `J` · Forte (Juraci) / Chute (Carlos): `K` · Defesa: segure `I` · Especial: `L` (barra cheia)
- Pausar: `P` ou `Esc`

**2 jogadores (mesmo teclado):**

- 1P: `WASD` + `F` soco, `G` forte, `H` defesa, `T` especial
- 2P: setas + `J` soco, `K` forte, `I` defesa, `L` especial (ou `Num1`, `Num2`, `Num3`, `Num0`)

**Gamepad:** analógico/direcional move, `A` pula, `X` soco, `Y` forte, `B` especial, `LB/RB/LT/RT` defesa, `Start` pausa. No modo 2P, o segundo controle é o 2P.

**Celular:** direcional à esquerda (cima = pular, baixo = agachar) e botões à direita. Jogue na horizontal; ao iniciar a luta o jogo tenta entrar em tela cheia.

**Dicas:**

- Combo: `J`, `J`, `K` quando os golpes acertam. Carlos tem um 4º golpe: `K` depois do chute vira o **Combo do Chute**, que derruba.
- Com a barra cheia, apertar `L` no meio de um combo cancela direto para o especial.
- Juraci: o **Super Bolo de Cenoura** é um projétil que derruba. Pule por cima do bolo do adversário!
- Carlos: o especial alterna entre **Gordão** (+25% de dano, mais empurrão, mais lento) e **Modo Fé** (recebe 45% menos dano) por 10 s.
- Pulo e agachar: agachado você desvia de socos altos; golpes no ar acertam de cima.

## Instalar no celular (GitHub Pages)

1. Envie esta pasta para um repositório no GitHub (incluindo `.github`).
2. Em **Settings → Pages**, escolha **GitHub Actions** como fonte.
3. Faça um commit em `main` e acompanhe **Actions → Deploy Família Fighter PWA**.
4. No Android (Chrome): **Instalar app**. No iPhone (Safari): **Compartilhar → Adicionar à Tela de Início**.

O deploy publica só os arquivos necessários (~1 MB em vez de ~14 MB) e cada publicação cria uma nova versão do cache offline.

## Conta e progresso (Supabase, opcional)

1. No Supabase, abra **SQL Editor** e execute `supabase/schema.sql` (pode executar de novo em um projeto já configurado; ele atualiza as funções e permissões).
2. Em **Authentication → URL Configuration**, use a URL do GitHub Pages como **Site URL** e em **Redirect URLs**.
3. No GitHub, em **Settings → Secrets and variables → Actions → Variables**, crie `SUPABASE_URL` e `SUPABASE_ANON_KEY` (chave pública *publishable/anon*).
4. Faça outro commit em `main`. Em **Minha Conta**, crie a conta ou entre; dá para trocar o apelido depois.

Só partidas contra a CPU são registradas. Resultados de lutas sem internet ficam numa fila no aparelho e são enviados quando a conexão volta.

**Segurança:** a chave *anon* é pública por natureza — a proteção vem das políticas RLS e das funções do banco. **Nunca** coloque a chave `service_role` no jogo ou no repositório. A versão do cliente Supabase é fixa, a página tem Content-Security-Policy e o servidor limita a 300 partidas registradas por conta a cada 24 h. Como o resultado é calculado no aparelho do jogador, as estatísticas servem para diversão, não para ranking competitivo.

## Próximas etapas

- Franciely, Gabi, Daniel e Pedro (precisam de folhas de sprite; basta adicioná-las em `tools/build_atlas.py` e em `CHARS` no `js/game.js`).
- Falas gravadas pela família (com autorização) no lugar dos efeitos sintetizados.
- Empacotar para a Play Store (por exemplo, com Capacitor) se quiser um APK/AAB.
