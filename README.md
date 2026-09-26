# Batalha Secreta — motor de jogo

Motor de batalha genérico (menu de dificuldade + luta com esquiva e bloqueio
direcional), pronto para você encaixar seus próprios sprites e áudios.
Nenhum arquivo protegido por direitos autorais está incluso.

## Rodando localmente

```bash
npm install
npm start
```

Abra `http://localhost:3000` no navegador do celular (mesma rede Wi-Fi) ou no
computador.

## Publicando no Render.com

1. Suba esta pasta inteira para um repositório no GitHub.
2. No Render.com: **New +** → **Web Service** → conecte o repositório.
3. Configurações:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
4. Deploy. O Render te dá uma URL pública que abre direto no navegador do
   celular.

## Onde colocar seus assets

As setas do minigame de bloqueio **já vêm inclusas** em
`assets/sprites/arrow_<cor>_<direção>.png` (verde = velocidade normal,
laranja = mais rápida — ver `ARROW_TYPES` em `game.js`). Para os demais
elementos, coloque arquivos com **exatamente esses nomes**:

```
assets/sprites/
  soul.png      -> substitui o coração/alma do jogador
  boss.png      -> (ainda não desenhado na tela; ver game.js para plugar)

assets/audio/
  battle_theme.mp3  -> música da batalha
  hit.wav           -> som de acerto no ataque
  block.wav         -> som de bloqueio bem-sucedido
```

**Sobre o áudio:** não inclui nenhuma trilha aqui, mesmo que você já tenha um
arquivo pronto — a "Hammer of Justice" é uma faixa comercial da trilha oficial
de Deltarune (Toby Fox / Materia Collective) e eu não posso empacotar ou
distribuir esse arquivo dentro do projeto. Se você tiver uma cópia obtida
legalmente, é só salvá-la localmente como `assets/audio/battle_theme.mp3` na
sua própria máquina antes de fazer o deploy — o código já está pronto pra
tocar o que estiver nesse caminho.

## Estrutura do projeto

```
battle-app/
  server.js        -> servidor Express (Render.com)
  package.json
  public/
    index.html      -> telas de menu, batalha e fim
    style.css        -> tema visual (mobile-first)
    game.js          -> toda a lógica: turnos, esquiva, bloqueio
  assets/
    sprites/  audio/  -> onde você adiciona seus próprios arquivos
```

## Ajustando a dificuldade / balanceamento

Edite o objeto `DIFFICULTY` no topo de `public/game.js`:

```js
const DIFFICULTY = {
  facil:   { bossHp: 90,  bulletSpeed: 1.6, bulletCount: 4, blockWindow: 420 },
  normal:  { bossHp: 140, bulletSpeed: 2.2, bulletCount: 6, blockWindow: 300 },
  dificil: { bossHp: 200, bulletSpeed: 3.0, bulletCount: 9, blockWindow: 200 },
};
```

## Plugando o sprite do chefe

No momento o chefe é representado só pela barra de vida e pelo texto do
diálogo. Para adicionar a imagem dele, em `public/index.html` adicione um
`<div id="boss-sprite"></div>` dentro de `.hud-top`, estilize em
`style.css`, e em `game.js` chame:

```js
trySprite('boss-sprite', 'assets/sprites/boss.png');
```

## Aviso sobre direitos autorais

Este projeto é um motor de jogo original, sem sprites, música ou textos
extraídos de Deltarune. Os arquivos que você adicionar em `assets/` são de
sua responsabilidade.
