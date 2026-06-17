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
const wavePreview = document.getElementById('wavePreview');
const toast = document.getElementById('toast');
const startWaveBtn = document.getElementById('startWaveBtn');
const speedBtn = document.getElementById('speedBtn');
const pauseBtn = document.getElementById('pauseBtn');
const backBtn = document.getElementById('backBtn');
const installBtn = document.getElementById('installBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const toggleMotionBtn = document.getElementById('toggleMotionBtn');
const toggleDamageBtn = document.getElementById('toggleDamageBtn');
const resetProgressBtn = document.getElementById('resetProgressBtn');

const ui = {
  mapName: document.getElementById('mapName'),
  waveText: document.getElementById('waveText'),
  goldText: document.getElementById('goldText'),
  livesText: document.getElementById('livesText'),
  scoreText: document.getElementById('scoreText')
};

const saveKey = 'siege-forge-save-v2-1-real-veg';
const settingsKey = 'siege-forge-settings-v2-1';
const towerUnlocks = { arrow: 0, cannon: 0, frost: 1, flame: 2, storm: 3 };
let state = null;
let selectedPad = null;
let selectedTower = null;
let deferredInstallPrompt = null;
let lastTime = 0;
let toastTimer = null;
let infoPanelLastKey = '';
let settings = loadSettings();

const veggieKinds = {
  grass: { goblin: 'tomato', runner: 'carrot', brute: 'watermelon', shield: 'onion', boss: 'pumpkin' },
  desert: { goblin: 'onion', runner: 'carrot', brute: 'potato', shield: 'pumpkin', boss: 'watermelon' },
  ice: { goblin: 'pea', runner: 'onion', brute: 'melon', shield: 'cabbage', boss: 'pumpkin' },
  lava: { goblin: 'chili', runner: 'pepper', brute: 'carrot', shield: 'pumpkin', boss: 'watermelon' },
  temple: { goblin: 'potato', runner: 'garlic', brute: 'pumpkin', shield: 'onion', boss: 'watermelon' }
};

const veggieNames = {
  tomato: 'Tomato', carrot: 'Carrot', watermelon: 'Watermelon', onion: 'Onion', pumpkin: 'Pumpkin', potato: 'Potato',
  pea: 'Pea Pod', melon: 'Melon', cabbage: 'Cabbage', chili: 'Chili', pepper: 'Pepper', garlic: 'Garlic'
};

const veggieIcons = {
  tomato: '🍅', carrot: '🥕', watermelon: '🍉', onion: '🧅', pumpkin: '🎃', potato: '🥔',
  pea: '🫛', melon: '🍈', cabbage: '🥬', chili: '🌶️', pepper: '🫑', garlic: '🧄'
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

function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(saveKey)) || { best: {}, progress: { completedMaps: 0, bestWave: {}, completed: {} } };
  } catch {
    return { best: {}, progress: { completedMaps: 0, bestWave: {}, completed: {} } };
  }
}

function loadSettings() {
  try {
    return Object.assign({ reducedMotion: false, showDamage: true }, JSON.parse(localStorage.getItem(settingsKey)) || {});
  } catch {
    return { reducedMotion: false, showDamage: true };
  }
}

function saveSettings() {
  localStorage.setItem(settingsKey, JSON.stringify(settings));
}

function getProgress() {
  return loadSave().progress || { completedMaps: 0, bestWave: {}, completed: {} };
}

function isMapUnlocked(index) {
  const progress = getProgress();
  return index === 0 || (progress.completedMaps || 0) >= index;
}

function isTowerUnlocked(kind) {
  return (getProgress().completedMaps || 0) >= (towerUnlocks[kind] || 0);
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

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 1500);
}

function showMenu() {
  menu.classList.add('active');
  gameScreen.classList.remove('active');
  buildPanel.classList.add('hidden');
  infoPanel.classList.add('hidden');
  selectedTower = null;
  selectedPad = null;
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
        <div class="map-caption">${unlocked ? `${map.wavesToWin} campaign waves` : unlockText}</div>
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
    currentWaveTypes: [],
    spawnTimer: 0,
    waveActive: false,
    paused: false,
    speed: 1,
    gameOver: false,
    won: false
  };
  selectedPad = null;
  selectedTower = null;
  infoPanelLastKey = '';
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
  startWaveBtn.textContent = state.won ? '▶ Endless' : '▶ Wave';
  pauseBtn.textContent = state.paused ? '▶' : '⏸';
  speedBtn.textContent = `⏩ x${state.speed}`;
  renderWavePreview();
  renderInfoPanel();
  renderSettings();
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

function summarizeWave(types, mapId) {
  const counts = {};
  types.forEach(type => {
    const kind = veggieKinds[mapId]?.[type] || 'tomato';
    counts[kind] = (counts[kind] || 0) + 1;
  });
  return Object.entries(counts).map(([kind, count]) => ({ kind, count }));
}

function renderWavePreview() {
  if (!state) {
    wavePreview.innerHTML = '<div class="preview-head"><b>Campaign</b><span>Select a map to begin</span></div>';
    return;
  }
  const types = state.waveActive ? state.currentWaveTypes : makeWave(state.wave);
  const summary = summarizeWave(types, state.map.id);
  const title = state.waveActive ? `Wave ${state.wave} active` : `Next wave ${state.wave}`;
  const sub = state.waveActive ? `${state.spawnQueue.length} left to spawn` : `${types.length} enemies incoming`;
  wavePreview.innerHTML = `
    <div class="preview-head"><b>${title}</b><span>${sub}</span></div>
    <div class="preview-list">
      ${summary.map(item => `<span class="preview-pill">${veggieIcons[item.kind] || '🥕'} ${veggieNames[item.kind] || item.kind}<b>${item.count}</b></span>`).join('')}
    </div>
  `;
}

function getVeggieKind(mapId, type) {
  return veggieKinds[mapId]?.[type] || 'tomato';
}

function startWave() {
  if (!state || state.waveActive || state.gameOver) return;
  state.currentWaveTypes = makeWave(state.wave);
  state.spawnQueue = state.currentWaveTypes.map((type, index) => ({ type, delay: index * 0.48 }));
  state.spawnTimer = 0;
  state.waveActive = true;
  buildPanel.classList.add('hidden');
  selectedPad = null;
  if (state.wave % 5 === 0) {
    state.effects.push({ type: 'bossText', x: canvas.width / 2, y: 118, color: '#facc15', life: 1.35, max: 1.35 });
    showToast('Boss veggie wave');
  } else showToast(`Wave ${state.wave}`);
  updateUI();
}

function spawnEnemy(type) {
  const def = ENEMIES[type];
  const scale = 1 + (state.wave - 1) * 0.16 + (state.map.id === 'lava' ? 0.08 : 0);
  const useSecondPath = state.map.secondPath && Math.random() > 0.5;
  const path = useSecondPath ? state.map.secondPath : state.map.path;
  const [x, y] = path[0];
  const kind = getVeggieKind(state.map.id, type);
  state.enemies.push({
    type,
    kind,
    label: veggieNames[kind] || kind,
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
    tower.flash = settings.reducedMotion ? 0.05 : 0.12;
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
    if (settings.showDamage) state.floating.push({ x: enemy.x, y: enemy.y, text: `+${enemy.reward}`, color: '#facc15', life: 0.8, max: 0.8 });
    state.effects.push({ type: 'pop', x: enemy.x, y: enemy.y, color: enemy.color, life: 0.35, max: 0.35 });
  }
  state.enemies = state.enemies.filter(e => e.hp > 0 && !e.reached);

  if (state.lives <= 0) {
    state.gameOver = true;
    state.lives = 0;
    recordProgress();
    showToast('Game over');
  }

  if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveActive = false;
    state.gold += 35 + state.wave * 5;
    state.score += 100 + state.wave * 10;
    if (state.wave >= state.map.wavesToWin) state.won = true;
    recordProgress(state.wave);
    state.wave += 1;
    showToast(state.won ? 'Map cleared · new unlocks!' : 'Wave cleared · bonus gold');
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
    for (const e of state.enemies) if (e !== target && dist(e, target) <= def.splash) applyDamage(e, damage * 0.55, tower.kind);
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
    const chained = state.enemies.filter(e => e !== target && e.hp > 0 && dist(e, target) <= 120).slice(0, def.chain + tower.level - 1);
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
  if (settings.showDamage && final > 0 && !settings.reducedMotion) {
    state.floating.push({ x: enemy.x, y: enemy.y - 14, text: `${Math.round(final)}`, color: '#ffffff', life: 0.45, max: 0.45 });
  }
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
  ctx.beginPath(); path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  ctx.lineWidth = 50;
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(22,32,55,.96)');
  ctx.strokeStyle = grad;
  ctx.beginPath(); path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,.16)';
  ctx.beginPath(); path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
}

function drawTower(tower) {
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
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(def.icon, tower.x, tower.y + 1);
  for (let i = 0; i < tower.level; i++) {
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.arc(tower.x - 11 + i * 11, tower.y + size + 8, 3.2, 0, Math.PI * 2); ctx.fill();
  }
}

function applyStrokeFill(fill, stroke, lineWidth = 2) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.fill();
  ctx.stroke();
}

function drawLeafCluster(x, y, scale = 1, color = '#2f8f3d') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  for (const angle of [-0.9, -0.2, 0.4]) {
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -5 * scale, 4 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawVeggieBody(enemy) {
  const x = enemy.x;
  const y = enemy.y;
  const scale = enemy.type === 'boss' ? 1.28 : (enemy.type === 'brute' ? 1.08 : 0.92);
  const r = enemy.radius * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = enemy.burnUntil > 0 ? 'rgba(251,113,133,.28)' : 'rgba(0,0,0,.24)';
  ctx.shadowBlur = settings.reducedMotion ? 4 : 10;
  ctx.fillStyle = 'rgba(2,6,23,.22)';
  ctx.beginPath(); ctx.ellipse(0, r + 6, r * 0.82, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  const matteHighlight = settings.reducedMotion ? 0.08 : 0.12;
  const kind = enemy.kind;

  const stem = (sx = 0, sy = 0, w = 4, h = 10, color = '#2f7d32') => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(sx - w / 2, sy - h, w, h, 2);
    ctx.fill();
  };

  if (kind === 'tomato') {
    const g = ctx.createRadialGradient(-r * 0.32, -r * 0.4, 1, 0, 0, r * 1.25);
    g.addColorStop(0, '#e86b66'); g.addColorStop(0.55, '#d8443a'); g.addColorStop(1, '#9e1f1c');
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.88, 0, 0, Math.PI * 2); applyStrokeFill(g, '#7b1918', 2);
    ctx.strokeStyle = `rgba(255,255,255,${matteHighlight})`; ctx.lineWidth = 1.5;
    for (const gx of [-0.45, 0, 0.45]) { ctx.beginPath(); ctx.moveTo(gx * r, -r * 0.55); ctx.quadraticCurveTo(gx * r * 1.35, 0, gx * r, r * 0.55); ctx.stroke(); }
    drawLeafCluster(0, -r * 0.76, 0.8, '#2d8d38');
  } else if (kind === 'carrot') {
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#f5a544'); g.addColorStop(1, '#dd6f12');
    ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(-r * 0.46, -r * 0.75); ctx.quadraticCurveTo(0, -r * 0.98, r * 0.46, -r * 0.75); ctx.closePath(); applyStrokeFill(g, '#9a4608', 2);
    ctx.strokeStyle = `rgba(120,60,20,${0.25})`; ctx.lineWidth = 1.25;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.25, -i * 4); ctx.lineTo(r * 0.2, -i * 4 - 4); ctx.stroke(); }
    drawLeafCluster(0, -r * 0.83, 0.85, '#3ea74d');
  } else if (kind === 'onion') {
    const g = ctx.createRadialGradient(-r * 0.25, -r * 0.35, 1, 0, 0, r * 1.2);
    g.addColorStop(0, '#f9e2ca'); g.addColorStop(0.62, '#dfbd9a'); g.addColorStop(1, '#b38358');
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r * 0.95, -r * 0.52, r * 0.72, r * 0.65, 0, r); ctx.bezierCurveTo(-r * 0.72, r * 0.65, -r * 0.95, -r * 0.52, 0, -r); applyStrokeFill(g, '#8c5a31', 2);
    ctx.strokeStyle = `rgba(255,255,255,${matteHighlight})`; ctx.lineWidth = 1.3;
    for (const gx of [-0.24, 0, 0.24]) { ctx.beginPath(); ctx.moveTo(gx * r, -r * 0.7); ctx.quadraticCurveTo(gx * r * 1.35, 0, gx * r, r * 0.74); ctx.stroke(); }
    stem(0, -r * 0.95, 4, 8, '#7fb348');
    ctx.strokeStyle = '#8c5a31'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4, r); ctx.lineTo(-1, r + 6); ctx.moveTo(0, r); ctx.lineTo(0, r + 7); ctx.moveTo(4, r); ctx.lineTo(2, r + 6); ctx.stroke();
  } else if (kind === 'watermelon') {
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#67bb5b'); g.addColorStop(1, '#2d6f2d');
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.06, r * 0.9, 0, 0, Math.PI * 2); applyStrokeFill(g, '#1f4e22', 2.5);
    ctx.strokeStyle = '#3f8340'; ctx.lineWidth = 2;
    for (const gx of [-0.58, -0.24, 0.12, 0.45]) { ctx.beginPath(); ctx.moveTo(gx * r, -r * 0.74); ctx.quadraticCurveTo(gx * r * 1.15, 0, gx * r, r * 0.74); ctx.stroke(); }
  } else if (kind === 'pumpkin') {
    const g = ctx.createRadialGradient(-r * 0.22, -r * 0.3, 1, 0, 0, r * 1.22);
    g.addColorStop(0, '#ffb55a'); g.addColorStop(0.58, '#e67f20'); g.addColorStop(1, '#8d4312');
    ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); applyStrokeFill(g, '#7a370f', 2.5);
    ctx.strokeStyle = 'rgba(125,55,14,.45)'; ctx.lineWidth = 2;
    for (const gx of [-0.52, -0.2, 0.2, 0.52]) { ctx.beginPath(); ctx.moveTo(gx * r, -r * 0.75); ctx.quadraticCurveTo(gx * r * 1.2, 0, gx * r, r * 0.75); ctx.stroke(); }
    stem(0, -r * 0.78, 7, 12, '#436b1e');
  } else if (kind === 'potato') {
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, '#c39a66'); g.addColorStop(1, '#8d6845');
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.8, 0.1, 0, Math.PI * 2); applyStrokeFill(g, '#6d4c30', 2);
    ctx.fillStyle = '#6d4c30';
    for (const p of [[-6,-5],[7,-2],[-3,6],[5,7]]) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.7, 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === 'pea') {
    const g = ctx.createLinearGradient(-r, 0, r, 0);
    g.addColorStop(0, '#96d96a'); g.addColorStop(1, '#4b9832');
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(-r * 0.3, -r * 0.8, r * 0.95, -r * 0.1); ctx.quadraticCurveTo(r * 0.3, r * 0.8, -r, 0); applyStrokeFill(g, '#3f7a28', 2);
    ctx.fillStyle = '#78bf50';
    for (const px of [-0.45, -0.05, 0.34]) { ctx.beginPath(); ctx.arc(px * r, 0, r * 0.2, 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === 'melon') {
    const g = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 1, 0, 0, r * 1.15);
    g.addColorStop(0, '#d5f0b2'); g.addColorStop(0.6, '#93bb60'); g.addColorStop(1, '#698d40');
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.86, 0, 0, Math.PI * 2); applyStrokeFill(g, '#5c7d36', 2);
    ctx.strokeStyle = '#b8d796'; ctx.lineWidth = 1.6;
    for (const gx of [-0.45, -0.12, 0.22, 0.52]) { ctx.beginPath(); ctx.moveTo(gx * r, -r * 0.72); ctx.quadraticCurveTo(gx * r * 1.16, 0, gx * r, r * 0.72); ctx.stroke(); }
  } else if (kind === 'cabbage') {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 1, 0, 0, r * 1.2);
    g.addColorStop(0, '#bfe8a2'); g.addColorStop(0.68, '#77b460'); g.addColorStop(1, '#436f34');
    ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); applyStrokeFill(g, '#355a2c', 2);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (0.25 + i * 0.16), 0.7, 2.5); ctx.stroke(); }
  } else if (kind === 'garlic') {
    const g = ctx.createRadialGradient(-r * 0.28, -r * 0.35, 1, 0, 0, r * 1.1);
    g.addColorStop(0, '#fff7de'); g.addColorStop(0.75, '#d8d1b1'); g.addColorStop(1, '#aaa387');
    for (const offset of [-0.32, 0, 0.32]) {
      ctx.beginPath(); ctx.ellipse(offset * r, offset === 0 ? 0 : 3, r * 0.34, r * 0.52, 0, 0, Math.PI * 2); applyStrokeFill(g, '#8d876f', 1.5);
    }
    stem(0, -r * 0.86, 5, 11, '#c9c49e');
  } else if (kind === 'chili') {
    ctx.save();
    ctx.rotate(-0.25);
    const g = ctx.createLinearGradient(-r, -r * 0.6, r, r * 0.6);
    g.addColorStop(0, '#ef6a53'); g.addColorStop(1, '#b31e18');
    ctx.beginPath(); ctx.moveTo(-r * 0.92, -r * 0.18); ctx.quadraticCurveTo(-r * 0.2, -r * 0.85, r * 0.86, -r * 0.05); ctx.quadraticCurveTo(r * 0.4, r * 0.54, -r * 0.95, 0.18); ctx.closePath(); applyStrokeFill(g, '#7f1513', 2);
    ctx.restore();
    drawLeafCluster(-r * 0.66, -r * 0.2, 0.5, '#41782d');
  } else if (kind === 'pepper') {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.32, 1, 0, 0, r * 1.15);
    g.addColorStop(0, '#78db64'); g.addColorStop(0.58, '#429a3b'); g.addColorStop(1, '#2a6730');
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.92, -r * 0.8, r * 0.88, r * 0.48, 0, r);
    ctx.bezierCurveTo(-r * 0.88, r * 0.48, -r * 0.92, -r * 0.8, 0, -r);
    applyStrokeFill(g, '#24522a', 2);
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.quadraticCurveTo(2, 0, 0, r * 0.72); ctx.stroke();
    stem(0, -r * 0.94, 6, 9, '#2d6926');
  }

  ctx.restore();
}

function drawVeggieEnemy(enemy, now) {
  ctx.save();
  if (enemy.slowUntil > now) {
    ctx.shadowColor = '#67e8f9';
    ctx.shadowBlur = settings.reducedMotion ? 4 : 14;
  } else if (enemy.burnUntil > now) {
    ctx.shadowColor = '#fb7185';
    ctx.shadowBlur = settings.reducedMotion ? 4 : 14;
  }
  drawVeggieBody(enemy);
  ctx.restore();

  if (enemy.type === 'shield') {
    ctx.strokeStyle = 'rgba(248,250,252,.95)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius + 12, -0.95, 0.95); ctx.stroke();
  }
  if (enemy.type === 'boss') {
    ctx.fillStyle = 'rgba(2,6,23,.82)';
    ctx.beginPath(); ctx.roundRect(enemy.x - 18, enemy.y - enemy.radius - 24, 36, 18, 8); ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', enemy.x, enemy.y - enemy.radius - 11);
  }
  const hpw = enemy.type === 'boss' ? 74 : 48;
  const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
  ctx.fillStyle = 'rgba(15,23,42,.96)';
  ctx.beginPath(); ctx.roundRect(enemy.x - hpw / 2, enemy.y - enemy.radius - 18, hpw, 7, 4); ctx.fill();
  ctx.fillStyle = hpPct > .45 ? '#22c55e' : (hpPct > .2 ? '#facc15' : '#ef4444');
  ctx.beginPath(); ctx.roundRect(enemy.x - hpw / 2, enemy.y - enemy.radius - 18, hpw * hpPct, 7, 4); ctx.fill();
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
  for (let x = 0; x < canvas.width; x += 60) { ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 60) { ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
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

  for (const tower of state.towers) drawTower(tower);
  for (const enemy of state.enemies) drawVeggieEnemy(enemy, now);

  for (const p of state.projectiles) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.kind === 'storm' ? 3 : 4;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = settings.reducedMotion ? 0 : 8;
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
      const drift = settings.reducedMotion ? 0 : (1 - pct) * 18;
      ctx.fillText('BOSS VEGGIE WAVE', fx.x, fx.y - drift);
    } else if (fx.type === 'ring' || fx.type === 'pop' || fx.type === 'leak') {
      const grow = settings.reducedMotion ? 1 : (1.2 - pct);
      const r = (fx.radius || 34) * grow;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  for (const f of state.floating) {
    const pct = Math.max(0, f.life / f.max);
    ctx.globalAlpha = pct;
    ctx.fillStyle = f.color || '#facc15';
    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const rise = settings.reducedMotion ? 8 : (1 - pct) * 42;
    ctx.fillText(f.text, f.x, f.y - rise);
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
    ctx.fillText(state.gameOver ? 'Try a stronger choke point next run.' : 'Return to maps to try the next realm.', canvas.width / 2, 275);
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
  tower.flash = settings.reducedMotion ? 0.12 : 0.4;
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
    const unlocked = isTowerUnlocked(kind);
    const btn = document.createElement('button');
    btn.className = `tower-choice ${unlocked ? '' : 'locked-tower'}`;
    btn.disabled = !unlocked || state.gold < t.cost;
    btn.style.background = `linear-gradient(145deg, ${t.dark}dd, rgba(255,255,255,.06))`;
    const unlockLabel = unlocked ? `${t.cost}g` : `🔒 Map ${towerUnlocks[kind] + 1}`;
    btn.innerHTML = `
      <span class="top"><span class="icon" style="color:${t.color};">${t.icon}</span><span class="cost">${unlockLabel}</span></span>
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

function renderSettings() {
  toggleMotionBtn.innerHTML = `<span>Reduced Motion</span><b>${settings.reducedMotion ? 'On' : 'Off'}</b>`;
  toggleDamageBtn.innerHTML = `<span>Damage Numbers</span><b>${settings.showDamage ? 'On' : 'Off'}</b>`;
}

function openSettings() {
  renderSettings();
  settingsModal.classList.remove('hidden');
  settingsModal.setAttribute('aria-hidden', 'false');
}

function closeSettings() {
  settingsModal.classList.add('hidden');
  settingsModal.setAttribute('aria-hidden', 'true');
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
  if (tower) return selectExistingTower(tower);
  const pad = state.map.pads.find(([x, y]) => Math.hypot(p.x - x, p.y - y) <= 36);
  if (pad) {
    const occupied = state.towers.some(t => Math.hypot(t.x - pad[0], t.y - pad[1]) < 10);
    if (occupied) return selectExistingTower(state.towers.find(t => Math.hypot(t.x - pad[0], t.y - pad[1]) < 10));
    return openBuildPanel(pad);
  }
  buildPanel.classList.add('hidden');
  selectedPad = null;
  selectedTower = null;
  renderInfoPanel();
});

startWaveBtn.addEventListener('click', startWave);
speedBtn.addEventListener('click', () => { if (!state) return; state.speed = state.speed === 1 ? 2 : 1; showToast(`Speed x${state.speed}`); updateUI(); });
pauseBtn.addEventListener('click', () => { if (!state) return; state.paused = !state.paused; updateUI(); });
backBtn.addEventListener('click', () => { if (state) recordProgress(); showMenu(); });
settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
settingsModal.addEventListener('click', e => { if (e.target.dataset.closeModal) closeSettings(); });
toggleMotionBtn.addEventListener('click', () => { settings.reducedMotion = !settings.reducedMotion; saveSettings(); renderSettings(); });
toggleDamageBtn.addEventListener('click', () => { settings.showDamage = !settings.showDamage; saveSettings(); renderSettings(); });
resetProgressBtn.addEventListener('click', () => {
  localStorage.removeItem(saveKey);
  showToast('Progress reset');
  closeSettings();
  showMenu();
});

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
renderSettings();
requestAnimationFrame(loop);
