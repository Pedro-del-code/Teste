/* =====================================================
   MOTOR DA BATALHA - lógica genérica, sem assets embutidos
   Coloque seus próprios arquivos em:
     /assets/sprites/  -> boss.png, soul.png, arrow.png
     /assets/audio/    -> battle_theme.mp3, hit.wav, block.wav
   Os nomes abaixo já são carregados automaticamente se existirem.
   ===================================================== */

const DIFFICULTY = {
  facil:   { bossHp: 90,  bulletSpeed: 1.6, bulletCount: 4, blockWindow: 420, fastChance: 0.15 },
  normal:  { bossHp: 140, bulletSpeed: 2.2, bulletCount: 6, blockWindow: 300, fastChance: 0.35 },
  dificil: { bossHp: 200, bulletSpeed: 3.0, bulletCount: 9, blockWindow: 200, fastChance: 0.55 },
};

/* setas do minigame de bloqueio: verde = velocidade normal, laranja = mais rápida */
const ARROW_TYPES = {
  normal: { color: 'green',  duration: 1400 },
  fast:   { color: 'orange', duration: 750  },
};

const state = {
  difficulty: 'normal',
  bossHp: 0, bossHpMax: 0,
  playerHp: 100, playerHpMax: 100,
  soulPos: { x: 50, y: 50 }, // percentual dentro da arena
  guardMode: false,
  turn: 'idle',
  keys: {},
};

const el = (id) => document.getElementById(id);
const arena = () => el('arena');
const soul = () => el('soul');

/* ---------- ÁUDIO (opcional, com fallback silencioso) ---------- */
const sfx = {};
function loadAudio(name, path) {
  const a = new Audio(path);
  a.onerror = () => { sfx[name] = null; };
  sfx[name] = a;
}
loadAudio('theme', 'assets/audio/battle_theme.mp3');
loadAudio('hit', 'assets/audio/hit.wav');
loadAudio('block', 'assets/audio/block.wav');
function play(name) {
  const a = sfx[name];
  if (a) { a.currentTime = 0; a.play().catch(() => {}); }
}

/* ---------- SPRITES (opcional) ---------- */
function trySprite(elementId, path) {
  const img = new Image();
  img.onload = () => { el(elementId).style.backgroundImage = `url(${path})`; el(elementId).style.backgroundSize = 'contain'; el(elementId).style.backgroundRepeat = 'no-repeat'; };
  img.src = path;
}
trySprite('soul', 'assets/sprites/soul.png');

/* ---------- NAVEGAÇÃO DE TELAS ---------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  el(id).classList.add('active');
}

document.querySelectorAll('.menu-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.difficulty = btn.dataset.difficulty;
  });
});
document.querySelector('[data-difficulty="normal"]').classList.add('selected');

el('btn-start').addEventListener('click', startBattle);
el('btn-retry').addEventListener('click', () => showScreen('screen-menu'));

/* ---------- CONTROLES ---------- */
window.addEventListener('keydown', e => {
  const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  if (map[e.key]) handleDirection(map[e.key]);
});
document.querySelectorAll('.pad-btn').forEach(btn => {
  btn.addEventListener('touchstart', e => { e.preventDefault(); handleDirection(btn.dataset.dir); });
  btn.addEventListener('click', () => handleDirection(btn.dataset.dir));
});

let dragging = false;
arena().addEventListener('touchstart', () => dragging = true);
arena().addEventListener('touchend', () => dragging = false);
arena().addEventListener('touchmove', e => {
  if (!dragging || state.turn !== 'dodge') return;
  const rect = arena().getBoundingClientRect();
  const t = e.touches[0];
  moveSoulTo(((t.clientX - rect.left) / rect.width) * 100, ((t.clientY - rect.top) / rect.height) * 100);
  e.preventDefault();
}, { passive: false });

function moveSoulTo(x, y) {
  state.soulPos.x = Math.max(4, Math.min(96, x));
  state.soulPos.y = Math.max(4, Math.min(96, y));
  soul().style.left = state.soulPos.x + '%';
  soul().style.top = state.soulPos.y + '%';
}

function handleDirection(dir) {
  if (state.turn === 'dodge') {
    const step = 6;
    if (dir === 'up') moveSoulTo(state.soulPos.x, state.soulPos.y - step);
    if (dir === 'down') moveSoulTo(state.soulPos.x, state.soulPos.y + step);
    if (dir === 'left') moveSoulTo(state.soulPos.x - step, state.soulPos.y);
    if (dir === 'right') moveSoulTo(state.soulPos.x + step, state.soulPos.y);
  } else if (state.turn === 'block' && state.pendingArrow) {
    resolveBlock(dir);
  }
}

/* ---------- BATALHA ---------- */
function startBattle() {
  const cfg = DIFFICULTY[state.difficulty];
  state.bossHp = state.bossHpMax = cfg.bossHp;
  state.playerHp = state.playerHpMax = 100;
  updateBars();
  showScreen('screen-battle');
  say('Gerson: "Prova que merece esse machado. Corte um fio do meu cabelo... se conseguir."');
  play('theme');
  setTimeout(() => playerTurn(), 1400);
}

function say(text) { el('dialogue-box').textContent = text; }

function updateBars() {
  el('boss-hp-fill').style.width = Math.max(0, state.bossHp / state.bossHpMax * 100) + '%';
  el('player-hp-fill').style.width = Math.max(0, state.playerHp / state.playerHpMax * 100) + '%';
  el('player-hp-text').textContent = `${Math.max(0, state.playerHp)}/${state.playerHpMax}`;
}

/* --- turno do jogador: minigame de timing --- */
function playerTurn() {
  state.turn = 'attack';
  el('btn-attack').disabled = false;
  say('Sua vez! Toque em ATACAR no momento certo.');
  el('btn-attack').onclick = () => runAttackMinigame();
}

function runAttackMinigame() {
  el('btn-attack').disabled = true;
  // barra de timing simples via prompt visual no dialogue-box
  let pos = 0, dir = 1, hit = false;
  const target = { min: 40, max: 60 };
  const bar = document.createElement('div');
  bar.style.cssText = 'position:relative;height:18px;background:#000;border:2px solid var(--muted);border-radius:3px;margin-top:6px;overflow:hidden;';
  const zone = document.createElement('div');
  zone.style.cssText = `position:absolute;left:${target.min}%;width:${target.max - target.min}%;top:0;bottom:0;background:rgba(63,255,107,.3);`;
  const marker = document.createElement('div');
  marker.style.cssText = 'position:absolute;top:0;bottom:0;width:4px;background:#ffd23f;';
  bar.appendChild(zone); bar.appendChild(marker);
  say('Toque em ATACAR quando o marcador estiver na área verde!');
  el('dialogue-box').appendChild(bar);
  el('btn-attack').disabled = false;

  const interval = setInterval(() => {
    pos += dir * 3;
    if (pos >= 100) dir = -1;
    if (pos <= 0) dir = 1;
    marker.style.left = pos + '%';
  }, 16);

  el('btn-attack').onclick = () => {
    clearInterval(interval);
    hit = pos >= target.min && pos <= target.max;
    el('btn-attack').disabled = true;
    const dmg = hit ? Math.round(state.bossHpMax * 0.22) : Math.round(state.bossHpMax * 0.08);
    state.bossHp -= dmg;
    updateBars();
    play('hit');
    say(hit ? `Golpe certeiro! -${dmg} de dano.` : `Você errou o tempo... -${dmg} de dano.`);
    setTimeout(() => {
      if (state.bossHp <= 0) return endBattle(true);
      bossTurn();
    }, 1000);
  };
}

/* --- turno do chefe: esquiva de balas + bloqueio direcional --- */
function bossTurn() {
  const cfg = DIFFICULTY[state.difficulty];
  state.turn = 'dodge';
  soul().classList.remove('guard-mode');
  moveSoulTo(50, 50);
  say('Cuidado! Desvie dos ataques.');
  spawnBullets(cfg);
}

function spawnBullets(cfg) {
  const a = arena();
  let spawned = 0;
  const spawnInterval = setInterval(() => {
    if (spawned >= cfg.bulletCount) { clearInterval(spawnInterval); return; }
    spawned++;
    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    const size = 10 + Math.random() * 8;
    bullet.style.width = bullet.style.height = size + 'px';
    const fromSide = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    const rect = a.getBoundingClientRect();
    if (fromSide === 0) { x = Math.random() * rect.width; y = -size; vx = 0; vy = cfg.bulletSpeed; }
    else if (fromSide === 1) { x = rect.width + size; y = Math.random() * rect.height; vx = -cfg.bulletSpeed; vy = 0; }
    else if (fromSide === 2) { x = Math.random() * rect.width; y = rect.height + size; vx = 0; vy = -cfg.bulletSpeed; }
    else { x = -size; y = Math.random() * rect.height; vx = cfg.bulletSpeed; vy = 0; }
    bullet.style.left = x + 'px'; bullet.style.top = y + 'px';
    a.appendChild(bullet);

    const move = setInterval(() => {
      x += vx; y += vy;
      bullet.style.left = x + 'px'; bullet.style.top = y + 'px';
      const soulX = (state.soulPos.x / 100) * rect.width;
      const soulY = (state.soulPos.y / 100) * rect.height;
      const dist = Math.hypot(x - soulX, y - soulY);
      if (dist < size) {
        clearInterval(move); bullet.remove();
        if (state.turn === 'dodge') damagePlayer(6);
      }
      if (x < -40 || x > rect.width + 40 || y < -40 || y > rect.height + 40) {
        clearInterval(move); bullet.remove();
      }
    }, 16);
  }, 550);

  setTimeout(() => { if (state.playerHp > 0) startBlockPhase(); }, cfg.bulletCount * 550 + 1200);
}

function damagePlayer(amount) {
  state.playerHp -= amount;
  updateBars();
  if (state.playerHp <= 0) { state.playerHp = 0; updateBars(); return endBattle(false); }
}

function startBlockPhase() {
  state.turn = 'block';
  soul().classList.add('guard-mode');
  const lane = el('block-lane');
  lane.classList.add('active');
  say('O coração ficou verde! Bloqueie com a seta correta.');
  const rounds = 4;
  let done = 0;

  function nextArrow() {
    if (done >= rounds || state.playerHp <= 0) {
      lane.classList.remove('active');
      lane.innerHTML = '';
      setTimeout(() => { if (state.playerHp > 0) playerTurn(); }, 800);
      return;
    }
    done++;
    const dirs = ['up', 'down', 'left', 'right'];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const cfg = DIFFICULTY[state.difficulty];
    const isFast = Math.random() < cfg.fastChance;
    const type = isFast ? ARROW_TYPES.fast : ARROW_TYPES.normal;
    lane.dataset.expected = dir;
    lane.innerHTML = '<div class="block-target"></div>';
    const arrow = document.createElement('div');
    arrow.className = 'block-arrow' + (isFast ? ' fast' : '');
    arrow.style.backgroundImage = `url(assets/sprites/arrow_${type.color}_${dir}.png)`;
    arrow.style.left = '0px';
    lane.appendChild(arrow);
    state.pendingArrow = dir;
    state.arrowResolved = false;
    const laneWidth = lane.clientWidth - 48;
    const duration = type.duration;
    const start = performance.now();

    function step(t) {
      if (state.arrowResolved) return;
      const p = Math.min(1, (t - start) / duration);
      arrow.style.left = (p * laneWidth) + 'px';
      if (p >= 1) {
        state.arrowResolved = true;
        state.pendingArrow = null;
        say('Muito lento! Levou dano.');
        damagePlayer(10);
        arrow.remove();
        setTimeout(nextArrow, 500);
        return;
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    lane._advance = nextArrow;
  }
  nextArrow();
}

function resolveBlock(dir) {
  if (state.arrowResolved) return;
  const lane = el('block-lane');
  const arrow = lane.querySelector('.block-arrow');
  if (!arrow) return;
  const arrowX = parseFloat(arrow.style.left) || 0;
  const targetX = lane.clientWidth - 48;
  const closeEnough = Math.abs(arrowX - targetX) < 60;
  state.arrowResolved = true;
  state.pendingArrow = null;

  if (closeEnough && dir === lane.dataset.expected) {
    play('block');
    say('Bloqueado!');
  } else if (closeEnough) {
    say('Direção errada!');
    damagePlayer(8);
  } else {
    say('Cedo demais!');
    damagePlayer(8);
  }
  arrow.remove();
  setTimeout(() => { if (lane._advance) lane._advance(); }, 500);
}

function endBattle(victory) {
  state.turn = 'idle';
  el('block-lane').classList.remove('active');
  showScreen('screen-end');
  el('end-title').textContent = victory ? 'VITÓRIA' : 'DERROTA';
  el('end-text').textContent = victory
    ? 'Você conquistou o Machado da Justiça.'
    : 'Você caiu em batalha... tente novamente.';
  if (sfx.theme) sfx.theme.pause();
}
