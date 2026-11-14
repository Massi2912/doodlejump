/* =====================================================================
   DOODLE JUMP – ein Doodle-Jump-Klon, komplett per Canvas gezeichnet
   Aufbau:
     1. Konstanten      (hier kannst du das Spiel leichter/schwerer machen)
     2. Hilfsfunktionen
     3. Zustand & Setup
     4. Sound (Web Audio)
     5. Eingabe
     6. Spawn   (Plattformen, Power-Ups, Gegner)
     7. Update  (Physik, Kamera, Partikel)
     8. Collision
     9. Draw
    10. Spielablauf & Hauptschleife
   Skins: Liste in Abschnitt 1 (SKINS), Zeichnen in 9, Menü & Freischalten in 3/10.
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   1. KONSTANTEN
   --------------------------------------------------------------------- */

// Spielfeld (logische Pixel, wird aufs Fenster skaliert)
const W = 400;
let H = 600;                     // wird je nach Bildschirmformat angepasst (600–820)
const H_MIN = 600, H_MAX = 820;

// Physik (Pixel pro Sekunde)
const GRAVITY          = 1500;   // höher = Figur fällt schneller
const JUMP_VELOCITY    = -640;   // normaler Sprung (negativ = nach oben)
const SPRING_VELOCITY  = -1050;  // Feder-Sprung
const PROPELLER_SPEED  = 480;    // Fluggeschwindigkeit mit Propeller-Hut
const PROPELLER_TIME   = 2.5;    // Flugdauer in Sekunden
const MAX_FALL_SPEED   = 900;
const MAX_DT           = 1 / 30; // Delta-Time-Deckel (verhindert Sprünge nach Tab-Wechsel)

// Steuerung
const MOVE_SPEED       = 340;    // Seitwärts-Tempo
const MOVE_SMOOTHING   = 14;     // Trägheit der Seitwärtsbewegung

// Figur, Plattformen, Kamera
const PLAYER_W = 36;
const PLAYER_H = 40;
const PLATFORM_W = 62;
const PLATFORM_H = 14;
const START_FEET = 540;          // Höhe der Start-Plattform (Welt-Y)
const CAMERA_LINE = 0.4;         // Figur bleibt bei 40 % der Bildhöhe
const SPAWN_AHEAD = 250;         // so weit über dem Bild werden Plattformen erzeugt
const SCORE_PER_PIXEL = 0.25;    // 4 Pixel Höhe = 1 Punkt

// Schwierigkeit: alles wird linear von START- auf END-Wert gesteigert,
// sobald die Höhe DIFFICULTY_RANGE (in Pixeln) erreicht ist.
const DIFFICULTY_RANGE = 28000;
const EASY_ZONE = 400;           // die ersten Pixel: nur normale Plattformen
const GAP_MIN_START = 40,  GAP_MIN_END = 82;   // Abstand zwischen Plattformen (Pixel)
const GAP_MAX_START = 58,  GAP_MAX_END = 116;
const MAX_JUMP_HEIGHT = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);
const MAX_SAFE_GAP = MAX_JUMP_HEIGHT * 0.85;   // Lücken sind IMMER kleiner als die Sprunghöhe
const MAX_DX = 170;                            // max. seitlicher Versatz zur vorigen Plattform
const MOVING_CHANCE_START = 0, MOVING_CHANCE_END = 0.4;
const MOVING_SPEED_START = 40,    MOVING_SPEED_END = 120;
const BREAKABLE_CHANCE_START = 0, BREAKABLE_CHANCE_END = 0.4;

// Power-Ups (Wahrscheinlichkeit pro Plattform)
const SPRING_CHANCE = 0.06;
const PROPELLER_CHANCE = 0.015;
const PROPELLER_COOLDOWN_PX = 3000;  // Mindestabstand zwischen zwei Hüten

// Gegner
const ENEMY_START_SCORE = 1200;
const ENEMY_CHANCE_START = 0.03, ENEMY_CHANCE_END = 0.16;
const ENEMY_W = 40, ENEMY_H = 34;

// Neue Power-Ups
const JETPACK_CHANCE     = 0.004;
const JETPACK_SPEED      = 600;
const JETPACK_TIME       = 2.8;
const JETPACK_MIN_HEIGHT = 900;   // erst ab dieser Höhe (Pixel) möglich
const SHIELD_CHANCE      = 0.005;
const SHIELD_TIME        = 10;    // Sekunden, falls vorher kein Treffer abgefangen wird
const INVULN_TIME        = 1.0;   // kurze Unverwundbarkeit nach einem abgefangenen Treffer

// Neue Gegner
const INKER_START_SCORE  = 2500;      // Tintenwerfer
const CHASER_START_SCORE = Infinity;  // Verfolger
const INKER_W = 40, INKER_H = 36;
const CHASER_W = 38, CHASER_H = 34;
const INK_SPEED = 200;             // Tempo des Kleckses (Pixel/Sekunde)
const INKER_CD_MIN = 1.1, INKER_CD_MAX = 1.9;   // Sekunden zwischen zwei Schüssen (zählt nur, wenn sichtbar)

// Boss (alle BOSS_EVERY_SCORE Punkte)
const BOSS_EVERY_SCORE = Infinity;   // Boss noch nicht fertig
const BOSS_W = 96, BOSS_H = 80;
const BOSS_MIN_X = 70, BOSS_MAX_X = W - 70 - BOSS_W;
const BOSS_BONUS = 500;

// Optik
const GRID = 25;                 // Kästchengrösse des Schulhefts
const MARGIN_X = 52;             // roter Rand

// Skins: Alle Punkte aus allen Runden werden zusammengezählt (bleibt im Browser gespeichert).
// 'cost' = Gesamtpunkte, ab denen der Skin freigeschaltet ist. Hier kannst du die Preise
// ändern oder neue Skins ergänzen.   top: 'leaves' | 'ears' | 'antenna' | 'bow' | 'crown'
// plat = Plattform-Farben [Füllung, Rand]; move = bewegliche Plattformen (optional, sonst blau)
const SKINS = [
  { id: 'kritzel', plat: ['#7ed957', '#3f8f2f'], name: 'Kritzel', cost: 0, top: 'leaves',
    body: ['#c9f78f', '#79c93e'], out: '#2f6b1f', feet: '#6cba34', arm: '#a6e86b',
    belly: 'rgba(255,255,225,0.55)', spot: 'rgba(70,140,30,0.35)', acc: '#58b82b', acc2: '#58b82b' },
  { id: 'blaubeere', plat: ['#6fb7ff', '#2b6cb0'], move: ['#7ed957', '#3f8f2f'], name: 'Blaubeere', cost: 1000, top: 'leaves',
    body: ['#a9d4ff', '#4d8fe0'], out: '#1f3f7a', feet: '#3f7fd0', arm: '#8fc2ff',
    belly: 'rgba(235,245,255,0.6)', spot: 'rgba(30,70,150,0.3)', acc: '#58b82b', acc2: '#58b82b' },
  { id: 'kater', plat: ['#ffb866', '#c2701a'], name: 'Kater Karl', cost: 3000, top: 'ears',
    body: ['#ffd9a0', '#f0933a'], out: '#8a4a12', feet: '#e08a30', arm: '#ffc27a',
    belly: 'rgba(255,248,225,0.7)', spot: 'rgba(170,90,20,0.3)', acc: '#f0933a', acc2: '#ffb3c1' },
  { id: 'zuckerwatte', plat: ['#ff9ccb', '#c2407f'], name: 'Zuckerwatte', cost: 6000, top: 'bow',
    body: ['#ffd0e6', '#f06fa8'], out: '#8c2a5b', feet: '#e0568f', arm: '#ffb0d3',
    belly: 'rgba(255,245,250,0.7)', spot: 'rgba(170,40,100,0.28)', acc: '#7c5cff', acc2: '#ffd23f' },
  { id: 'robo', plat: ['#b9c4d0', '#5b6878'], name: 'Robo-Bot', cost: 12000, top: 'antenna',
    body: ['#e3e9f0', '#8e9bab'], out: '#39434f', feet: '#7a8797', arm: '#c3ccd6',
    belly: 'rgba(100,200,255,0.55)', spot: 'rgba(40,50,60,0.3)', acc: '#ff5a5f', acc2: '#4a5568' },
  { id: 'koenig', plat: ['#ffd84d', '#b8860b'], name: 'Königlich', cost: 25000, top: 'crown',
    body: ['#fff0a8', '#e8b820'], out: '#8a6208', feet: '#d9a516', arm: '#ffe27a',
    belly: 'rgba(255,252,225,0.7)', spot: 'rgba(170,120,10,0.3)', acc: '#ffd23f', acc2: '#e74c3c' },
  // Nur im Shop mit Münzen kaufbar (cost: Infinity = nicht über Punkte freischaltbar)
  { id: 'geist', plat: ['#e8eef7', '#8a97ab'], name: 'Gespenst', cost: Infinity, top: 'curl',
    body: ['#ffffff', '#cfd8e8'], out: '#5b6b86', feet: '#e2e8f2', arm: '#f1f5fb',
    belly: 'rgba(200,215,240,0.5)', spot: 'rgba(120,140,180,0.3)', acc: '#cfd8e8', acc2: '#cfd8e8' },
  { id: 'hase', plat: ['#e9c9a0', '#8a6a45'], name: 'Hase', cost: Infinity, top: 'bunny',
    body: ['#f7ead9', '#d1ab84'], out: '#6b4a2f', feet: '#c49a70', arm: '#e8cba8',
    belly: 'rgba(255,255,250,0.75)', spot: 'rgba(120,80,40,0.28)', acc: '#e8cba8', acc2: '#ffb3c1' },
  { id: 'ninja', plat: ['#5a6578', '#1a202c'], name: 'Ninja', cost: Infinity, top: 'headband',
    body: ['#4a5568', '#1f2430'], out: '#0d1117', feet: '#2d3748', arm: '#4a5568',
    belly: 'rgba(120,130,150,0.35)', spot: 'rgba(255,255,255,0.15)', acc: '#e53e3e', acc2: '#e53e3e' },
  { id: 'alien', plat: ['#b794f4', '#6b46c1'], name: 'Alien', cost: Infinity, top: 'antennas',
    body: ['#e9d8fd', '#9f7aea'], out: '#44337a', feet: '#805ad5', arm: '#d6bcfa',
    belly: 'rgba(250,245,255,0.6)', spot: 'rgba(90,60,160,0.3)', acc: '#68d391', acc2: '#68d391' },
  { id: 'zauberer', plat: ['#7f9cf5', '#3c366b'], name: 'Zauberer', cost: Infinity, top: 'wizard',
    body: ['#c3dafe', '#667eea'], out: '#2c2a6b', feet: '#5a67d8', arm: '#a3bffa',
    belly: 'rgba(235,242,255,0.6)', spot: 'rgba(60,60,150,0.3)', acc: '#434190', acc2: '#ffd23f' },
  { id: 'drache', plat: ['#fc8181', '#9b2c2c'], name: 'Drache', cost: Infinity, top: 'horns',
    body: ['#feb2b2', '#e53e3e'], out: '#742a2a', feet: '#c53030', arm: '#fc8181',
    belly: 'rgba(255,245,200,0.7)', spot: 'rgba(120,20,20,0.3)', acc: '#fefcbf', acc2: '#fefcbf' }
];

// Münzen (Währung für den Shop)
const START_COINS = 0;           // Test-Münzen beim Laden (0 = normal starten)
const COIN_CHANCE     = 0.16;    // Wahrscheinlichkeit pro Plattform (nie bei Monstern/Power-Ups)
const COIN_MIN_HEIGHT = 150;     // erst ab dieser Höhe (Pixel)
const COIN_PICKUP     = 24;      // Einsammel-Radius
const MAGNET_RANGE    = 85;      // Fähigkeit "Münzmagnet"
const MAGNET_SPEED    = 420;

// Shop-Fähigkeiten: pro Spiel kann eine ausgerüstet werden (bewusst nicht zu stark)
const ABILITIES = [
  { id: 'glueck',  name: 'Glückspilz',      cost: 25,  desc: 'Doppelt so viele Münzen' },
  { id: 'magnet',  name: 'Münzmagnet',      cost: 50,  desc: 'Zieht Münzen in der Nähe an' },
  { id: 'fuesse',  name: 'Grosse Füsse',    cost: 75,  desc: 'Etwas grössere Füsse' },
  { id: 'schild',  name: 'Startschild',     cost: 100, desc: 'Schild bis zum 1. Treffer' },
  { id: 'schub',   name: 'Startschub',      cost: 150, desc: 'Propeller-Flug für 6 Sek.' },
  { id: 'netz',    name: 'Sicherheitsnetz', cost: 200, desc: 'Rettet 1× vor Sturz/Treffer' }
];
const START_PROP_TIME   = 6;

// Preise der Shop-Skins (nur diese Skins gibt es im Shop; die anderen schaltest du über Punkte frei)
const SKIN_COIN_PRICE = { geist: 20, hase: 30, ninja: 45, alien: 60, zauberer: 80, drache: 100 };

// Papierarten (Shop). style: 'grid' | 'lines' | 'dots' | 'mm'
const PAPERS = [
  { id: 'kariert',    name: 'Kariert',    cost: 0,   bg: '#fbfaf0', style: 'grid',  size: 25, line: 'rgba(110,165,220,0.35)', margin: 'rgba(230,90,90,0.5)',  holes: true },
  { id: 'liniert',    name: 'Liniert',    cost: 40,  bg: '#fdfcf3', style: 'lines', size: 28, line: 'rgba(110,165,220,0.5)',  margin: 'rgba(230,90,90,0.5)',  holes: true },
  { id: 'punkte',     name: 'Punktraster',cost: 55,  bg: '#faf8f2', style: 'dots',  size: 25, line: 'rgba(90,100,120,0.55)',  margin: null, holes: false },
  { id: 'millimeter', name: 'Millimeter', cost: 70, bg: '#f3fbef', style: 'mm',    size: 10, line: 'rgba(70,170,90,0.3)', heavy: 'rgba(70,170,90,0.55)', margin: null, holes: false },
  { id: 'pergament',  name: 'Pergament',  cost: 85, bg: '#f0deb0', style: 'lines', size: 30, line: 'rgba(130,90,40,0.25)',   margin: 'rgba(150,60,40,0.35)', holes: false },
  { id: 'tafel',      name: 'Tafel',      cost: 100, bg: '#2e4a3c', style: 'lines', size: 40, line: 'rgba(255,255,255,0.18)', margin: null, holes: false }
];

/* ---------------------------------------------------------------------
   2. HILFSFUNKTIONEN
   --------------------------------------------------------------------- */
const clamp  = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp   = (a, b, t) => a + (b - a) * t;
const rand   = (a, b) => a + Math.random() * (b - a);
const chance = p => Math.random() < p;

/** Schwierigkeit 0..1 abhängig von der Höhe in Pixeln. */
function difficultyAt(heightPx) {
  const t = clamp(heightPx / DIFFICULTY_RANGE, 0, 1);
  return t * t * (3 - 2 * t);      // sanfter Start, dann stetig steiler
}

/** Überschneiden sich zwei Rechtecke? */
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Rechteck mit runden Ecken als Pfad. */
function roundedRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------------------------------------------------------------
   3. ZUSTAND & SETUP
   --------------------------------------------------------------------- */
const canvas  = document.getElementById('game');
let ctx         = canvas.getContext('2d');   // 'let': wird kurz für die Skin-Vorschauen getauscht
const wrapper = document.getElementById('game-wrapper');
const backdrop = document.getElementById('backdrop');

const screens = {
  start: document.getElementById('screen-start'),
  pause: document.getElementById('screen-pause'),
  over:  document.getElementById('screen-over'),
  skins: document.getElementById('screen-skins'),
  shop:  document.getElementById('screen-shop')
};
const el = {
  finalScore: document.getElementById('final-score'),
  finalBest:  document.getElementById('final-best'),
  newRecord:  document.getElementById('new-record'),
  btnPause:   document.getElementById('btn-pause'),
  btnMute:    document.getElementById('btn-mute'),
  btnRestart: document.getElementById('btn-restart'),
  newSkin:    document.getElementById('new-skin'),
  overProgress: document.getElementById('over-progress'),
  btnSkins:     document.getElementById('btn-skins'),
  btnSkinsOver: document.getElementById('btn-skins-over'),
  btnSkinsPause: document.getElementById('btn-skins-pause'),
  btnSkinsClose: document.getElementById('btn-skins-close'),
  skinGrid:     document.getElementById('skin-grid'),
  skinTotal:    document.getElementById('skin-total'),
  skinProgress: document.getElementById('skin-progress'),
  skinBarFill:  document.getElementById('skin-bar-fill'),
  chipCoins:    document.getElementById('chip-coins'),
  chipAbil:     document.getElementById('chip-abil'),
  btnPlay:      document.getElementById('btn-play'),
  shopCoinNum:  document.getElementById('shop-coin-num'),
  overGain:     document.getElementById('over-gain'),
  overTotal:    document.getElementById('over-total'),
  pauseScore:   document.getElementById('pause-score'),
  pauseCoins:   document.getElementById('pause-coins'),
  pauseAbil:    document.getElementById('pause-abil'),
  btnResume:    document.getElementById('btn-resume'),
  btnShop:      document.getElementById('btn-shop'),
  btnShopOver:  document.getElementById('btn-shop-over'),
  btnShopClose: document.getElementById('btn-shop-close'),
  tabAbil:      document.getElementById('tab-abil'),
  tabPaper:     document.getElementById('tab-paper'),
  tabSkin:      document.getElementById('tab-skin'),
  shopCoins:    document.getElementById('shop-coins'),
  shopHint:     document.getElementById('shop-hint'),
  shopGrid:     document.getElementById('shop-grid')
};

let viewScale = 1;     // Canvas-Pixel pro logischem Pixel
let game = null;       // kompletter Spielzustand (siehe resetGame)
let highscore = loadHighscore();
let lastTime = 0;

function loadHighscore() {
  try { return parseInt(localStorage.getItem('huepfKritzelHighscore'), 10) || 0; }
  catch (e) { return 0; }
}
function saveHighscore() {
  try { localStorage.setItem('huepfKritzelHighscore', String(highscore)); }
  catch (e) { /* localStorage nicht verfügbar – egal */ }
}

/* ---- Skins: Gesamtpunkte und gewählter Skin (bleiben im Browser gespeichert) ---- */
const TOTAL_KEY = 'huepfKritzelTotal';
const SKIN_KEY  = 'huepfKritzelSkin';
function storeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function storeSet(key, value) { try { localStorage.setItem(key, String(value)); } catch (e) { /* egal */ } }

// Wer schon einen Highscore hat, startet nicht bei null
let totalPoints = (() => { const v = parseInt(storeGet(TOTAL_KEY), 10); return Number.isFinite(v) ? v : highscore; })();
const skinById      = id => SKINS.find(s => s.id === id);
const isUnlocked    = s => totalPoints >= s.cost || isOwned('s:' + s.id);   // Punkte ODER im Shop gekauft
const nextLockedSkin = () => SKINS.find(s => s.cost !== Infinity && !isUnlocked(s));
let skinId = SKINS[0].id;   // gespeicherter Skin wird unten gesetzt (nach 'owned')
const currentSkin = () => skinById(skinId);

/* ---- Münzen, gekaufte Dinge, gewähltes Papier und Fähigkeit (bleiben im Browser gespeichert) ---- */
const COIN_KEY = 'huepfKritzelCoins', OWNED_KEY = 'huepfKritzelOwned';
const PAPER_KEY = 'huepfKritzelPaper', ABIL_KEY = 'huepfKritzelAbility';
let coinTotal = Math.max(START_COINS, parseInt(storeGet(COIN_KEY), 10) || 0);
let owned = (() => { try { const a = JSON.parse(storeGet(OWNED_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } })();
const isOwned = key => key === 'p:kariert' || owned.includes(key);
let paperId = (() => { const k = storeGet(PAPER_KEY); return PAPERS.some(x => x.id === k) && isOwned('p:' + k) ? k : 'kariert'; })();
let abilityId = (() => { const k = storeGet(ABIL_KEY); return ABILITIES.some(x => x.id === k) && isOwned('a:' + k) ? k : ''; })();
const currentPaper = () => PAPERS.find(x => x.id === paperId) || PAPERS[0];
const abilityName = () => { const a = ABILITIES.find(x => x.id === abilityId); return a ? a.name : 'keine'; };
{ const sv = skinById(storeGet(SKIN_KEY)); if (sv && isUnlocked(sv)) skinId = sv.id; }
const coinChance = () => COIN_CHANCE * (abilityId === 'glueck' ? 2 : 1);

function progressText() {
  const n = nextLockedSkin();
  return n ? `Nächster Skin „${n.name}“: noch ${n.cost - totalPoints} Punkte` : 'Alle Skins freigeschaltet!';
}

/** Passt Canvas und Wrapper an das Fenster an (Seitenverhältnis 2:3 bleibt). */
function resize() {
  const oldH = H;
  // Längerer Bildschirm (z. B. modernes Handy) = mehr sichtbare Spielhöhe
  H = clamp(Math.round(W * window.innerHeight / window.innerWidth), H_MIN, H_MAX);
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  const cssW = Math.floor(W * scale);
  const cssH = Math.floor(H * scale);
  wrapper.style.width = cssW + 'px';
  wrapper.style.height = cssH + 'px';
  wrapper.style.setProperty('--u', scale + 'px');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  viewScale = canvas.width / W;
  if (game) { game.cameraY -= H - oldH; spawnPlatforms(); }
  drawBackdrop();
}

function createPlayer() {
  return {
    x: W / 2,
    y: START_FEET - PLAYER_H - 1,   // y = Oberkante der Figur
    vx: 0,
    vy: JUMP_VELOCITY,
    facing: 1,
    propTimer: 0,
    jetTimer: 0,
    shield: 0,
    invuln: 0,
    jetSnd: 0,
    squashT: 5,                      // Zeit seit letztem Absprung (für Squash & Stretch)
    squashAmp: 0.28,
    springT: 0,                      // Restzeit der Feder-Streifen
    dead: false
  };
}

/** Setzt die Welt neu auf (State bleibt 'start', bis startGame() aufgerufen wird). */
function resetGame() {
  game = {
    state: 'start',
    skinFrom: 'start',              // von wo das Skin-Menü geöffnet wurde
    shopFrom: 'start',              // von wo der Shop geöffnet wurde
    coinItems: [],                  // Münzen auf den Plattformen
    coins: 0,                       // in dieser Runde gesammelt
    netUsed: false,                 // Sicherheitsnetz schon benutzt?
    time: 0,
    idleTime: 0,
    idlePhase: 0,
    player: createPlayer(),
    platforms: [],
    enemies: [],
    particles: [],
    shots: [],                      // Tintenklekse
    boss: null,
    bossCount: 0,
    bossCeil: -Infinity,
    nextBossPx: BOSS_EVERY_SCORE / SCORE_PER_PIXEL,
    banner: null,
    cameraY: START_FEET - (H - 60),
    maxHeight: 0,
    score: 0,
    topY: START_FEET,               // Höhe der obersten erzeugten Plattform
    lastX: W / 2 - PLATFORM_W / 2,
    lastHatY: START_FEET,
    overAt: 0,
    shake: 0,                       // Stärke des Kamera-Wackelns
    newRecord: false,
    recordScore: highscore          // Rekord vom Rundenanfang (für die Rekord-Linie)
  };
  game.platforms.push(makePlatform(W / 2 - PLATFORM_W / 2, START_FEET, 'normal'));
  spawnPlatforms();
}

/* ---------------------------------------------------------------------
   4. SOUND (Web Audio API, alles synthetisch)
   --------------------------------------------------------------------- */
let audioCtx = null;
let muted = false;

function initAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function tone(from, to, dur, type = 'sine', vol = 0.15, delay = 0) {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

const sfx = {
  coin:     () => { tone(988, 988, 0.07, 'square', 0.05); tone(1319, 1319, 0.14, 'square', 0.05, 0.06); },
  jump:     () => tone(380, 720, 0.12, 'sine', 0.14),
  select:   () => { tone(520, 780, 0.08, 'triangle', 0.12); tone(780, 1040, 0.1, 'triangle', 0.12, 0.07); },
  spring:   () => { tone(300, 1000, 0.28, 'square', 0.07); tone(500, 1400, 0.2, 'sine', 0.1, 0.05); },
  powerup:  () => { tone(500, 700, 0.1, 'triangle', 0.15); tone(700, 1000, 0.1, 'triangle', 0.15, 0.09); tone(1000, 1400, 0.18, 'triangle', 0.15, 0.18); },
  break:    () => tone(220, 50, 0.25, 'sawtooth', 0.1),
  jetpack:  () => { tone(150, 500, 0.4, 'sawtooth', 0.06); tone(300, 900, 0.3, 'triangle', 0.1, 0.1); },
  jetLoop:  () => tone(130 + Math.random() * 30, 80, 0.1, 'sawtooth', 0.025),
  shield:   () => { tone(600, 900, 0.12, 'sine', 0.14); tone(900, 1300, 0.18, 'sine', 0.14, 0.1); },
  shieldBreak: () => { tone(900, 200, 0.25, 'triangle', 0.15); tone(1200, 300, 0.15, 'sine', 0.1, 0.03); },
  ink:      () => tone(260, 110, 0.15, 'sine', 0.1),
  bossAppear: () => { tone(220, 220, 0.15, 'square', 0.08); tone(220, 220, 0.15, 'square', 0.08, 0.22); tone(330, 330, 0.3, 'square', 0.08, 0.44); },
  bossHit:  () => { tone(160, 60, 0.3, 'sawtooth', 0.14); tone(500, 150, 0.2, 'square', 0.08, 0.05); },
  bossDie:  () => { tone(400, 60, 0.8, 'sawtooth', 0.15); tone(800, 200, 0.6, 'square', 0.08, 0.1); tone(523, 523, 0.15, 'triangle', 0.14, 0.7); tone(659, 659, 0.15, 'triangle', 0.14, 0.85); tone(784, 1047, 0.4, 'triangle', 0.14, 1.0); },
  stomp:    () => { tone(600, 200, 0.15, 'square', 0.1); tone(300, 700, 0.12, 'sine', 0.12, 0.1); },
  gameOver: () => { tone(440, 330, 0.25, 'triangle', 0.18); tone(330, 220, 0.25, 'triangle', 0.18, 0.22); tone(220, 90, 0.5, 'triangle', 0.18, 0.45); }
};

function toggleMute() {
  muted = !muted;
  el.btnMute.classList.toggle('muted', muted);
}

/* ---------------------------------------------------------------------
   5. EINGABE (Tastatur, Touch)
   --------------------------------------------------------------------- */
const keys = { left: false, right: false };
const pointers = new Map();       // aktive Finger/Mäuse -> Seite (-1 links, +1 rechts)

/** Liefert die gewünschte Richtung -1..+1 (Tastatur > Touch). */
function getInputDirection() {
  let d = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (d === 0 && pointers.size > 0) {
    let sum = 0;
    pointers.forEach(side => { sum += side; });
    d = clamp(sum, -1, 1);
  }
  return d;
}

function onActionKey() {
  if (game.state === 'start') startGame();
  else if (game.state === 'paused') togglePause();
  else if (game.state === 'over' && performance.now() - game.overAt > 400) startGame();
}

window.addEventListener('keydown', e => {
  initAudio();
  if (game.state === 'skins') { handleSkinKey(e); return; }
  if (game.state === 'shop')  { handleShopKey(e); return; }
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA':  keys.left = true;  e.preventDefault(); break;
    case 'ArrowRight': case 'KeyD': keys.right = true; e.preventDefault(); break;
    case 'Space': case 'Enter':     e.preventDefault(); if (!e.repeat) onActionKey(); break;
    case 'KeyP': case 'Escape':     if (!e.repeat) togglePause(); break;
    case 'KeyM':                    if (!e.repeat) toggleMute(); break;
    case 'KeyK':                    if (!e.repeat) openSkins(); break;
    case 'KeyB':                    if (!e.repeat) openShop(); break;
  }
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
});
window.addEventListener('blur', () => {
  keys.left = keys.right = false;
  pointers.clear();
  if (game.state === 'playing') togglePause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') togglePause();
});

/** Linke oder rechte Bildschirmhälfte? */
function sideOf(e) {
  const rect = wrapper.getBoundingClientRect();
  return (e.clientX - rect.left) < rect.width / 2 ? -1 : 1;
}

wrapper.addEventListener('pointerdown', e => {
  if (e.target.closest('button')) return;      // Knöpfe haben eigene Handler
  initAudio();
  if (game.state === 'start') startGame();
  else if (game.state === 'paused') { togglePause(); return; }
  if (game.state === 'playing') pointers.set(e.pointerId, sideOf(e));
});
wrapper.addEventListener('pointermove', e => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, sideOf(e));
});
['pointerup', 'pointercancel'].forEach(type =>
  window.addEventListener(type, e => pointers.delete(e.pointerId)));

el.btnPause.addEventListener('click', () => { togglePause(); el.btnPause.blur(); });
el.btnMute.addEventListener('click',  () => { initAudio(); toggleMute(); el.btnMute.blur(); });
el.btnRestart.addEventListener('click', () => { initAudio(); startGame(); });
el.btnSkins.addEventListener('click',      () => { initAudio(); openSkins(); });
el.btnSkinsOver.addEventListener('click',  () => { initAudio(); openSkins(); });
el.btnSkinsPause.addEventListener('click', () => { initAudio(); openSkins(); });
el.btnSkinsClose.addEventListener('click', () => { closeSkins(); });
el.btnResume.addEventListener('click', () => { initAudio(); togglePause(); });
el.btnPlay.addEventListener('click', () => { initAudio(); startGame(); });
el.btnShop.addEventListener('click',      () => { initAudio(); openShop(); });
el.btnShopOver.addEventListener('click',  () => { initAudio(); openShop(); });
el.btnShopClose.addEventListener('click', () => { closeShop(); });
el.tabAbil.addEventListener('click',  () => { shopTab = 'abil';  renderShop(); });
el.tabPaper.addEventListener('click', () => { shopTab = 'paper'; renderShop(); });
el.tabSkin.addEventListener('click',  () => { shopTab = 'skin';  renderShop(); });

/* ---------------------------------------------------------------------
   6. SPAWN (Plattformen, Power-Ups, Gegner)
   --------------------------------------------------------------------- */
function makePlatform(x, y, type) {
  return { x, y, type, vx: 0, powerup: null, broken: false };
}

/** Erzeugt Plattformen, bis über dem sichtbaren Bereich genug vorhanden sind. */
function spawnPlatforms() {
  // Solange ein Boss lebt, wird nichts Neues darüber erzeugt (Boss versperrt den Weg)
  while (!game.boss && game.topY > game.cameraY - SPAWN_AHEAD) spawnRow();
}

/**
 * Erzeugt eine "Hauptplattform" (normal oder beweglich) im erreichbaren Abstand.
 * Diese Kette ist immer begehbar. Zerbrechliche Plattformen kommen nur ZUSÄTZLICH
 * dazu (sie sind Fallen), damit nie eine Lücke unüberwindbar wird.
 */
function spawnRow() {
  const heightRow = START_FEET - game.topY;
  if (heightRow >= game.nextBossPx) { spawnBossArena(); return; }
  const d = difficultyAt(heightRow);

  // Abstand: wächst mit der Höhe, bleibt aber unter MAX_SAFE_GAP
  const gapMax = Math.min(lerp(GAP_MAX_START, GAP_MAX_END, d), MAX_SAFE_GAP);
  const gapMin = Math.min(lerp(GAP_MIN_START, GAP_MIN_END, d), gapMax);
  const gap = rand(gapMin, gapMax);
  const y = game.topY - gap;

  // Seitlicher Versatz begrenzt, damit der Weg machbar bleibt
  const dx = lerp(110, MAX_DX, d);
  const x = rand(Math.max(0, game.lastX - dx), Math.min(W - PLATFORM_W, game.lastX + dx));

  const moving = heightRow > EASY_ZONE && chance(lerp(MOVING_CHANCE_START, MOVING_CHANCE_END, d));
  const pl = makePlatform(x, y, moving ? 'moving' : 'normal');
  if (moving) {
    pl.vx = (chance(0.5) ? 1 : -1) * lerp(MOVING_SPEED_START, MOVING_SPEED_END, d) * rand(0.8, 1.2);
  }

  spawnPowerup(pl, moving, heightRow);
  game.platforms.push(pl);

  // Zusätzliche, zerbrechliche Falle
  if (heightRow > EASY_ZONE && chance(lerp(BREAKABLE_CHANCE_START, BREAKABLE_CHANCE_END, d))) spawnBreakable(y, gap);

  // Gegner erst ab ENEMY_START_SCORE
  let enemyMade = false;
  if (heightRow * SCORE_PER_PIXEL >= ENEMY_START_SCORE &&
      chance(lerp(ENEMY_CHANCE_START, ENEMY_CHANCE_END, d))) {
    enemyMade = spawnEnemy(pl, moving, y, gap, heightRow * SCORE_PER_PIXEL);
  }

  // Münze: nur gelegentlich, nie bei einem Monster dieser Reihe und nie auf einem Power-Up
  if (enemyMade) {
    const en = game.enemies[game.enemies.length - 1];
    game.coinItems = game.coinItems.filter(c =>
      Math.abs(c.y - (en.y + en.h / 2)) > 60 || Math.abs(c.x - (en.x + en.w / 2)) > 60);
  } else if (!pl.powerup && heightRow > COIN_MIN_HEIGHT && chance(coinChance())) {
    spawnCoin(pl);
  }

  game.topY = y;
  game.lastX = x;
}

function spawnPowerup(pl, moving, heightRow) {
  if (heightRow < 300) return;                      // am Anfang keine Power-Ups
  const roll = Math.random();
  const c1 = PROPELLER_CHANCE, c2 = c1 + JETPACK_CHANCE, c3 = c2 + SHIELD_CHANCE, c4 = c3 + SPRING_CHANCE;
  const flyOk = !moving && (game.lastHatY - pl.y) > PROPELLER_COOLDOWN_PX;   // Propeller & Jetpack teilen sich den Abstand
  if (roll < c1) {                                  // Propeller-Kappe
    if (flyOk) {
      pl.powerup = { type: 'propeller', ox: (PLATFORM_W - 28) / 2 };
      game.lastHatY = pl.y;
    }
  } else if (roll < c2) {                           // Jetpack
    if (flyOk && heightRow > JETPACK_MIN_HEIGHT) {
      pl.powerup = { type: 'jetpack', ox: (PLATFORM_W - 24) / 2 };
      game.lastHatY = pl.y;
    }
  } else if (roll < c3) {                           // Schild
    if (!moving) pl.powerup = { type: 'shield', ox: (PLATFORM_W - 22) / 2 };
  } else if (roll < c4) {
    pl.powerup = { type: 'spring', ox: rand(4, PLATFORM_W - 24) };
  }
}

function spawnBreakable(y, gap) {
  const by = y + gap * rand(0.3, 0.7);
  const bx = rand(0, W - PLATFORM_W);
  for (const o of game.platforms) {                 // nicht über andere Plattformen legen
    if (Math.abs(o.y - by) < 22 && Math.abs(o.x - bx) < PLATFORM_W + 12) return;
  }
  game.platforms.push(makePlatform(bx, by, 'breakable'));
}

function spawnEnemy(pl, moving, y, gap, score) {
  const kinds = ['classic', 'classic'];
  if (score >= INKER_START_SCORE) kinds.push('inker');
  if (score >= CHASER_START_SCORE) kinds.push('chaser');
  const kind = kinds[Math.floor(Math.random() * kinds.length)];

  if (kind === 'chaser') {
    // Startet über dem Bild und fliegt los, sobald er sichtbar wird
    const cy = y - rand(60, 140);
    game.enemies.push({ type: 'chaser', x: rand(20, W - CHASER_W - 20), y: cy, baseY: cy,
                        w: CHASER_W, h: CHASER_H, vx: 0, vy: 0, t: rand(0, 6), awake: false, alive: true });
    return true;
  }
  if (kind === 'inker') {
    const iy = y - rand(40, 70);
    game.enemies.push({ type: 'inker', x: rand(20, W - INKER_W - 20), y: iy, baseY: iy,
                        w: INKER_W, h: INKER_H, vx: (chance(0.5) ? 1 : -1) * rand(25, 50),
                        t: rand(0, 6), cd: rand(0.8, 1.4), alive: true });
    return true;
  }

  if (!moving && !pl.powerup && chance(0.5)) {
    // Monster sitzt auf der Plattform
    game.enemies.push({ type: 'perch', x: pl.x + (PLATFORM_W - ENEMY_W) / 2, y: y - ENEMY_H,
                        baseY: y - ENEMY_H, w: ENEMY_W, h: ENEMY_H, vx: 0, t: rand(0, 6), alive: true });
    return true;
  } else if (gap >= 70) {
    // Monster schwebt in der Lücke
    const by = y + gap / 2 - ENEMY_H / 2;
    game.enemies.push({ type: 'float', x: rand(10, W - ENEMY_W - 10), y: by, baseY: by,
                        w: ENEMY_W, h: ENEMY_H, vx: (chance(0.5) ? 1 : -1) * rand(30, 60),
                        t: rand(0, 6), alive: true });
    return true;
  }
  return false;                                     // kein Monster entstanden
}

/** Münze über der Plattform (bewegt sich mit ihr mit). */
function spawnCoin(pl) {
  const ox = PLATFORM_W / 2, oy = -17;
  const cx = pl.x + ox, cy = pl.y + oy;
  for (const e of game.enemies) {                    // nie in der Nähe eines Monsters
    if (Math.abs(e.x + e.w / 2 - cx) < 55 && Math.abs(e.y + e.h / 2 - cy) < 55) return;
  }
  game.coinItems.push({ pl, ox, oy, x: cx, y: cy, free: false, t: rand(0, 6), got: false });
}

/** Münzen mitbewegen, vom Magneten anziehen lassen und einsammeln. */
function updateCoins(dt) {
  const p = game.player;
  const px = p.x, py = p.y + PLAYER_H / 2;
  for (const c of game.coinItems) {
    if (!c.free) { c.x = c.pl.x + c.ox; c.y = c.pl.y + c.oy; }
    if (p.dead) continue;
    let d = Math.hypot(px - c.x, py - c.y);
    if (abilityId === 'magnet' && !c.free && d < MAGNET_RANGE) c.free = true;
    if (c.free && d > 0.01) {
      const step = Math.min(MAGNET_SPEED * dt, d);
      c.x += (px - c.x) / d * step; c.y += (py - c.y) / d * step;
      d = Math.hypot(px - c.x, py - c.y);
    }
    if (d < COIN_PICKUP) {
      c.got = true;
      game.coins++;
      sfx.coin();
      spawnParticles(c.x, c.y, 6, ['#ffd23f', '#fff3a0', '#e8b820'], 140);
    }
  }
}

/** Boss-Arena: drei Randplattformen und der Boss, der mittig hin und her schwebt.
 *  Von oben draufspringen = Schaden. Darüber entsteht nichts Neues, bis er besiegt ist. */
function spawnBossArena() {
  const base = game.topY;
  const k = game.bossCount++;
  game.nextBossPx += BOSS_EVERY_SCORE / SCORE_PER_PIXEL;
  game.platforms.push(makePlatform(0, base - 85, 'normal'));
  game.platforms.push(makePlatform(W - PLATFORM_W, base - 170, 'normal'));
  game.platforms.push(makePlatform(0, base - 255, 'normal'));
  const hp = Math.min(3 + k, 8);
  const by = base - 130;
  game.boss = { x: W / 2 - BOSS_W / 2, y: by, baseY: by, hp, maxHp: hp,
                vx: chance(0.5) ? 85 : -85, t: 0, hurtT: 0, cd: 2.2, seen: false };
  game.bossCeil = base - 460;       // Obergrenze, damit niemand ins Leere fliegt
  game.topY = base - 255;
  game.lastX = 0;
}

/** Tintenklecks auf den Spieler zielen (offsets = Winkel-Abweichungen für Fächer). */
function fireInk(x, y, speed, offsets = [0], r = 7) {
  const p = game.player;
  const a0 = Math.atan2((p.y + PLAYER_H / 2) - y, p.x - x);
  for (const off of offsets) {
    game.shots.push({ x, y, vx: Math.cos(a0 + off) * speed, vy: Math.sin(a0 + off) * speed, r, life: 5, t: 0 });
  }
  sfx.ink();
}

/** Flammen des Jetpacks. */
function spawnFlame(p) {
  const bx = p.x - p.facing * 20;
  for (let i = 0; i < 2; i++) {
    game.particles.push({
      kind: 'flame', x: bx + rand(-4, 4), y: p.y + PLAYER_H - 8, vx: rand(-25, 25), vy: rand(160, 300), g: 0,
      life: rand(0.25, 0.4), max: 0.4, size: rand(4, 8), rot: 0, vr: 0, color: chance(0.5) ? '#ff9f1c' : '#ffd23f'
    });
  }
}

/** Staubwölkchen links und rechts vom Aufprall. */
function spawnDust(x, y, count, spread = 1) {
  for (let i = 0; i < count; i++) {
    const dir = i % 2 ? 1 : -1;
    game.particles.push({
      kind: 'dust', x: x + dir * rand(2, 12) * spread, y: y - rand(0, 3),
      vx: dir * rand(30, 110) * spread, vy: rand(-45, -10), g: 0,
      life: rand(0.35, 0.6), max: 0.6, size: rand(4, 7) * spread, rot: 0, vr: 0, color: '#d6cdb4'
    });
  }
}

/** Bunte Geschwindigkeitsstriche unter der Figur (Feder-Sprung). */
function spawnStreaks(p) {
  const cols = ['#ff6b6b', '#ffd23f', '#4dabf7'];
  for (let i = 0; i < 2; i++) {
    game.particles.push({
      kind: 'streak', x: p.x + rand(-13, 13), y: p.y + PLAYER_H - rand(0, 14), vx: 0, vy: 40, g: 0,
      life: 0.22, max: 0.22, size: rand(18, 34), rot: 0, vr: 0, color: cols[Math.floor(Math.random() * 3)]
    });
  }
}

function spawnParticles(x, y, count, colors, speed = 220) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(0.3, 1) * speed;
    game.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80,
      life: rand(0.5, 0.9), max: 0.9, size: rand(3, 7),
      rot: rand(0, 6), vr: rand(-8, 8), color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

/* ---------------------------------------------------------------------
   7. UPDATE
   --------------------------------------------------------------------- */
function update(dt) {
  game.time += dt;
  game.shake *= Math.exp(-9 * dt);
  if (game.shake < 0.3) game.shake = 0;
  updatePlatforms(dt);
  updateEnemies(dt);
  updatePlayer(dt);
  checkPowerupPickup();
  updateCoins(dt);
  checkEnemyCollisions();
  updateShots(dt);
  checkShotHits();
  updateCamera(dt);
  updateScore();
  spawnPlatforms();
  cleanup();
  updateParticles(dt);
  checkGameOver();
}

/** Start-Bildschirm: Figur hüpft locker auf der Startplattform. */
function updateIdle(dt) {
  game.idleTime += dt;
  game.time += dt;
  const p = game.player;
  const phase = game.idleTime * 5;
  p.y = START_FEET - PLAYER_H - Math.abs(Math.sin(phase)) * 45;
  const cycle = Math.floor(phase / Math.PI);
  if (cycle !== game.idlePhase) { game.idlePhase = cycle; p.squashT = 0; }
  p.squashT += dt;
}

function updatePlatforms(dt) {
  for (const pl of game.platforms) {
    if (pl.type !== 'moving') continue;
    pl.x += pl.vx * dt;
    if (pl.x < 0) { pl.x = 0; pl.vx = Math.abs(pl.vx); }
    if (pl.x > W - PLATFORM_W) { pl.x = W - PLATFORM_W; pl.vx = -Math.abs(pl.vx); }
  }
}

function updateEnemies(dt) {
  for (const e of game.enemies) {
    e.t += dt;
    if (e.type === 'float') {
      e.x += e.vx * dt;
      if (e.x < 0) { e.x = 0; e.vx = Math.abs(e.vx); }
      if (e.x > W - e.w) { e.x = W - e.w; e.vx = -Math.abs(e.vx); }
      e.y = e.baseY + Math.sin(e.t * 2.2) * 12;
    } else if (e.type === 'inker') {
      e.x += e.vx * dt;
      if (e.x < 0) { e.x = 0; e.vx = Math.abs(e.vx); }
      if (e.x > W - e.w) { e.x = W - e.w; e.vx = -Math.abs(e.vx); }
      e.y = e.baseY + Math.sin(e.t * 2) * 8;
      // schiesst nur, wenn er im Bild ist und die Figur unter ihm ist
      const p = game.player, sy = e.y - game.cameraY;
      if (!p.dead && sy > 10 && sy < H * 0.7 && p.y > e.y + 30) {
        e.cd -= dt;
        if (e.cd <= 0) { fireInk(e.x + e.w / 2, e.y + e.h, INK_SPEED); e.cd = rand(INKER_CD_MIN, INKER_CD_MAX); }
      }
    }
  }
}

function updatePlayer(dt) {
  const p = game.player;
  const prevFeet = p.y + PLAYER_H;

  // Horizontal: weiche Annäherung an die Wunschgeschwindigkeit
  const dir = p.dead ? 0 : getInputDirection();
  p.vx += (dir * MOVE_SPEED - p.vx) * Math.min(1, MOVE_SMOOTHING * dt);
  if (Math.abs(dir) > 0.05) p.facing = dir > 0 ? 1 : -1;
  p.x += p.vx * dt;

  // Screen Wrap: links raus -> rechts wieder rein (und umgekehrt)
  if (p.x < -PLAYER_W / 2) p.x = W + PLAYER_W / 2;
  else if (p.x > W + PLAYER_W / 2) p.x = -PLAYER_W / 2;

  // Vertikal: Jetpack, Propeller oder normale Schwerkraft
  if (p.jetTimer > 0 && !p.dead) {
    p.jetTimer -= dt;
    p.vy += (-JETPACK_SPEED - p.vy) * Math.min(1, 10 * dt);
    if (p.jetTimer < 0) p.jetTimer = 0;
    spawnFlame(p);
    p.jetSnd -= dt;
    if (p.jetSnd <= 0) { sfx.jetLoop(); p.jetSnd = 0.08; }
  } else if (p.propTimer > 0 && !p.dead) {
    p.propTimer -= dt;
    p.vy += (-PROPELLER_SPEED - p.vy) * Math.min(1, 10 * dt);
    if (p.propTimer < 0) p.propTimer = 0;
  } else {
    p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL_SPEED);
  }
  p.y += p.vy * dt;
  p.squashT += dt;
  if (p.shield > 0) p.shield = Math.max(0, p.shield - dt);
  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
  if (p.springT > 0) { p.springT -= dt; if (p.vy < 0 && !p.dead) spawnStreaks(p); }

  if (!p.dead && p.vy > 0) checkPlatformCollisions(prevFeet);
}

function updateCamera(dt) {
  const target = game.player.y - H * CAMERA_LINE;
  if (target < game.cameraY) {                     // Kamera geht nur nach oben
    game.cameraY += (target - game.cameraY) * Math.min(1, 14 * dt);
  }
}

function updateScore() {
  const feet = game.player.y + PLAYER_H;
  game.maxHeight = Math.max(game.maxHeight, START_FEET - feet);
  game.score = Math.floor(game.maxHeight * SCORE_PER_PIXEL);
}

function updateParticles(dt) {
  for (const p of game.particles) {
    p.life -= dt;
    p.vy += (p.g === undefined ? 900 : p.g) * dt;
    if (p.kind === 'dust') p.vx *= Math.max(0, 1 - 4 * dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
  game.particles = game.particles.filter(p => p.life > 0);
}

/** Entfernt Objekte, die weit unter dem Bild liegen oder zerstört sind. */
function cleanup() {
  const limit = game.cameraY + H + 80;
  game.platforms = game.platforms.filter(pl => !pl.broken && pl.y < limit);
  game.enemies = game.enemies.filter(e => e.alive && e.y < limit);
  game.coinItems = game.coinItems.filter(c => !c.got && c.y < limit);
}

/** Sicherheitsnetz: rettet einmal pro Spiel (Sturz, Monster oder Klecks). */
function canUseNet() { return abilityId === 'netz' && !game.netUsed; }
function useNet() {
  const p = game.player;
  game.netUsed = true;
  p.invuln = INVULN_TIME;
  sfx.spring();
  spawnParticles(p.x, p.y + PLAYER_H / 2, 16, ['#ffffff', '#7ec8ff', '#ffd23f'], 240);
  game.shake = Math.max(game.shake, 5);
}

function checkGameOver() {
  const p = game.player;
  const below = p.y - game.cameraY;
  if (!p.dead && below > H + 30) {                 // unten aus dem Bild gefallen
    if (canUseNet()) {                             // Sicherheitsnetz fängt dich einmal auf
      useNet();
      p.y = game.cameraY + H - PLAYER_H - 4;
      p.vy = SPRING_VELOCITY;
      p.springT = 0.5;
    } else die(false);
  }
  if (p.dead && below > H + 260) endGame();
}

/* ---------------------------------------------------------------------
   8. COLLISION
   --------------------------------------------------------------------- */

/** Landet die (fallende) Figur auf einer Plattform? Prüft die Strecke seit dem letzten Frame. */
function checkPlatformCollisions(prevFeet) {
  const p = game.player;
  const feet = p.y + PLAYER_H;
  const reach = PLATFORM_W / 2 + PLAYER_W * 0.3 + (abilityId === 'fuesse' ? 6 : 0);
  let hit = null;

  for (const pl of game.platforms) {
    if (pl.broken) continue;
    if (prevFeet <= pl.y + 2 && feet >= pl.y) {
      // horizontaler Abstand, wrap-sicher
      let dx = p.x - (pl.x + PLATFORM_W / 2);
      dx = ((dx + W / 2) % W + W) % W - W / 2;
      if (Math.abs(dx) < reach) {
        if (pl.type !== 'breakable') { hit = pl; break; }   // feste Plattform hat Vorrang
        if (!hit) hit = pl;
      }
    }
  }
  if (hit) landOn(hit);
}

function landOn(pl) {
  const p = game.player;

  if (pl.type === 'breakable') {                   // bricht, kein Absprung
    pl.broken = true;
    spawnParticles(pl.x + PLATFORM_W / 2, pl.y + 6, 14, ['#c08a54', '#a8743f', '#7a5230'], 200);
    sfx.break();
    return;
  }

  p.y = pl.y - PLAYER_H;

  // Feder getroffen?
  const sp = pl.powerup && pl.powerup.type === 'spring' ? pl.powerup : null;
  if (sp) {
    const cx = pl.x + sp.ox + 10;
    if (Math.abs(p.x - cx) < 10 + PLAYER_W * 0.4) {
      bounce(SPRING_VELOCITY, 0.4);
      sfx.spring();
      p.springT = 0.5;
      spawnDust(p.x, pl.y, 8, 1.3);
      spawnParticles(cx, pl.y - 8, 8, ['#e74c3c', '#f5b7b1', '#ffffff'], 160);
      return;
    }
  }
  bounce(JUMP_VELOCITY, 0.28);
  sfx.jump();
  spawnDust(p.x, pl.y, 4);
}

function bounce(vy, amp) {
  const p = game.player;
  p.vy = vy;
  p.squashT = 0;
  p.squashAmp = amp;
}

/** Hut, Jetpack und Schild einsammeln. */
function checkPowerupPickup() {
  const p = game.player;
  if (p.dead) return;
  const body = { x: p.x - 14, y: p.y + 4, w: 28, h: PLAYER_H - 4 };
  for (const pl of game.platforms) {
    const u = pl.powerup;
    if (!u || u.type === 'spring') continue;
    const w = u.type === 'propeller' ? 28 : u.type === 'jetpack' ? 24 : 22;
    const h = u.type === 'shield' ? 24 : 22;
    if (!overlap(body, { x: pl.x + u.ox, y: pl.y - h, w, h })) continue;
    pl.powerup = null;
    if (u.type === 'shield') {
      p.shield = Math.max(p.shield, SHIELD_TIME);
      sfx.shield();
    } else if (u.type === 'jetpack') {
      p.jetTimer = JETPACK_TIME; p.propTimer = 0; p.vy = -JETPACK_SPEED;
      sfx.jetpack();
    } else {
      p.propTimer = PROPELLER_TIME; p.jetTimer = 0; p.vy = -PROPELLER_SPEED;
      sfx.powerup();
    }
    spawnParticles(p.x, p.y, 12, ['#ffd23f', '#ff5a5f', '#4dabf7'], 240);
  }
}

/** Tintenklekse fliegen lassen und aufräumen. */
function updateShots(dt) {
  for (const sh of game.shots) {
    sh.t += dt; sh.life -= dt;
    sh.x += sh.vx * dt; sh.y += sh.vy * dt;
  }
  const top = game.cameraY - 250, bottom = game.cameraY + H + 80;
  game.shots = game.shots.filter(sh => sh.life > 0 && sh.y > top && sh.y < bottom && sh.x > -30 && sh.x < W + 30);
}

/** Klecks trifft die Figur: Schild fängt ihn ab, im Flug geht er kaputt, sonst Game Over. */
function checkShotHits() {
  const p = game.player;
  if (p.dead || !game.shots.length) return;
  const body = { x: p.x - 14, y: p.y + 4, w: 28, h: PLAYER_H - 4 };
  for (const sh of game.shots) {
    const nx = clamp(sh.x, body.x, body.x + body.w), ny = clamp(sh.y, body.y, body.y + body.h);
    if (Math.hypot(sh.x - nx, sh.y - ny) > sh.r) continue;
    if (p.invuln > 0) continue;
    sh.life = 0;
    spawnParticles(sh.x, sh.y, 8, ['#3a4fa8', '#2c3e7a', '#6b82d6'], 160);
    if (p.propTimer > 0 || p.jetTimer > 0) continue;       // im Flug: Klecks geht einfach kaputt
    if (p.shield > 0) {
      p.shield = 0;
      p.invuln = INVULN_TIME;
      spawnParticles(p.x, p.y + 20, 12, ['#7ec8ff', '#ffffff', '#2b6cb0'], 240);
      sfx.shieldBreak();
    } else if (canUseNet()) {
      useNet();
    } else {
      die(true);
      return;
    }
  }
}

/** Von oben draufspringen = Gegner besiegt, sonst Game Over. */
function checkEnemyCollisions() {
  const p = game.player;
  if (p.dead) return;
  const prevFeet = p.y + PLAYER_H - p.vy * 0.0167;
  const body = { x: p.x - 14, y: p.y + 4, w: 28, h: PLAYER_H - 4 };

  for (const e of game.enemies) {
    if (!e.alive || !overlap(body, e)) continue;
    const stomp = p.vy > 0 && prevFeet <= e.y + e.h * 0.55;
    if (stomp || p.propTimer > 0 || p.jetTimer > 0) {
      e.alive = false;
      spawnParticles(e.x + e.w / 2, e.y + e.h / 2, 16, ['#b06ad8', '#6a2f95', '#e9c8ff'], 260);
      sfx.stomp();
      game.shake = Math.max(game.shake, 4);
      if (stomp) bounce(JUMP_VELOCITY, 0.3);
    } else if (p.invuln > 0) {
      continue;
    } else if (p.shield > 0) {            // Schild fängt den Treffer ab
      p.shield = 0;
      p.invuln = INVULN_TIME;
      e.alive = false;
      spawnParticles(p.x, p.y + 20, 14, ['#7ec8ff', '#ffffff', '#2b6cb0'], 260);
      sfx.shieldBreak();
      game.shake = Math.max(game.shake, 6);
    } else if (canUseNet()) {             // Sicherheitsnetz rettet
      useNet();
      e.alive = false;
      spawnParticles(e.x + e.w / 2, e.y + e.h / 2, 16, ['#b06ad8', '#6a2f95', '#e9c8ff'], 260);
    } else {
      die(true);
      return;
    }
  }
}

/* ---------------------------------------------------------------------
   9. DRAW
   --------------------------------------------------------------------- */
function draw() {
  ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
  ctx.save();
  const sh = game.state === 'playing' ? game.shake : 0;
  if (sh) ctx.translate(rand(-sh, sh), rand(-sh, sh));
  drawBackground();
  drawRecordLine();
  drawPlatforms();
  drawCoins();
  drawEnemies();
  drawShots();
  drawParticles();
  drawPlayer();
  ctx.restore();
  if (menuBase() !== 'start') drawHUD();
}

/** Papier: Muster (Kästchen, Linien, Punkte, Millimeter), Rand und Löcher – scrollt mit der Kamera. */
function drawPaper(pp, camY, w, h) {
  ctx.fillStyle = pp.bg;
  ctx.fillRect(-20, -20, w + 40, h + 40);
  const s = pp.size;
  const k0 = Math.floor(camY / s) - 1;

  if (pp.style === 'dots') {
    ctx.fillStyle = pp.line;
    for (let k = k0; k * s - camY <= h + s; k++) {
      for (let i = 0; i * s <= w + s; i++) {
        ctx.beginPath(); ctx.arc(i * s, k * s - camY, 1.7, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else {
    const grid = pp.style !== 'lines';
    const mm = pp.style === 'mm';
    for (let pass = 0; pass < (mm ? 2 : 1); pass++) {
      ctx.strokeStyle = pass ? pp.heavy : pp.line;
      ctx.lineWidth = pass ? 1.5 : 1;
      ctx.beginPath();
      for (let k = k0; k * s - camY <= h + s; k++) {
        if (mm && (k % 5 === 0) !== (pass === 1)) continue;
        const y = k * s - camY + 0.5;
        ctx.moveTo(-20, y); ctx.lineTo(w + 20, y);
      }
      if (grid) {
        for (let i = -1; i * s <= w + s; i++) {
          if (mm && (i % 5 === 0) !== (pass === 1)) continue;
          const x = i * s + 0.5;
          ctx.moveTo(x, -20); ctx.lineTo(x, h + 20);
        }
      }
      ctx.stroke();
    }
  }

  if (pp.margin) {
    ctx.strokeStyle = pp.margin;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, -20);
    ctx.lineTo(MARGIN_X, h + 20);
    ctx.stroke();
  }

  if (pp.holes) {                                      // Lochung am linken Rand
    const holeStep = 150;
    const holeOff = (((-camY) % holeStep) + holeStep) % holeStep;
    ctx.fillStyle = '#e4e1cf';
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1.5;
    for (let y = holeOff - holeStep; y < h + holeStep; y += holeStep) {
      ctx.beginPath();
      ctx.arc(20, y + 40, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawBackground() { drawPaper(currentPaper(), game.cameraY, W, H); }

/** Gestrichelte Linie in der Höhe deines bisherigen Highscores. */
function drawRecordLine() {
  const rec = game.recordScore;
  if (!rec || menuBase() === 'start') return;
  const y = START_FEET - rec / SCORE_PER_PIXEL - game.cameraY;
  if (y < -30 || y > H + 30) return;
  const beaten = game.score >= rec;
  const col = beaten ? 'rgba(230,160,20,0.85)' : 'rgba(231,76,60,0.85)';
  ctx.save();
  ctx.setLineDash([10, 7]);
  ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.strokeStyle = col;
  ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(W + 10, y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = "bold 15px 'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', cursive";
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.fillStyle = beaten ? '#b87400' : '#c0392b';
  const label = `Rekord: ${rec}`;
  ctx.strokeText(label, W - 12, y - 7);
  ctx.fillText(label, W - 12, y - 7);
  ctx.restore();
}

function drawPlatforms() {
  const cam = game.cameraY;
  const sk = currentSkin();
  const mv = sk.move || ['#5fb4ff', '#2b6cb0'];
  for (const pl of game.platforms) {
    const x = pl.x, y = pl.y - cam;
    if (y < -40 || y > H + 20) continue;

    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    if (pl.type === 'normal') {
      ctx.fillStyle = sk.plat[0]; ctx.strokeStyle = sk.plat[1];
      roundedRect(x, y, PLATFORM_W, PLATFORM_H, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      roundedRect(x + 5, y + 3, PLATFORM_W - 10, 3, 1.5); ctx.fill();
    } else if (pl.type === 'moving') {
      ctx.fillStyle = mv[0]; ctx.strokeStyle = mv[1];
      roundedRect(x, y, PLATFORM_W, PLATFORM_H, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';                       // kleine Pfeile ◄ ►
      const cx = x + PLATFORM_W / 2, cy = y + PLATFORM_H / 2;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy); ctx.lineTo(cx - 14, cy - 4); ctx.lineTo(cx - 14, cy + 4);
      ctx.moveTo(cx + 6, cy); ctx.lineTo(cx + 14, cy - 4); ctx.lineTo(cx + 14, cy + 4);
      ctx.fill();
    } else {                                           // breakable
      ctx.fillStyle = '#c08a54'; ctx.strokeStyle = '#7a5230';
      roundedRect(x, y, PLATFORM_W, PLATFORM_H, 4); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();                                 // Riss
      ctx.moveTo(x + 24, y); ctx.lineTo(x + 29, y + 5); ctx.lineTo(x + 25, y + 9); ctx.lineTo(x + 31, y + PLATFORM_H);
      ctx.moveTo(x + 44, y); ctx.lineTo(x + 40, y + 6); ctx.lineTo(x + 45, y + PLATFORM_H);
      ctx.stroke();
    }

    if (pl.powerup) {
      if (pl.powerup.type === 'spring') drawSpring(x + pl.powerup.ox, y);
      else if (pl.powerup.type === 'jetpack') drawJetpack(x + pl.powerup.ox + 12, y);
      else if (pl.powerup.type === 'shield') drawShieldItem(x + pl.powerup.ox + 11, y);
      else drawPropellerHat(x + pl.powerup.ox + 14, y - 2, game.time * 6);
    }
  }
}

function drawSpring(x, y) {            // y = Oberkante der Plattform
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6b7280';
  ctx.beginPath();
  ctx.moveTo(x + 10, y);
  ctx.lineTo(x + 3, y - 3);
  ctx.lineTo(x + 17, y - 6);
  ctx.lineTo(x + 3, y - 9);
  ctx.lineTo(x + 17, y - 12);
  ctx.lineTo(x + 10, y - 14);
  ctx.stroke();
  ctx.fillStyle = '#e74c3c';
  ctx.strokeStyle = '#8c1c2b';
  ctx.lineWidth = 2;
  roundedRect(x, y - 18, 20, 5, 2); ctx.fill(); ctx.stroke();
}

function drawPropellerHat(cx, by, spin) {   // by = Unterkante des Huts
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#8c1c2b';
  ctx.fillStyle = '#ff5a5f';
  ctx.beginPath(); ctx.arc(cx, by, 12, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(cx - 11, by - 5, 22, 3);
  ctx.beginPath(); ctx.moveTo(cx, by - 12); ctx.lineTo(cx, by - 17); ctx.stroke();
  ctx.fillStyle = '#4dabf7';
  ctx.strokeStyle = '#1c5d99';
  ctx.beginPath();
  ctx.ellipse(cx, by - 18, Math.abs(15 * Math.cos(spin)) + 1, 2.5, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
}

function drawJetpack(cx, by) {          // by = Unterkante
  ctx.lineWidth = 2; ctx.strokeStyle = '#4a5568';
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#e74c3c';
    roundedRect(cx + s * 6 - 5, by - 22, 10, 20, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(cx + s * 6 - 5, by - 14, 10, 3);
  }
}

function drawShieldItem(cx, by) {
  const bob = Math.sin(game.time * 4) * 2;
  ctx.fillStyle = 'rgba(120,200,255,0.45)'; ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, by - 13 + bob, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx - 4, by - 17 + bob, 3, 0, Math.PI * 2); ctx.fill();
}

function drawCoinShape(x, y, r, spin) {
  const rx = Math.max(0.22, Math.abs(Math.cos(spin))) * r;   // dreht sich um die eigene Achse
  ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, rx, r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (rx > r * 0.55) {
    ctx.strokeStyle = 'rgba(184,134,11,0.8)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x, y, rx * 0.55, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawCoins() {
  const cam = game.cameraY;
  for (const c of game.coinItems) {
    const y = c.y - cam + (c.free ? 0 : Math.sin(game.time * 3 + c.t) * 2);
    if (y < -20 || y > H + 20) continue;
    drawCoinShape(c.x, y, 9, game.time * 4 + c.t);
  }
}

function drawEnemies() {
  const cam = game.cameraY;
  for (const e of game.enemies) {
    const x = e.x, y = e.y - cam;
    if (y < -60 || y > H + 40) continue;
    if (e.type === 'inker') { drawInker(e, x, y); continue; }
    const bob = Math.sin(e.t * 6) * 1.5;

    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#b06ad8';
    ctx.strokeStyle = '#6a2f95';
    ctx.beginPath();                                   // Hörner
    ctx.moveTo(x + 7, y + 6); ctx.lineTo(x + 10, y - 4 + bob); ctx.lineTo(x + 16, y + 3);
    ctx.moveTo(x + 33, y + 6); ctx.lineTo(x + 30, y - 4 + bob); ctx.lineTo(x + 24, y + 3);
    ctx.fill(); ctx.stroke();
    roundedRect(x, y + 2, e.w, e.h - 2, 14); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#ffffff';                         // zwei grimmige Augen
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + 13, y + 14, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 27, y + 14, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2d1b3d';
    ctx.beginPath(); ctx.arc(x + 14, y + 15, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 26, y + 15, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2d1b3d';                       // Augenbrauen
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 6); ctx.lineTo(x + 18, y + 10);
    ctx.moveTo(x + 33, y + 6); ctx.lineTo(x + 22, y + 10);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';                         // Zähne
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 25); ctx.lineTo(x + 14, y + 31); ctx.lineTo(x + 18, y + 25);
    ctx.lineTo(x + 22, y + 31); ctx.lineTo(x + 26, y + 25); ctx.lineTo(x + 30, y + 31);
    ctx.stroke();
  }
}

/** Tintenwerfer: wütende Tintenflasche mit Federkiel. Vor dem Schuss bläht er sich auf, zittert
 *  und der Tropfen unten wird dicker (= Vorwarnung). */
function drawInker(e, x, y) {
  const warn = e.cd > 0 && e.cd < 0.6 ? 1 - e.cd / 0.6 : 0;
  const p = game.player;
  const look = clamp((p.x - (x + e.w / 2)) / 80, -1, 1);
  const wob = Math.sin(e.t * 5) * 1.2;
  const cx = x + e.w / 2, bottom = y + e.h;

  ctx.save();
  ctx.translate(cx + Math.sin(e.t * 70) * warn * 1.3, bottom);
  ctx.scale(1 + warn * 0.12, 1 - warn * 0.09);       // aufblähen
  ctx.translate(-cx, -bottom);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const OUT = '#18215a';

  // Federkiel (wippt)
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUT; ctx.fillStyle = '#f4f6ff';
  ctx.beginPath();
  ctx.moveTo(cx + 3, y - 2 + wob);
  ctx.quadraticCurveTo(cx + 20, y - 8 + wob, cx + 17, y - 24 + wob);
  ctx.quadraticCurveTo(cx + 7, y - 17 + wob, cx + 3, y - 2 + wob);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 4, y - 3 + wob); ctx.quadraticCurveTo(cx + 12, y - 11 + wob, cx + 16, y - 22 + wob); ctx.stroke();

  // Flaschenhals + Korken
  ctx.lineWidth = 2.5;
  ctx.fillStyle = '#4a62c8';
  roundedRect(x + 13, y + 1, 14, 11, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c98a4b';
  roundedRect(x + 11, y - 3, 18, 8, 3); ctx.fill(); ctx.stroke();

  // Körper mit Farbverlauf
  const g = ctx.createLinearGradient(0, y + 8, 0, bottom);
  g.addColorStop(0, '#6a84ee'); g.addColorStop(1, '#2a3b98');
  ctx.fillStyle = g;
  roundedRect(x, y + 9, e.w, e.h - 9, 13); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';           // Glanz
  roundedRect(x + 5, y + 15, 4.5, 11, 2.2); ctx.fill();
  ctx.fillStyle = 'rgba(10,15,60,0.25)';              // Tinten-Pegel unten
  ctx.beginPath(); ctx.moveTo(x + 3, y + 28); ctx.quadraticCurveTo(cx, y + 24, x + e.w - 3, y + 28);
  ctx.lineTo(x + e.w - 5, bottom - 4); ctx.quadraticCurveTo(cx, bottom + 1, x + 5, bottom - 4); ctx.closePath(); ctx.fill();

  // Augen
  ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.fillStyle = '#ffffff';
  for (const ex of [x + 13.5, x + 26.5]) { ctx.beginPath(); ctx.ellipse(ex, y + 21, 5.6, 6.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = warn > 0.3 ? '#c0172b' : '#0c1238';
  for (const ex of [x + 13.5, x + 26.5]) { ctx.beginPath(); ctx.arc(ex + look * 2.2, y + 22.5, 2.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#0c1238'; ctx.lineWidth = 3;      // dicke, wütende Augenbrauen
  ctx.beginPath(); ctx.moveTo(x + 6.5, y + 11.5); ctx.lineTo(x + 18, y + 16.5); ctx.moveTo(x + 33.5, y + 11.5); ctx.lineTo(x + 22, y + 16.5); ctx.stroke();

  // Mund: Zackenzähne, vor dem Schuss weit offen
  if (warn > 0.15) {
    ctx.fillStyle = '#0c1238'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(cx, y + 31, 6 + warn * 2, 2.5 + warn * 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 9, y + 29); ctx.lineTo(cx - 6, y + 33.5); ctx.lineTo(cx - 3, y + 29); ctx.lineTo(cx, y + 33.5);
    ctx.lineTo(cx + 3, y + 29); ctx.lineTo(cx + 6, y + 33.5); ctx.lineTo(cx + 9, y + 29);
    ctx.stroke();
  }

  // Tropfen
  ctx.fillStyle = '#26358c'; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(cx, bottom + 2 + warn * 5, 3 + warn * 3, 4 + warn * 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawShots() {
  const cam = game.cameraY;
  for (const sh of game.shots) {
    const y = sh.y - cam;
    const sp = Math.hypot(sh.vx, sh.vy) || 1;
    ctx.fillStyle = 'rgba(44,62,122,0.35)';          // kleine Schleppe
    ctx.beginPath(); ctx.arc(sh.x - sh.vx / sp * 7, y - sh.vy / sp * 7, sh.r * 0.65, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c3e7a'; ctx.strokeStyle = '#1c2a63'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sh.x, y, sh.r + Math.sin(sh.t * 14) * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(sh.x - 2, y - 2, 1.8, 0, Math.PI * 2); ctx.fill();
  }
}

function drawParticles() {
  const cam = game.cameraY;
  for (const p of game.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.translate(p.x, p.y - cam);
    if (p.kind === 'dust') {
      ctx.globalAlpha *= 0.7;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(0, 0, p.size * (1 + (1 - p.life / p.max) * 1.2), 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'streak') {
      ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, p.size); ctx.stroke();
    } else {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }
}

function drawPlayer() {
  const p = game.player;
  // Wrap: bei Bedarf auch am anderen Bildrand zeichnen
  for (const off of [0, -W, W]) {
    const x = p.x + off;
    if (x > -PLAYER_W && x < W + PLAYER_W) drawPlayerAt(x);
  }
}

function drawPlayerAt(px) {
  const p = game.player;
  drawCharacter(p, px, p.y + PLAYER_H - game.cameraY, game.time, currentSkin());
}

/** Zeichnet die Figur mit dem Skin 'sk' (px = Mitte, feetY = Fusslinie, time = für Blinzeln & Propeller). */
function drawCharacter(p, px, feetY, time, sk) {
  const k = -p.squashAmp * Math.exp(-p.squashT * 7) * Math.cos(p.squashT * 22);  // Squash & Stretch
  const f = p.facing, up = p.vy < 0, fast = p.vy < -750 || p.propTimer > 0 || p.jetTimer > 0;
  const OUT = sk.out;
  const hat = p.propTimer > 0;      // Propeller-Hut verdeckt Kopfschmuck

  ctx.save();
  if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2) ctx.globalAlpha = 0.4;
  ctx.translate(px, feetY);
  ctx.scale(1 - k * 0.8, 1 + k);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = 2.5; ctx.strokeStyle = OUT;

  // Füsse (mit "Grosse Füsse" deutlich grösser)
  const fs = (game && p === game.player && abilityId === 'fuesse') ? 1.3 : 1;
  ctx.fillStyle = sk.feet;
  for (const fx of [-9, 9]) {
    ctx.beginPath(); ctx.ellipse(fx * (fs > 1 ? 1.15 : 1) + f * 2, (up ? -4 : -3) - (fs - 1) * 2, 7 * fs, 3.6 * fs, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // Arme: nach oben beim Steigen, seitlich beim Fallen
  const hy = up ? -33 : -15;
  for (const [w, col] of [[5, OUT], [2, sk.arm]]) {
    ctx.lineWidth = w; ctx.strokeStyle = col;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 16, -22); ctx.lineTo(s * 25, hy); ctx.stroke(); }
  }
  ctx.lineWidth = 2.5; ctx.strokeStyle = OUT;

  // Kopfschmuck hinter dem Körper (Blätter, Ohren, Antenne)
  if (!hat) drawSkinTop(sk, p, f, false);

  if (p.jetTimer > 0) drawJetpack(-f * 21, -10);      // Jetpack auf dem Rücken

  // Körper mit Farbverlauf, Bauch und Tupfen
  const g = ctx.createLinearGradient(0, -40, 0, -5);
  g.addColorStop(0, sk.body[0]); g.addColorStop(1, sk.body[1]);
  ctx.fillStyle = g;
  roundedRect(-18, -39, 36, 34, 15); ctx.fill(); ctx.stroke();
  ctx.fillStyle = sk.belly;
  ctx.beginPath(); ctx.ellipse(-f, -12, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = sk.spot;
  ctx.beginPath(); ctx.arc(-f * 12, -34, 2, 0, Math.PI * 2); ctx.arc(-f * 8, -31, 1.5, 0, Math.PI * 2); ctx.fill();

  // Augen
  const exs = [-6 + f * 4, 7 + f * 4];
  if (p.dead) {
    ctx.lineWidth = 2;
    for (const ex of exs) {
      ctx.beginPath(); ctx.moveTo(ex - 3, -31); ctx.lineTo(ex + 3, -25); ctx.moveTo(ex + 3, -31); ctx.lineTo(ex - 3, -25); ctx.stroke();
    }
  } else if (time % 3.4 < 0.12) {                 // Blinzeln
    ctx.lineWidth = 2;
    for (const ex of exs) { ctx.beginPath(); ctx.arc(ex, -28, 4, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
  } else {
    const py = clamp(p.vy / 500, -1, 1) * 1.8;          // Blick folgt der Bewegung
    for (const ex of exs) {
      ctx.fillStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ex, -28, 5.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.arc(ex + f * 1.8, -28 + py, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex + f * 1.8 + 1, -29 + py, 1, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Wangen und Mund
  ctx.fillStyle = 'rgba(255,110,140,0.55)';
  for (const cx of [-12 + f * 4, 13 + f * 4]) { ctx.beginPath(); ctx.ellipse(cx, -17, 3.6, 2.3, 0, 0, Math.PI * 2); ctx.fill(); }
  const mx = 0.5 + f * 5;
  ctx.lineWidth = 2; ctx.strokeStyle = OUT;
  if (p.dead) {
    ctx.beginPath(); ctx.moveTo(mx - 4, -15); ctx.quadraticCurveTo(mx, -19, mx + 4, -15); ctx.stroke();
  } else if (fast) {                                   // staunender, offener Mund
    ctx.fillStyle = '#7a1f2b';
    ctx.beginPath(); ctx.ellipse(mx, -16, 3.2, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(mx, -20, 4.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }

  // Kopfschmuck vor dem Körper (Schleife, Krone)
  if (!hat) drawSkinTop(sk, p, f, true);

  // Propeller-Hut (blinkt kurz vor Ende)
  if (p.propTimer > 0 && (p.propTimer > 0.6 || Math.floor(p.propTimer * 12) % 2 === 0)) {
    drawPropellerHat(0, -PLAYER_H + 4, time * 40);
  }
  // Schild-Blase (blinkt kurz vor Ende)
  if (p.shield > 0 && (p.shield > 2 || Math.floor(p.shield * 8) % 2 === 0)) {
    ctx.fillStyle = 'rgba(120,200,255,0.25)'; ctx.strokeStyle = 'rgba(43,108,176,0.8)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, -20, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/** Kopfschmuck des Skins. front=false: hinter dem Körper, front=true: davor. */
function drawSkinTop(sk, p, f, front) {
  ctx.lineWidth = 2.5; ctx.strokeStyle = sk.out;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const sway = clamp(-p.vy / 900, -0.4, 0.5) + p.vx * 0.001;

  if (sk.top === 'leaves' && !front) {               // Blatt-Schopf
    ctx.fillStyle = sk.acc;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 4, -37); ctx.rotate(s * (0.5 + sway));
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 8, -8, 0, -15); ctx.quadraticCurveTo(-s * 5, -8, 0, 0);
      ctx.fill(); ctx.stroke(); ctx.restore();
    }
  } else if (sk.top === 'ears' && !front) {          // Katzenohren
    for (const s of [-1, 1]) {
      ctx.fillStyle = sk.acc;
      ctx.beginPath(); ctx.moveTo(s * 4, -36); ctx.lineTo(s * 10, -53); ctx.lineTo(s * 17, -33); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = sk.acc2;
      ctx.beginPath(); ctx.moveTo(s * 8, -38); ctx.lineTo(s * 11, -47); ctx.lineTo(s * 14, -37); ctx.closePath(); ctx.fill();
    }
  } else if (sk.top === 'antenna' && !front) {       // Roboter-Antenne
    const ax = sway * 8;
    ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(ax, -51); ctx.stroke();
    ctx.fillStyle = sk.acc;
    ctx.beginPath(); ctx.arc(ax, -54, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (sk.top === 'curl' && !front) {          // Gespenst-Tolle
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -38); ctx.quadraticCurveTo(8 + sway * 6, -46, 2, -52); ctx.quadraticCurveTo(-2, -55, -5, -51); ctx.stroke();
  } else if (sk.top === 'bunny' && !front) {          // Hasenohren (wippen mit)
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 8, -36); ctx.rotate(s * 0.22 + sway * s * 0.5);
      ctx.fillStyle = sk.acc;
      ctx.beginPath(); ctx.ellipse(0, -13, 5.5, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = sk.acc2;
      ctx.beginPath(); ctx.ellipse(0, -12, 2.6, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  } else if (sk.top === 'antennas' && !front) {      // Alien: zwei Fühler
    for (const s of [-1, 1]) {
      const tx = s * 11 + sway * s * 6;
      ctx.beginPath(); ctx.moveTo(s * 5, -37); ctx.lineTo(tx, -52); ctx.stroke();
      ctx.fillStyle = sk.acc;
      ctx.beginPath(); ctx.arc(tx, -54, 3.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  } else if (sk.top === 'horns' && !front) {         // Drachen-Hörner
    ctx.fillStyle = sk.acc;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 3, -37); ctx.quadraticCurveTo(s * 15, -43, s * 12, -56);
      ctx.quadraticCurveTo(s * 7, -44, s * 13, -36); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  } else if (sk.top === 'headband' && front) {       // Ninja-Stirnband mit flatternden Enden
    ctx.save();
    roundedRect(-18, -39, 36, 34, 15); ctx.clip();
    ctx.fillStyle = sk.acc; ctx.fillRect(-20, -36, 40, 6);
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-20, -36); ctx.lineTo(20, -36); ctx.moveTo(-20, -30); ctx.lineTo(20, -30); ctx.stroke();
    ctx.restore();
    const bx = -f * 17;
    ctx.fillStyle = sk.acc; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, -33); ctx.lineTo(bx - f * 12, -40 + sway * 4); ctx.lineTo(bx - f * 9, -33);
    ctx.lineTo(bx - f * 13, -26 - sway * 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (sk.top === 'wizard' && front) {         // Zauberhut mit Stern
    ctx.fillStyle = sk.acc;
    ctx.beginPath(); ctx.moveTo(-15, -37); ctx.quadraticCurveTo(-2, -48, 4 + sway * 10, -66); ctx.quadraticCurveTo(8, -48, 15, -37); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -37, 20, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = sk.acc2;
    ctx.beginPath(); ctx.arc(2, -50, 2.6, 0, Math.PI * 2); ctx.fill();
  } else if (sk.top === 'bow' && front) {            // Schleife
    const bx = -f * 9, by = -40;
    ctx.fillStyle = sk.acc;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(bx, by - 2); ctx.lineTo(bx + s * 12, by - 10); ctx.lineTo(bx + s * 12, by + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = sk.acc2;
    ctx.beginPath(); ctx.arc(bx, by - 2, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (sk.top === 'crown' && front) {          // Krone
    ctx.fillStyle = sk.acc;
    ctx.beginPath();
    ctx.moveTo(-11, -37); ctx.lineTo(-12, -50); ctx.lineTo(-6, -44); ctx.lineTo(0, -53);
    ctx.lineTo(6, -44); ctx.lineTo(12, -50); ctx.lineTo(11, -37); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = sk.acc2;
    ctx.beginPath(); ctx.arc(0, -41, 2.4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawHUD() {
  ctx.lineJoin = 'round';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const font = "'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', cursive";

  ctx.font = `bold 32px ${font}`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.fillStyle = '#2d3748';
  ctx.strokeText(game.score, 14, 40);
  ctx.fillText(game.score, 14, 40);

  ctx.font = `bold 15px ${font}`;
  ctx.lineWidth = 4;
  const best = `Best: ${Math.max(highscore, game.score)}`;
  ctx.strokeText(best, 15, 62);
  ctx.fillText(best, 15, 62);
  drawCoinShape(23, 79, 8, 0);                          // Münzen dieser Runde
  ctx.font = `bold 15px ${font}`;
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.fillStyle = '#2d3748';
  ctx.strokeText(`× ${game.coins}`, 36, 85);
  ctx.fillText(`× ${game.coins}`, 36, 85);
  const pl = game.player;
  if (pl.shield > 0 && isFinite(pl.shield)) {           // Schild-Restzeit
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(15, 96, 60, 7);
    ctx.fillStyle = '#4dabf7'; ctx.fillRect(15, 96, 60 * pl.shield / SHIELD_TIME, 7);
  }
}

/* ---------------------------------------------------------------------
   10. SPIELABLAUF & HAUPTSCHLEIFE
   --------------------------------------------------------------------- */
function showScreen(name) {
  el.btnPause.classList.toggle('paused', name === 'pause' || (name === 'skins' && game.skinFrom === 'paused'));
  for (const key in screens) screens[key].classList.toggle('hidden', key !== name);
  updateMenuInfo();
}

/** Texte auf Start- und Game-Over-Bildschirm (Münzen, gewählte Fähigkeit). */
function updateMenuInfo() {
  const abil = `Fähigkeit: ${abilityName()}`;
  el.chipCoins.textContent = fmt(coinTotal);
  el.chipAbil.textContent = abil;
  el.overGain.textContent = fmt(game.coins);
  el.overTotal.textContent = fmt(coinTotal);
  el.pauseScore.textContent = fmt(game.score);
  el.pauseCoins.textContent = fmt(game.coins);
  el.pauseAbil.textContent = abil;
}

/** Zahl mit Tausendertrennung (z. B. 100'000). */
function fmt(n) { return Number(n).toLocaleString('de-CH'); }

function startGame() {
  resetGame();
  game.state = 'playing';
  if (abilityId === 'schild') game.player.shield = Infinity;   // bleibt, bis es einen Treffer abfängt
  if (abilityId === 'schub')  { game.player.propTimer = START_PROP_TIME; game.player.vy = -PROPELLER_SPEED; }
  pointers.clear();
  showScreen(null);
}

function togglePause() {
  if (game.state === 'playing') {
    game.state = 'paused';
    pointers.clear();
    showScreen('pause');
  } else if (game.state === 'paused') {
    game.state = 'playing';
    showScreen(null);
  }
}

/** Figur stirbt: bei Gegnerkontakt hüpft sie noch kurz hoch, dann fällt sie aus dem Bild. */
function die(hitEnemy) {
  const p = game.player;
  if (p.dead) return;
  p.dead = true;
  p.propTimer = 0;
  p.jetTimer = 0;
  p.shield = 0;
  p.springT = 0;
  if (hitEnemy) { p.vy = -380; game.shake = 12; }
  sfx.gameOver();
}

function endGame() {
  game.state = 'over';
  game.overAt = performance.now();
  pointers.clear();
  if (game.score > highscore) {
    highscore = game.score;
    game.newRecord = true;
    saveHighscore();
  }
  el.finalScore.textContent = game.score;
  el.finalBest.textContent = highscore;
  el.newRecord.classList.toggle('hidden', !game.newRecord);

  // Punkte der Runde zum Skin-Konto addieren und neue Skins melden
  const before = totalPoints;
  totalPoints += game.score;
  storeSet(TOTAL_KEY, totalPoints);
  const fresh = SKINS.filter(s => s.cost > before && s.cost <= totalPoints && !isOwned('s:' + s.id));
  el.newSkin.textContent = fresh.length ? `Neuer Skin: ${fresh.map(s => s.name).join(', ')}!` : '';
  el.newSkin.classList.toggle('hidden', fresh.length === 0);
  el.overProgress.textContent = progressText();
  coinTotal += game.coins;                         // gesammelte Münzen gutschreiben
  storeSet(COIN_KEY, coinTotal);
  if (fresh.length) sfx.powerup();
  showScreen('over');
}

/* ---- Skin-Menü ---- */
const PREVIEW_W = 64, PREVIEW_H = 72;       // logische Grösse der Vorschau-Bilder

/** Malt die Figur mit dem Skin 'sk' auf ein kleines Canvas (gesperrte Skins als Silhouette). */
function drawSkinPreview(cv, sk, unlocked) {
  const c = cv.getContext('2d');
  const saved = ctx;
  ctx = c;                                   // die Zeichenfunktionen benutzen das globale ctx
  try {
    c.setTransform(2, 0, 0, 2, 0, 0);
    const dummy = { vx: 0, vy: -200, facing: 1, propTimer: 0, jetTimer: 0, shield: 0,
                    invuln: 0, squashT: 9, squashAmp: 0, dead: false };
    drawCharacter(dummy, PREVIEW_W / 2, PREVIEW_H - 4, 1, sk);
    if (!unlocked) {
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(45, 55, 72, 0.8)';
      c.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
      c.globalCompositeOperation = 'source-over';
    }
  } finally {
    ctx = saved;
  }
}

function renderSkinMenu() {
  el.skinTotal.textContent = `Gesamtpunkte: ${totalPoints}`;
  el.skinProgress.textContent = progressText();

  const next = nextLockedSkin();
  let pct = 100;
  if (next) {
    const prev = SKINS.filter(s => s.cost <= totalPoints).pop();
    pct = (totalPoints - prev.cost) / (next.cost - prev.cost) * 100;
  }
  el.skinBarFill.style.width = clamp(pct, 0, 100) + '%';

  el.skinGrid.textContent = '';
  for (const sk of SKINS) {
    const unlocked = isUnlocked(sk);
    const selected = sk.id === skinId;
    const card = document.createElement('button');
    card.type = 'button';
    card.tabIndex = -1;
    card.disabled = !unlocked;
    card.className = 'skin-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');

    const cv = document.createElement('canvas');
    cv.width = PREVIEW_W * 2; cv.height = PREVIEW_H * 2;
    drawSkinPreview(cv, sk, unlocked);

    const name = document.createElement('span');
    name.className = 'skin-name';
    name.textContent = sk.name;
    const state = document.createElement('span');
    state.className = 'skin-state';
    state.textContent = !unlocked ? (sk.cost === Infinity ? 'Im Shop' : `ab ${sk.cost} Pkt.`) : selected ? 'Gewählt' : 'Wählen';

    card.append(cv, name, state);
    card.addEventListener('click', () => selectSkin(sk.id));
    el.skinGrid.appendChild(card);
  }
}

function selectSkin(id) {
  const sk = skinById(id);
  if (!sk || !isUnlocked(sk) || id === skinId) return;
  skinId = id;
  storeSet(SKIN_KEY, id);
  sfx.select();
  renderSkinMenu();
}

/** Pfeiltasten im Menü: vorheriger / nächster freigeschalteter Skin. */
function cycleSkin(dir) {
  const list = SKINS.filter(isUnlocked);
  const i = list.findIndex(s => s.id === skinId);
  selectSkin(list[(i + dir + list.length) % list.length].id);
}

function openSkins() {
  if (game.state !== 'start' && game.state !== 'over' && game.state !== 'paused') return;
  game.skinFrom = game.state;
  game.state = 'skins';
  pointers.clear();
  renderSkinMenu();
  showScreen('skins');
}

function closeSkins() {
  if (game.state !== 'skins') return;
  game.state = game.skinFrom;
  showScreen(game.state === 'start' ? 'start' : game.state === 'paused' ? 'pause' : 'over');
}

function handleSkinKey(e) {
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA':  e.preventDefault(); cycleSkin(-1); break;
    case 'ArrowRight': case 'KeyD': e.preventDefault(); cycleSkin(1); break;
    case 'Escape': case 'KeyK': case 'KeyP': case 'Space': case 'Enter':
      e.preventDefault(); if (!e.repeat) closeSkins(); break;
    case 'KeyM': if (!e.repeat) toggleMute(); break;
  }
}

/* ---- Shop: Fähigkeiten & Papierarten ---- */
let shopTab = 'abil';

/** Zustand, der im Hintergrund weiterläuft, solange ein Menü offen ist. */
function menuBase() {
  return game.state === 'skins' ? game.skinFrom : game.state === 'shop' ? game.shopFrom : game.state;
}

function drawPaperPreview(cv, pp) {
  const c = cv.getContext('2d');
  const saved = ctx;
  ctx = c;
  try {
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.beginPath(); c.rect(0, 0, 90, 44); c.clip();
    drawPaper(pp, 40, 90, 44);
  } finally {
    ctx = saved;
  }
}

/** Kleine Symbole für die Fähigkeiten im Shop. */
function drawAbilityIcon(cv, id) {
  const c = cv.getContext('2d');
  const saved = ctx;
  ctx = c;
  try {
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 2.5;
    if (id === 'glueck') {                              // Glückspilz
      c.fillStyle = '#fff3d6'; c.strokeStyle = '#8a4a12';
      roundedRect(16, 24, 12, 15, 4); c.fill(); c.stroke();
      c.fillStyle = '#e74c3c';
      c.beginPath(); c.arc(22, 26, 17, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff';
      for (const [x, y, r] of [[14, 20, 3.2], [26, 15, 3.6], [31, 22, 2.6]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    } else if (id === 'magnet') {                       // Münzmagnet
      const path = () => { c.beginPath(); c.moveTo(33, 9); c.lineTo(33, 24); c.arc(22, 24, 11, 0, Math.PI); c.lineTo(11, 9); };
      c.strokeStyle = '#8c1c2b'; c.lineWidth = 12; path(); c.stroke();
      c.strokeStyle = '#e74c3c'; c.lineWidth = 7.5; path(); c.stroke();
      for (const x of [11, 33]) {
        c.strokeStyle = '#4a5568'; c.lineWidth = 12; c.beginPath(); c.moveTo(x, 9); c.lineTo(x, 15); c.stroke();
        c.strokeStyle = '#e2e8f0'; c.lineWidth = 7.5; c.beginPath(); c.moveTo(x, 9); c.lineTo(x, 15); c.stroke();
      }
    } else if (id === 'fuesse') {                       // Grosse Füsse
      c.fillStyle = '#6cba34'; c.strokeStyle = '#2f6b1f';
      for (const x of [14, 31]) { c.beginPath(); c.ellipse(x, 28, 9.5, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
    } else if (id === 'schild') {                       // Startschild
      c.fillStyle = 'rgba(120,200,255,0.5)'; c.strokeStyle = '#2b6cb0';
      c.beginPath(); c.arc(22, 22, 16, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(15, 15, 4, 0, Math.PI * 2); c.fill();
    } else if (id === 'schub') {                        // Startschub
      c.save(); c.translate(22, 35); c.scale(1.2, 1.2);
      drawPropellerHat(0, 0, 0.8);
      c.restore();
    } else if (id === 'netz') {                         // Sicherheitsnetz
      c.strokeStyle = '#4a5568'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(9, 28); c.lineTo(6, 39); c.moveTo(35, 28); c.lineTo(38, 39); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2.5;
      c.beginPath(); c.ellipse(22, 24, 18, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.save(); c.beginPath(); c.ellipse(22, 24, 18, 7, 0, 0, Math.PI * 2); c.clip();
      c.lineWidth = 1.2; c.beginPath();
      for (let k = -4; k <= 4; k++) {
        c.moveTo(22 + k * 6 - 8, 16); c.lineTo(22 + k * 6 + 8, 32);
        c.moveTo(22 + k * 6 + 8, 16); c.lineTo(22 + k * 6 - 8, 32);
      }
      c.stroke(); c.restore();
    }
  } finally {
    ctx = saved;
  }
}

/** Einträge des aktuellen Shop-Reiters. */
function shopList() {
  if (shopTab === 'abil')  return ABILITIES.map(it => ({ it, cost: it.cost, key: 'a:' + it.id, own: isOwned('a:' + it.id), sel: abilityId === it.id }));
  if (shopTab === 'paper') return PAPERS.map(it => ({ it, cost: it.cost, key: 'p:' + it.id, own: isOwned('p:' + it.id), sel: paperId === it.id }));
  return SKINS.filter(sk => sk.cost === Infinity).map(it => ({ it, cost: SKIN_COIN_PRICE[it.id] || 0, key: 's:' + it.id, own: isUnlocked(it), sel: skinId === it.id }));
}

function renderShop() {
  const abil = shopTab === 'abil';
  el.shopCoinNum.textContent = fmt(coinTotal);
  el.tabAbil.classList.toggle('active', abil);
  el.tabPaper.classList.toggle('active', shopTab === 'paper');
  el.tabSkin.classList.toggle('active', shopTab === 'skin');
  el.shopHint.textContent = abil ? 'Pro Spiel eine Fähigkeit – antippen zum Ausrüsten'
    : shopTab === 'paper' ? 'Das Papier gilt für alle Runden'
    : 'Diese Skins gibt es nur hier';
  el.shopGrid.textContent = '';

  for (const entry of shopList()) {
    const { it, cost, own, sel } = entry;
    const afford = coinTotal >= cost;
    const card = document.createElement('button');
    card.type = 'button';
    card.tabIndex = -1;
    card.disabled = !own && !afford;
    card.className = 'skin-card shop-card' + (sel ? ' selected' : '') + (!own && !afford ? ' locked' : '') + (!own && afford ? ' can-buy' : '');

    const cv = document.createElement('canvas');
    if (abil) {
      cv.width = 88; cv.height = 88; cv.className = 'icon'; drawAbilityIcon(cv, it.id);
    } else if (shopTab === 'paper') {
      cv.width = 180; cv.height = 88; drawPaperPreview(cv, it);
    } else {
      cv.width = PREVIEW_W * 2; cv.height = PREVIEW_H * 2; cv.className = 'skinprev'; drawSkinPreview(cv, it, true);
    }
    card.append(cv);

    const name = document.createElement('span');
    name.className = 'skin-name';
    name.textContent = it.name;
    card.append(name);
    if (abil) {
      const desc = document.createElement('span');
      desc.className = 'shop-desc';
      desc.textContent = it.desc;
      card.append(desc);
    }
    const state = document.createElement('span');
    state.className = 'skin-state';
    if (!own) {
      state.classList.add('price');
      const dot = document.createElement('i');
      dot.className = 'coin-dot';
      state.append(dot, String(cost));
    } else {
      state.textContent = sel ? (abil ? 'Ausgerüstet' : 'Gewählt') : (abil ? 'Ausrüsten' : 'Wählen');
    }
    card.append(state);
    card.addEventListener('click', () => shopClick(entry));
    el.shopGrid.appendChild(card);
  }
}

function shopClick(entry) {
  const { it, cost, key } = entry;
  let bought = false;
  if (!entry.own) {
    if (coinTotal < cost) return;
    coinTotal -= cost;
    storeSet(COIN_KEY, coinTotal);
    owned.push(key);
    storeSet(OWNED_KEY, JSON.stringify(owned));
    bought = true;
  }
  if (shopTab === 'abil') {
    abilityId = (!bought && abilityId === it.id) ? '' : it.id;   // nochmal antippen = ablegen
    storeSet(ABIL_KEY, abilityId);
  } else if (shopTab === 'paper') {
    paperId = it.id;
    storeSet(PAPER_KEY, paperId);
  } else {
    skinId = it.id;
    storeSet(SKIN_KEY, skinId);
  }
  bought ? sfx.powerup() : sfx.select();
  renderShop();
  updateMenuInfo();
}

function openShop() {
  if (game.state !== 'start' && game.state !== 'over') return;
  game.shopFrom = game.state;
  game.state = 'shop';
  pointers.clear();
  renderShop();
  showScreen('shop');
}

function closeShop() {
  if (game.state !== 'shop') return;
  game.state = game.shopFrom;
  showScreen(game.state === 'start' ? 'start' : 'over');
}

function handleShopKey(e) {
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': case 'ArrowRight': case 'KeyD':
      e.preventDefault();
      { const tabs = ['abil', 'paper', 'skin'], d = (e.code === 'ArrowLeft' || e.code === 'KeyA') ? -1 : 1;
        shopTab = tabs[(tabs.indexOf(shopTab) + d + tabs.length) % tabs.length]; renderShop(); }
      break;
    case 'Escape': case 'KeyB': case 'Space': case 'Enter':
      e.preventDefault(); if (!e.repeat) closeShop(); break;
    case 'KeyM': if (!e.repeat) toggleMute(); break;
  }
}

/** Hauptschleife mit Delta-Time: Spiel läuft auf allen Bildschirmen gleich schnell. */
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastTime) lastTime = now;
  const dt = clamp((now - lastTime) / 1000, 0, MAX_DT);
  lastTime = now;

  const st = menuBase();   // in Skin-Menü und Shop läuft der Hintergrund weiter
  if (st === 'playing') update(dt);
  else if (st === 'start') updateIdle(dt);
  else if (st === 'over') updateParticles(dt);

  draw();
}

/* ---------------------------------------------------------------------
   HINTERGRUND AUSSERHALB DES HEFTES: Schulbank mit Stiften, Radierer & Co.
   (wird nur sichtbar, wenn der Bildschirm breiter/länger als das Spielfeld ist)
   --------------------------------------------------------------------- */
function drawBackdrop() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = window.innerWidth, vh = window.innerHeight;
  backdrop.width = vw * dpr; backdrop.height = vh * dpr;
  const c = backdrop.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

  const wood = c.createLinearGradient(0, 0, vw, vh);
  wood.addColorStop(0, '#b3804f'); wood.addColorStop(1, '#8a5c36');
  c.fillStyle = wood; c.fillRect(0, 0, vw, vh);
  c.lineCap = 'round';
  for (let i = 0; i < 160; i++) {                      // Holzmaserung
    const x = rnd() * vw, y = rnd() * vh, l = 60 + rnd() * 240;
    c.strokeStyle = rnd() < 0.5 ? 'rgba(60,35,15,0.13)' : 'rgba(255,225,175,0.09)';
    c.lineWidth = 1 + rnd() * 2;
    c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + l / 3, y - 5, x + 2 * l / 3, y + 5, x + l, y); c.stroke();
  }

  const r = wrapper.getBoundingClientRect();
  const s = clamp(Math.min(vw, vh) / 650, 0.55, 1.3);
  const list = [['pencil', 190], ['ruler', 230], ['eraser', 64], ['sticky', 80], ['ring', 72],
                ['sharpener', 46], ['pencil', 160], ['ring', 60], ['sticky', 66], ['eraser', 54], ['pencil', 175]];
  const placed = [];
  for (const [type, L] of list) {
    const rad = L / 2 * s;
    for (let tries = 0; tries < 60; tries++) {         // freie Stelle neben dem Heft suchen
      const x = rad + rnd() * Math.max(1, vw - 2 * rad), y = rad + rnd() * Math.max(1, vh - 2 * rad);
      const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
      if (Math.hypot(dx, dy) < rad + 14) continue;
      if (placed.some(o => Math.hypot(o.x - x, o.y - y) < o.r + rad + 8)) continue;
      placed.push({ x, y, r: rad });
      c.save(); c.translate(x, y); c.rotate(rnd() * Math.PI * 2); c.scale(s, s);
      c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 8; c.shadowOffsetY = 4;
      drawDeskItem(c, type, L);
      c.restore();
      break;
    }
  }
}

function drawDeskItem(c, type, L) {
  const x0 = -L / 2, noShadow = () => { c.shadowColor = 'transparent'; };
  c.lineJoin = 'round';
  if (type === 'pencil') {
    const h = 16;
    c.fillStyle = '#f5c518'; c.fillRect(x0 + 30, -h / 2, L - 60, h); noShadow();
    c.fillStyle = '#d9a800'; c.fillRect(x0 + 30, -h / 2 + 5, L - 60, 2.5); c.fillRect(x0 + 30, h / 2 - 7, L - 60, 2.5);
    c.fillStyle = '#f48fb1'; c.fillRect(x0, -h / 2, 18, h);
    c.fillStyle = '#b8bfc8'; c.fillRect(x0 + 18, -h / 2, 12, h);
    c.fillStyle = '#f1d3a1'; c.beginPath(); c.moveTo(L / 2 - 30, -h / 2); c.lineTo(L / 2, 0); c.lineTo(L / 2 - 30, h / 2); c.fill();
    c.fillStyle = '#2d3748'; c.beginPath(); c.moveTo(L / 2 - 8, -2.5); c.lineTo(L / 2, 0); c.lineTo(L / 2 - 8, 2.5); c.fill();
  } else if (type === 'ruler') {
    const h = 36;
    c.fillStyle = '#f2dfa8'; c.fillRect(x0, -h / 2, L, h); noShadow();
    c.strokeStyle = '#5b4630'; c.lineWidth = 1.2; c.beginPath();
    for (let i = 1; i * 10 < L; i++) { c.moveTo(x0 + i * 10, -h / 2); c.lineTo(x0 + i * 10, -h / 2 + (i % 5 ? 8 : 15)); }
    c.stroke();
  } else if (type === 'eraser') {
    c.fillStyle = '#f7f6f0'; c.fillRect(x0, -14, L, 28); noShadow();
    c.fillStyle = '#4f7fd8'; c.fillRect(x0 + L * 0.32, -14, L * 0.36, 28);
  } else if (type === 'sticky') {
    c.fillStyle = '#ffe66d'; c.fillRect(x0, x0, L, L); noShadow();
    c.strokeStyle = '#3b3b3b'; c.lineWidth = 2.2; c.fillStyle = '#3b3b3b';
    c.beginPath(); c.arc(0, 0, L * 0.28, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(-L * 0.1, -L * 0.08, 2.4, 0, 7); c.arc(L * 0.1, -L * 0.08, 2.4, 0, 7); c.fill();
    c.beginPath(); c.arc(0, 0, L * 0.15, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  } else if (type === 'ring') {                        // Tassen-Fleck
    noShadow();
    c.strokeStyle = 'rgba(70,40,20,0.35)'; c.lineWidth = 5;
    c.beginPath(); c.arc(0, 0, L / 2 - 4, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.arc(2, 1, L / 2 - 9, 0.3, 4.4); c.stroke();
  } else if (type === 'sharpener') {
    c.fillStyle = '#6c7a89'; c.fillRect(x0, -11, L, 22); noShadow();
    c.fillStyle = '#2d3748'; c.beginPath(); c.arc(x0 + 13, 0, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#8fa0b2'; c.fillRect(x0 + 26, -8, L - 32, 4);
  }
}

// Start
window.addEventListener('resize', resize);
resize();
resetGame();
showScreen('start');
requestAnimationFrame(frame);
