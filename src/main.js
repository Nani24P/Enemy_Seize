import { MAPS } from '../data/maps.js';
import { TOWERS } from '../data/towers.js';
import { ENEMIES } from '../data/enemies.js';

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    this.beginPath();
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
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

const enemyVisuals = {
  grass: { goblin: '🍅', runner: '🥕', brute: '🍉', shield: '🧅', boss: '🎃' },
  desert: { goblin: '🧅', runner: '🥕', brute: '🎃', shield: '🥔', boss: '🍉' },
  ice: { goblin: '🫛', runner: '🧅', brute: '🍈', shield: '🥬', boss: '🎃' },
  lava: { goblin: '🌶️', runner: '🫑', brute: '🎃', shield: '🥕', boss: '🍉' },
  temple: { goblin: '🥔', runner: '🧄', brute: '🎃', shield: '🧅', boss: '🍉' }
};
const mapDecor = {
  grass: [['🌲',66,66,36,.7],['🌳',136,470,34,.7],['🦊',908,440,28,.8],['🦋',826,74,22,.8],['🍄',772,486,20,.8],['🌿',554,512,24,.6],['🐇',46,458,24,.85],['🌼',930,86,20,.78],['🌱',364,22,20,.8],['🪵',880,206,22,.7],['🌲',922,298,30,.66],['🪲',58,180,18,.85]],
  desert: [['🌵',68,72,32,.72],['🌵',900,412,30,.72],['🪨',842,62,28,.72],['🐪',110,506,26,.82],['☀️',912,98,28,.88],['🦂',782,512,20,.86],['🏺',532,42,22,.72],['🌵',696,104,28,.74],['🦎',64,282,18,.82],['🪨',276,34,20,.76]],
  ice: [['❄️',72,74,28,.78],['🧊',904,84,32,.72],['🐧',900,458,28,.82],['❄️',64,468,30,.72],['☃️',468,520,26,.78],['🦭',812,256,22,.82],['❅',234,42,24,.82],['🧊',632,522,24,.7]],
  lava: [['🌋',72,68,34,.76],['🔥',918,76,30,.82],['🪨',80,472,28,.76],['🦂',902,438,18,.86],['🔥',676,516,24,.82],['🐉',870,262,24,.62],['🪨',356,520,22,.78],['♨️',236,30,20,.74]],
  temple: [['🏛️',70,44,28,.82],['🕯️',914,84,22,.8],['🦉',896,494,22,.84],['🔮',516,148,20,.84],['🏺',82,500,24,.82],['✨',922,224,20,.8],['🪷',638,510,22,.82],['🐍',936,356,18,.84]]
};
const terrainScatter = {
  grass: ['rgba(74,222,128,.08)', 24, 42],
  desert: ['rgba(251,191,36,.07)', 22, 44],
  ice: ['rgba(103,232,249,.08)', 24, 40],
  lava: ['rgba(251,113,133,.07)', 22, 46],
  temple: ['rgba(192,132,252,.07)', 20, 44]
};
function getEnemyEmoji(mapId, type) { return enemyVisuals[mapId]?.[type] || '🥕'; }

let state;
let selectedPad = null;
let selectedTower = null;
let lastTime = 0;
let deferredInstallPrompt = null;
let toastTimer = null;
const saveKey = 'siege-forge-save-v2-0-phase2';
const towerUnlocks = { arrow: 0, cannon: 0, frost: 1, flame: 2, storm: 3 };
const phase2MapGoals = [0, 10, 12, 14, 16];
let infoPanelLastKey = '';

function getProgress() {
  const save = loadSave();
  return save.progress || { completedMaps: 0, bestWave: {}, completed: {} };
}
function isMapUnlocked(index) {
  const progress = getProgress();
  return index === 0 || (progress.completedMaps || 0) >= index;
}
function isTowerUnlocked(kind) {
  const progress = getProgress();
  return (progress.completedMaps || 0) >= (towerUnlocks[kind] || 0);
}
function recordProgress(waveJustCleared = null) {
  if (!state) return;
  const save = loadSave();
  save.best ||= {};
  save.progress ||= { completedMaps: 0, bestWave: {}, completed: {} };
  if (!save.best[state.map.id] || state.score > save.best[state.map.id]) save.best[state.map.id] = state.score;
  if (waveJustCleared) save.progress.bestWave[state.map.id] = Math.max(save.progress.bestWave[state.map.id] || 0, waveJustCleared);
  if (state.won) {
    save.progress.completed[state.map.id] = true;
    const completedIndex = MAPS.findIndex(m => m.id === state.map.id) + 1;
    save.progress.completedMaps = Math.max(save.progress.completedMaps || 0, completedIndex);
  }
  localStorage.setItem(saveKey, JSON.stringify(save));
}

function loadSave() {
  try { return JSON.parse(localStorage.getItem(saveKey)) || { best: {}, progress: { completedMaps: 0, bestWave: {}, completed: {} } }; }
  catch { return { best: {}, progress: { completedMaps: 0, bestWave: {}, completed: {} } }; }
}

function saveGame() {
  recordProgress();
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 1300);
}

function showMenu() {
  menu.classList.add('active');
  gameScreen.classList.remove('active');
  buildPanel.classList.add('hidden');
  infoPanel.classList.add('hidden');
  renderMapCards();
}

function showGame() {
  menu.classList.remove('active');
  gameScreen.classList.add('active');
}

function renderMapCards() {
  const save = loadSave();
  const progress = save.progress || { completedMaps: 0, bestWave: {}, completed: {} };
  mapGrid.innerHTML = '';
  MAPS.forEach((map, index) => {
    const unlocked = isMapUnlocked(index);
    const completed = !!progress.completed?.[map.id];
    const card = document.createElement('article');
    card.className = `map-card ${unlocked ? '' : 'locked'}`;
    card.style.background = `linear-gradient(160deg, ${map.theme[1]}aa, rgba(255,255,255,.04))`;
    card.style.setProperty('--map-accent', map.theme[2]);
    const unlockText = index === 0 ? 'Ready' : `Unlock: clear ${MAPS[index - 1].name}`;
    card.innerHTML = `
      <div>
        <div class="map-head">
          <span class="map-hero-icon">${unlocked ? (map.icon || '🗺️') : '🔒'}</span>
          <div class="map-mini-icons"><span>${map.veggieIcons?.[0] || '🍅'}</span><span>${map.veggieIcons?.[1] || '🥕'}</span><span>${map.veggieIcons?.[2] || '🎃'}</span></div>
        </div>
        <div class="map-title">${map.name}</div>
        <div class="map-caption">${unlocked ? `${(map.veggieIcons || []).join('  ')} · ${map.wavesToWin} waves` : unlockText}</div>
      </div>
      <div class="map-footer">
        <div class="best">${completed ? '🏆 Cleared' : `★ ${save.best?.[map.id] || 0}`}</div>
        <div class="play-chip">${unlocked ? '▶ Play' : 'Locked'}</div>
      </div>
    `;
    if (unlocked) card.addEventListener('click', () => startMap(map));
    else card.addEventListener('click', () => showToast(unlockText));
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
  ui.mapName.textContent = `${map.icon || '🗺️'} ${map.name}`;
  showGame();
  updateUI();
  renderInfoPanel();
  draw(0);
  showToast('Build on a glowing pad');
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
  if (state.wave % 5 === 0) {
    state.effects.push({ type: 'bossText', x: canvas.width / 2, y: 118, color: '#facc15', life: 1.35, max: 1.35 });
    showToast('🎃 Boss veggie wave');
  } else showToast(`🌱 Wave ${state.wave}`);
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
    emoji: getEnemyEmoji(state.map.id, type),
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

function update(dt, now) {
  if (!state || state.paused || state.gameOver) return;
  dt *= state.speed;

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
      state.effects.push({ type: 'leak', x: enemy.x, y: enemy.y, color: '#ef4444', life: 0.5, max: 0.5 });
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
    tower.flash = 0.12;
  }

  for (const tower of state.towers) tower.flash = Math.max(0, (tower.flash || 0) - dt);
  for (const p of state.projectiles) {
    p.life -= dt;
    p.x += (p.tx - p.x) * Math.min(1, dt * 12);
    p.y += (p.ty - p.y) * Math.min(1, dt * 12);
  }
  state.projectiles = state.projectiles.filter(p => p.life > 0);
  state.effects = state.effects.filter(fx => (fx.life -= dt) > 0);
  state.floating = state.floating.filter(f => (f.life -= dt) > 0);

  const killed = state.enemies.filter(e => e.hp <= 0 && !e.reached);
  for (const enemy of killed) {
    state.gold += enemy.reward;
    state.score += enemy.reward + state.wave * 2;
    state.floating.push({ x: enemy.x, y: enemy.y, text: `+${enemy.reward}`, color: '#facc15', life: 0.8, max: 0.8 });
    state.effects.push({ type: 'pop', x: enemy.x, y: enemy.y, color: enemy.color, life: 0.35, max: 0.35 });
  }
  state.enemies = state.enemies.filter(e => e.hp > 0 && !e.reached);

  if (state.lives <= 0) {
    state.gameOver = true;
    state.lives = 0;
    saveGame();
    showToast('Game over');
  }

  if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveActive = false;
    state.gold += 35 + state.wave * 5;
    state.score += 100 + state.wave * 10;
    if (state.wave >= state.map.wavesToWin) state.won = true;
    recordProgress(state.wave);
    state.wave += 1;
    showToast(state.won ? '🏆 Map cleared · new unlocks!' : 'Wave cleared · bonus gold');
  }
  updateUI();
}

function fireTower(tower, target, now) {
  const def = TOWERS[tower.kind];
  const damage = def.damage * tower.level;
  applyDamage(target, damage, tower.kind);
  state.projectiles.push({ x: tower.x, y: tower.y, tx: target.x, ty: target.y, color: def.color, life: 0.22, kind: tower.kind });

  if (def.splash) {
    state.effects.push({ type: 'ring', x: target.x, y: target.y, color: def.color, life: 0.28, max: 0.28, radius: def.splash });
    for (const e of state.enemies) {
      if (e !== target && dist(e, target) <= def.splash) applyDamage(e, damage * 0.55, tower.kind);
    }
  }
  if (def.slow) {
    target.slowFactor = def.slow;
    target.slowUntil = now + def.slowTime;
    state.effects.push({ type: 'ring', x: target.x, y: target.y, color: def.color, life: 0.22, max: 0.22, radius: 26 });
  }
  if (def.burn) {
    target.burnDps = def.burn * tower.level;
    target.burnUntil = now + def.burnTime;
  }
  if (def.chain) {
    const chained = state.enemies
      .filter(e => e !== target && e.hp > 0 && dist(e, target) <= 120)
      .slice(0, def.chain + tower.level - 1);
    chained.forEach(e => {
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
  const [fill, count, baseSize] = terrainScatter[map.id] || terrainScatter.grass;
  ctx.fillStyle = fill;
  for (let i = 0; i < count; i++) {
    const x = (i * 137) % canvas.width;
    const y = (i * 97 + 43) % canvas.height;
    const size = baseSize + (i % 5) * 7;
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [icon, x, y, size, alpha] of (mapDecor[map.id] || [])) {
    ctx.globalAlpha = alpha;
    ctx.font = `${size}px system-ui`;
    ctx.fillText(icon, x, y);
  }
  ctx.globalAlpha = 1;
}

function drawGridPath(path, color) {
  ctx.lineWidth = 64;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.beginPath();
  path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
  ctx.lineWidth = 50;
  ctx.strokeStyle = color;
  ctx.beginPath();
  path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,.16)';
  ctx.beginPath();
  path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}

function drawTower(tower, now) {
  const def = TOWERS[tower.kind];
  const isSelected = selectedTower === tower;
  if (isSelected) {
    ctx.fillStyle = `${def.color}22`;
    ctx.strokeStyle = `${def.color}aa`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  const pulse = tower.flash ? tower.flash * 25 : 0;
  const size = 21 + tower.level * 3 + pulse;
  ctx.shadowColor = def.color;
  ctx.shadowBlur = isSelected ? 16 : (tower.level === 3 ? 10 : 0);
  ctx.fillStyle = def.color;
  ctx.strokeStyle = def.dark || '#020617';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(tower.x, tower.y, size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(2,6,23,.92)';
  ctx.beginPath(); ctx.arc(tower.x, tower.y, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.icon, tower.x, tower.y + 1);

  for (let i = 0; i < tower.level; i++) {
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(tower.x - 11 + i * 11, tower.y + size + 8, 3.2, 0, Math.PI * 2); ctx.fill();
  }
}


function drawGlossyVeggie(enemy, now) {
  const slowed = enemy.slowUntil > now;
  const burning = enemy.burnUntil > now;
  const r = enemy.radius + (enemy.type === 'boss' ? 11 : 8);
  ctx.save();
  ctx.shadowColor = burning ? '#fb7185' : (slowed ? '#67e8f9' : 'rgba(0,0,0,.45)');
  ctx.shadowBlur = burning || slowed ? 18 : 8;
  const grad = ctx.createRadialGradient(enemy.x - r * .35, enemy.y - r * .42, 2, enemy.x, enemy.y, r + 8);
  grad.addColorStop(0, 'rgba(255,255,255,.92)');
  grad.addColorStop(.22, 'rgba(255,255,255,.30)');
  grad.addColorStop(.62, enemy.color || '#84cc16');
  grad.addColorStop(1, 'rgba(2,6,23,.78)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.42)';
  ctx.beginPath();
  ctx.ellipse(enemy.x - r * .28, enemy.y - r * .34, r * .22, r * .12, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(2,6,23,.35)';
  ctx.beginPath();
  ctx.ellipse(enemy.x, enemy.y + r + 5, r * .75, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `${enemy.type === 'boss' ? 34 : enemy.type === 'brute' ? 28 : 23}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(enemy.emoji || '🥕', enemy.x, enemy.y + 1);
  if (enemy.type === 'shield') {
    ctx.strokeStyle = 'rgba(248,250,252,.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r + 6, -0.95, 0.95);
    ctx.stroke();
  }
  if (enemy.type === 'boss') {
    ctx.fillStyle = 'rgba(2,6,23,.82)';
    ctx.beginPath();
    ctx.roundRect(enemy.x - 18, enemy.y - r - 24, 36, 18, 8);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 10px system-ui';
    ctx.fillText('BOSS', enemy.x, enemy.y - r - 15);
  }
  const hpw = enemy.type === 'boss' ? 72 : 48;
  const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
  ctx.fillStyle = 'rgba(15,23,42,.96)';
  ctx.beginPath();
  ctx.roundRect(enemy.x - hpw / 2, enemy.y - r - 13, hpw, 7, 4);
  ctx.fill();
  ctx.fillStyle = hpPct > .45 ? '#22c55e' : (hpPct > .2 ? '#facc15' : '#ef4444');
  ctx.beginPath();
  ctx.roundRect(enemy.x - hpw / 2, enemy.y - r - 13, hpw * hpPct, 7, 4);
  ctx.fill();
  ctx.restore();
}

function draw(now) {
  if (!state) return;
  const [bg, pathColor] = state.map.theme;
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

  drawMapDecoration(state.map);

  drawGridPath(state.map.path, pathColor);
  if (state.map.secondPath) drawGridPath(state.map.secondPath, pathColor);

  for (const [x, y] of state.map.pads) {
    const occupied = state.towers.some(t => Math.hypot(t.x - x, t.y - y) < 10);
    const isSelected = selectedPad && selectedPad[0] === x && selectedPad[1] === y;
    ctx.fillStyle = occupied ? 'rgba(255,255,255,.10)' : 'rgba(34,197,94,.32)';
    ctx.strokeStyle = isSelected ? '#facc15' : (occupied ? 'rgba(255,255,255,.24)' : 'rgba(187,247,208,.70)');
    ctx.lineWidth = isSelected ? 4 : 2.5;
    ctx.beginPath(); ctx.roundRect(x - 25, y - 25, 50, 50, 14); ctx.fill(); ctx.stroke();
    if (!occupied) {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.font = 'bold 20px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+', x, y + 1);
    }
  }

  for (const tower of state.towers) drawTower(tower, now);

  for (const enemy of state.enemies) drawGlossyVeggie(enemy, now);

  for (const p of state.projectiles) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.kind === 'storm' ? 3 : 4;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.tx, p.ty); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  for (const fx of state.effects) {
    const pct = Math.max(0, fx.life / fx.max);
    ctx.globalAlpha = pct;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 4;
    if (fx.type === 'bossText') {
      ctx.fillStyle = fx.color;
      ctx.font = 'bold 40px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎃 BOSS VEGGIE WAVE', fx.x, fx.y - (1 - pct) * 18);
    } else if (fx.type === 'ring' || fx.type === 'pop' || fx.type === 'leak') {
      const r = (fx.radius || 34) * (1.2 - pct);
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  for (const f of state.floating) {
    const pct = Math.max(0, f.life / f.max);
    ctx.globalAlpha = pct;
    ctx.fillStyle = f.color || '#facc15'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(f.text, f.x, f.y - (1 - pct) * 42);
    ctx.globalAlpha = 1;
  }

  if (state.paused) {
    ctx.fillStyle = 'rgba(2,6,23,.52)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc'; ctx.textAlign = 'center'; ctx.font = 'bold 44px system-ui';
    ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
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

function formatFireRate(rate, level = 1) {
  return `${(1 / (rate / level)).toFixed(1)}/s`;
}

function renderInfoPanel(force = false) {
  if (!state || !selectedTower) {
    infoPanel.classList.add('hidden');
    infoPanelLastKey = '';
    return;
  }
  const tower = selectedTower;
  const def = TOWERS[tower.kind];
  const upgradeCost = Math.floor(def.cost * 0.45 + 35 * tower.level);
  const sellValue = Math.floor(def.cost * 0.55 * tower.level);
  const maxed = tower.level >= 3;
  const canUpgrade = !maxed && state.gold >= upgradeCost;
  const key = `${tower.kind}-${tower.level}-${Math.floor(state.gold)}-${selectedTower.x}-${selectedTower.y}`;
  if (!force && infoPanelLastKey === key) return;
  infoPanelLastKey = key;
  infoPanel.innerHTML = `
    <div class="info-title">
      <div class="tower-icon" style="background:${def.dark}; color:${def.color};">${def.icon}</div>
      <div>
        <h3>${def.name} Tower · Lv ${tower.level}</h3>
        <p>${def.role} · ${def.note}</p>
      </div>
    </div>
    <div class="stat-grid">
      <div class="mini-stat"><span>Damage</span><b>${Math.round(def.damage * tower.level)}</b></div>
      <div class="mini-stat"><span>Range</span><b>${tower.range}</b></div>
      <div class="mini-stat"><span>Rate</span><b>${formatFireRate(tower.fireRate, tower.level)}</b></div>
      <div class="mini-stat"><span>Upgrade</span><b>${maxed ? 'Max' : upgradeCost + 'g'}</b></div>
      <div class="mini-stat"><span>Sell</span><b>+${sellValue}g</b></div>
      <div class="mini-stat"><span>Gold</span><b>${Math.floor(state.gold)}g</b></div>
    </div>
    <div class="panel-actions">
      <button data-action="upgrade" ${canUpgrade ? '' : 'disabled'}>${maxed ? 'Max Level' : `Upgrade · ${upgradeCost}g`}</button>
      <button data-action="sell" class="ghost">Sell · +${sellValue}g</button>
      <button data-action="close" class="ghost">Close</button>
    </div>
  `;
  infoPanel.classList.remove('hidden');
}

function upgradeTower(tower) {
  const def = TOWERS[tower.kind];
  const upgradeCost = Math.floor(def.cost * 0.45 + 35 * tower.level);
  if (tower.level >= 3) return showToast('Tower already maxed');
  if (state.gold < upgradeCost) return showToast('Not enough gold');
  state.gold -= upgradeCost;
  tower.level += 1;
  tower.range += 10;
  tower.flash = 0.4;
  state.effects.push({ type: 'ring', x: tower.x, y: tower.y, color: def.color, life: 0.45, max: 0.45, radius: tower.range });
  showToast(`${def.name} upgraded to level ${tower.level}`);
  infoPanelLastKey = '';
  updateUI();
}

function sellTower(tower) {
  const def = TOWERS[tower.kind];
  const sellValue = Math.floor(def.cost * 0.55 * tower.level);
  state.gold += sellValue;
  state.towers = state.towers.filter(t => t !== tower);
  selectedTower = null;
  selectedPad = null;
  buildPanel.classList.add('hidden');
  infoPanel.classList.add('hidden');
  showToast(`${def.name} sold`);
  updateUI();
}

function openBuildPanel(pad) {
  selectedPad = pad;
  selectedTower = null;
  infoPanel.classList.add('hidden');
  buildPanel.innerHTML = `
    <div class="build-heading">
      <div><b>Choose Tower</b><br><span>Gold available: ${Math.floor(state.gold)}</span></div>
      <button id="closeBuild" class="ghost">Cancel</button>
    </div>
    <div class="tower-grid"></div>
  `;
  const grid = buildPanel.querySelector('.tower-grid');
  Object.entries(TOWERS).forEach(([kind, t]) => {
    const btn = document.createElement('button');
    const unlocked = isTowerUnlocked(kind);
    btn.className = `tower-choice ${unlocked ? '' : 'locked-tower'}`;
    btn.disabled = !unlocked || state.gold < t.cost;
    btn.style.background = `linear-gradient(145deg, ${t.dark}dd, rgba(255,255,255,.06))`;
    const unlockLabel = unlocked ? `${t.cost}g` : `🔒 Map ${towerUnlocks[kind] + 1}`;
    btn.innerHTML = `
      <span class="top"><span class="icon" style="color:${t.color}; background:${t.dark};">${t.icon}</span><span class="cost">${unlockLabel}</span></span>
      <b>${t.name}</b>
      <small>${t.role}<br>${t.note}</small>
      <span class="strategy">${unlocked ? t.strategy : 'Clear earlier maps to unlock.'}</span>
    `;
    btn.onclick = () => {
      if (!unlocked) return showToast(`${t.name} unlocks later`);
      if (state.gold < t.cost) return showToast('Not enough gold');
      state.gold -= t.cost;
      const tower = { kind, x: pad[0], y: pad[1], level: 1, cooldown: 0, ...t };
      state.towers.push(tower);
      selectedTower = tower;
      infoPanelLastKey = '';
      buildPanel.classList.add('hidden');
      state.effects.push({ type: 'ring', x: tower.x, y: tower.y, color: t.color, life: 0.36, max: 0.36, radius: 70 });
      showToast(`${t.name} tower built`);
      updateUI();
    };
    grid.appendChild(btn);
  });
  buildPanel.classList.remove('hidden');
  document.getElementById('closeBuild').onclick = () => {
    buildPanel.classList.add('hidden');
    selectedPad = null;
  };
}

function selectExistingTower(tower) {
  selectedTower = tower;
  selectedPad = [tower.x, tower.y];
  buildPanel.classList.add('hidden');
  infoPanelLastKey = '';
  renderInfoPanel(true);
}

infoPanel.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || !selectedTower) return;
  const action = button.dataset.action;
  if (action === 'upgrade') upgradeTower(selectedTower);
  if (action === 'sell') sellTower(selectedTower);
  if (action === 'close') {
    selectedTower = null;
    selectedPad = null;
    infoPanel.classList.add('hidden');
    infoPanelLastKey = '';
  }
});

canvas.addEventListener('pointerdown', event => {
  if (!state || state.gameOver) return;
  const p = canvasPoint(event);
  const tower = state.towers.find(t => Math.hypot(p.x - t.x, p.y - t.y) <= 34);
  if (tower) {
    selectExistingTower(tower);
    return;
  }
  const pad = state.map.pads.find(([x, y]) => Math.hypot(p.x - x, p.y - y) <= 36);
  if (pad) {
    const occupied = state.towers.some(t => Math.hypot(t.x - pad[0], t.y - pad[1]) < 10);
    if (occupied) {
      const existing = state.towers.find(t => Math.hypot(t.x - pad[0], t.y - pad[1]) < 10);
      selectExistingTower(existing);
    } else openBuildPanel(pad);
  } else {
    buildPanel.classList.add('hidden');
    selectedPad = null;
    selectedTower = null;
    renderInfoPanel();
  }
});

startWaveBtn.addEventListener('click', startWave);
speedBtn.addEventListener('click', () => {
  state.speed = state.speed === 1 ? 2 : 1;
  showToast(`Speed x${state.speed}`);
  updateUI();
});
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

renderMapCards();
requestAnimationFrame(loop);
