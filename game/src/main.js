// main.js — titik masuk Costa Verde: merangkai dunia, pemain, lalu lintas,
// polisi, misi, HUD, audio, dan efek ke dalam satu loop game.
// Juga menyediakan window.__game untuk staging screenshot dan play-test.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { buildWorld, LANDMARKS } from './world.js';
import { Traffic, Police } from './vehicles.js';
import { Pedestrians } from './pedestrians.js';
import { Player } from './player.js';
import { MissionSystem, loadSave, saveProgress, clearSave } from './missions.js';
import { HUD } from './hud.js';
import { AudioEngine } from './audio.js';
import { ParticleSystem } from './effects.js';
import { stageShot } from './shots.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.className = 'game';
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);
camera.position.set(0, 5, 55);

const world = buildWorld(scene);
const traffic = new Traffic(scene, world.colliders);
const police = new Police(scene);
const pedestrians = new Pedestrians(scene, world.colliders);
const player = new Player(scene, world.colliders);
const hud = new HUD();
const audio = new AudioEngine();
const particles = new ParticleSystem(scene);

const save = loadSave();
const missions = new MissionSystem(scene, {
  onToast: (t, s) => { hud.toast(t, s); audio.missionDone(); },
  onMoney: (m) => hud.setMoney(m),
  onWanted: (n) => setWanted(n),
  onObjective: (t, txt) => hud.setObjective(t, txt),
  onComplete: () => { saveProgress(missions); },
});
missions.load(save);

let wanted = 0;
let wantedTimer = 0;
let crimeFlash = 0;
let started = false;
let paused = false;
let dragDeltaX = 0;
let dragging = false;
let lastX = 0;

const input = { forward: false, back: false, left: false, right: false, run: false, brake: false };

function setWanted(n) {
  const rising = n > wanted;
  wanted = Math.max(0, Math.min(5, n));
  wantedTimer = 0;
  hud.setWanted(wanted);
  // Kejahatan baru mendatangkan patroli segar seketika.
  if (rising) police.respawnCooldown = 0;
  if (wanted > 0) crimeFlash = 1;
}

function addWanted(n, reason) {
  if (wanted >= 5) return;
  setWanted(wanted + n);
  if (reason) hud.toast(`DICARI POLISI — ${reason}`, 'Tingkat wanted naik!');
}

player.hooks = {
  onSteal: () => { addWanted(CONFIG.wanted.stealCar, 'Mobil dicuri'); audio.thud(0.15, 0.1); },
  onEnterCar: () => audio.blip(440, 0.08, 'square', 0.06),
  onExitCar: () => audio.blip(330, 0.08, 'square', 0.06),
  onPunch: () => { addWanted(CONFIG.wanted.punch, 'Menyerang warga'); audio.thud(0.3, 0.15); },
  onHitPed: () => { addWanted(CONFIG.wanted.hitPedestrian, 'Menabrak pejalan kaki'); audio.thud(0.3, 0.2); },
  onCrash: () => { audio.thud(0.35, 0.22); particles.burst(player.pos.x, 1, player.pos.z, 0xffaa33, 18); },
  onBump: () => { audio.thud(0.18, 0.12); },
  onDamage: (hp) => { if (hp <= 0) gameOver(); },
};

function gameOver() {
  hud.toast('DANA TERTANGKAP / ROBOH', 'Marco Vela tidak suka menunggu. Misi dimulai ulang.');
  audio.thud(0.4, 0.4);
  setTimeout(() => {
    player.health = CONFIG.player.health;
    player.heal(CONFIG.player.health);
    setWanted(0);
    police.clear();
    if (player.car) player.exitCar();
    player.x = LANDMARKS.spawn.x; player.z = LANDMARKS.spawn.z;
    player.mesh.position.set(player.x, 0, player.z);
    missions.start();
  }, 1800);
}

function startGame(fresh) {
  audio.init();
  audio.resume();
  if (fresh) {
    clearSave();
    missions.money = 0; missions.completed = []; missions.index = 0;
    player.health = CONFIG.player.health;
    setWanted(0);
  }
  hud.setMoney(missions.money);
  hud.setHealth(player.health);
  hud.setWanted(wanted);
  started = true;
  paused = false;
  hud.showGame();
  missions.start();
  hud.toast('COSTA VERDE', 'Misi 1: antar paket ke Kios Pantai Surya.');
}

// --- input keyboard ---
const KEYMAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'brake',
};
addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  if (KEYMAP[e.code]) input[KEYMAP[e.code]] = true;
  if (e.repeat) return;
  if (e.code === 'KeyE' && started && !paused) {
    if (player.car) player.exitCar();
    else if (!player.tryEnterCar(traffic)) hud.toast('Tidak ada mobil di dekat sini', 'Dekati mobil lalu tekan E.');
  }
  if (e.code === 'KeyF' && started && !paused) player.punch(pedestrians);
  if (e.code === 'KeyM') { audio.init(); hud.toast(audio.toggle() ? 'Suara: NYALA' : 'Suara: MATI'); }
  if ((e.code === 'KeyP' || e.code === 'Escape') && started) togglePause();
});
addEventListener('keyup', (e) => { if (KEYMAP[e.code]) input[KEYMAP[e.code]] = false; });

// --- input mouse: seret untuk memutar kamera ---
renderer.domElement.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; });
addEventListener('pointermove', (e) => {
  if (!dragging) return;
  dragDeltaX += e.clientX - lastX;
  lastX = e.clientX;
});
addEventListener('pointerup', () => { dragging = false; });

function togglePause() {
  paused = !paused;
  if (paused) {
    hud.showPause(`Uang: $${missions.money} · Misi selesai: ${missions.completed.length}/3 · Wanted: ${wanted} bintang · Nyawa: ${Math.round(player.health)}%`);
  } else {
    hud.hidePause();
  }
}

document.getElementById('btn-start').addEventListener('click', () => startGame(true));
document.getElementById('btn-continue').addEventListener('click', () => startGame(false));
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-restart').addEventListener('click', () => {
  hud.hidePause();
  startGame(true);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --- debug hook untuk staging screenshot & play-test ---
const game = {
  player, traffic, police, pedestrians, missions, hud, audio, world,
  scene, camera, renderer,
  get wanted() { return wanted; },
  get started() { return started; },
  set started(v) { started = v; },
  get paused() { return paused; },
  setWanted, addWanted, startGame, togglePause,
  teleport(x, z) {
    if (player.car) player.exitCar();
    player.x = x; player.z = z;
    player.mesh.position.set(x, 0, z);
  },
  state() {
    return {
      started, paused, wanted,
      money: missions.money,
      missionIndex: missions.index,
      missionActive: missions.active,
      crates: missions.cratesCollected,
      health: Math.round(player.health),
      inCar: player.inCar,
      speedKmh: Math.round(player.speedKmh),
      playerPos: { x: Math.round(player.pos.x), z: Math.round(player.pos.z) },
      policeCars: police.cars.length,
      target: missions.target,
    };
  },
};
window.__game = game;

// --- shot mode: ?shot=cover|street|chase|mission langsung main tanpa menu ---
const shotName = new URLSearchParams(location.search).get('shot');
let shotSettle = 0;
if (shotName) {
  audio.init();
  // missions.load(save) sudah dipanggil saat MissionSystem dibuat; jangan
  // dipanggil lagi di sini supaya staging shot tidak tertimpa simpanan lama.
  shotSettle = stageShot(game, shotName);
}

// --- loop utama ---
const clock = new THREE.Clock();
let elapsed = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;
  const t = clock.elapsedTime;

  if (started && !paused) {
    player.update(dt, input, pedestrians, traffic);
    traffic.update(dt, player.pos);
    pedestrians.update(dt, player.pos);
    police.update(dt, wanted, player.pos, player.speedKmh, (car) => {
      player.damage(6);
      particles.burst(car.pos.x, 1, car.pos.z, 0xff5533, 12);
      audio.thud(0.25, 0.15);
    });
    missions.update(dt, player.pos, wanted);
    particles.update(dt);
    world.update(t);

    // wanted memudar bila lama tidak berbuat kejahatan
    if (wanted > 0) {
      wantedTimer += dt;
      if (wantedTimer > CONFIG.wanted.decaySeconds && police.nearestDistance(player.pos) > 40) {
        setWanted(wanted - 1);
        hud.toast('Wanted turun', 'Polisi kehilangan jejakmu.');
      }
    }
    // regenerasi nyawa pelan saat aman
    if (wanted === 0 && player.health > 0 && player.health < CONFIG.player.health) {
      player.heal(dt * 2);
    }
    // debu dari mobil yang melaju
    if (player.car && Math.abs(player.car.speed) > 8) {
      const behind = player.car.forward();
      particles.dust(player.car.pos.x - behind.x * 2.2, player.car.pos.z - behind.z * 2.2, player.speedKmh);
    }
    // audio
    audio.setEngine(player.car ? player.speedKmh : 0);
    audio.updateSiren(dt, wanted > 0 && police.nearestDistance(player.pos) < 70);

    // HUD
    hud.setHealth(player.health);
    hud.setSpeed(player.speedKmh);
    hud.drawMinimap({
      player: { x: player.pos.x, z: player.pos.z, heading: player.car ? player.car.heading : player.heading },
      traffic: traffic.cars.filter((c) => !c.driven).map((c) => ({ x: c.pos.x, z: c.pos.z })),
      police: police.cars.map((c) => ({ x: c.pos.x, z: c.pos.z })),
      target: missions.target,
    });
    player.updateCamera(camera, dt, dragDeltaX);
  }
  dragDeltaX = 0;
  renderer.render(scene, camera);
}
document.getElementById('loading').style.display = 'none';
if (!shotName) hud.showStart();
loop();
