// player.js — Dana Cruz: berjalan kaki, berlari, memukul, masuk/keluar mobil,
// mengemudi arcade, dan kamera chase yang mengikuti dari belakang.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { buildPedMesh } from './pedestrians.js';
import { resolveCollisions } from './world.js';

export class Player {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    // Dana Cruz: jaket teal khas, topi — mudah dikenali di kerumunan.
    this.mesh = buildPedMesh(0x0e7c7b, 0xf2c09a);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46),
      new THREE.MeshLambertMaterial({ color: 0xffd23e, flatShading: true }));
    cap.position.y = 2.16;
    this.mesh.add(cap);
    this.mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(this.mesh);

    this.x = 0; this.z = 40;
    this.heading = Math.PI;      // menghadap selatan (ke pantai)
    this.camYaw = Math.PI;       // kamera di belakang pemain
    this.health = CONFIG.player.health;
    this.car = null;             // mobil yang sedang dikemudikan
    this.speed = 0;              // kecepatan berjalan / mobil (m/s)
    this.walkPhase = 0;
    this.punchCooldown = 0;
    this.punchAnim = 0;
    this.invulnerable = 0;
    this.hooks = {};
  }

  get pos() { return this.car ? this.car.pos : { x: this.x, z: this.z }; }
  get inCar() { return this.car !== null; }
  get speedKmh() { return Math.abs(this.speed) * 3.6; }

  // Masuk mobil terdekat (mencuri bila mobil lalu lintas): kembalikan true bila berhasil.
  tryEnterCar(traffic) {
    if (this.car) return false;
    const car = traffic.nearestTo(this.x, this.z, 4.5);
    if (!car) return false;
    car.driven = true;
    car.speed = 0;
    this.car = car;
    this.mesh.visible = false;
    if (!car.stolen) {
      car.stolen = true;
      if (this.hooks.onSteal) this.hooks.onSteal(car);
    }
    if (this.hooks.onEnterCar) this.hooks.onEnterCar(car);
    return true;
  }

  exitCar() {
    if (!this.car) return false;
    const car = this.car;
    car.driven = false;
    car.speed = 0;
    this.car = null;
    // keluar di sisi kiri mobil
    const side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
    this.x = car.pos.x + side.x * 2.2;
    this.z = car.pos.z + side.z * 2.2;
    this.heading = car.heading;
    this.mesh.visible = true;
    this.mesh.position.set(this.x, 0, this.z);
    if (this.hooks.onExitCar) this.hooks.onExitCar(car);
    return true;
  }

  // Pukulan (F): mengenai pejalan kaki terdekat dalam 2 m di depan.
  punch(pedestrians) {
    if (this.punchCooldown > 0 || this.car) return null;
    this.punchCooldown = 0.45;
    this.punchAnim = 0.3;
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    const px = this.x + fx * 1.6, pz = this.z + fz * 1.6;
    const ped = pedestrians.nearestTo(px, pz, 1.6);
    if (ped) {
      pedestrians.knockDown(ped);
      pedestrians.panicNear(px, pz, 14);
      if (this.hooks.onPunch) this.hooks.onPunch(ped);
    }
    return ped;
  }

  damage(amount) {
    if (this.invulnerable > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invulnerable = 0.6;
    if (this.hooks.onDamage) this.hooks.onDamage(this.health);
  }

  heal(amount) { this.health = Math.min(CONFIG.player.health, this.health + amount); }

  update(dt, input, pedestrians, traffic) {
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    this.punchAnim = Math.max(0, this.punchAnim - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);

    if (this.car) {
      this.updateDriving(dt, input, pedestrians, traffic);
    } else {
      this.updateWalking(dt, input);
    }
  }

  updateWalking(dt, input) {
    // gerak relatif terhadap arah kamera
    let mx = 0, mz = 0;
    if (input.forward) { mx += -Math.sin(this.camYaw); mz += -Math.cos(this.camYaw); }
    if (input.back) { mx += Math.sin(this.camYaw); mz += Math.cos(this.camYaw); }
    if (input.left) { mx += -Math.cos(this.camYaw); mz += Math.sin(this.camYaw); }
    if (input.right) { mx += Math.cos(this.camYaw); mz += -Math.sin(this.camYaw); }
    const len = Math.hypot(mx, mz);
    const target = input.run ? CONFIG.player.runSpeed : CONFIG.player.walkSpeed;
    if (len > 0) {
      mx /= len; mz /= len;
      this.speed = target;
      this.x += mx * target * dt;
      this.z += mz * target * dt;
      const wantHeading = Math.atan2(-mx, -mz);
      this.heading = turnToward(this.heading, wantHeading, dt * 10);
      this.walkPhase += dt * target * 1.6;
      // kamera perlahan menyelaraskan diri di belakang arah gerak
      this.camYaw = turnToward(this.camYaw, this.heading, dt * 1.2);
    } else {
      this.speed = 0;
    }
    resolveCollisions(this, CONFIG.player.radius, this.colliders);
    const legL = this.mesh.getObjectByName('legL');
    const legR = this.mesh.getObjectByName('legR');
    const armL = this.mesh.getObjectByName('armL');
    const armR = this.mesh.getObjectByName('armR');
    const swing = this.speed > 0 ? Math.sin(this.walkPhase) * 0.6 : 0;
    if (legL) legL.rotation.x = swing;
    if (legR) legR.rotation.x = -swing;
    if (armL) armL.rotation.x = this.punchAnim > 0 ? -1.4 : -swing * 0.7;
    if (armR) armR.rotation.x = this.punchAnim > 0 ? -1.4 : swing * 0.7;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }

  updateDriving(dt, input, pedestrians, traffic) {
    const car = this.car;
    const C = CONFIG.car;
    if (input.forward) car.speed += C.accel * dt;
    if (input.back) car.speed -= (car.speed > 0.5 ? C.brake : C.accel * 0.6) * dt;
    if (input.brake) car.speed *= Math.max(0, 1 - 4 * dt);
    car.speed *= Math.pow(C.grip, dt * 8);
    car.speed = Math.max(-C.reverseSpeed, Math.min(C.maxSpeed, car.speed));
    let steer = 0;
    if (input.left) steer += 1;
    if (input.right) steer -= 1;
    const steerFactor = Math.min(1, Math.abs(car.speed) / 8) * (input.brake ? 1.5 : 1);
    car.heading += steer * C.steer * steerFactor * dt * Math.sign(car.speed || 1);
    const f = car.forward();
    const nx = car.pos.x + f.x * car.speed * dt;
    const nz = car.pos.z + f.z * car.speed * dt;
    const before = { x: car.pos.x, z: car.pos.z };
    car.pos.x = nx; car.pos.z = nz;
    resolveCollisions(car.pos, 1.6, this.colliders);
    const hitWall = Math.hypot(car.pos.x - before.x, car.pos.z - before.z) <
      Math.abs(car.speed) * dt * 0.5;
    if (hitWall && Math.abs(car.speed) > 6) {
      car.speed *= -0.25;
      this.damage(4);
      if (this.hooks.onCrash) this.hooks.onCrash();
    }
    // menabrak pejalan kaki
    const ped = pedestrians.nearestTo(car.pos.x, car.pos.z, 2.2);
    if (ped && Math.abs(car.speed) > 3) {
      pedestrians.knockDown(ped);
      pedestrians.panicNear(car.pos.x, car.pos.z, 16);
      car.speed *= 0.6;
      if (this.hooks.onHitPed) this.hooks.onHitPed(ped);
    }
    // bersenggolan dengan lalu lintas
    for (const other of traffic.cars) {
      if (other === car || other.driven) continue;
      const dx = other.pos.x - car.pos.x, dz = other.pos.z - car.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 3.6 && d > 0.01) {
        car.speed *= 0.55;
        other.speed = 0;
        other.pos.x += (dx / d) * 1.2;
        other.pos.z += (dz / d) * 1.2;
        if (this.hooks.onBump) this.hooks.onBump();
      }
    }
    this.speed = car.speed;
    this.camYaw = turnToward(this.camYaw, car.heading, dt * 2.2);
    car.sync();
  }

  // Kamera chase: di belakang dan sedikit di atas, memandang ke depan.
  updateCamera(camera, dt, dragDeltaX) {
    if (dragDeltaX) this.camYaw += dragDeltaX * 0.005;
    const dist = this.car ? 12.5 : 9;
    const height = this.car ? 5.2 : 4.0;
    const p = this.pos;
    const tx = p.x + Math.sin(this.camYaw) * dist;
    const tz = p.z + Math.cos(this.camYaw) * dist;
    camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 5);
    camera.position.y += (height - camera.position.y) * Math.min(1, dt * 5);
    camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 5);
    const f = { x: -Math.sin(this.camYaw), z: -Math.cos(this.camYaw) };
    camera.lookAt(p.x + f.x * 5, this.car ? 1.4 : 1.6, p.z + f.z * 5);
  }
}

function turnToward(angle, target, maxStep) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return angle + Math.max(-maxStep, Math.min(maxStep, diff));
}
