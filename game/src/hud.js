// hud.js — HUD DOM: bintang wanted, uang, nyawa, kecepatan, objektif,
// minimap canvas top-down, toast, layar mulai/jeda, dan vignette kerusakan.
import { CONFIG } from './config.js';

export class HUD {
  constructor() {
    this.el = {
      hud: document.getElementById('hud'),
      stars: document.getElementById('stars'),
      money: document.getElementById('money'),
      healthFill: document.getElementById('health-fill'),
      speedNum: document.getElementById('speed-num'),
      objTitle: document.getElementById('obj-title'),
      objText: document.getElementById('obj-text'),
      minimap: document.getElementById('minimap'),
      toast: document.getElementById('toast'),
      hint: document.getElementById('hint'),
      vignette: document.getElementById('vignette'),
      start: document.getElementById('start-screen'),
      pause: document.getElementById('pause-screen'),
      pauseStats: document.getElementById('pause-stats'),
    };
    this.mm = this.el.minimap.getContext('2d');
    this.toastTimer = 0;
    this.lastWanted = -1;
    this.lastMoney = -1;
  }

  showGame() {
    this.el.hud.style.display = 'block';
    this.el.start.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    document.getElementById('loading').style.display = 'none';
  }
  showStart() {
    this.el.start.classList.remove('hidden');
    this.el.pause.classList.add('hidden');
    document.getElementById('loading').style.display = 'none';
  }
  showPause(statsText) {
    this.el.pauseStats.textContent = statsText;
    this.el.pause.classList.remove('hidden');
  }
  hidePause() { this.el.pause.classList.add('hidden'); }

  setWanted(n) {
    if (n === this.lastWanted) return;
    this.lastWanted = n;
    let html = '';
    for (let i = 0; i < 5; i++) html += `<span class="${i < n ? '' : 'off'}">★</span>`;
    this.el.stars.innerHTML = html;
  }
  setMoney(amount) {
    if (amount === this.lastMoney) return;
    this.lastMoney = amount;
    this.el.money.textContent = `$${amount.toLocaleString('id-ID')}`;
  }
  setHealth(hp) {
    this.el.healthFill.style.width = `${Math.max(0, hp)}%`;
    this.el.vignette.style.opacity = hp < 35 ? String((35 - hp) / 35 * 0.9) : '0';
  }
  setSpeed(kmh) { this.el.speedNum.textContent = String(Math.round(kmh)); }
  setObjective(title, text) {
    this.el.objTitle.textContent = title;
    this.el.objText.textContent = text;
  }
  toast(title, sub = '') {
    this.el.toast.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
    this.el.toast.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.el.toast.style.opacity = '0'; }, 3200);
  }

  // Minimap: jalan sebagai garis, laut di selatan, pemain panah putih,
  // lalu lintas titik kuning, polisi merah, target misi emas.
  drawMinimap(state) {
    const ctx = this.mm;
    const S = 180, H = CONFIG.city.halfSize;
    const toMap = (x, z) => [((x + H) / (2 * H)) * S, ((z + H) / (2 * H)) * S];
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#274b34';
    ctx.fillRect(0, 0, S, S);
    // laut di selatan
    const [, seaY] = toMap(0, 168);
    ctx.fillStyle = '#2e7fb8';
    ctx.fillRect(0, seaY, S, S - seaY);
    ctx.fillStyle = '#e8d29a';
    ctx.fillRect(0, seaY - 4, S, 5);
    // jalan grid
    ctx.strokeStyle = '#4a4f57';
    ctx.lineWidth = 5;
    for (let c = -H; c <= H; c += 40) {
      const [x] = toMap(c, 0); const [, y] = toMap(0, c);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke();
    }
    // alun-alun
    const [cx, cy] = toMap(0, 0);
    ctx.fillStyle = '#9fc8d8';
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
    // target misi
    if (state.target) {
      const [tx, ty] = toMap(state.target.x, state.target.z);
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(tx, ty, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tx, ty, 8 + Math.sin(performance.now() / 300) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    // lalu lintas
    ctx.fillStyle = '#f2c230';
    for (const c of state.traffic || []) {
      const [x, y] = toMap(c.x, c.z);
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    // polisi
    ctx.fillStyle = '#ff3333';
    for (const c of state.police || []) {
      const [x, y] = toMap(c.x, c.z);
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // pemain: panah mengikuti arah hadap
    const [px, py] = toMap(state.player.x, state.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-state.player.heading);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
