// pedestrians.js — pejalan kaki low-poly yang berjalan di trotoar,
// menghindar dari mobil, dan panik (lari) saat ada kejahatan di dekatnya.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { makeRng } from './random.js';

const rng = makeRng(CONFIG.seed + 21);
const SHIRTS = [0xe85d75, 0x4da6ff, 0xffd23e, 0x7ac74f, 0xf2f2f2, 0xff9f43, 0x9b59b6, 0x2ec4b6];
const SKINS = [0xf2c09a, 0xc98d5f, 0x8a5a3b, 0xf7d7b0];

function lam(color) { return new THREE.MeshLambertMaterial({ color, flatShading: true }); }

export function buildPedMesh(shirt, skin) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), lam(shirt));
  body.position.y = 1.15; body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), lam(skin));
  head.position.y = 1.82; head.castShadow = true;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.44), lam(0x2b2118));
  hair.position.y = 2.06; g.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.26), lam(0x2e3a4a));
  legL.position.set(-0.16, 0.38, 0); legL.name = 'legL'; g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.16; legR.name = 'legR'; g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.2), lam(shirt));
  armL.position.set(-0.42, 1.15, 0); armL.name = 'armL'; g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.42; armR.name = 'armR'; g.add(armR);
  return g;
}

export class Pedestrians {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.list = [];
    const H = CONFIG.city.halfSize;
    for (let i = 0; i < CONFIG.pedestrians.count; i++) {
      const mesh = buildPedMesh(rng.pick(SHIRTS), rng.pick(SKINS));
      scene.add(mesh);
      // mulai di trotoar: dekat jalan (offset 8 dari garis grid)
      const road = Math.floor(rng.range(-4, 5)) * 40;
      const along = rng.range(-H + 20, H - 20);
      const horizontal = rng.chance(0.5);
      const x = horizontal ? along : road + 8;
      const z = horizontal ? road + 8 : along;
      mesh.position.set(x, 0, z);
      this.list.push({
        mesh, x, z,
        heading: rng.rand() * Math.PI * 2,
        speed: CONFIG.pedestrians.speed * rng.range(0.7, 1.3),
        panic: 0,           // >0: lari menjauh dari bahaya
        walkPhase: rng.rand() * 10,
        alive: true,
      });
    }
  }
  // Dorong semua pejalan kaki dalam radius `r` dari (x,z) menjadi panik.
  panicNear(x, z, r) {
    for (const p of this.list) {
      if (!p.alive) continue;
      const dx = p.x - x, dz = p.z - z;
      if (dx * dx + dz * dz < r * r) {
        p.panic = 3;
        p.heading = Math.atan2(-dx, -dz) + Math.PI + rng.range(-0.6, 0.6);
      }
    }
  }
  nearestTo(x, z, maxDist) {
    let best = null, bestD = maxDist;
    for (const p of this.list) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }
  update(dt, dangerPos) {
    const H = CONFIG.city.halfSize;
    for (const p of this.list) {
      if (!p.alive) continue;
      if (p.panic > 0) p.panic -= dt;
      const speed = p.panic > 0 ? p.speed * 3.2 : p.speed;
      p.x += -Math.sin(p.heading) * speed * dt;
      p.z += -Math.cos(p.heading) * speed * dt;
      // belok acak sesekali; pantul di tepi kota
      if (rng.chance(dt * 0.25)) p.heading += rng.range(-1.2, 1.2);
      if (Math.abs(p.x) > H - 6 || Math.abs(p.z) > H - 6) p.heading += Math.PI;
      p.walkPhase += dt * speed * 4;
      const swing = Math.sin(p.walkPhase) * 0.55;
      const legL = p.mesh.getObjectByName('legL');
      const legR = p.mesh.getObjectByName('legR');
      const armL = p.mesh.getObjectByName('armL');
      const armR = p.mesh.getObjectByName('armR');
      if (legL) legL.rotation.x = swing;
      if (legR) legR.rotation.x = -swing;
      if (armL) armL.rotation.x = -swing * 0.7;
      if (armR) armR.rotation.x = swing * 0.7;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
    }
  }
  // Pejalan kaki yang tertabrak: jatuh (terbaring) lalu hilang sebentar, lalu bangkit di tempat baru.
  knockDown(p) {
    p.alive = false;
    p.mesh.rotation.z = Math.PI / 2;
    p.mesh.position.y = 0.3;
    setTimeout(() => {
      p.alive = true;
      p.mesh.rotation.z = 0;
      p.mesh.position.y = 0;
      p.x = rng.range(-160, 160); p.z = rng.range(-160, 160);
      p.panic = 2;
    }, 6000);
  }
}
