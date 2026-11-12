# Família Fighter — Batalha na Padaria

Jogo de luta arcade em HTML Canvas e JavaScript puro (sem build), com a família: Juraci, Carlos, Pedro, Daniel, Franciely e Gabi.

## Novidades da v0.5 a v0.7

- **Animações refeitas:** atlas único e limpo (`assets/sprites/fighters.webp`, com PNG de reserva) gerado a partir das folhas originais. Remove o brilho roxo atrás dos sprites, normaliza a escala e alinha cada quadro pelos pés — sem tremidas, "flutuações" ou troca de tamanho ao atacar.
- **Movimentação nova:** simulação em passo fixo (60 Hz, igual em qualquer tela/FPS), pulo com direção, empurrão sem sair da tela, câmera que acompanha a luta com parallax.
- **Combate:** hitbox/hurtbox reais (agachar desvia de socos altos, pulo desvia de rasteiras), combos encadeados, cancelamento para o especial, defesa só pela frente, dano reduzido na defesa, contador de hits, hitstop e tremor de tela.
- **Partida:** melhor de 3 rounds, 60 s por round, anúncios (ROUND / LUTEM! / K.O. / TEMPO!), vitória perfeita, pose de vitória, estatísticas no final.
- **3 cenários:** Padaria da Juju, Quintal da Família (pôr do sol) e Festa Junina (noite, fogueira animada) + aleatório.
- **Modos:** 1P × CPU (Fácil, Normal, Difícil) e **1P × 2P local** no mesmo teclado. Luta espelhada (mesmo lutador) com roupas em cores alternativas.
- **Controles:** teclado, **gamepad** e, no celular, direcional analógico + botões redondos (o botão Especial mostra a barra carregando).
- **Áudio:** efeitos sintetizados melhores e trilha chiptune por cenário (pode desligar).
- **Configurações salvas:** som, música, voz, conversa, volume, vibração e exibição dos controles de toque.
- **v0.6 — Falas:** balões de fala, conversa antes da luta e cenas do Carlos com bolo/pizza e no batismo.
- **v0.7 — Novos lutadores:** Pedro, Daniel, Franciely e Gabi; segundo especial (↓ + L) para todos; Juraci chama o Dadá; cenários **Bar da Simone** e **Praia do Natal**.

## Novidades da v0.8

- **Telas no estilo jogo de luta:** Lutador (grade de retratos, painel grande do 1P e do adversário com os especiais) → Cenário (cartões com prévia) → Dificuldade, rounds e tempo → tela **VS** → luta. Teclado: setas escolhem, Enter confirma, Esc volta. Toque: toque no lutador/cenário para ver, toque de novo para confirmar.
- **Personagens maiores:** câmera aproximada (cerca de 40% da altura da tela), que sobe quando alguém pula. Sprites em resolução maior e em WebP (mais nítidos).
- **Funciona em qualquer tela:** a luta se adapta de 4:3 (tablet) a 21:9 (ultrawide) sem faixas pretas; as telas de escolha têm layout para celular deitado, em pé, tablet e monitor grande.
- **Sprites "quebrados" corrigidos:** o cache offline podia misturar a tabela de sprites nova com a imagem antiga. Agora o atlas tem versão no endereço e o código é sempre buscado na rede primeiro.
- **Cenários pintados:** Bar da Simone e Praia usam a sua arte (`assets/stages`).
- **Músicas por cenário:** Padaria = "Bolo da Juraci", Quintal e Praia = música 3, Festa Junina e Bar = música 2 (configurável).
- **Voz real da Franciely:** "É isso!" (especial), "Ferrinho por ferrinho!" (combo), "Na praia a gente só desarma!" (começo da luta na Praia) e "Aí, essa tem que montar ferrinho por ferrinho!" (vitória).
- **Lista de golpes** no menu de pausa e regras de luta (1 round, melhor de 3 ou de 5; 45 s, 60 s, 99 s ou sem tempo).

## Novidades da v0.9

- **Nível de poder:** cada lutador recebe uma classificação de 1 a 1000, mostrada na seleção; ela afeta moderadamente o dano.
- **Pose de apresentação:** cada personagem aparece na seleção com uma pose característica.
- **Corrida curta:** toque duas vezes para frente para correr por um instante; também funciona com teclado e gamepad.
- **Locução arcade:** anúncios de rodada, início, combos, tempo e resultado com clipes humanos CC0 em inglês, ativados separadamente nas configurações.
- **Vozes gravadas dos personagens:** os clipes do Pedro, Daniel, Tainara e Gabi entram nos golpes e cenas correspondentes; as falas aparecem legendadas. Os arquivos foram nivelados, aparados e convertidos para MP3.
- **Impacto mais claro:** flashes, hitstop, vibração, sons de contagem regressiva e faíscas ajudam a destacar golpes e rounds decisivos.
- **HUD e resultado polidos:** vida numérica e colorida, especiais com marca de meia barra, combos em destaque e retratos dos lutadores com confete no resultado.
- **Ajustes de acessibilidade:** volume separado para efeitos, música e vozes; remapeamento de teclado no modo de 1 jogador; botões de toque em tamanho maior; animações reduzidas quando o aparelho pede menos movimento.

## Novidades da v0.10

- **Modo treino:** escolha um alvo parado, sem cronômetro; ele recupera a vida para você praticar combos e especiais.
- **Atalho para treino:** botão dedicado na tela inicial, além da seleção de modo na escolha do lutador.
- **Treino avançado:** painel ao vivo com dano acumulado, maior combo e últimos comandos; o alvo pode ficar parado ou defender. Reinicie posição e estatísticas pelo menu de pausa ou use `Shift + R`.
- **Locutor arcade opcional:** falas em inglês nos rounds, início, combos, tempo e resultado. Desligado por padrão; pode ser ativado em Configurações e funciona offline.
- **Locução de vitória em português:** o clipe enviado ao repositório é usado quando o jogador vence e também funciona offline.
- **Configurações compactas:** áudio, acessibilidade/celular e teclado ficam em seções recolhíveis para facilitar o uso em telas pequenas.
- **Lista de golpes contextual:** disponível antes da luta e na pausa; no versus mostra os comandos e golpes de cada jogador conforme as teclas configuradas.
- **Teclas remapeáveis no versus:** configure separadamente 1P e 2P; conflitos entre os dois conjuntos são trocados automaticamente.
- **Acessibilidade:** opção de alto contraste e redução de flashes, tremores e confetes; a redução de movimento do sistema é respeitada por padrão.
- **Mais acabamento na arena:** iluminação nas bordas, brilho de impacto e sombras nos lutadores ajudam a separar personagens e cenário.
- **Revanche corrigida:** reiniciar a luta não confunde mais o clique com o modo de pré-carregamento da tela VS.

### Artes de referência

`art-source/references/` guarda os pôsteres e a imagem "Selecione seu lutador". Eles **não** são usados como sprites: vários quadros têm nome ou aparência trocados (ex.: no pôster 4 a coluna "Juraci" mostra o Carlos, e Gabi/Franciely estão invertidas) e os bonequinhos são pequenos demais e diferentes dos sprites do jogo. Servem de inspiração e divulgação.
## Lutadores e especiais

`L` = especial principal (barra cheia) · `↓ + L` = segundo especial (meia barra).

| Lutador | L (barra cheia) | ↓ + L (meia barra) |
| --- | --- | --- |
| **Juraci** | Super Bolo de Cenoura (projétil que derruba) | Chama o **Dadá**: "Já vou, irmã!" — ele lava a louça e a água com sabão escorre pelo chão (pule por cima ou escorrega) |
| **Carlos** | Alterna **Gordão** (come bolo ou pizza e engorda: +força) e **Modo Fé** (é batizado: +defesa) | — |
| **Pedro** | Bebe uma **Heineken** e vira o **Monstrão** (+força, +defesa) | **Fumaça de cigarro** (o adversário tosse) |
| **Daniel** | **Modo Natal Praia**: rápido e imprevisível, dano aleatório + surpresa: bate o carro, pede uma Heineken pra esposa (ela pode deixar e ele recupera vida… ou não) ou faz um show | Dancinha com notas musicais |
| **Franciely** | Fica **irritada sem motivo**: o Carlos aparece fugindo de medo, ela ganha força e uma **fome sem fim** (vai recuperando vida) | Jato de leite |
| **Gabi** | **Super L** gigante + chuva de **brigadeiros**; no fim a **Juraci vem buscar a panela** | Canto com notas musicais |

Vitórias: o Pedro foge pro Bar da Simone, o Daniel comemora de biquíni, o Carlos ergue os braços no Modo Fé e a Juraci levanta o bolo.

## Música

A música tema **"Bolo da Juraci"** toca nos menus e, por padrão, também durante a luta (um pouco mais baixa, para os golpes e falas aparecerem). Em **Configurações → Música na luta** dá para trocar pela trilha 8-bit de cada cenário.

- Arquivos: `assets/music/bolo-da-juraci.m4a` (original, Opus) e `bolo-da-juraci.mp3` (reserva para navegadores que não tocam Opus, como Safari antigo). O jogo baixa só um dos dois.
- Os navegadores só deixam tocar som depois do primeiro toque ou tecla — a música começa aí.
- Depois de tocar uma vez, fica guardada para jogar offline.
- Para trocar a música, substitua os dois arquivos mantendo os nomes (o MP3 pode ser gerado com `ffmpeg -i musica.m4a -b:a 128k bolo-da-juraci.mp3`).

## Falas e conversas

- **Conversa antes da luta** no 1º round (balões de quadrinho; qualquer botão ou toque pula).
- **Narrador:** os anúncios aparecem como texto; o locutor arcade humano em inglês é opcional nas configurações. A síntese robotizada do navegador foi removida.
- **Juraci** grita "BOLO DE CENOURA!" no especial, dá bronca nos combos e comemora a vitória.
- **Carlos** no especial **Gordão** come um bolo ou uma pizza (com mordidas e farelos) e engorda; no **Modo Fé** é batizado com água e luz do céu e grita "Aleluia!".
- **Pedro** fala ao fazer combo e ao beber a cerveja; **Daniel** anuncia a praia; **Tainara** responde quando ele pede uma bebida; **Gabi** canta no especial.
- Frases ao derrubar, ser nocauteado e vencer.
- **Vozes:** o jogo toca gravações humanas disponíveis e mantém as demais falas como legendas. Vozes sintéticas do navegador estão desativadas.
- **Vozes complementares:** novas amostras entram em falas correspondentes; Paula, Tainara e o Cão do Daniel também têm clipes para os dois especiais de cada um. As gravações originais continuam disponíveis. O áudio de narrador que mistura momentos diferentes fica em `art-source/audio/references/`, sem tocar fora de contexto.

Todas as frases ficam em **`js/dialogue.js`** — dá para editar ou acrescentar sem mexer no resto do código.

### Locutor arcade

Os clipes opcionais em `assets/voice/arcade/` vêm do **Voiceover Pack: Fighter**, de Kenney Vleugels. Licença **CC0 1.0** (uso livre em projetos pessoais e comerciais; atribuição não obrigatória). A licença está junto dos arquivos em `assets/voice/arcade/LICENSE.txt`. Fonte: [Kenney — Voiceover Pack (Fighter)](https://kenney.nl/assets/voiceover-pack-fighter).

## Estrutura

```
├── index.html               telas do jogo
├── manifest.webmanifest     instalação como app (PWA)
├── sw.js                    modo offline (service worker)
├── supabase-config.js       configuração pública do cliente Supabase
├── css/style.css            visual de menus, seleção e controles de toque
├── js/
│   ├── game.js              motor: lutadores, IA, rounds, cenários, HUD
│   ├── boot.js              recuperação de arquivos antigos do cache offline
│   ├── dialogue.js          ✏️ FALAS DOS PERSONAGENS (edite aqui)
│   ├── audio.js             efeitos, música e voz
│   ├── account.js           conta Supabase e sincronização
│   └── sprite-data.js       gerado: tabela de quadros do atlas
├── assets/                  tudo que o jogo carrega
│   ├── sprites/              atlas gerado dos lutadores e efeitos (WebP + PNG)
│   ├── menu/                arte do menu (menu.png original + menu.webp otimizado)
│   ├── portraits/           retratos dos lutadores
│   ├── music/               músicas (.m4a original + .mp3 reserva)
│   ├── voice/               clipes prontos para o jogo e locutor arcade CC0
│   ├── stages/              cenários pintados (Bar da Simone, Praia)
│   └── icons/               ícones do app
├── art-source/              artes de origem e arquivos de trabalho
│   ├── *-sheet.png          folhas originais dos lutadores
│   ├── audio/               gravações originais e áudio de referência (sem duplicatas dos clipes do jogo)
│   ├── cutouts/             recortes transparentes usados pelo atlas
│   └── references/          pôsteres e artes de referência
├── supabase/schema.sql      banco de dados (opcional)
└── tools/                   ferramentas locais para preparar arte e sprites
```

As artes-fonte de Paula e Tainara incluem a ficha de movimentos em
`art-source/paula-tainara-movement-sheet.png`, com vários quadros para parado,
andar, correr, pular, defesa e agachado. Os recortes transparentes ficam em
`art-source/cutouts/{paula,tainara,cao}/` e são usados para animar os lutadores.
A ficha do cão ainda fornece uma pose por estado. Para refazer os recortes após
editar as fichas:

```
pip install pillow numpy scipy
python tools/cutout_reference_cards.py
python tools/build_atlas.py
```

Os arquivos de cenário originais e as colagens de referência do Bar da Simone e
da Praia ficam em `art-source/references/stages-bar-praia/`. As imagens otimizadas
que o jogo carrega estão em `assets/stages/bar.webp` e `assets/stages/praia.webp`.

### Regenerar o atlas

Se alterar as folhas de sprite originais, gere o atlas normal:

```
pip install pillow numpy scipy
python tools/build_atlas.py
```

Para gerar sprites com super-resolução, instale também `onnxruntime` e use:

```
pip install pillow numpy scipy onnxruntime
python tools/build_atlas.py --enhance
```

Na primeira execução, o modelo de super-resolução (~18 MB) é baixado para a pasta temporária do sistema e validado por hash. O processamento das artes é feito localmente.

Os quadros de cada animação são definidos no topo de `tools/build_atlas.py`.

### Adicionar a folha de um lutador novo (fundo opaco)

As folhas do Pedro, Daniel, Franciely e Gabi têm cenário no fundo. Para recortá-las:

1. Salve a folha em `art-source/<lutador>-sheet.png` (ex.: `art-source/gabi-sheet.png`).
2. Confira/ajuste os retângulos de cada quadro em `CUTS` no `tools/cutout.py`.
3. Rode:

```
pip install "rembg[cpu]" pillow numpy scipy
python tools/cutout.py gabi
python tools/build_atlas.py
```
O `cutout.py` também gera o retrato em `assets/portraits/`. Na primeira vez ele baixa o modelo de IA (~180 MB); tudo roda no seu computador. O lutador é liberado na seleção automaticamente quando os sprites dele existem no atlas.

## Executar

Abra `index.html` no navegador. Para testar como no site publicado (service worker, instalação), sirva a pasta:

```
python -m http.server 8080
```

e acesse `http://localhost:8080`.

## Como jogar

**1 jogador (teclado):**

- Mover: `A`/`D` ou `←`/`→` · toque duplo para frente corre · Pular: `W`, `↑` ou `Espaço` (segure uma direção para pular para o lado) · Agachar: `S`/`↓`
- Soco: `J` · Forte/Chute: `K` · Defesa: segure `I` · Especial: `L` (barra cheia) · Segundo especial: segure `↓` + `L` (meia barra)
- Pausar: `P` ou `Esc`

As teclas de 1 jogador e os conjuntos de 1P/2P podem ser remapeados em **Configurações**. Abra **Ver golpes** na seleção de partida ou **Lista de golpes** durante a pausa para consultar os comandos atuais.

**2 jogadores (mesmo teclado):**

- 1P: `WASD` + `F` soco, `G` forte, `H` defesa, `T` especial
- 2P: setas + `J` soco, `K` forte, `I` defesa, `L` especial (ou `Num1`, `Num2`, `Num3`, `Num0`)

Os dois conjuntos de teclas podem ser alterados em **Configurações → Teclado (2 jogadores)**.

**Gamepad:** analógico/direcional move, toque duplo para frente corre, `A` pula, `X` soco, `Y` forte, `B` especial, `LB/RB/LT/RT` defesa, `Start` pausa. No modo 2P, o segundo controle é o 2P.

**Celular:** direcional à esquerda (cima = pular, baixo = agachar) e botões à direita (segundo especial: direcional para baixo + Especial). Em Configurações, escolha o tamanho maior dos controles de toque. Jogue na horizontal; ao iniciar a luta o jogo tenta entrar em tela cheia.

**Treino:** na seleção de lutadores, escolha **TREINO**. O alvo fica parado, a luta não termina por tempo ou nocaute e a vida do alvo se recupera após alguns segundos.

**Dicas:**

- Combo: `J`, `J`, `K` quando os golpes acertam. Carlos tem um 4º golpe: `K` depois do chute vira o **Combo do Chute**, que derruba.
- Com a barra cheia, apertar `L` no meio de um combo cancela direto para o especial.
- As formas (Gordão, Modo Fé, Monstrão, Natal Praia, Irritada) duram 10 s.
- Pulo e agachar: agachado você desvia de socos altos; golpes no ar acertam de cima.

## Instalar no celular (GitHub Pages)

O projeto é um site estático. Para publicar pelo GitHub Pages, abra **Settings → Pages**, selecione **Deploy from a branch**, escolha `main` e a pasta `/ (root)`. Depois de salvar, cada envio para `main` atualiza o site. O repositório não contém atualmente um workflow de GitHub Actions.

No Android (Chrome), use **Instalar app**. No iPhone (Safari), use **Compartilhar → Adicionar à Tela de Início**.

## Conta e progresso (Supabase, opcional)

1. No Supabase, abra **SQL Editor** e execute `supabase/schema.sql` (pode executar de novo em um projeto já configurado; ele atualiza as funções e permissões).
2. Em **Authentication → URL Configuration**, use a URL do GitHub Pages como **Site URL** e em **Redirect URLs**.
3. Preencha `url` e `anonKey` em `supabase-config.js` com a URL do projeto e a chave pública (*publishable/anon*). O deploy atual não injeta variáveis do GitHub nesse arquivo.
4. Publique as alterações. Em **Minha Conta**, crie a conta ou entre; dá para trocar o apelido depois.

Só partidas contra a CPU são registradas. Resultados de lutas sem internet ficam numa fila no aparelho e são enviados quando a conexão volta.

**Segurança:** a chave *anon* é pública por natureza — a proteção vem das políticas RLS e das funções do banco. **Nunca** coloque a chave `service_role` no jogo ou no repositório. A versão do cliente Supabase é fixa, a página tem Content-Security-Policy e o servidor limita a 300 partidas registradas por conta a cada 24 h. Como o resultado é calculado no aparelho do jogador, as estatísticas servem para diversão, não para ranking competitivo.

## Próximas etapas

- Gravar mais falas da família e expandir as respostas contextuais dos personagens.
- Adicionar um workflow de publicação e validação automática no GitHub Actions.
- Melhorar a navegação por controle e teclado e oferecer opções de acessibilidade visual.
- Empacotar para a Play Store (por exemplo, com Capacitor) se quiser um APK/AAB.
