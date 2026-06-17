import { MAPS } from '../data/maps.js';
import { TOWERS } from '../data/towers.js';
import { ENEMIES } from '../data/enemies.js';

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    this.beginPath();
    this.moveTo(x + r, y); this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r); this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    return this;
  };
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const gameScreen = document.getElementById('game');
const mapGrid = document.getElementById('mapGrid');
const buildPanel = document.getElementById('buildPanel');
const infoPanel = document.getElementById('infoPanel');
const toast = document.getElementById('toast');
const startWaveBtn = document.getElementById('startWaveBtn');
const speedBtn = document.getElementById('speedBtn');
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

const mapIcons = { grass: '🌿', desert: '🏜️', ice: '🧊', lava: '🌋', temple: '🏛️' };
const saveKey = 'siege-forge-save-v1-6-ui';
let state;
let selectedPad = null;
let selectedTower = null;
let lastTime = 0;
let deferredInstallPrompt = null;
let toastTimer = null;

function loadSave() {
  try { return JSON.parse(localStorage.getItem(saveKey)) || { best: {} }; }
  catch { return { best: {} }; }
}
function saveGame() {
  if (!state) return;
  const save = loadSave();
  if (!save.best[state.map.id] || state.score > save.best[state.map.id]) save.best[state.map.id] = state.score;
  localStorage.setItem(saveKey, JSON.stringify(save));
}
function showToast(text) {
  toast.textContent = text;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 1450);
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
    card.style.setProperty('--map-accent', map.theme[2]);
    card.style.background = `linear-gradient(150deg, ${map.theme[1]}88, rgba(255,255,255,.045))`;
    card.innerHTML = `
      <div>
        <span class="realm-icon">${mapIcons[map.id] || '🛡️'}</span>
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
    effects: [],
    floating: [],
    spawnQueue: [],
    spawnTimer: 0,
    waveActive: false,
    paused: false,
    speed: 1,
    gameOver: false,
    won: false
  };
  selectedPad = null;
  selectedTower = null;
  ui.mapName.textContent = `${mapIcons[map.id] || '🛡️'} ${map.name}`;
  showGame();
  updateUI();
  renderInfoPanel();
  draw(0);
  showToast('Tap a glowing green pad to build');
}

function updateUI() {
  if (!state) return;
  ui.waveText.textContent = state.wave;
  ui.goldText.textContent = Math.floor(state.gold);
  ui.livesText.textContent = state.lives;
  ui.scoreText.textContent = state.score;
  startWaveBtn.disabled = state.waveActive || state.gameOver;
  startWaveBtn.textContent = state.won ? 'Endless Wave' : 'Start Wave';
  pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
  speedBtn.textContent = `Speed x${state.speed}`;
  renderInfoPanel();
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
  selectedPad = null;
  showToast(state.wave % 5 === 0 ? '⚠️ Boss wave incoming' : `Wave ${state.wave} started`);
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
    x, y, path, pathIndex: 1,
    slowUntil: 0, slowFactor: 1,
    burnUntil: 0, burnDps: 0,
    reached: false
  });
}
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function update(dt, now) {
  if (!state || state.paused || state.gameOver) return;
  dt *= state.speed;
  state.spawnTimer += dt;
  while (state.spawnQueue.length && state.spawnTimer >= state.spawnQueue[0].delay) spawnEnemy(state.spawnQueue.shift().type);

  for (const enemy of state.enemies) {
    if (enemy.burnUntil > now) enemy.hp -= enemy.burnDps * dt;
    const target = enemy.path[enemy.pathIndex];
    if (!target) {
      enemy.reached = true;
      state.lives -= enemy.type === 'boss' ? 3 : 1;
      state.effects.push({ type: 'leak', x: enemy.x, y: enemy.y, color: '#ef4444', life: 0.5, max: 0.5 });
      continue;
    }
    const speed = enemy.speed * (enemy.slowUntil > now ? enemy.slowFactor : 1);
    const dx = target[0] - enemy.x;
    const dy = target[1] - enemy.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) enemy.pathIndex += 1;
    else { enemy.x += (dx / d) * speed * dt; enemy.y += (dy / d) * speed * dt; }
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
    tower.flash = 0.16;
  }

  for (const tower of state.towers) tower.flash = Math.max(0, (tower.flash || 0) - dt);
  for (const p of state.projectiles) {
    p.life -= dt;
    p.x += (p.tx - p.x) * Math.min(1, dt * 13);
    p.y += (p.ty - p.y) * Math.min(1, dt * 13);
  }
  state.projectiles = state.projectiles.filter(p => p.life > 0);
  state.effects = state.effects.filter(fx => (fx.life -= dt) > 0);
  state.floating = state.floating.filter(f => (f.life -= dt) > 0);

  const killed = state.enemies.filter(e => e.hp <= 0 && !e.reached);
  for (const enemy of killed) {
    state.gold += enemy.reward;
    state.score += enemy.reward + state.wave * 2;
    state.floating.push({ x: enemy.x, y: enemy.y, text: `+${enemy.reward}`, color: '#facc15', life: 0.85, max: 0.85 });
    state.effects.push({ type: 'pop', x: enemy.x, y: enemy.y, color: enemy.color, life: 0.35, max: 0.35 });
  }
  state.enemies = state.enemies.filter(e => e.hp > 0 && !e.reached);

  if (state.lives <= 0) { state.gameOver = true; state.lives = 0; saveGame(); showToast('Game over'); }
  if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveActive = false;
    state.gold += 35 + state.wave * 5;
    state.score += 100 + state.wave * 10;
    if (state.wave >= state.map.wavesToWin) state.won = true;
    state.wave += 1;
    saveGame();
    showToast('Wave cleared · bonus gold');
  }
  updateUI();
}

function fireTower(tower, target, now) {
  const def = TOWERS[tower.kind];
  const damage = def.damage * tower.level;
  applyDamage(target, damage, tower.kind);
  state.projectiles.push({ x: tower.x, y: tower.y, tx: target.x, ty: target.y, color: def.color, life: 0.23, kind: tower.kind });
  if (def.splash) {
    state.effects.push({ type: 'ring', x: target.x, y: target.y, color: def.color, life: 0.30, max: 0.30, radius: def.splash });
    for (const e of state.enemies) if (e !== target && dist(e, target) <= def.splash) applyDamage(e, damage * 0.55, tower.kind);
  }
  if (def.slow) {
    target.slowFactor = def.slow;
    target.slowUntil = now + def.slowTime;
    state.effects.push({ type: 'ring', x: target.x, y: target.y, color: def.color, life: 0.22, max: 0.22, radius: 30 });
  }
  if (def.burn) { target.burnDps = def.burn * tower.level; target.burnUntil = now + def.burnTime; }
  if (def.chain) {
    state.enemies.filter(e => e !== target && e.hp > 0 && dist(e, target) <= 120).slice(0, def.chain + tower.level - 1).forEach(e => {
      applyDamage(e, damage * 0.65, tower.kind);
      state.projectiles.push({ x: target.x, y: target.y, tx: e.x, ty: e.y, color: def.color, life: 0.18, kind: 'storm' });
    });
  }
}
function applyDamage(enemy, amount, kind) {
  let final = amount;
  if (enemy.armor && kind === 'arrow') final *= enemy.armor;
  enemy.hp -= final;
}

function drawMapDecoration(map) {
  const decorative = {
    grass: [['🌳',72,74],['🌲',896,430],['🌿',790,72],['🍄',430,505]],
    desert: [['🌵',88,84],['☀️',874,62],['🪨',510,84],['🌵',720,466]],
    ice: [['❄️',86,88],['🧊',822,96],['❅',490,492],['❄️',720,420]],
    lava: [['🌋',90,78],['🔥',805,88],['🪨',355,478],['🔥',878,420]],
    temple: [['🏛️',80,42],['🔮',855,150],['✦',520,148],['🏺',120,470]]
  }[map.id] || [];
  ctx.globalAlpha = .34;
  ctx.font = '30px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [icon, x, y] of decorative) ctx.fillText(icon, x, y);
  ctx.globalAlpha = 1;
}

function drawGridPath(path, color) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = 58;
  ctx.strokeStyle = 'rgba(2, 6, 23, 0.56)';
  ctx.beginPath(); path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  ctx.lineWidth = 42;
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(15,23,42,.92)');
  ctx.strokeStyle = grad;
  ctx.beginPath(); path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 16]);
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath(); path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  ctx.setLineDash([]);
}

function drawTowerBody(tower, def, size, isSelected) {
  ctx.save();
  ctx.translate(tower.x, tower.y);
  ctx.shadowColor = def.color;
  ctx.shadowBlur = isSelected ? 24 : (tower.level >= 3 ? 15 : 6);
  const bodyGrad = ctx.createRadialGradient(-8, -10, 4, 0, 0, size + 8);
  bodyGrad.addColorStop(0, def.glow || def.color);
  bodyGrad.addColorStop(.48, def.color);
  bodyGrad.addColorStop(1, def.dark);
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = 'rgba(2,6,23,.86)';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(2,6,23,.72)';
  ctx.beginPath(); ctx.arc(0, 0, size * .58, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, size + 4, -1.2, 1.5); ctx.stroke();

  if (tower.kind === 'arrow') {
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-12, 8); ctx.quadraticCurveTo(0, -18, 12, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, -14); ctx.lineTo(-1, 15); ctx.stroke();
    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(-1,-18); ctx.lineTo(-7,-8); ctx.lineTo(5,-8); ctx.closePath(); ctx.fill();
  } else if (tower.kind === 'cannon') {
    ctx.fillStyle = '#111827'; ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-9, -24, 18, 34, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(0, 11, 7, 0, Math.PI * 2); ctx.fill();
  } else if (tower.kind === 'frost') {
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -18); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,-11); ctx.lineTo(-6,-16); ctx.moveTo(0,-11); ctx.lineTo(6,-16); ctx.stroke(); }
  } else if (tower.kind === 'flame') {
    ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.moveTo(0,-20); ctx.bezierCurveTo(18,-2,8,15,0,18); ctx.bezierCurveTo(-12,10,-18,-4,0,-20); ctx.fill();
    ctx.fillStyle = '#fb7185'; ctx.beginPath(); ctx.moveTo(2,-10); ctx.bezierCurveTo(10,3,6,12,0,14); ctx.bezierCurveTo(-7,8,-8,0,2,-10); ctx.fill();
  } else if (tower.kind === 'storm') {
    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(4,-22); ctx.lineTo(-10,2); ctx.lineTo(2,2); ctx.lineTo(-4,22); ctx.lineTo(14,-6); ctx.lineTo(2,-6); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawTower(tower, now) {
  const def = TOWERS[tower.kind];
  const isSelected = selectedTower === tower;
  if (isSelected) {
    ctx.fillStyle = `${def.color}20`;
    ctx.strokeStyle = `${def.color}d0`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  const pulse = tower.flash ? tower.flash * 28 : 0;
  const size = 23 + tower.level * 3 + pulse;
  drawTowerBody(tower, def, size, isSelected);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < tower.level ? '#facc15' : 'rgba(255,255,255,.20)';
    ctx.beginPath(); ctx.arc(tower.x - 12 + i * 12, tower.y + size + 10, 3.5, 0, Math.PI * 2); ctx.fill();
  }
}

function draw(now) {
  if (!state) return;
  const [bg, pathColor, accent] = state.map.theme;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, bg);
  gradient.addColorStop(.56, '#0f172a');
  gradient.addColorStop(1, '#020617');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = .55;
  for (let x = 0; x < canvas.width; x += 60) { ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 60) { ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  drawMapDecoration(state.map);

  drawGridPath(state.map.path, pathColor);
  if (state.map.secondPath) drawGridPath(state.map.secondPath, pathColor);

  for (const [x, y] of state.map.pads) {
    const occupied = state.towers.some(t => Math.hypot(t.x - x, t.y - y) < 10);
    const isSelected = selectedPad && selectedPad[0] === x && selectedPad[1] === y;
    ctx.shadowColor = occupied ? 'transparent' : '#86efac';
    ctx.shadowBlur = occupied ? 0 : 12;
    ctx.fillStyle = occupied ? 'rgba(255,255,255,.10)' : 'rgba(34,197,94,.32)';
    ctx.strokeStyle = isSelected ? '#facc15' : (occupied ? 'rgba(255,255,255,.26)' : 'rgba(187,247,208,.86)');
    ctx.lineWidth = isSelected ? 4 : 2.5;
    ctx.beginPath(); ctx.roundRect(x - 27, y - 27, 54, 54, 16); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (!occupied) {
      ctx.fillStyle = 'rgba(248,250,252,.78)'; ctx.font = 'bold 24px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+', x, y + 1);
    }
  }

  for (const tower of state.towers) drawTower(tower, now);

  for (const enemy of state.enemies) {
    const slowed = enemy.slowUntil > now;
    const burning = enemy.burnUntil > now;
    ctx.shadowColor = burning ? '#fb7185' : (slowed ? '#67e8f9' : 'rgba(0,0,0,.35)');
    ctx.shadowBlur = burning || slowed ? 13 : 5;
    const enemyGrad = ctx.createRadialGradient(enemy.x - 5, enemy.y - 6, 2, enemy.x, enemy.y, enemy.radius + 7);
    enemyGrad.addColorStop(0, '#f8fafc'); enemyGrad.addColorStop(.26, enemy.color); enemyGrad.addColorStop(1, '#020617');
    ctx.fillStyle = enemyGrad;
    ctx.strokeStyle = slowed ? '#67e8f9' : '#020617'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (enemy.type === 'shield') { ctx.strokeStyle = 'rgba(248,250,252,.92)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius + 6, -0.9, 0.95); ctx.stroke(); }
    if (enemy.type === 'boss') { ctx.fillStyle = '#020617'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('B', enemy.x, enemy.y + 1); }
    const hpw = enemy.type === 'boss' ? 68 : 46;
    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(15,23,42,.96)'; ctx.beginPath(); ctx.roundRect(enemy.x - hpw / 2, enemy.y - enemy.radius - 18, hpw, 8, 4); ctx.fill();
    ctx.fillStyle = hpPct > .45 ? '#22c55e' : (hpPct > .2 ? '#facc15' : '#ef4444'); ctx.beginPath(); ctx.roundRect(enemy.x - hpw / 2, enemy.y - enemy.radius - 18, hpw * hpPct, 8, 4); ctx.fill();
  }

  for (const p of state.projectiles) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.kind === 'storm' ? 4 : (p.kind === 'arrow' ? 3 : 5);
    ctx.lineCap = 'round'; ctx.shadowColor = p.color; ctx.shadowBlur = 11;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.tx, p.ty); ctx.stroke();
    if (p.kind === 'cannon') { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.tx, p.ty, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.shadowBlur = 0;
  }

  for (const fx of state.effects) {
    const pct = Math.max(0, fx.life / fx.max);
    ctx.globalAlpha = pct;
    ctx.strokeStyle = fx.color; ctx.lineWidth = 4;
    const r = (fx.radius || 34) * (1.25 - pct);
    ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const f of state.floating) {
    const pct = Math.max(0, f.life / f.max);
    ctx.globalAlpha = pct; ctx.fillStyle = f.color || '#facc15'; ctx.font = 'bold 21px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(f.text, f.x, f.y - (1 - pct) * 44);
    ctx.globalAlpha = 1;
  }

  if (state.paused) {
    ctx.fillStyle = 'rgba(2,6,23,.54)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc'; ctx.textAlign = 'center'; ctx.font = 'bold 44px system-ui'; ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
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
  return { x: (touch.clientX - rect.left) * (canvas.width / rect.width), y: (touch.clientY - rect.top) * (canvas.height / rect.height) };
}
function formatFireRate(rate, level = 1) { return `${(1 / (rate / level)).toFixed(1)}/s`; }

function renderEmptyInfoPanel() {
  infoPanel.className = 'info-panel empty-state';
  infoPanel.innerHTML = `<div class="empty-orb">＋</div><b>No tower selected</b><span>Tap a tower to see range, stats, upgrade cost, and sell value.</span>`;
}
function renderInfoPanel() {
  if (!state || !selectedTower) return renderEmptyInfoPanel();
  const tower = selectedTower;
  const def = TOWERS[tower.kind];
  const upgradeCost = 60 * tower.level + def.cost;
  const sellValue = Math.floor(def.cost * 0.55 * tower.level);
  const maxed = tower.level >= 3;
  const dots = [1,2,3].map(n => `<i class="${n <= tower.level ? 'on' : ''}"></i>`).join('');
  infoPanel.className = 'info-panel';
  infoPanel.innerHTML = `
    <div class="info-card" style="--tower-color:${def.color}; --tower-dark:${def.dark};">
      <div class="info-title">
        <div class="tower-icon" style="background:${def.dark}; color:${def.color};">${def.icon}</div>
        <div>
          <h3>${def.name} Tower</h3>
          <p>${def.role}<br>${def.note}</p>
          <div class="level-dots">${dots}</div>
        </div>
      </div>
      <div class="stat-grid">
        <div class="mini-stat"><span>Level</span><b>${tower.level}/3</b></div>
        <div class="mini-stat"><span>Damage</span><b>${Math.round(def.damage * tower.level)}</b></div>
        <div class="mini-stat"><span>Range</span><b>${tower.range}</b></div>
        <div class="mini-stat"><span>Fire Rate</span><b>${formatFireRate(tower.fireRate, tower.level)}</b></div>
        <div class="mini-stat"><span>Upgrade</span><b>${maxed ? 'Max' : upgradeCost + 'g'}</b></div>
        <div class="mini-stat"><span>Sell Value</span><b>+${sellValue}g</b></div>
      </div>
      <div class="panel-actions">
        <button id="infoUpgrade" ${maxed || state.gold < upgradeCost ? 'disabled' : ''}>${maxed ? 'Max Level' : `Upgrade · ${upgradeCost}g`}</button>
        <button id="infoSell" class="ghost">Sell · +${sellValue}g</button>
        <button id="infoClose" class="ghost wide">Close Selection</button>
      </div>
    </div>`;
  document.getElementById('infoUpgrade').onclick = () => upgradeTower(tower);
  document.getElementById('infoSell').onclick = () => sellTower(tower);
  document.getElementById('infoClose').onclick = () => { selectedTower = null; selectedPad = null; renderInfoPanel(); };
}
function upgradeTower(tower) {
  const def = TOWERS[tower.kind];
  const upgradeCost = 60 * tower.level + def.cost;
  if (tower.level >= 3) return showToast('Tower already maxed');
  if (state.gold < upgradeCost) return showToast('Not enough gold');
  state.gold -= upgradeCost; tower.level += 1; tower.range += 10; tower.flash = 0.45;
  state.effects.push({ type: 'ring', x: tower.x, y: tower.y, color: def.color, life: 0.48, max: 0.48, radius: tower.range });
  showToast(`${def.icon} ${def.name} upgraded to level ${tower.level}`); updateUI();
}
function sellTower(tower) {
  const def = TOWERS[tower.kind];
  const sellValue = Math.floor(def.cost * 0.55 * tower.level);
  state.gold += sellValue; state.towers = state.towers.filter(t => t !== tower);
  selectedTower = null; selectedPad = null; buildPanel.classList.add('hidden'); renderInfoPanel();
  showToast(`${def.icon} ${def.name} sold`); updateUI();
}
function openBuildPanel(pad) {
  selectedPad = pad; selectedTower = null; renderInfoPanel();
  buildPanel.innerHTML = `
    <div class="build-heading">
      <div><b>Choose Tower</b><br><span>Gold available: ${Math.floor(state.gold)} · each tower has a clear role</span></div>
      <button id="closeBuild" class="ghost">Cancel</button>
    </div>
    <div class="tower-grid"></div>`;
  const grid = buildPanel.querySelector('.tower-grid');
  Object.entries(TOWERS).forEach(([kind, t]) => {
    const btn = document.createElement('button');
    btn.className = `tower-choice ${t.accentClass || ''}`;
    btn.disabled = state.gold < t.cost;
    btn.style.setProperty('--tower-color', t.color);
    btn.style.background = `linear-gradient(145deg, ${t.dark}f0, rgba(255,255,255,.055))`;
    btn.innerHTML = `
      <span class="top"><span class="icon" style="color:${t.color};">${t.icon}</span><span class="cost">${t.cost}g</span></span>
      <b>${t.name}</b>
      <small>${t.role}<br>${t.note}</small>
      <span class="strategy">${t.strategy}</span>`;
    btn.onclick = () => {
      if (state.gold < t.cost) return showToast('Not enough gold');
      state.gold -= t.cost;
      const tower = { kind, x: pad[0], y: pad[1], level: 1, cooldown: 0, ...t };
      state.towers.push(tower); selectedTower = tower; buildPanel.classList.add('hidden');
      state.effects.push({ type: 'ring', x: tower.x, y: tower.y, color: t.color, life: 0.38, max: 0.38, radius: 76 });
      showToast(`${t.icon} ${t.name} tower built`); updateUI();
    };
    grid.appendChild(btn);
  });
  buildPanel.classList.remove('hidden');
  document.getElementById('closeBuild').onclick = () => { buildPanel.classList.add('hidden'); selectedPad = null; };
}
function selectExistingTower(tower) { selectedTower = tower; selectedPad = [tower.x, tower.y]; buildPanel.classList.add('hidden'); renderInfoPanel(); }

canvas.addEventListener('pointerdown', event => {
  if (!state || state.gameOver) return;
  const p = canvasPoint(event);
  const tower = state.towers.find(t => Math.hypot(p.x - t.x, p.y - t.y) <= 38);
  if (tower) return selectExistingTower(tower);
  const pad = state.map.pads.find(([x, y]) => Math.hypot(p.x - x, p.y - y) <= 39);
  if (pad) {
    const occupied = state.towers.some(t => Math.hypot(t.x - pad[0], t.y - pad[1]) < 10);
    if (occupied) selectExistingTower(state.towers.find(t => Math.hypot(t.x - pad[0], t.y - pad[1]) < 10));
    else openBuildPanel(pad);
  } else { buildPanel.classList.add('hidden'); selectedPad = null; selectedTower = null; renderInfoPanel(); }
});

startWaveBtn.addEventListener('click', startWave);
speedBtn.addEventListener('click', () => { if (!state) return; state.speed = state.speed === 1 ? 2 : 1; showToast(`Speed x${state.speed}`); updateUI(); });
pauseBtn.addEventListener('click', () => { if (!state) return; state.paused = !state.paused; updateUI(); });
backBtn.addEventListener('click', () => { if (state) saveGame(); showMenu(); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstallPrompt = e; installBtn.classList.remove('hidden'); });
installBtn.addEventListener('click', async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); deferredInstallPrompt = null; installBtn.classList.add('hidden'); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));

renderMapCards();
renderEmptyInfoPanel();
requestAnimationFrame(loop);
