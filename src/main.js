import { MAPS } from '../data/maps.js';
import { TOWERS } from '../data/towers.js';
import { ENEMIES } from '../data/enemies.js';

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    this.beginPath(); this.moveTo(x + r, y); this.lineTo(x + w - r, y); this.quadraticCurveTo(x + w, y, x + w, y + r); this.lineTo(x + w, y + h - r); this.quadraticCurveTo(x + w, y + h, x + w - r, y + h); this.lineTo(x + r, y + h); this.quadraticCurveTo(x, y + h, x, y + h - r); this.lineTo(x, y + r); this.quadraticCurveTo(x, y, x + r, y); this.closePath(); return this;
  };
}

const $ = id => document.getElementById(id);
const canvas = $('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = $('menu');
const gameScreen = $('game');
const mapGrid = $('mapGrid');
const buildPanel = $('buildPanel');
const infoPanel = $('infoPanel');
const wavePreview = $('wavePreview');
const toast = $('toast');
const startWaveBtn = $('startWaveBtn');
const speedBtn = $('speedBtn');
const pauseBtn = $('pauseBtn');
const backBtn = $('backBtn');
const installBtn = $('installBtn');
const settingsBtn = $('settingsBtn');
const codexBtn = $('codexBtn');
const profileBtn = $('profileBtn');
const settingsModal = $('settingsModal');
const codexModal = $('codexModal');
const profileModal = $('profileModal');
const closeSettingsBtn = $('closeSettingsBtn');
const closeCodexBtn = $('closeCodexBtn');
const closeProfileBtn = $('closeProfileBtn');
const toggleSoundBtn = $('toggleSoundBtn');
const toggleMusicBtn = $('toggleMusicBtn');
const toggleMotionBtn = $('toggleMotionBtn');
const toggleDamageBtn = $('toggleDamageBtn');
const resetProgressBtn = $('resetProgressBtn');
const codexContent = $('codexContent');
const profileContent = $('profileContent');
const ui = { mapName: $('mapName'), waveText: $('waveText'), goldText: $('goldText'), livesText: $('livesText'), scoreText: $('scoreText') };

const settingsKey = 'siege-forge-settings-v2-2';
const saveBaseKey = 'siege-forge-save-v2-2';
let settings = loadSettings();
let state = null;
let selectedPad = null;
let selectedTower = null;
let deferredInstallPrompt = null;
let lastTime = 0;
let toastTimer = null;
let infoPanelLastKey = '';
let audio = { ctx: null, master: null, musicTimer: null, musicStep: 0 };

const veggieKinds = {
  jungle: { goblin: 'tomato', runner: 'carrot', brute: 'watermelon', shield: 'onion', boss: 'pumpkin' },
  desert: { goblin: 'onion', runner: 'carrot', brute: 'potato', shield: 'pumpkin', boss: 'watermelon' },
  lava: { goblin: 'chili', runner: 'pepper', brute: 'carrot', shield: 'pumpkin', boss: 'watermelon' }
};
const veggieNames = { tomato:'Jungle Tomato', carrot:'Runaway Carrot', watermelon:'Heavy Watermelon', onion:'Peelguard Onion', pumpkin:'Boss Pumpkin', potato:'Dune Potato', chili:'Lava Chili', pepper:'Molten Pepper' };
const veggieIcons = { tomato:'🍅', carrot:'🥕', watermelon:'🍉', onion:'🧅', pumpkin:'🎃', potato:'🥔', chili:'🌶️', pepper:'🫑' };
const mapDecor = {
  jungle: [['🌴',58,68,38,.75],['🌿',148,478,30,.65],['🦜',880,432,28,.8],['🦋',820,72,22,.8],['🍄',780,496,20,.8],['🐒',50,440,24,.78],['🌺',930,84,22,.8],['🌱',370,28,22,.8],['🐍',884,202,20,.72],['🌴',920,300,32,.68]],
  desert: [['🌵',68,72,32,.72],['🌵',900,412,30,.72],['🪨',842,62,28,.72],['🐪',110,506,26,.82],['☀️',912,98,28,.88],['🦂',782,512,20,.86],['🏺',532,42,22,.72],['🌵',696,104,28,.74],['🦎',64,282,18,.82],['🪨',276,34,20,.76]],
  lava: [['🌋',72,68,34,.76],['🔥',918,76,30,.82],['🪨',80,472,28,.76],['🦂',902,438,18,.86],['🔥',676,516,24,.82],['🐉',870,262,24,.62],['🪨',356,520,22,.78],['♨️',236,30,20,.74],['🔥',528,22,22,.7]]
};
const terrainScatter = { jungle:['rgba(74,222,128,.08)',28,42], desert:['rgba(251,191,36,.07)',24,44], lava:['rgba(251,113,133,.075)',24,46] };
const mapArtDecos = { jungle:['🌴','🦜','🌺'], desert:['🌵','🐪','☀️'], lava:['🌋','🔥','🪨'] };

function loadSettings() {
  try { return Object.assign({ slot: 1, sound: true, music: false, reducedMotion: false, showDamage: true }, JSON.parse(localStorage.getItem(settingsKey)) || {}); }
  catch { return { slot: 1, sound: true, music: false, reducedMotion: false, showDamage: true }; }
}
function saveSettings() { localStorage.setItem(settingsKey, JSON.stringify(settings)); }
function saveKey() { return `${saveBaseKey}-slot-${settings.slot || 1}`; }
function loadSave(slot = settings.slot) {
  try { return JSON.parse(localStorage.getItem(`${saveBaseKey}-slot-${slot}`)) || { best: {}, stars: {}, bestWave: {}, cleared: {} }; }
  catch { return { best: {}, stars: {}, bestWave: {}, cleared: {} }; }
}
function writeSave(save, slot = settings.slot) { localStorage.setItem(`${saveBaseKey}-slot-${slot}`, JSON.stringify(save)); }
function recordProgress(waveJustCleared = null) {
  if (!state) return;
  const save = loadSave();
  save.best ||= {}; save.stars ||= {}; save.bestWave ||= {}; save.cleared ||= {};
  if (!save.best[state.map.id] || state.score > save.best[state.map.id]) save.best[state.map.id] = state.score;
  if (waveJustCleared) save.bestWave[state.map.id] = Math.max(save.bestWave[state.map.id] || 0, waveJustCleared);
  const stars = calcRunStars(state.map, waveJustCleared || state.wave - 1, state.lives);
  save.stars[state.map.id] = Math.max(save.stars[state.map.id] || 0, stars);
  if (state.campaignCleared) save.cleared[state.map.id] = true;
  writeSave(save);
}
function calcRunStars(map, wave, lives) {
  if (wave >= map.wavesToWin && lives >= 15) return 3;
  if (wave >= map.wavesToWin) return 2;
  if (wave >= Math.ceil(map.wavesToWin / 2)) return 1;
  return 0;
}
function starText(n = 0) { return '★'.repeat(n) + '☆'.repeat(3 - n); }

function ensureAudio() {
  if (!settings.sound && !settings.music) return;
  if (!audio.ctx) {
    audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.08;
    audio.master.connect(audio.ctx.destination);
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
}
function tone(freq, duration = 0.09, type = 'sine', gain = 0.08, delay = 0) {
  if (!settings.sound || !audio.ctx) return;
  const t = audio.ctx.currentTime + delay;
  const osc = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g); g.connect(audio.master); osc.start(t); osc.stop(t + duration + 0.02);
}
function sfx(name) {
  if (!settings.sound) return;
  ensureAudio();
  const map = {
    click: [[420,.04,'sine',.04]], place: [[360,.08,'triangle',.06],[620,.08,'sine',.04,.04]], upgrade: [[520,.08,'triangle',.05],[760,.12,'sine',.05,.05]], sell: [[260,.12,'sine',.04]], wave: [[330,.08,'square',.035],[440,.10,'triangle',.05,.05]], boss: [[120,.22,'sawtooth',.06],[95,.24,'sawtooth',.04,.08]], clear: [[520,.08,'sine',.05],[660,.08,'sine',.05,.07],[880,.16,'triangle',.05,.14]], gameover: [[180,.18,'sawtooth',.04],[120,.24,'sine',.035,.12]]
  };
  (map[name] || map.click).forEach(n => tone(...n));
}
function startMusic() {
  ensureAudio();
  stopMusic();
  if (!settings.music || !audio.ctx) return;
  const notes = [196, 247, 294, 330, 294, 247];
  audio.musicTimer = setInterval(() => {
    if (!settings.music || !audio.ctx) return;
    const f = notes[audio.musicStep++ % notes.length];
    const oldSound = settings.sound; settings.sound = true;
    tone(f, 0.18, 'triangle', 0.022); tone(f * 2, 0.12, 'sine', 0.012, 0.04);
    settings.sound = oldSound;
  }, 850);
}
function stopMusic() { if (audio.musicTimer) clearInterval(audio.musicTimer); audio.musicTimer = null; }

function showToast(text) { toast.textContent = text; toast.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.add('hidden'), 1500); }
function showMenu() { menu.classList.add('active'); gameScreen.classList.remove('active'); buildPanel.classList.add('hidden'); infoPanel.classList.add('hidden'); selectedTower = null; selectedPad = null; renderMapCards(); }
function showGame() { menu.classList.remove('active'); gameScreen.classList.add('active'); }

function renderMapCards() {
  const save = loadSave();
  mapGrid.innerHTML = '';
  MAPS.forEach(map => {
    const stars = save.stars?.[map.id] || 0;
    const card = document.createElement('article');
    card.className = 'map-card';
    card.style.background = `linear-gradient(160deg, ${map.theme[1]}aa, rgba(255,255,255,.04))`;
    card.style.setProperty('--map-accent', map.theme[2]);
    const decos = mapArtDecos[map.id] || ['🗺️','🌱','⭐'];
    card.innerHTML = `
      <div>
        <div class="map-art"><span class="trail two"></span><span class="trail"></span><span class="trail three"></span><span class="deco" style="left:18px;top:12px">${decos[0]}</span><span class="deco" style="right:28px;top:18px">${decos[1]}</span><span class="deco" style="left:48%;bottom:10px">${decos[2]}</span></div>
        <div class="star-row">${starText(stars)}</div>
        <div class="map-title">${map.icon} ${map.name}</div>
        <div class="map-caption">${map.description}</div>
      </div>
      <div class="map-footer"><div class="best">Best: ${save.best?.[map.id] || 0}</div><div class="play-chip">▶ Play</div></div>`;
    card.addEventListener('click', () => { ensureAudio(); sfx('click'); startMap(map); });
    mapGrid.appendChild(card);
  });
}
function startMap(map) {
  state = { map, gold: 220, lives: 20, wave: 1, score: 0, towers: [], enemies: [], projectiles: [], effects: [], floating: [], spawnQueue: [], currentWaveTypes: [], spawnTimer: 0, waveActive: false, paused: false, speed: 1, gameOver: false, campaignCleared: false, victoryTimer: 0, victoryStars: 0, bossIntroTime: 0 };
  selectedPad = null; selectedTower = null; infoPanelLastKey = ''; ui.mapName.textContent = `${map.icon} ${map.name}`; showGame(); updateUI(); draw(0); showToast('Build on a glowing pad');
}
function updateUI() {
  if (!state) return;
  ui.waveText.textContent = state.wave; ui.goldText.textContent = Math.floor(state.gold); ui.livesText.textContent = state.lives; ui.scoreText.textContent = state.score;
  startWaveBtn.disabled = state.waveActive || state.gameOver; startWaveBtn.textContent = state.campaignCleared ? '▶ Endless' : '▶ Wave'; pauseBtn.textContent = state.paused ? '▶' : '⏸'; speedBtn.textContent = `⏩ x${state.speed}`;
  renderWavePreview(); renderInfoPanel(); renderSettings();
}
function makeWave(wave) {
  const list = []; const baseCount = 8 + Math.floor(wave * 1.55);
  for (let i = 0; i < baseCount; i++) { let type = 'goblin'; if (wave >= 3 && i % 5 === 0) type = 'runner'; if (wave >= 5 && i % 6 === 1) type = 'brute'; if (wave >= 8 && i % 7 === 2) type = 'shield'; list.push(type); }
  if (wave % 5 === 0) list.push('boss'); return list;
}
function getVeggieKind(mapId, type) { return veggieKinds[mapId]?.[type] || 'tomato'; }
function summarizeWave(types, mapId) { const counts = {}; types.forEach(type => { const kind = getVeggieKind(mapId, type); counts[kind] = (counts[kind] || 0) + 1; }); return Object.entries(counts).map(([kind,count]) => ({kind,count})); }
function renderWavePreview() {
  if (!state) { wavePreview.innerHTML = '<div class="preview-head"><b>Three Realms</b><span>Select any map to begin</span></div>'; return; }
  const types = state.waveActive ? state.currentWaveTypes : makeWave(state.wave);
  const title = state.waveActive ? `Wave ${state.wave} active` : `Next wave ${state.wave}`;
  const sub = state.waveActive ? `${state.spawnQueue.length} left to spawn` : `${types.length} enemies incoming`;
  wavePreview.innerHTML = `<div class="preview-head"><b>${title}</b><span>${sub}</span></div><div class="preview-list">${summarizeWave(types,state.map.id).map(i => `<span class="preview-pill">${veggieIcons[i.kind] || '🥕'} ${veggieNames[i.kind] || i.kind}<b>${i.count}</b></span>`).join('')}</div>`;
}
function startWave() {
  if (!state || state.waveActive || state.gameOver) return; ensureAudio();
  state.currentWaveTypes = makeWave(state.wave); state.spawnQueue = state.currentWaveTypes.map((type, index) => ({ type, delay: index * 0.46 })); state.spawnTimer = 0; state.waveActive = true; buildPanel.classList.add('hidden'); selectedPad = null;
  if (state.wave % 5 === 0) { state.bossIntroTime = 2.1; state.effects.push({ type:'bossText', x: canvas.width/2, y:118, color:'#facc15', life:1.7, max:1.7 }); sfx('boss'); showToast('Boss veggie wave'); }
  else { sfx('wave'); showToast(`Wave ${state.wave}`); }
  updateUI();
}
function spawnEnemy(type) {
  const def = ENEMIES[type]; const scale = 1 + (state.wave - 1) * 0.16 + (state.map.id === 'lava' ? 0.08 : 0); const useSecondPath = state.map.secondPath && Math.random() > 0.5; const path = useSecondPath ? state.map.secondPath : state.map.path; const [x,y] = path[0]; const kind = getVeggieKind(state.map.id, type);
  state.enemies.push({ type, kind, label: veggieNames[kind] || kind, ...def, maxHp: Math.floor(def.hp * scale), hp: Math.floor(def.hp * scale), speed: def.speed * (state.map.id === 'lava' ? 1.12 : 1), x, y, path, pathIndex: 1, slowUntil:0, slowFactor:1, burnUntil:0, burnDps:0, reached:false });
}
function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
function update(dt, now) {
  if (!state || state.paused || state.gameOver) return; dt *= state.speed;
  if (state.bossIntroTime > 0) { state.bossIntroTime = Math.max(0, state.bossIntroTime - dt); updateUI(); return; }
  if (state.victoryTimer > 0) state.victoryTimer = Math.max(0, state.victoryTimer - dt);
  state.spawnTimer += dt; while (state.spawnQueue.length && state.spawnTimer >= state.spawnQueue[0].delay) spawnEnemy(state.spawnQueue.shift().type);
  for (const enemy of state.enemies) { if (enemy.burnUntil > now) enemy.hp -= enemy.burnDps * dt; const target = enemy.path[enemy.pathIndex]; if (!target) { enemy.reached = true; state.lives -= enemy.type === 'boss' ? 3 : 1; state.effects.push({type:'leak', x:enemy.x, y:enemy.y, color:'#ef4444', life:.5, max:.5}); continue; } const speed = enemy.speed * (enemy.slowUntil > now ? enemy.slowFactor : 1); const dx = target[0]-enemy.x, dy = target[1]-enemy.y, d = Math.hypot(dx,dy); if (d < 4) enemy.pathIndex += 1; else { enemy.x += dx/d*speed*dt; enemy.y += dy/d*speed*dt; } }
  for (const tower of state.towers) { tower.cooldown -= dt; if (tower.cooldown > 0) continue; const target = state.enemies.filter(e => e.hp > 0 && !e.reached && dist(tower,e) <= tower.range).sort((a,b)=>b.pathIndex-a.pathIndex || a.hp-b.hp)[0]; if (!target) continue; fireTower(tower,target,now); tower.cooldown = tower.fireRate / tower.level; tower.flash = settings.reducedMotion ? .05 : .12; }
  for (const tower of state.towers) tower.flash = Math.max(0, (tower.flash || 0) - dt);
  for (const p of state.projectiles) { p.life -= dt; p.x += (p.tx-p.x)*Math.min(1,dt*12); p.y += (p.ty-p.y)*Math.min(1,dt*12); }
  state.projectiles = state.projectiles.filter(p => p.life > 0); state.effects = state.effects.filter(fx => (fx.life -= dt) > 0); state.floating = state.floating.filter(f => (f.life -= dt) > 0);
  const killed = state.enemies.filter(e => e.hp <= 0 && !e.reached); for (const enemy of killed) { state.gold += enemy.reward; state.score += enemy.reward + state.wave * 2; if (settings.showDamage) state.floating.push({x:enemy.x,y:enemy.y,text:`+${enemy.reward}`,color:'#facc15',life:.8,max:.8}); state.effects.push({type:'pop',x:enemy.x,y:enemy.y,color:enemy.color,life:.35,max:.35}); }
  state.enemies = state.enemies.filter(e => e.hp > 0 && !e.reached);
  if (state.lives <= 0) { state.gameOver = true; state.lives = 0; recordProgress(); sfx('gameover'); showToast('Game over'); }
  if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) { const clearedWave = state.wave; state.waveActive = false; state.gold += 35 + state.wave * 5; state.score += 100 + state.wave * 10; if (!state.campaignCleared && state.wave >= state.map.wavesToWin) { state.campaignCleared = true; state.victoryStars = calcRunStars(state.map, clearedWave, state.lives); state.victoryTimer = 4.5; sfx('clear'); } recordProgress(clearedWave); state.wave += 1; showToast(state.campaignCleared && state.victoryTimer > 0 ? `${starText(state.victoryStars)} Map cleared!` : 'Wave cleared · bonus gold'); }
  updateUI();
}
function fireTower(tower,target,now) {
  const def = TOWERS[tower.kind]; const damage = def.damage * tower.level; applyDamage(target,damage,tower.kind); state.projectiles.push({x:tower.x,y:tower.y,tx:target.x,ty:target.y,color:def.color,life:.22,kind:tower.kind});
  if (def.splash) { state.effects.push({type:'ring',x:target.x,y:target.y,color:def.color,life:.28,max:.28,radius:def.splash}); for (const e of state.enemies) if (e !== target && dist(e,target) <= def.splash) applyDamage(e,damage*.55,tower.kind); }
  if (def.slow) { target.slowFactor = def.slow; target.slowUntil = now + def.slowTime; state.effects.push({type:'ring',x:target.x,y:target.y,color:def.color,life:.22,max:.22,radius:26}); }
  if (def.burn) { target.burnDps = def.burn * tower.level; target.burnUntil = now + def.burnTime; }
  if (def.chain) state.enemies.filter(e => e !== target && e.hp > 0 && dist(e,target) <= 120).slice(0, def.chain + tower.level - 1).forEach(e => { applyDamage(e, damage*.65, tower.kind); state.projectiles.push({x:target.x,y:target.y,tx:e.x,ty:e.y,color:def.color,life:.18,kind:'storm'}); });
}
function applyDamage(enemy, amount, kind) { let final = amount; if (enemy.armor && kind === 'arrow') final *= enemy.armor; enemy.hp -= final; if (settings.showDamage && final > 0 && !settings.reducedMotion) state.floating.push({x:enemy.x,y:enemy.y-14,text:`${Math.round(final)}`,color:'#fff',life:.45,max:.45}); }

function drawMapDecoration(map) { const [fill,count,baseSize] = terrainScatter[map.id] || terrainScatter.jungle; ctx.fillStyle = fill; for(let i=0;i<count;i++){ const x=(i*137)%canvas.width, y=(i*97+43)%canvas.height, size=baseSize+(i%5)*7; ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fill(); } ctx.textAlign='center'; ctx.textBaseline='middle'; for (const [icon,x,y,size,alpha] of (mapDecor[map.id]||[])){ ctx.globalAlpha=alpha; ctx.font=`${size}px system-ui`; ctx.fillText(icon,x,y); } ctx.globalAlpha=1; }
function drawGridPath(path,color){ ctx.lineWidth=72; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='rgba(15,23,42,.78)'; ctx.beginPath(); path.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke(); ctx.lineWidth=56; const g=ctx.createLinearGradient(0,0,canvas.width,canvas.height); g.addColorStop(0,color); g.addColorStop(1,'rgba(22,32,55,.96)'); ctx.strokeStyle=g; ctx.beginPath(); path.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke(); ctx.lineWidth=2; ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.beginPath(); path.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke(); }
function drawTower(tower){ const def=TOWERS[tower.kind]; const isSelected=selectedTower===tower; if(isSelected){ctx.fillStyle=`${def.color}22`;ctx.strokeStyle=`${def.color}aa`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(tower.x,tower.y,tower.range,0,Math.PI*2);ctx.fill();ctx.stroke();} const pulse=tower.flash?tower.flash*25:0, size=21+tower.level*3+pulse; ctx.shadowColor=def.color;ctx.shadowBlur=isSelected?16:(tower.level===3?10:0);ctx.fillStyle=def.color;ctx.strokeStyle=def.dark;ctx.lineWidth=6;ctx.beginPath();ctx.arc(tower.x,tower.y,size,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='rgba(2,6,23,.92)';ctx.beginPath();ctx.arc(tower.x,tower.y,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f8fafc';ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(def.icon,tower.x,tower.y+1);for(let i=0;i<tower.level;i++){ctx.fillStyle='#facc15';ctx.beginPath();ctx.arc(tower.x-11+i*11,tower.y+size+8,3.2,0,Math.PI*2);ctx.fill();}}
function fillStroke(fill,stroke,w=2){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.fill();ctx.stroke();}
function leaf(x,y,s=1,color='#2f8f3d'){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;[-.9,-.2,.45].forEach(a=>{ctx.save();ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,-5*s,4*s,10*s,0,0,Math.PI*2);ctx.fill();ctx.restore();});ctx.restore();}
function veggieGradient(x,y,r,c1,c2,c3){const g=ctx.createRadialGradient(x-r*.3,y-r*.35,1,x,y,r*1.25);g.addColorStop(0,c1);g.addColorStop(.62,c2);g.addColorStop(1,c3);return g;}
function drawVeggieEnemy(enemy,now){ const x=enemy.x,y=enemy.y, s=enemy.type==='boss'?1.34:(enemy.type==='brute'?1.13:.94), r=enemy.radius*s, kind=enemy.kind; ctx.save(); ctx.fillStyle='rgba(2,6,23,.28)'; ctx.beginPath(); ctx.ellipse(x,y+r+7,r*.86,5,0,0,Math.PI*2); ctx.fill(); ctx.shadowColor=enemy.slowUntil>now?'#67e8f9':(enemy.burnUntil>now?'#fb7185':'rgba(0,0,0,.24)'); ctx.shadowBlur=settings.reducedMotion?4:12; ctx.translate(x,y);
  if(kind==='tomato'){ctx.beginPath();ctx.ellipse(0,0,r*.96,r*.88,0,0,Math.PI*2);fillStroke(veggieGradient(0,0,r,'#f27b70','#d94236','#8e201c'),'#741a18',2.4);ctx.strokeStyle='rgba(255,255,255,.13)';[-.45,0,.45].forEach(gx=>{ctx.beginPath();ctx.moveTo(gx*r,-r*.55);ctx.quadraticCurveTo(gx*r*1.35,0,gx*r,r*.55);ctx.stroke();});leaf(0,-r*.78,.82,'#2d8d38');}
  else if(kind==='carrot'){const g=ctx.createLinearGradient(0,-r,0,r);g.addColorStop(0,'#f5a544');g.addColorStop(1,'#db6a10');ctx.beginPath();ctx.moveTo(0,r);ctx.lineTo(-r*.46,-r*.75);ctx.quadraticCurveTo(0,-r*.98,r*.46,-r*.75);ctx.closePath();fillStroke(g,'#8d3f08',2.2);ctx.strokeStyle='rgba(92,42,10,.32)';[-1,0,1].forEach(i=>{ctx.beginPath();ctx.moveTo(-r*.24,i*5);ctx.lineTo(r*.22,i*5-4);ctx.stroke();});leaf(0,-r*.85,.88,'#3ea74d');}
  else if(kind==='onion'){ctx.beginPath();ctx.moveTo(0,-r);ctx.bezierCurveTo(r*.95,-r*.52,r*.72,r*.65,0,r);ctx.bezierCurveTo(-r*.72,r*.65,-r*.95,-r*.52,0,-r);fillStroke(veggieGradient(0,0,r,'#f9e2ca','#dfbd9a','#a97850'),'#81502c',2.3);ctx.strokeStyle='rgba(255,255,255,.13)';[-.25,0,.25].forEach(gx=>{ctx.beginPath();ctx.moveTo(gx*r,-r*.7);ctx.quadraticCurveTo(gx*r*1.35,0,gx*r,r*.74);ctx.stroke();});}
  else if(kind==='watermelon'){ctx.beginPath();ctx.ellipse(0,0,r*1.08,r*.9,0,0,Math.PI*2);const g=ctx.createLinearGradient(0,-r,0,r);g.addColorStop(0,'#6fbf5c');g.addColorStop(1,'#2b6a2c');fillStroke(g,'#1e4b22',2.8);ctx.strokeStyle='#3d843f';ctx.lineWidth=2;[-.58,-.24,.12,.45].forEach(gx=>{ctx.beginPath();ctx.moveTo(gx*r,-r*.74);ctx.quadraticCurveTo(gx*r*1.15,0,gx*r,r*.74);ctx.stroke();});}
  else if(kind==='pumpkin'){ctx.beginPath();ctx.arc(0,0,r*.94,0,Math.PI*2);fillStroke(veggieGradient(0,0,r,'#ffb55a','#e67f20','#884010'),'#74360f',2.8);ctx.strokeStyle='rgba(110,48,13,.48)';ctx.lineWidth=2;[-.52,-.2,.2,.52].forEach(gx=>{ctx.beginPath();ctx.moveTo(gx*r,-r*.75);ctx.quadraticCurveTo(gx*r*1.2,0,gx*r,r*.75);ctx.stroke();});ctx.fillStyle='#42691e';ctx.beginPath();ctx.roundRect(-3,-r*.96,7,13,2);ctx.fill();}
  else if(kind==='potato'){ctx.beginPath();ctx.ellipse(0,0,r,r*.8,.1,0,Math.PI*2);fillStroke(veggieGradient(0,0,r,'#caa06e','#9c744e','#6d4c30'),'#5d412a',2.2);ctx.fillStyle='#5d412a';[[-6,-5],[7,-2],[-3,6],[5,7]].forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],1.8,0,Math.PI*2);ctx.fill();});}
  else if(kind==='chili'){ctx.rotate(-.25);const g=ctx.createLinearGradient(-r,-r*.6,r,r*.6);g.addColorStop(0,'#ef6a53');g.addColorStop(1,'#a91817');ctx.beginPath();ctx.moveTo(-r*.92,-r*.18);ctx.quadraticCurveTo(-r*.2,-r*.85,r*.86,-r*.05);ctx.quadraticCurveTo(r*.4,r*.54,-r*.95,.18);ctx.closePath();fillStroke(g,'#6f1110',2.2);ctx.rotate(.25);leaf(-r*.66,-r*.2,.5,'#41782d');}
  else if(kind==='pepper'){ctx.beginPath();ctx.moveTo(0,-r);ctx.bezierCurveTo(r*.92,-r*.8,r*.88,r*.48,0,r);ctx.bezierCurveTo(-r*.88,r*.48,-r*.92,-r*.8,0,-r);fillStroke(veggieGradient(0,0,r,'#78db64','#429a3b','#255c2a'),'#214d27',2.3);ctx.fillStyle='#2d6926';ctx.beginPath();ctx.roundRect(-3,-r*.98,6,10,2);ctx.fill();}
  ctx.shadowBlur=0; if(enemy.type==='shield'){ctx.strokeStyle='rgba(248,250,252,.95)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r+8,-.95,.95);ctx.stroke();} if(enemy.type==='boss'){ctx.fillStyle='rgba(2,6,23,.82)';ctx.beginPath();ctx.roundRect(-20,-r-25,40,18,8);ctx.fill();ctx.fillStyle='#fef08a';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('BOSS',0,-r-16);} ctx.restore(); const hpw=enemy.type==='boss'?76:50,hpPct=Math.max(0,enemy.hp/enemy.maxHp);ctx.fillStyle='rgba(15,23,42,.96)';ctx.beginPath();ctx.roundRect(x-hpw/2,y-r-18,hpw,7,4);ctx.fill();ctx.fillStyle=hpPct>.45?'#22c55e':(hpPct>.2?'#facc15':'#ef4444');ctx.beginPath();ctx.roundRect(x-hpw/2,y-r-18,hpw*hpPct,7,4);ctx.fill(); }
function draw(now){ if(!state)return; const [bg,pathColor]=state.map.theme; ctx.clearRect(0,0,canvas.width,canvas.height); const gradient=ctx.createLinearGradient(0,0,canvas.width,canvas.height); gradient.addColorStop(0,bg);gradient.addColorStop(1,'#020617');ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height); for(let x=0;x<canvas.width;x+=60){ctx.strokeStyle='rgba(255,255,255,.035)';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();} for(let y=0;y<canvas.height;y+=60){ctx.strokeStyle='rgba(255,255,255,.035)';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();} drawMapDecoration(state.map); drawGridPath(state.map.path,pathColor); if(state.map.secondPath)drawGridPath(state.map.secondPath,pathColor); for(const [x,y] of state.map.pads){const occupied=state.towers.some(t=>Math.hypot(t.x-x,t.y-y)<10), isSelected=selectedPad&&selectedPad[0]===x&&selectedPad[1]===y;ctx.fillStyle=occupied?'rgba(255,255,255,.10)':'rgba(34,197,94,.32)';ctx.strokeStyle=isSelected?'#facc15':(occupied?'rgba(255,255,255,.24)':'rgba(187,247,208,.70)');ctx.lineWidth=isSelected?4:2.5;ctx.beginPath();ctx.roundRect(x-25,y-25,50,50,14);ctx.fill();ctx.stroke();if(!occupied){ctx.fillStyle='rgba(255,255,255,.35)';ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('+',x,y+1);}} for(const tower of state.towers)drawTower(tower); for(const enemy of state.enemies)drawVeggieEnemy(enemy,now); for(const p of state.projectiles){ctx.strokeStyle=p.color;ctx.lineWidth=p.kind==='storm'?3:4;ctx.shadowColor=p.color;ctx.shadowBlur=settings.reducedMotion?0:8;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.tx,p.ty);ctx.stroke();ctx.shadowBlur=0;} for(const fx of state.effects){const pct=Math.max(0,fx.life/fx.max);ctx.globalAlpha=pct;ctx.strokeStyle=fx.color;ctx.lineWidth=4;if(fx.type==='bossText'){ctx.fillStyle=fx.color;ctx.font='bold 40px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BOSS VEGGIE WAVE',fx.x,fx.y-(settings.reducedMotion?0:(1-pct)*18));}else{const r=(fx.radius||34)*(settings.reducedMotion?1:(1.2-pct));ctx.beginPath();ctx.arc(fx.x,fx.y,r,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;} for(const f of state.floating){const pct=Math.max(0,f.life/f.max);ctx.globalAlpha=pct;ctx.fillStyle=f.color||'#facc15';ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(f.text,f.x,f.y-(settings.reducedMotion?8:(1-pct)*42));ctx.globalAlpha=1;} if(state.bossIntroTime>0){ctx.fillStyle='rgba(2,6,23,.62)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#facc15';ctx.textAlign='center';ctx.font='bold 46px system-ui';ctx.fillText('BOSS VEGGIE',canvas.width/2,230);ctx.fillStyle='#f8fafc';ctx.font='24px system-ui';ctx.fillText('Prepare your strongest choke point',canvas.width/2,270);} if(state.paused){ctx.fillStyle='rgba(2,6,23,.52)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#f8fafc';ctx.textAlign='center';ctx.font='bold 44px system-ui';ctx.fillText('Paused',canvas.width/2,canvas.height/2);} if(state.victoryTimer>0){ctx.fillStyle='rgba(2,6,23,.70)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#facc15';ctx.textAlign='center';ctx.font='bold 56px system-ui';ctx.fillText(starText(state.victoryStars),canvas.width/2,205);ctx.fillStyle='#f8fafc';ctx.font='bold 46px system-ui';ctx.fillText('Map Cleared!',canvas.width/2,255);ctx.font='22px system-ui';ctx.fillText('Keep going for endless score or return to maps.',canvas.width/2,294);} if(state.gameOver){ctx.fillStyle='rgba(2,6,23,.72)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#f8fafc';ctx.textAlign='center';ctx.font='bold 48px system-ui';ctx.fillText('Game Over',canvas.width/2,240);ctx.font='24px system-ui';ctx.fillText('Try a stronger choke point next run.',canvas.width/2,282);} }
function loop(time){const now=time/1000, dt=Math.min(.033, now-lastTime||0);lastTime=now;update(dt,now);draw(now);requestAnimationFrame(loop);} function canvasPoint(event){const rect=canvas.getBoundingClientRect(), touch=event.touches?.[0]||event.changedTouches?.[0]||event;return{x:(touch.clientX-rect.left)*(canvas.width/rect.width),y:(touch.clientY-rect.top)*(canvas.height/rect.height)};} function formatFireRate(rate,level=1){return `${(1/(rate/level)).toFixed(1)}/s`;}
function renderInfoPanel(force=false){ if(!state||!selectedTower){infoPanel.classList.add('hidden');infoPanelLastKey='';return;} const tower=selectedTower, def=TOWERS[tower.kind], upgradeCost=Math.floor(def.cost*.45+35*tower.level), sellValue=Math.floor(def.cost*.55*tower.level), maxed=tower.level>=3, canUpgrade=!maxed&&state.gold>=upgradeCost, key=`${tower.kind}-${tower.level}-${Math.floor(state.gold)}-${tower.x}-${tower.y}`; if(!force&&infoPanelLastKey===key)return; infoPanelLastKey=key; infoPanel.innerHTML=`<div class="info-title"><div class="tower-icon" style="background:${def.dark};color:${def.color};">${def.icon}</div><div><h3>${def.name} Tower · Lv ${tower.level}</h3><p>${def.role} · ${def.note}</p></div></div><div class="stat-grid"><div class="mini-stat"><span>Damage</span><b>${Math.round(def.damage*tower.level)}</b></div><div class="mini-stat"><span>Range</span><b>${tower.range}</b></div><div class="mini-stat"><span>Rate</span><b>${formatFireRate(tower.fireRate,tower.level)}</b></div><div class="mini-stat"><span>Upgrade</span><b>${maxed?'Max':upgradeCost+'g'}</b></div><div class="mini-stat"><span>Sell</span><b>+${sellValue}g</b></div><div class="mini-stat"><span>Gold</span><b>${Math.floor(state.gold)}g</b></div></div><div class="panel-actions"><button data-action="upgrade" ${canUpgrade?'':'disabled'}>${maxed?'Max Level':`Upgrade · ${upgradeCost}g`}</button><button data-action="sell" class="ghost">Sell · +${sellValue}g</button><button data-action="close" class="ghost">Close</button></div>`; infoPanel.classList.remove('hidden'); }
function upgradeTower(tower){const def=TOWERS[tower.kind], cost=Math.floor(def.cost*.45+35*tower.level); if(tower.level>=3)return showToast('Tower already maxed'); if(state.gold<cost)return showToast('Not enough gold'); ensureAudio(); sfx('upgrade'); state.gold-=cost;tower.level+=1;tower.range+=10;tower.flash=settings.reducedMotion?.12:.4;state.effects.push({type:'ring',x:tower.x,y:tower.y,color:def.color,life:.45,max:.45,radius:tower.range});showToast(`${def.name} upgraded to level ${tower.level}`);infoPanelLastKey='';updateUI();}
function sellTower(tower){const def=TOWERS[tower.kind], val=Math.floor(def.cost*.55*tower.level); ensureAudio(); sfx('sell'); state.gold+=val;state.towers=state.towers.filter(t=>t!==tower);selectedTower=null;selectedPad=null;buildPanel.classList.add('hidden');infoPanel.classList.add('hidden');showToast(`${def.name} sold`);updateUI();}
function openBuildPanel(pad){selectedPad=pad;selectedTower=null;infoPanel.classList.add('hidden');buildPanel.innerHTML=`<div class="build-heading"><div><b>Choose Tower</b><br><span>Gold available: ${Math.floor(state.gold)}</span></div><button id="closeBuild" class="ghost">Cancel</button></div><div class="tower-grid"></div>`;const grid=buildPanel.querySelector('.tower-grid');Object.entries(TOWERS).forEach(([kind,t])=>{const btn=document.createElement('button');btn.className='tower-choice';btn.disabled=state.gold<t.cost;btn.style.background=`linear-gradient(145deg, ${t.dark}dd, rgba(255,255,255,.06))`;btn.innerHTML=`<span class="top"><span class="icon" style="color:${t.color};">${t.icon}</span><span class="cost">${t.cost}g</span></span><b>${t.name}</b><small>${t.role}<br>${t.note}</small><span class="strategy">${t.strategy}</span>`;btn.onclick=()=>{if(state.gold<t.cost)return showToast('Not enough gold');ensureAudio();sfx('place');state.gold-=t.cost;const tower={kind,x:pad[0],y:pad[1],level:1,cooldown:0,...t};state.towers.push(tower);selectedTower=tower;infoPanelLastKey='';buildPanel.classList.add('hidden');state.effects.push({type:'ring',x:tower.x,y:tower.y,color:t.color,life:.36,max:.36,radius:70});showToast(`${t.name} tower built`);updateUI();};grid.appendChild(btn);});buildPanel.classList.remove('hidden');$('closeBuild').onclick=()=>{buildPanel.classList.add('hidden');selectedPad=null;};}
function selectExistingTower(tower){selectedTower=tower;selectedPad=[tower.x,tower.y];buildPanel.classList.add('hidden');infoPanelLastKey='';renderInfoPanel(true);}
function renderSettings(){toggleSoundBtn.innerHTML=`<span>Sound Effects</span><b>${settings.sound?'On':'Off'}</b>`;toggleMusicBtn.innerHTML=`<span>Music Loop</span><b>${settings.music?'On':'Off'}</b>`;toggleMotionBtn.innerHTML=`<span>Reduced Motion</span><b>${settings.reducedMotion?'On':'Off'}</b>`;toggleDamageBtn.innerHTML=`<span>Damage Numbers</span><b>${settings.showDamage?'On':'Off'}</b>`;}
function openSettings(){renderSettings();settingsModal.classList.remove('hidden');settingsModal.setAttribute('aria-hidden','false');}
function closeSettings(){settingsModal.classList.add('hidden');settingsModal.setAttribute('aria-hidden','true');}
function renderCodex(){const towerCards=Object.entries(TOWERS).map(([k,t])=>`<div class="codex-card"><div class="codex-icon">${t.icon}</div><h3>${t.name} Tower</h3><p>${t.role}. ${t.strategy}<br>Cost ${t.cost} · Damage ${t.damage} · Range ${t.range}</p></div>`).join('');const veggieSet=[...new Set(Object.values(veggieKinds).flatMap(v=>Object.values(v)))];const vegCards=veggieSet.map(k=>`<div class="codex-card"><div class="codex-icon">${veggieIcons[k]||'🥕'}</div><h3>${veggieNames[k]||k}</h3><p>Map-specific veggie unit rendered as a matte canvas sprite with custom outlines, shadows, and trail movement.</p></div>`).join('');codexContent.innerHTML=towerCards+vegCards;}
function openCodex(){renderCodex();codexModal.classList.remove('hidden');codexModal.setAttribute('aria-hidden','false');}
function closeCodex(){codexModal.classList.add('hidden');codexModal.setAttribute('aria-hidden','true');}
function renderProfile(){const save=loadSave();profileContent.innerHTML=`<div class="profile-slots">${[1,2,3].map(n=>`<button class="slot-btn ghost ${settings.slot===n?'active':''}" data-slot="${n}">Slot ${n}</button>`).join('')}</div><div class="profile-grid">${MAPS.map(m=>`<div class="profile-card"><h3>${m.icon} ${m.name}</h3><p>Stars: <span class="star-row">${starText(save.stars?.[m.id]||0)}</span><br>Best Score: ${save.best?.[m.id]||0}<br>Best Wave: ${save.bestWave?.[m.id]||0}</p></div>`).join('')}</div>`;profileContent.querySelectorAll('[data-slot]').forEach(btn=>btn.onclick=()=>{settings.slot=Number(btn.dataset.slot);saveSettings();renderProfile();renderMapCards();showToast(`Profile slot ${settings.slot}`);});}
function openProfile(){renderProfile();profileModal.classList.remove('hidden');profileModal.setAttribute('aria-hidden','false');}
function closeProfile(){profileModal.classList.add('hidden');profileModal.setAttribute('aria-hidden','true');}
infoPanel.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||!selectedTower)return; if(b.dataset.action==='upgrade')upgradeTower(selectedTower); if(b.dataset.action==='sell')sellTower(selectedTower); if(b.dataset.action==='close'){selectedTower=null;selectedPad=null;infoPanel.classList.add('hidden');infoPanelLastKey='';}});
canvas.addEventListener('pointerdown',event=>{if(!state||state.gameOver)return;const p=canvasPoint(event);const tower=state.towers.find(t=>Math.hypot(p.x-t.x,p.y-t.y)<=34);if(tower)return selectExistingTower(tower);const pad=state.map.pads.find(([x,y])=>Math.hypot(p.x-x,p.y-y)<=36);if(pad){const occupied=state.towers.some(t=>Math.hypot(t.x-pad[0],t.y-pad[1])<10);if(occupied)return selectExistingTower(state.towers.find(t=>Math.hypot(t.x-pad[0],t.y-pad[1])<10));return openBuildPanel(pad);}buildPanel.classList.add('hidden');selectedPad=null;selectedTower=null;renderInfoPanel();});
startWaveBtn.addEventListener('click',startWave);speedBtn.addEventListener('click',()=>{if(!state)return;state.speed=state.speed===1?2:1;showToast(`Speed x${state.speed}`);updateUI();});pauseBtn.addEventListener('click',()=>{if(!state)return;state.paused=!state.paused;updateUI();});backBtn.addEventListener('click',()=>{if(state)recordProgress();showMenu();});settingsBtn.addEventListener('click',openSettings);codexBtn.addEventListener('click',openCodex);profileBtn.addEventListener('click',openProfile);closeSettingsBtn.addEventListener('click',closeSettings);closeCodexBtn.addEventListener('click',closeCodex);closeProfileBtn.addEventListener('click',closeProfile);settingsModal.addEventListener('click',e=>{if(e.target.dataset.closeModal)closeSettings();});codexModal.addEventListener('click',e=>{if(e.target.dataset.closeCodex)closeCodex();});profileModal.addEventListener('click',e=>{if(e.target.dataset.closeProfile)closeProfile();});toggleSoundBtn.addEventListener('click',()=>{settings.sound=!settings.sound;saveSettings();renderSettings();if(settings.sound)sfx('click');});toggleMusicBtn.addEventListener('click',()=>{settings.music=!settings.music;saveSettings();renderSettings();if(settings.music){ensureAudio();startMusic();}else stopMusic();});toggleMotionBtn.addEventListener('click',()=>{settings.reducedMotion=!settings.reducedMotion;saveSettings();renderSettings();});toggleDamageBtn.addEventListener('click',()=>{settings.showDamage=!settings.showDamage;saveSettings();renderSettings();});resetProgressBtn.addEventListener('click',()=>{localStorage.removeItem(saveKey());showToast(`Slot ${settings.slot} reset`);closeSettings();showMenu();});window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;installBtn.classList.remove('hidden');});installBtn.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();deferredInstallPrompt=null;installBtn.classList.add('hidden');});if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js'));
renderMapCards(); renderSettings(); requestAnimationFrame(loop);
