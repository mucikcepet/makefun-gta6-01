// effects.js — partikel ringan dengan THREE.Points: debu saat mobil melaju,
// percikan tabrakan, dan kilau saat mengambil peti. Satu sistem, dipakai ulang.
import * as THREE from 'three';

const MAX = 420;

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.positions = new Float32Array(MAX * 3);
    this.velocities = [];
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.colors = new Float32Array(MAX * 3);
    this.cursor = 0;
    for (let i = 0; i < MAX; i++) {
      this.velocities.push(new THREE.Vector3());
      this.positions[i * 3 + 1] = -100; // sembunyikan di bawah tanah
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.color = new THREE.Color();
  }

  spawn(x, y, z, colorHex, count, spread = 1.6, up = 2.2, life = 0.8) {
    this.color.setHex(colorHex);
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % MAX;
      this.positions[i * 3] = x + (Math.random() - 0.5) * spread;
      this.positions[i * 3 + 1] = y + Math.random() * 0.5;
      this.positions[i * 3 + 2] = z + (Math.random() - 0.5) * spread;
      this.velocities[i].set((Math.random() - 0.5) * 3, Math.random() * up, (Math.random() - 0.5) * 3);
      this.colors[i * 3] = this.color.r;
      this.colors[i * 3 + 1] = this.color.g;
      this.colors[i * 3 + 2] = this.color.b;
      this.life[i] = life * (0.6 + Math.random() * 0.7);
      this.maxLife[i] = this.life[i];
    }
  }

  dust(x, z, speedKmh) {
    if (speedKmh < 25 || Math.random() > 0.5) return;
    this.spawn(x, 0.3, z, 0xcbb98f, 2, 2.2, 1.2, 0.7);
  }

  burst(x, y, z, colorHex, count = 22) {
    this.spawn(x, y, z, colorHex, count, 1.2, 3.5, 0.9);
  }

  update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.positions[i * 3 + 1] = -100; continue; }
      this.positions[i * 3] += this.velocities[i].x * dt;
      this.positions[i * 3 + 1] += this.velocities[i].y * dt;
      this.positions[i * 3 + 2] += this.velocities[i].z * dt;
      this.velocities[i].y -= 4 * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
