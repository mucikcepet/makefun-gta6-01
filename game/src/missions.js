// missions.js — cerita dan sistem misi Costa Verde.
// Tiga pekerjaan Dana Cruz, berurutan, dengan objektif, penanda di dunia,
// hadiah uang, dan simpanan progres di localStorage.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { LANDMARKS } from './world.js';

const SAVE_KEY = CONFIG.saveKey;

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { money: 0, completed: [], missionIndex: 0 };
    const s = JSON.parse(raw);
    return {
      money: typeof s.money === 'number' ? s.money : 0,
      completed: Array.isArray(s.completed) ? s.completed : [],
      missionIndex: typeof s.missionIndex === 'number' ? s.missionIndex : 0,
    };
  } catch {
    return { money: 0, completed: [], missionIndex: 0 };
  }
}

export function saveProgress(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.money,
      completed: state.completed,
      // MissionSystem menyimpan indeks di `index`; pemanggil lain di `missionIndex`.
      missionIndex: typeof state.missionIndex === 'number' ? state.missionIndex
        : (typeof state.index === 'number' ? state.index : 0),
    }));
  } catch { /* penyimpanan penuh / privat: permainan tetap jalan */ }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* abaikan */ }
}

// Penanda misi: suar cahaya emas + cincin di tanah, terlihat dari jauh.
export function buildBeacon(scene) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.6, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 13;
  g.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.1, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  g.add(ring);
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.9),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }));
  diamond.position.y = 5;
  diamond.name = 'diamond';
  g.add(diamond);
  g.visible = false;
  scene.add(g);
  return g;
}

export class MissionSystem {
  constructor(scene, hooks) {
    this.scene = scene;
    this.hooks = hooks;   // { onToast(title, sub), onMoney(amount), onWanted(n), onComplete(mission) }
    this.beacon = buildBeacon(scene);
    this.index = 0;       // misi aktif (0..2), 3 = semua selesai
    this.money = 0;
    this.completed = [];
    this.active = false;
    this.cratesCollected = 0;
    this.crateMeshes = [];
    this.target = null;   // {x, z, label}
    this.escapeTimer = 0;
    this.announced = false;
  }

  load(save) {
    this.money = save.money;
    this.completed = save.completed.slice();
    this.index = Math.min(save.missionIndex, CONFIG.missions.length);
  }

  current() { return CONFIG.missions[this.index] || null; }

  start() {
    const m = this.current();
    if (!m) {
      this.active = false;
      this.setObjective('COSTA VERDE', 'Semua pekerjaan selesai! Costa Verde milikmu, Dana. Nikmati kotanya — atau cari masalah baru.');
      this.beacon.visible = false;
      return;
    }
    this.active = true;
    this.cratesCollected = 0;
    this.announced = false;
    this.hooks.onToast(`MISI ${m.id}: ${m.name}`, m.brief);
    if (m.id === 1) this.setTarget(LANDMARKS.kiosk, 'Kios Pantai Surya');
    if (m.id === 2) {
      this.setTarget(LANDMARKS.safehouse, 'Rumah Aman Bukit Palma');
      this.hooks.onWanted(3);
      this.escapeTimer = 0;
    }
    if (m.id === 3) {
      this.setTarget(LANDMARKS.crates[0], 'Peti 1 dari 3 — Dermaga Timur');
      this.showCrates();
    }
    this.updateObjectiveText();
  }

  setTarget(point, label) {
    this.target = { x: point.x, z: point.z, label };
    this.beacon.position.set(point.x, 0, point.z);
    this.beacon.visible = true;
  }

  showCrates() {
    for (const c of LANDMARKS.crates) {
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.1),
        new THREE.MeshBasicMaterial({ color: 0xffd23e }));
      mesh.position.set(c.x, 2.2, c.z);
      mesh.name = 'crateMarker';
      this.scene.add(mesh);
      this.crateMeshes.push(mesh);
    }
  }

  hideCrates() {
    for (const m of this.crateMeshes) this.scene.remove(m);
    this.crateMeshes = [];
  }

  setObjective(title, text) {
    if (this.hooks.onObjective) this.hooks.onObjective(title, text);
  }

  updateObjectiveText() {
    const m = this.current();
    if (!m) return;
    let text = m.brief;
    if (m.id === 3) text = `Kumpulkan peti di dermaga: ${this.cratesCollected}/3, lalu kembali ke Markas Verde.`;
    if (m.id === 2) text = 'Patroli mengejarmu! Sampai ke Rumah Aman Bukit Palma sebelum mereka menangkapmu.';
    this.setObjective(`MISI ${m.id}: ${m.name} — $${m.reward}`, text);
  }

  completeMission() {
    const m = this.current();
    if (!m) return;
    this.money += m.reward;
    this.completed.push(m.id);
    this.index += 1;
    this.active = false;
    this.beacon.visible = false;
    this.hideCrates();
    this.hooks.onToast(`MISI SELESAI: ${m.name}`, `+$${m.reward} — Dana mengantongi $${this.money}.`);
    this.hooks.onMoney(this.money);
    if (this.hooks.onComplete) this.hooks.onComplete(m);
    saveProgress(this);
    setTimeout(() => this.start(), 2500);
  }

  // Dipanggil tiap frame: cek kedatangan di target, peti, dan kondisi kabur.
  update(dt, playerPos, wanted) {
    if (!this.active || !this.target) return;
    const m = this.current();
    if (!m) return;
    // animasi beacon
    this.beacon.rotation.y += dt;
    const diamond = this.beacon.getObjectByName('diamond');
    if (diamond) {
      diamond.rotation.y += dt * 2;
      diamond.position.y = 5 + Math.sin(performance.now() * 0.003) * 0.5;
    }
    for (const cm of this.crateMeshes) cm.rotation.y += dt * 1.5;

    const d = Math.hypot(playerPos.x - this.target.x, playerPos.z - this.target.z);
    if (m.id === 1) {
      if (d < 5) this.completeMission();
    } else if (m.id === 2) {
      this.escapeTimer += dt;
      if (d < 5) {
        this.hooks.onWanted(0);
        this.completeMission();
      }
    } else if (m.id === 3) {
      if (this.cratesCollected < 3) {
        const crate = LANDMARKS.crates[this.cratesCollected];
        if (Math.hypot(playerPos.x - crate.x, playerPos.z - crate.z) < 4) {
          this.cratesCollected += 1;
          const marker = this.crateMeshes[this.cratesCollected - 1];
          if (marker) this.scene.remove(marker);
          this.hooks.onToast(`PETI ${this.cratesCollected}/3`, this.cratesCollected < 3 ? 'Satu lagi di dermaga.' : 'Semua peti didapat — kembali ke Markas Verde!');
          this.updateObjectiveText();
          if (this.cratesCollected < 3) {
            const next = LANDMARKS.crates[this.cratesCollected];
            this.setTarget(next, `Peti ${this.cratesCollected + 1} dari 3`);
          } else {
            this.setTarget(LANDMARKS.hq, 'Markas Verde');
          }
        }
      } else if (d < 5) {
        this.completeMission();
      }
    }
  }
}
