# Família Fighter — Batalha na Padaria

Protótipo web jogável com Juraci e Carlos, feito em HTML Canvas e JavaScript sem dependências.

## Menu e personagens

A tela inicial usa a arte `menu-familia.png` enviada para o projeto. Os botões de Jogar, Configurações e Créditos são interativos; Configurações permite silenciar os efeitos sonoros. A seleção já mostra Juraci e Carlos disponíveis e Franciely, Gabi, Daniel e Pedro como lutadores bloqueados/em desenvolvimento. Os novos personagens só poderão ser escolhidos quando seus sprites e golpes forem implementados.

Os retratos de Juraci e Carlos na seleção são recortes da folha de sprites: `juraci-rosto.png` e `carlos-rosto.png`.

## Executar

Mantenha estes arquivos na mesma pasta:

- `index.html`
- `menu-familia.png` (arte da tela inicial)
- `juraci-rosto.png` e `carlos-rosto.png` (retratos dos lutadores jogáveis)
- `supabase-config.js` (configuração pública vazia no protótipo; preenchida pelo workflow no deploy)
- `.github/workflows/deploy.yml` e `supabase/schema.sql` (publicação e configuração do banco)
- `tela_inicial.png`
- `Sprite Sheet Arcade de Juju e Carlos.png`
- `combat-sprites.png` (recortes limpos das animações de combate)
- `specials-reference.png` (arte dos especiais da Juraci e das transformações do Carlos)
- `manifest.webmanifest`, `sw.js` e os ícones `icon.svg`, `icon-192.png` e `icon-512.png` (instalação/offline)

Abra `index.html` em um navegador atualizado. Se o navegador bloquear imagens ao abrir diretamente do disco, sirva a pasta por um servidor web local simples.

## Instalar no celular

O projeto pode ser instalado como PWA e jogar offline depois do primeiro carregamento. O workflow em `.github/workflows/deploy.yml` publica automaticamente no GitHub Pages quando há um push para `main`.

### Publicar pelo GitHub Pages

1. Crie um repositório no GitHub e envie todos os arquivos desta pasta, incluindo a pasta oculta `.github`. O GitHub Desktop pode publicar uma pasta local sem usar comandos Git.
2. No repositório, abra **Settings → Pages** e escolha **GitHub Actions** como fonte de publicação.
3. Envie um commit para `main`. Acompanhe **Actions → Deploy Família Fighter PWA**; ao terminar, o GitHub mostrará o link HTTPS do jogo. Em um repositório chamado `familia-fighter`, o endereço padrão é `https://SEU-USUARIO.github.io/familia-fighter/`.
4. No Android, abra o link no Chrome e escolha **Instalar app** ou **Adicionar à tela inicial**. No iPhone, abra no Safari e use **Compartilhar → Adicionar à Tela de Início**.

Cada publicação cria uma nova versão do cache e o PWA busca a versão atualizada do site.

### Conectar Supabase e sincronizar progresso

1. No Supabase, abra **SQL Editor**, cole e execute `supabase/schema.sql`. A tabela guarda apelido, lutador escolhido e totais de partidas, vitórias, derrotas e empates. As políticas RLS deixam cada jogador ler apenas o próprio perfil; os resultados são incrementados por uma função autenticada.
2. Em **Authentication → URL Configuration**, configure a URL do GitHub Pages como **Site URL** e adicione a mesma URL às **Redirect URLs**. Se a confirmação de e-mail estiver ativa, novos jogadores devem confirmar o e-mail antes de entrar. Se o projeto exigir exposição explícita à Data API, exponha o schema `public` e as funções do jogo.
3. No GitHub, abra **Settings → Secrets and variables → Actions → Variables** e crie as variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY`. Use a URL do projeto e a chave pública **publishable/anon** do Supabase. O workflow injeta esses valores na publicação; não edite `supabase-config.js` no repositório.
4. Faça outro commit em `main`. Depois, abra **Minha Conta** no jogo para criar uma conta ou entrar. Resultados feitos sem conexão, enquanto a conta está conectada, ficam na fila deste aparelho e são enviados quando a internet voltar.

A chave pública publishable/anon é entregue ao navegador e não é segredo; a segurança depende das políticas RLS e das funções do schema. **Nunca** coloque a chave `service_role` no jogo, no repositório ou nas variáveis públicas. O jogo continua funcionando sem configurar o Supabase; login e sincronização precisam de internet.

Esta etapa não gera um APK/AAB nativo; isso exige empacotamento e assinatura próprios.

## Como jogar

- **Mover:** `A`/`D` ou setas esquerda/direita
- **Pular:** `W`, `↑` ou `Espaço`
- **Agachar:** segure `S` ou `↓`
- **Soco:** `J`
- **Golpe forte (Juraci) / chute (Carlos):** `K`
- **Defesa:** segure `I`
- **Especial:** `L`, quando a barra estiver cheia
- **Pausar/continuar:** `P` ou `Esc`
- **Reiniciar luta:** `R`
- Em celular, use os botões na tela; recomenda-se jogar na horizontal.
- Os botões touch de golpe e especial mostram miniaturas do lutador escolhido. Como a folha de Juraci não tem pose de chute, o botão `K` usa o golpe forte dela; Carlos usa as poses de chute disponíveis.

Você controla o personagem escolhido; o outro é o adversário controlado pelo jogo. Ele espera o primeiro comando antes de começar a lutar. O especial da Juraci lança o super bolo de cenoura. O especial do Carlos alterna entre **Ficar Gordão** (mais força e empurrão, com menos velocidade) e **Virar um Crente** (recebe menos dano); os efeitos duram alguns segundos. Golpes acertados e defesas carregam a barra de especial. Pulos evitam golpes baixos; agachar evita socos.

## Próximas etapas

- Gravar falas e efeitos próprios com autorização das pessoas envolvidas e integrar os arquivos de áudio.
- Testar em diferentes celulares e ajustar o equilíbrio da luta.
- Se precisar distribuir pela Play Store, empacotar a versão web para Android (por exemplo, com Capacitor) e gerar o APK/AAB de publicação.

As falas reais não estão incluídas: precisam de gravações fornecidas pela família. Os efeitos sonoros atuais são sintetizados pelo navegador.
