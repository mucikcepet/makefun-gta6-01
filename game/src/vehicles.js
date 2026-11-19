// vehicles.js — model mobil low-poly, lalu lintas AI yang mengikuti grid jalan,
// dan mobil polisi yang mengejar pemain saat wanted naik.
import * as THREE from 'three';
import { CONFIG, PALETTE } from './config.js';
import { makeRng } from './random.js';
import { isOnRoad } from './world.js';

const rng = makeRng(CONFIG.seed + 7);

function lam(color) { return new THREE.MeshLambertMaterial({ color, flatShading: true }); }

// Membangun satu mobil dari kotak: bodi, kabin, roda, lampu. `police` menambah
// garis putih, lightbar, dan lampu strobo merah/biru yang berkedip.
export function buildCarMesh(color, police = false) {
  const car = new THREE.Group();
  const bodyColor = police ? PALETTE.policeBody : color;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 4.4), lam(bodyColor));
  body.position.y = 0.55; body.castShadow = true;
  car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.2), lam(police ? 0x22303e : 0x223344));
  cabin.position.set(0, 1.15, -0.2); cabin.castShadow = true;
  car.add(cabin);
  if (police) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.3, 4.42), lam(PALETTE.policeDoor));
    stripe.position.y = 0.55; car.add(stripe);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.5), lam(0x111111));
    bar.position.set(0, 1.55, -0.2); car.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.35, 1.68, -0.2); red.name = 'sirenRed'; car.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    blue.position.set(0.35, 1.68, -0.2); blue.name = 'sirenBlue'; car.add(blue);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = lam(0x181818);
  const wheels = [];
  for (const [x, z] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    car.add(w); wheels.push(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const x of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headMat);
    h.position.set(x, 0.6, 2.21); car.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
  for (const x of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tailMat);
    t.position.set(x, 0.6, -2.21); car.add(t);
  }
  car.userData.wheels = wheels;
  return car;
}

// Satu mobil di dunia: mesh + state mengemudi (dipakai pemain, lalu lintas, polisi).
export class Car {
  constructor(scene, color, police = false) {
    this.mesh = buildCarMesh(color, police);
    this.police = police;
    this.pos = this.mesh.position;
    this.heading = 0;          // radian, 0 = ke -Z
    this.speed = 0;
    this.steer = 0;
    this.driven = false;       // dikemudikan pemain
    this.stolen = false;
    this.sirenPhase = rng.rand() * 10;
    scene.add(this.mesh);
  }
  setPose(x, z, heading) {
    this.pos.set(x, 0, z);
    this.heading = heading;
    this.sync();
  }
  sync() {
    this.mesh.rotation.y = this.heading;
    const spin = this.speed * 0.016 / 0.38;
    for (const w of this.mesh.userData.wheels) w.rotation.x += spin;
  }
  forward() { return { x: -Math.sin(this.heading), z: -Math.cos(this.heading) }; }
}

// --- Lalu lintas AI: mobil melaju di lajur jalan, belok di persimpangan. ---
export class Traffic {
  constructor(scene, colliders) {
    this.cars = [];
    this.colliders = colliders;
    const H = CONFIG.city.halfSize;
    for (let i = 0; i < CONFIG.traffic.count; i++) {
      const car = new Car(scene, rng.pick(PALETTE.carColors));
      // mulai di jalan: satu sumbu kelipatan 40, sumbu lain acak
      const road = Math.floor(rng.range(-4, 5)) * 40;
      const along = rng.range(-H + 20, H - 20);
      const horizontal = rng.chance(0.5);
      const heading = horizontal ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2)
                                 : (rng.chance(0.5) ? 0 : Math.PI);
      car.setPose(horizontal ? along : road, horizontal ? road : along, heading);
      car.speed = CONFIG.traffic.speed * rng.range(0.8, 1.15);
      car.ai = { axis: horizontal ? 'x' : 'z', dir: Math.sign(horizontal ? Math.cos(heading) : -Math.sin(heading)) || 1 };
      this.cars.push(car);
    }
  }
  update(dt, playerPos) {
    const H = CONFIG.city.halfSize;
    for (const car of this.cars) {
      if (car.driven) continue;
      const f = car.forward();
      car.pos.x += f.x * car.speed * dt;
      car.pos.z += f.z * car.speed * dt;
      // di persimpangan: kadang belok 90 derajat
      const nearCross = Math.abs(((car.pos.x % 40) + 40) % 40) < 2.5 &&
                        Math.abs(((car.pos.z % 40) + 40) % 40) < 2.5;
      if (nearCross && rng.chance(dt * 0.5)) {
        car.heading += rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
      }
      // keluar kota: putar balik di ujung
      if (Math.abs(car.pos.x) > H - 8 || Math.abs(car.pos.z) > H - 8) {
        car.heading += Math.PI;
      }
      // menghindar kasar dari pemain yang berjalan kaki
      if (playerPos) {
        const dx = car.pos.x - playerPos.x, dz = car.pos.z - playerPos.z;
        if (dx * dx + dz * dz < 25 && car.speed > 0) {
          car.speed = Math.max(2, car.speed - 20 * dt);
        } else {
          car.speed = Math.min(CONFIG.traffic.speed, car.speed + 4 * dt);
        }
      }
      car.sync();
    }
  }
  nearestTo(x, z, maxDist, excludeDriven = true) {
    let best = null, bestD = maxDist;
    for (const car of this.cars) {
      if (excludeDriven && car.driven) continue;
      const dx = car.pos.x - x, dz = car.pos.z - z;
      const d = Math.hypot(dx, dz);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }
}

// --- Polisi: muncul sesuai wanted, mengejar dan menabrak pemain. ---
export class Police {
  constructor(scene) {
    this.scene = scene;
    this.cars = [];
    this.respawnCooldown = 0; // jeda sebelum patroli baru muncul setelah kehilangan jejak
  }
  desiredCount(wanted) {
    return wanted <= 0 ? 0 : Math.min(CONFIG.police.maxCars, wanted <= 2 ? 1 : wanted <= 3 ? 2 : wanted <= 4 ? 3 : 4);
  }
  update(dt, wanted, targetPos, targetSpeed, onRam) {
    const want = this.desiredCount(wanted);
    this.respawnCooldown = Math.max(0, this.respawnCooldown - dt);
    while (this.cars.length < want && this.respawnCooldown <= 0) {
      const car = new Car(this.scene, 0, true);
      const a = rng.rand() * Math.PI * 2;
      car.setPose(targetPos.x + Math.cos(a) * CONFIG.police.spawnDistance,
        targetPos.z + Math.sin(a) * CONFIG.police.spawnDistance, a);
      car.speed = 12;
      this.cars.push(car);
    }
    while (this.cars.length > want) {
      const car = this.cars.pop();
      this.scene.remove(car.mesh);
    }
    for (const car of this.cars) {
      // kejar: belok menuju target, gas penuh
      const dx = targetPos.x - car.pos.x, dz = targetPos.z - car.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      const wantHeading = Math.atan2(-dx, -dz);
      let diff = wantHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
      const target = Math.min(CONFIG.police.chaseSpeed, 14 + wanted * 3.2);
      car.speed += (target - car.speed) * Math.min(1, dt * 1.2);
      const f = car.forward();
      car.pos.x += f.x * car.speed * dt;
      car.pos.z += f.z * car.speed * dt;
      // menabrak target: beri kerusakan
      if (dist < 3.4) {
        car.speed *= 0.4;
        if (onRam) onRam(car);
      }
      // strobo sirene berkedip
      car.sirenPhase += dt * 8;
      const red = car.mesh.getObjectByName('sirenRed');
      const blue = car.mesh.getObjectByName('sirenBlue');
      const on = Math.sin(car.sirenPhase) > 0;
      if (red) red.visible = on;
      if (blue) blue.visible = !on;
      car.sync();
      // polisi yang tertinggal terlalu jauh kehilangan jejak dan mundur;
      // patroli baru baru muncul setelah jeda, supaya wanted bisa memudar.
      if (dist > 160) {
        this.scene.remove(car.mesh);
        this.cars.splice(this.cars.indexOf(car), 1);
        this.respawnCooldown = 3;
      }
    }
  }
  nearestDistance(targetPos) {
    let best = Infinity;
    for (const car of this.cars) {
      best = Math.min(best, Math.hypot(car.pos.x - targetPos.x, car.pos.z - targetPos.z));
    }
    return best;
  }
  clear() {
    for (const car of this.cars) this.scene.remove(car.mesh);
    this.cars = [];
  }
}
