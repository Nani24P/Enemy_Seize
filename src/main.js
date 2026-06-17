import { MAPS } from '../data/maps.js';
import { TOWERS } from '../data/towers.js';
import { ENEMIES } from '../data/enemies.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const gameScreen = document.getElementById('game');
const mapGrid = document.getElementById('mapGrid');
const buildPanel = document.getElementById('buildPanel');
const startWaveBtn = document.getElementById('startWaveBtn');
const pauseBtn = document.getElementById('pauseBtn');
const backBtn = document.getElementById('backBtn');
const installBtn = document.getElementById('installBtn');

const ui = {
  mapName: document.getElementById('mapName'),
  waveText: document.getElementById('waveText'),
  goldText: document.getElementById('goldText'),
  livesText: document.getElementById('livesText'),
  scoreText: document.getElementById('scoreText')
};

let state;
let selectedPad = null;
let lastTime = 0;
let deferredInstallPrompt = null;
const saveKey = 'siege-forge-save-v1';

function loadSave() {
  try { return JSON.parse(localStorage.getItem(saveKey)) || { best: {} }; }
  catch { return { best: {} }; }
}
function saveGame() {
  const save = loadSave();
  if (!save.best[state.map.id] || state.score > save.best[state.map.id]) save.best[state.map.id] = state.score;
  localStorage.setItem(saveKey, JSON.stringify(save));
}

function showMenu() {
  menu.classList.add('active');
  gameScreen.classList.remove('active');
  buildPanel.classList.add('hidden');
  renderMapCards();
}
function showGame() {
  menu.classList.remove('active');
  gameScreen.classList.add('active');
}

function renderMapCards() {
  const save = loadSave();
  mapGrid.innerHTML = '';
  MAPS.forEach((map, index) => {
    const card = document.createElement('article');
    card.className = 'map-card';
    card.style.background = `linear-gradient(150deg, ${map.theme[1]}55, rgba(255,255,255,.04))`;
    card.innerHTML = `
      <div>
        <h3>${index + 1}. ${map.name}</h3>
        <small>${map.description}</small>
      </div>
      <div class="best">Best Score: ${save.best[map.id] || 0}</div>
    `;
    card.addEventListener('click', () => startMap(map));
    mapGrid.appendChild(card);
  });
}

function startMap(map) {
  state = {
    map,
    gold: 180,
    lives: 20,
    wave: 1,
    score: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    floating: [],
    spawnQueue: [],
    spawnTimer: 0,
    waveActive: false,
    paused: false,
    gameOver: false,
    won: false
  };
  selectedPad = null;
  ui.mapName.textContent = map.name;
  showGame();
  updateUI();
  draw(0);
}

function updateUI() {
  ui.waveText.textContent = state.wave;
  ui.goldText.textContent = Math.floor(state.gold);
  ui.livesText.textContent = state.lives;
  ui.scoreText.textContent = state.score;
  startWaveBtn.disabled = state.waveActive || state.gameOver;
  startWaveBtn.textContent = state.won ? 'Endless Wave' : 'Start Wave';
  pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
}

function makeWave(wave) {
  const list = [];
  const baseCount = 7 + Math.floor(wave * 1.4);
  for (let i = 0; i < baseCount; i++) {
    let type = 'goblin';
    if (wave >= 3 && i % 5 === 0) type = 'runner';
    if (wave >= 5 && i % 6 === 1) type = 'brute';
    if (wave >= 8 && i % 7 === 2) type = 'shield';
    list.push(type);
  }
  if (wave % 5 === 0) list.push('boss');
  return list;
}

function startWave() {
  if (state.waveActive || state.gameOver) return;
  state.spawnQueue = makeWave(state.wave).map((type, index) => ({ type, delay: index * 0.48 }));
  state.spawnTimer = 0;
  state.waveActive = true;
  buildPanel.classList.add('hidden');
  updateUI();
}

function spawnEnemy(type) {
  const def = ENEMIES[type];
  const scale = 1 + (state.wave - 1) * 0.16 + (state.map.id === 'lava' ? 0.08 : 0);
  const useSecondPath = state.map.secondPath && Math.random() > 0.5;
  const path = useSecondPath ? state.map.secondPath : state.map.path;
  const [x, y] = path[0];
  state.enemies.push({
    type,
    ...def,
    maxHp: Math.floor(def.hp * scale),
    hp: Math.floor(def.hp * scale),
    speed: def.speed * (state.map.id === 'lava' ? 1.12 : 1),
    x, y,
    path,
    pathIndex: 1,
    slowUntil: 0,
    slowFactor: 1,
    burnUntil: 0,
    burnDps: 0,
    reached: false
  });
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function distXY(a, x, y) { return Math.hypot(a.x - x, a.y - y); }

function update(dt, now) {
  if (!state || state.paused || state.gameOver) return;

  state.spawnTimer += dt;
  while (state.spawnQueue.length && state.spawnTimer >= state.spawnQueue[0].delay) {
    spawnEnemy(state.spawnQueue.shift().type);
  }

  for (const enemy of state.enemies) {
    if (enemy.burnUntil > now) enemy.hp -= enemy.burnDps * dt;
    const target = enemy.path[enemy.pathIndex];
    if (!target) {
      enemy.reached = true;
      state.lives -= enemy.type === 'boss' ? 3 : 1;
      continue;
    }
    const speed = enemy.speed * (enemy.slowUntil > now ? enemy.slowFactor : 1);
    const dx = target[0] - enemy.x;
    const dy = target[1] - enemy.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) enemy.pathIndex += 1;
    else {
      enemy.x += (dx / d) * speed * dt;
      enemy.y += (dy / d) * speed * dt;
    }
  }

  for (const tower of state.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;
    const target = state.enemies
      .filter(e => e.hp > 0 && !e.reached && dist(tower, e) <= tower.range)
      .sort((a, b) => b.pathIndex - a.pathIndex || a.hp - b.hp)[0];
    if (!target) continue;
    fireTower(tower, target, now);
    tower.cooldown = tower.fireRate / tower.level;
  }

  for (const p of state.projectiles) {
    p.life -= dt;
    p.x += (p.tx - p.x) * Math.min(1, dt * 12);
    p.y += (p.ty - p.y) * Math.min(1, dt * 12);
  }
  state.projectiles = state.projectiles.filter(p => p.life > 0);
  state.floating = state.floating.filter(f => (f.life -= dt) > 0);

  const killed = state.enemies.filter(e => e.hp <= 0 && !e.reached);
  for (const enemy of killed) {
    state.gold += enemy.reward;
    state.score += enemy.reward + state.wave * 2;
    state.floating.push({ x: enemy.x, y: enemy.y, text: `+${enemy.reward}`, life: 0.8 });
  }
  state.enemies = state.enemies.filter(e => e.hp > 0 && !e.reached);

  if (state.lives <= 0) {
    state.gameOver = true;
    state.lives = 0;
    saveGame();
  }

  if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveActive = false;
    state.gold += 35 + state.wave * 5;
    state.score += 100 + state.wave * 10;
    if (state.wave >= state.map.wavesToWin) state.won = true;
    state.wave += 1;
    saveGame();
  }
  updateUI();
}

function fireTower(tower, target, now) {
  const def = TOWERS[tower.kind];
  const damage = def.damage * tower.level;
  applyDamage(target, damage, tower.kind);
  state.projectiles.push({ x: tower.x, y: tower.y, tx: target.x, ty: target.y, color: def.color, life: 0.22 });

  if (def.splash) {
    for (const e of state.enemies) {
      if (e !== target && dist(e, target) <= def.splash) applyDamage(e, damage * 0.55, tower.kind);
    }
  }
  if (def.slow) {
    target.slowFactor = def.slow;
    target.slowUntil = now + def.slowTime;
  }
  if (def.burn) {
    target.burnDps = def.burn * tower.level;
    target.burnUntil = now + def.burnTime;
  }
  if (def.chain) {
    const chained = state.enemies
      .filter(e => e !== target && e.hp > 0 && dist(e, target) <= 120)
      .slice(0, def.chain + tower.level - 1);
    chained.forEach(e => applyDamage(e, damage * 0.65, tower.kind));
  }
}

function applyDamage(enemy, amount, kind) {
  let final = amount;
  if (enemy.armor && kind === 'arrow') final *= enemy.armor;
  enemy.hp -= final;
}

function drawGridPath(path, color) {
  ctx.lineWidth = 46;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.beginPath();
  path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
  ctx.lineWidth = 30;
  ctx.strokeStyle = color;
  ctx.beginPath();
  path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}

function draw(now) {
  if (!state) return;
  const [bg, pathColor, accent] = state.map.theme;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, bg);
  gradient.addColorStop(1, '#020617');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < canvas.width; x += 60) {
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 60) {
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  drawGridPath(state.map.path, pathColor);
  if (state.map.secondPath) drawGridPath(state.map.secondPath, pathColor);

  for (const [x, y] of state.map.pads) {
    const occupied = state.towers.some(t => Math.hypot(t.x - x, t.y - y) < 10);
    ctx.fillStyle = occupied ? 'rgba(255,255,255,.10)' : 'rgba(34,197,94,.30)';
    ctx.strokeStyle = selectedPad && selectedPad[0] === x && selectedPad[1] === y ? '#facc15' : 'rgba(255,255,255,.40)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x - 24, y - 24, 48, 48, 12); ctx.fill(); ctx.stroke();
  }

  for (const tower of state.towers) {
    const def = TOWERS[tower.kind];
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath(); ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.color;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(tower.x, tower.y, 19 + tower.level * 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#020617';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(tower.level, tower.x, tower.y + 6);
  }

  for (const enemy of state.enemies) {
    ctx.fillStyle = enemy.color;
    ctx.strokeStyle = enemy.slowUntil > performance.now() / 1000 ? '#67e8f9' : '#020617';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const hpw = 44;
    ctx.fillStyle = 'rgba(15,23,42,.9)'; ctx.fillRect(enemy.x - hpw / 2, enemy.y - enemy.radius - 14, hpw, 6);
    ctx.fillStyle = '#22c55e'; ctx.fillRect(enemy.x - hpw / 2, enemy.y - enemy.radius - 14, hpw * Math.max(0, enemy.hp / enemy.maxHp), 6);
  }

  for (const p of state.projectiles) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.tx, p.ty); ctx.stroke();
  }

  for (const f of state.floating) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = '#facc15'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y - (1 - f.life) * 40);
    ctx.globalAlpha = 1;
  }

  if (state.gameOver || state.won) {
    ctx.fillStyle = 'rgba(2,6,23,.72)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc'; ctx.textAlign = 'center'; ctx.font = 'bold 48px system-ui';
    ctx.fillText(state.gameOver ? 'Game Over' : 'Map Cleared!', canvas.width / 2, 230);
    ctx.font = '24px system-ui';
    ctx.fillText(state.gameOver ? 'Try a stronger choke point next run.' : 'Continue into endless waves or return to maps.', canvas.width / 2, 275);
  }
}

function loop(time) {
  const now = time / 1000;
  const dt = Math.min(0.033, now - lastTime || 0);
  lastTime = now;
  update(dt, now);
  draw(now);
  requestAnimationFrame(loop);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches?.[0] || event.changedTouches?.[0] || event;
  return {
    x: (touch.clientX - rect.left) * (canvas.width / rect.width),
    y: (touch.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function openBuildPanel(pad) {
  selectedPad = pad;
  buildPanel.innerHTML = '';
  const existing = state.towers.find(t => Math.hypot(t.x - pad[0], t.y - pad[1]) < 10);
  if (existing) {
    const upgradeCost = 60 * existing.level + TOWERS[existing.kind].cost;
    const sellValue = Math.floor(TOWERS[existing.kind].cost * 0.55 * existing.level);
    buildPanel.innerHTML = `
      <button class="tower-choice" id="upgradeTower"><b>Upgrade</b><small>${upgradeCost} gold</small></button>
      <button class="tower-choice" id="sellTower"><b>Sell</b><small>+${sellValue} gold</small></button>
      <button class="tower-choice" id="closeBuild"><b>Close</b><small>keep tower</small></button>
    `;
    document.getElementById('upgradeTower').onclick = () => {
      if (state.gold >= upgradeCost && existing.level < 3) { state.gold -= upgradeCost; existing.level += 1; updateUI(); }
      buildPanel.classList.add('hidden');
    };
    document.getElementById('sellTower').onclick = () => {
      state.gold += sellValue;
      state.towers = state.towers.filter(t => t !== existing);
      updateUI(); buildPanel.classList.add('hidden');
    };
    document.getElementById('closeBuild').onclick = () => buildPanel.classList.add('hidden');
  } else {
    Object.entries(TOWERS).forEach(([kind, t]) => {
      const btn = document.createElement('button');
      btn.className = 'tower-choice';
      btn.disabled = state.gold < t.cost;
      btn.innerHTML = `<b>${t.name}</b><small>${t.cost} gold<br>${t.note}</small>`;
      btn.onclick = () => {
        if (state.gold < t.cost) return;
        state.gold -= t.cost;
        state.towers.push({ kind, x: pad[0], y: pad[1], level: 1, cooldown: 0, ...t });
        buildPanel.classList.add('hidden');
        updateUI();
      };
      buildPanel.appendChild(btn);
    });
  }
  buildPanel.classList.remove('hidden');
}

canvas.addEventListener('pointerdown', event => {
  if (!state || state.gameOver) return;
  const p = canvasPoint(event);
  const pad = state.map.pads.find(([x, y]) => Math.hypot(p.x - x, p.y - y) <= 34);
  if (pad) openBuildPanel(pad);
  else buildPanel.classList.add('hidden');
});

startWaveBtn.addEventListener('click', startWave);
pauseBtn.addEventListener('click', () => { state.paused = !state.paused; updateUI(); });
backBtn.addEventListener('click', () => { if (state) saveGame(); showMenu(); });

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.classList.remove('hidden');
});
installBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt = null;
  installBtn.classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    this.beginPath(); this.moveTo(x + r, y); this.lineTo(x + w - r, y); this.quadraticCurveTo(x + w, y, x + w, y + r); this.lineTo(x + w, y + h - r); this.quadraticCurveTo(x + w, y + h, x + w - r, y + h); this.lineTo(x + r, y + h); this.quadraticCurveTo(x, y + h, x, y + h - r); this.lineTo(x, y + r); this.quadraticCurveTo(x, y, x + r, y); this.closePath(); return this;
  };
}

renderMapCards();
requestAnimationFrame(loop);
