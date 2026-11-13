# Família Fighter 2.0 — Protótipo Phaser 3

Protótipo experimental e isolado do jogo original. A seleção permite jogar com Pedro ou Paula, escolher o oponente entre esses lutadores e selecionar o Bar da Simone ou a Praia. O jogo atual não é alterado por esta pasta.

## Requisitos

- Node.js 20.19+ (ou 22.12+)
- npm

## Instalar e executar

Na pasta `prototype-phaser/`:

```bash
npm install
npm run dev
```

Abra o endereço local mostrado pelo Vite. Clique em **JOGAR** para desbloquear áudio, escolher os dois lutadores e selecionar a arena antes da apresentação.

## Gerar e testar o build

```bash
npm test
npm run build
npm run preview
```

O build estático é criado em `dist/`. A configuração `base: './'` gera caminhos relativos, apropriados para uma futura publicação em subpasta. Este protótipo não altera o workflow nem a publicação atual do GitHub Pages.

`npm test` executa os testes unitários de combate/cenário/câmera/áudio e os testes E2E em Chromium. Os testes de áudio verificam que os arquivos mapeados carregam metadados e que os eventos de reprodução funcionam; eles não validam a percepção auditiva. Instale o navegador uma vez antes do primeiro teste:

```bash
npx playwright install chromium
```

Os testes E2E verificam seleção por teclado, lutadores disponíveis/bloqueados, arenas, ordem da introdução, enquadramento da câmera, combate, KO, vitória/derrota, empate, reinício, retorno ao menu, carregamento de metadados de áudio e fallbacks quando sprites ou cenário não carregam.

Para atualizar as cópias locais dos assets a partir do jogo original:

```bash
npm run sync-assets
```

O sincronizador somente lê `../assets/sprites/fighters.webp`, `../assets/sprites/fighters.png`, `../js/sprite-data.js` e os assets necessários. Ele copia os assets e grava os metadados em `prototype-phaser/public/assets/`; não altera nem sobrescreve os arquivos originais.

## Controles

| Tecla | Ação |
|---|---|
| `A` / `D` | Mover para esquerda / direita |
| `W` | Pular |
| `S` / `↑` | Avançar / recuar na profundidade |
| `C` | Agachar |
| `Shift` | Correr |
| `J` | Soco |
| `K` | Chute |
| `L` | Defender |
| `U` | Especial de aura verde |
| `P` / `Esc` | Pausar / retomar |
| `R` | Reiniciar |

Na seleção, Pedro e Paula são jogáveis; Juraci, Carlos, Daniel, Franciely, Gabi e Tainara aparecem com seus retratos reais, mas permanecem indisponíveis até terem dados e combate implementados. Use as setas para navegar e trocar a arena, `Tab` para alternar entre jogador e CPU, `Enter` para escolher e `Espaço` para confirmar. Pedro se transforma durante a introdução, independentemente do lado escolhido. Em telas touch, toque nos retratos, nos seletores de P1/CPU e nas setas de arena. Durante a luta, movimento, corrida, agachamento, pulo, avanço/recuo em profundidade e golpes suportam toque mantido e múltiplos dedos.

## Assets reutilizados

- `assets/stages/bar.webp`: ilustração original do Bar da Simone.
- `assets/stages/praia.webp`: ilustração original da Praia.
- `assets/sprites/fighters.webp`: atlas original com os quadros de Pedro e Paula.
- `assets/portraits/*.png`: retratos originais usados na seleção; personagens sem combate implementado ficam marcados como indisponíveis.
- `js/sprite-data.js`: fonte dos retângulos e âncoras de cada quadro.
- `assets/music/family-fighter-2.mp3` e `family-fighter-3.mp3`: trilhas originais usadas, respectivamente, no Bar da Simone e na Praia.
- `assets/voice/arcade/*.ogg`: locuções existentes para rounds, Fight, Time, Combo, empate e resultado.
- `assets/voice/` e `assets/voice/generated/`: gravações disponíveis de Pedro, Paula, Juraci, Carlos, Daniel, Franciely, Gabi, Tainara, Dada e Cão; os arquivos mapeados são copiados para `public/assets/voice/characters/`.
- `assets/sprites/fighters.png`: consultado para validar dimensões; usado pelo sincronizador para ler o tamanho do atlas.

Os recortes isolados em `art-source/cutouts/` possuem fundo opaco em alguns quadros e não são usados diretamente. Em vez disso, o protótipo copia o atlas com transparência e constrói um atlas Phaser com coordenadas e pivôs derivados dos dados existentes. Se as imagens não carregarem, há fallback visual para cenário, personagens e projétil.

## O que já funciona

- Máquina de estados compartilhada para idle, walk, run, jump, fall, crouch, attack, hit, block, special, transformation, victory, defeat e KO.
- Transições terminais protegidas, hit/block stun e cancelamento configurado de soco para chute após confirmar um acerto.
- Combate com hitboxes/hurtboxes separados, prioridade, dano, knockback, invulnerabilidade curta, cooldowns, combos e efeitos por golpe.
- Seleção de Pedro ou Paula para o jogador e para a CPU; a IA existente controla o oponente sem duplicar regras de combate.
- Cena Phaser 3, carregamento de assets e layout adaptável.
- Tela de seleção Phaser, com dois slots de lutador, retratos, seleção de arena baseada diretamente em `stages.js`, navegação por teclado e toque, e personagens futuros bloqueados.
- Introdução cinematográfica modular com fade dos lutadores, foco/zoom de câmera, transformação do Pedro, “Ready?”, “Round One!” e “Fight!” antes de habilitar o combate, com limite máximo de espera.
- Encerramento idempotente para KO, time over com comparação de vida e empate; apresenta “K.O.”/“Time Over!”, vencedor, “You Win!”/“You Lose!”, animações de resultado disponíveis, reinício e retorno ao menu.
- Transformação de Pedro com os quadros `pedro/hulkPower_0..3`, seguida pela forma `pedro/hulk_0..2`.
- Barra de vida, temporizador, resultado por nocaute/tempo, pausa e reinício.
- Cenários selecionáveis por configuração de dados, limites e posições iniciais próprios.
- Movimento de profundidade separado da altura física do pulo; sombras, escala e ordenação acompanham o plano de chão.
- Câmera com acompanhamento horizontal e zoom suave quando os lutadores se afastam.
- Sombras, efeitos de impacto e tremor de câmera.
- Áudio dividido em MUSIC, SFX, CHARACTER_VOICE e ANNOUNCER, com volumes/mutes independentes, fades, pausa/retomada e instâncias de voz isoladas.
- Música específica para Bar da Simone e Praia; trocar ou reiniciar a partida não duplica nem reinicia a faixa que já está tocando.
- Locuções gravadas para Fight, rounds, Time, Combo, empate e resultados; Ready?, Perfect!, Excellent!, Knockout! e Time Over! usam `speechSynthesis` em inglês quando não há gravação correspondente. A síntese é temporária e não é apresentada como áudio gravado.
- Falas reais mapeadas para eventos compatíveis: Paula tem introdução do Bar e fala de especial; Pedro tem fala de combo e vitória. Outros clipes disponíveis estão catalogados para personagens futuros, sem atribuir falas ausentes a socos, chutes, defesa, dano ou transformação.
- Controle de prioridade previsível: no máximo duas vozes de personagem e uma locução arcade simultâneas; repetições são limitadas por cooldown, locuções podem substituir outra locução de mesma prioridade e canais diferentes podem coexistir.
- A sequência Ready? → introdução da Paula (somente no Bar) → Round One! → Fight! aguarda eventos reais de reprodução e tem um limite máximo de 12 segundos; falhas de mídia ou de síntese não bloqueiam a luta.
- Controles touch, opção de desligar música e efeitos separadamente.
- Controles independentes para música, efeitos, vozes dos personagens e narrador.

## Limitações conhecidas

- O atlas não tem ciclos dedicados de queda, vitória ou derrota; queda reutiliza a pose descendente do pulo, vitória usa idle e derrota usa uma pose disponível. Paula não tem frames próprios de agachamento ou KO, então esses estados reutilizam guarda/derrota. Não são animações desenhadas especificamente para esses estados.
- A forma transformada de Pedro tem idle e especial próprios, mas o atlas não contém versões Hulk distintas de soco e chute; esses golpes usam os frames comuns de Pedro.
- A transformação e os estados temporários usam sprites existentes; novos sprites não foram inventados nem as posições do atlas alteradas.
- A arena reaproveita uma ilustração panorâmica achatada; o parallax e a oclusão entre planos ainda não são independentes.
- Bar da Simone (1536×397) e Praia (1672×443) são cada um uma única imagem; não há camadas de água, mobiliário ou iluminação isoladas para animar sem alterar a arte.
- Os planos de chão, spawns e limites são valores configuráveis proporcionais ao viewport, aproximados a partir da área livre visível de cada panorama; ainda precisam de ajuste fino com arte final e testes em aparelhos reais.
- O especial usa o efeito verde já existente; balanceamento e timings são valores iniciais.
- Ready?, Perfect!, Excellent!, Knockout! e Time Over! ainda dependem de `speechSynthesis`, cuja disponibilidade e timbre variam por dispositivo. Não há gravações correspondentes nos assets verificados.
- Não há gravações mapeadas para Pedro ou Paula em idle, soco, chute, defesa, receber dano ou transformação; Pedro também não tem uma fala específica do especial nos eventos do jogo original. O especial ainda usa efeitos sintetizados, sem inventar uma fala para preencher essa ausência.
- Os clipes de Juraci, Carlos, Daniel, Franciely, Gabi, Tainara, Dada e Cão estão disponíveis e mapeados, mas esses personagens ainda não fazem parte do protótipo jogável.
- A gravação `assets/voice/narrator/vitoria-na-luta.mp3` é em português e não substitui uma locução arcade em inglês; a referência em `art-source/audio/references/` não tem mapeamento de evento no jogo e não foi integrada.
- Testes em aparelho físico, gamepad, acessibilidade completa, progressão, Supabase e integração ao jogo original estão fora deste protótipo.
