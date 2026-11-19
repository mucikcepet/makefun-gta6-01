// world.js — membangun kota Costa Verde: grid jalan, gedung, trotoar,
// pohon palem, pantai dan laut, langit, lampu jalan, dan landmark misi.
// Semua penempatan memakai RNG seeded dari config, jadi kota deterministik.
import * as THREE from 'three';
import { CONFIG, PALETTE } from './config.js';
import { makeRng } from './random.js';

const CITY = CONFIG.city;

// Posisi penting cerita (di persimpangan jalan supaya mudah dicapai).
export const LANDMARKS = {
  hq:        { x: 0,   z: 0,   label: 'Markas Verde' },
  kiosk:     { x: 120, z: 160, label: 'Kios Pantai Surya' },
  safehouse: { x: -160, z: -160, label: 'Rumah Aman Bukit Palma' },
  dock:      { x: 160, z: 80,  label: 'Dermaga Timur' },
  crates: [
    { x: 186, z: 62 }, { x: 186, z: 80 }, { x: 186, z: 98 },
  ],
  spawn:     { x: 0, z: 40 },
};

function flatMat(color) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMat(color));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Apakah titik (x,z) berada di jalan (termasuk trotoar)?
export function isOnRoad(x, z) {
  const s = CITY.roadSpacing, w = CITY.roadWidth / 2 + 3;
  const rx = ((x % s) + s) % s, rz = ((z % s) + s) % s;
  const nearX = rx < w || rx > s - w;
  const nearZ = rz < w || rz > s - w;
  return nearX || nearZ;
}

export function buildWorld(scene) {
  const rng = makeRng(CONFIG.seed);
  const group = new THREE.Group();
  group.name = 'CostaVerde';
  const colliders = [];
  const seaMeshes = [];

  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 180, 520);

  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.4);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -220; sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220; sun.shadow.camera.bottom = -220;
  sun.shadow.camera.far = 600;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 1.1));

  // --- tanah dasar kota ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.halfSize * 2 + 120, CITY.halfSize * 2 + 120),
    flatMat(PALETTE.ground));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 20);
  ground.receiveShadow = true;
  group.add(ground);

  // --- pasir pantai (selatan) dan laut ---
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(560, 44), flatMat(PALETTE.sand));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.05, CITY.beachZ + 8);
  sand.receiveShadow = true;
  group.add(sand);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 260), flatMat(PALETTE.sea));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.4, CITY.seaZ + 120);
  group.add(sea);
  seaMeshes.push(sea);
  const seaDeep = new THREE.Mesh(new THREE.PlaneGeometry(700, 120), flatMat(PALETTE.seaDeep));
  seaDeep.rotation.x = -Math.PI / 2;
  seaDeep.position.set(0, -0.7, CITY.seaZ + 300);
  group.add(seaDeep);
  seaMeshes.push(seaDeep);

  // --- jalan: bidang aspal + garis tengah putus-putus ---
  const roadMat = flatMat(PALETTE.road);
  const lineMat = flatMat(PALETTE.roadLine);
  const walkMat = flatMat(PALETTE.sidewalk);
  const H = CITY.halfSize;
  for (let c = -H; c <= H; c += CITY.roadSpacing) {
    for (const horizontal of [true, false]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, CITY.roadWidth), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = horizontal ? 0 : Math.PI / 2;
      road.position.set(horizontal ? 0 : c, 0.06, horizontal ? c : 0);
      road.receiveShadow = true;
      group.add(road);
      // trotoar di kedua sisi
      for (const side of [-1, 1]) {
        const walk = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, 3), walkMat);
        walk.rotation.x = -Math.PI / 2;
        walk.rotation.z = horizontal ? 0 : Math.PI / 2;
        walk.position.set(horizontal ? 0 : c + side * (CITY.roadWidth / 2 + 2), 0.07,
          horizontal ? c + side * (CITY.roadWidth / 2 + 2) : 0);
        group.add(walk);
      }
      // garis tengah
      for (let d = -H + 10; d < H; d += 16) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.6), lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.rotation.z = horizontal ? 0 : Math.PI / 2;
        dash.position.set(horizontal ? d : c, 0.08, horizontal ? c : d);
        group.add(dash);
      }
    }
  }

  // --- gedung per blok (hindari jalan, pantai, dan alun-alun pusat) ---
  const roofMat = flatMat(0x5a6b7a);
  for (let bx = -H + CITY.roadSpacing; bx < H; bx += CITY.roadSpacing) {
    for (let bz = -H + CITY.roadSpacing; bz < H; bz += CITY.roadSpacing) {
      if (bz > 120) continue;                       // kawasan pantai dibiarkan terbuka
      if (Math.abs(bx) < 45 && Math.abs(bz) < 45) continue; // alun-alun Verde
      const cx = bx + CITY.roadSpacing / 2;
      const cz = bz + CITY.roadSpacing / 2;
      const n = rng.int(1, 3);
      for (let k = 0; k < n; k++) {
        const w = rng.range(9, 15), d = rng.range(9, 15);
        const h = rng.range(7, 26) * (rng.chance(0.12) ? 1.9 : 1);
        const ox = cx + rng.range(-8, 8), oz = cz + rng.range(-8, 8);
        if (Math.abs(ox) > H - 12 || Math.abs(oz) > H - 12) continue;
        if (ox > 176 && oz > 52 && oz < 108) continue; // dermaga timur dibiarkan terbuka
        const color = rng.pick(PALETTE.building);
        const b = box(w, h, d, color, ox, h / 2, oz);
        group.add(b);
        const roof = box(w * 0.7, 0.8, d * 0.7, 0x5a6b7a, ox, h + 0.4, oz);
        roof.material = roofMat;
        group.add(roof);
        // jendela: kotak-kotak kecil menempel di fasad
        const winMat = flatMat(rng.chance(0.5) ? 0x2b4a5e : 0xffe9a8);
        const floors = Math.max(1, Math.floor(h / 4));
        for (let f = 0; f < floors; f++) {
          for (let j = 0; j < 3; j++) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), winMat);
            win.position.set(ox - w / 2 + 2.5 + j * (w / 3.2), 3 + f * 4, oz + d / 2 + 0.06);
            group.add(win);
          }
        }
        colliders.push({ minX: ox - w / 2, maxX: ox + w / 2, minZ: oz - d / 2, maxZ: oz + d / 2 });
      }
    }
  }

  // --- alun-alun Verde: air mancur + pohon ---
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1.2, 12), flatMat(0x9fc8d8));
  fountain.position.set(0, 0.6, 0); fountain.receiveShadow = true;
  group.add(fountain);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.4, 12), flatMat(0x4fb3e3));
  water.position.set(0, 1.2, 0);
  group.add(water);

  // --- pohon palem: di pantai dan di sepanjang jalan ---
  function palm(x, z, scale = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.55 * scale, 7 * scale, 6),
      flatMat(PALETTE.palmTrunk));
    trunk.position.y = 3.5 * scale; trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1 * scale, 4.5 * scale, 4), flatMat(PALETTE.palmLeaf));
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.6 * scale, 7.2 * scale, Math.sin(a) * 1.6 * scale);
      leaf.rotation.z = Math.cos(a) * 1.1;
      leaf.rotation.x = -Math.sin(a) * 1.1;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    return g;
  }
  for (let x = -180; x <= 180; x += 24) {
    group.add(palm(x + rng.range(-4, 4), CITY.beachZ - 6 + rng.range(-2, 4), rng.range(0.9, 1.3)));
  }
  for (let c = -160; c <= 160; c += 40) {
    group.add(palm(c + 14, -160 + rng.range(-2, 2), 0.9));
    group.add(palm(c - 14, 120 + rng.range(-2, 2), 0.9));
  }

  // --- lampu jalan di persimpangan ---
  const lampMat = flatMat(0x2b2b33);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let x = -160; x <= 160; x += 80) {
    for (let z = -160; z <= 160; z += 80) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6, 6), lampMat);
      pole.position.set(x + 7, 3, z + 7);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), bulbMat);
      bulb.position.set(x + 7, 6.2, z + 7);
      group.add(bulb);
    }
  }

  // --- dermaga timur: papan kayu menjorok ke laut + peti ---
  const pier = box(10, 1, 46, 0x8a6b4f, 186, 0.5, 80);
  group.add(pier);
  for (const c of LANDMARKS.crates) {
    const crate = box(2.4, 2.4, 2.4, 0xc98f2e, c.x, 1.2, c.z);
    group.add(crate);
    colliders.push({ minX: c.x - 1.2, maxX: c.x + 1.2, minZ: c.z - 1.2, maxZ: c.z + 1.2 });
  }

  // --- papan nama landmark: tiang + kotak warna di tiap titik misi ---
  function signpost(lm, color) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 5, 6), lampMat);
    pole.position.set(lm.x + 4, 2.5, lm.z + 4);
    group.add(pole);
    const board = box(4.5, 2, 0.3, color, lm.x + 4, 5.4, lm.z + 4);
    group.add(board);
  }
  signpost(LANDMARKS.hq, 0x2e9e5b);
  signpost(LANDMARKS.kiosk, 0xffd23e);
  signpost(LANDMARKS.safehouse, 0x4de3ff);
  signpost(LANDMARKS.dock, 0xef8354);

  // --- pagar kota di tepi (batas dunia) ---
  const bound = CITY.halfSize + 6;
  colliders.push({ minX: -bound - 2, maxX: -bound, minZ: -bound, maxZ: bound });
  colliders.push({ minX: bound, maxX: bound + 2, minZ: -bound, maxZ: bound });
  colliders.push({ minX: -bound, maxX: bound, minZ: -bound - 2, maxZ: -bound });
  colliders.push({ minX: -bound, maxX: bound, minZ: 210, maxZ: 212 }); // laut selatan

  scene.add(group);
  return {
    group, colliders, seaMeshes,
    bounds: bound,
    update(t) {
      // ombak: laut naik-turun pelan
      sea.position.y = -0.4 + Math.sin(t * 0.7) * 0.18;
      seaDeep.position.y = -0.7 + Math.sin(t * 0.5 + 1.3) * 0.15;
    },
  };
}

// Dorong lingkaran (x,z,r) keluar dari semua collider AABB. Mengubah pos in-place.
export function resolveCollisions(pos, radius, colliders) {
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - cx, dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
      } else {
        pos.x = c.maxX + radius;
      }
    }
  }
}
