// RNG deterministik (mulberry32) + helper acak.
// Semua penempatan kota, warna gedung, dan lalu lintas memakai RNG ini,
// jadi kota yang sama selalu terbangun sama dari seed yang sama.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const rand = mulberry32(seed);
  return {
    rand,
    range(min, max) { return min + rand() * (max - min); },
    int(min, max) { return Math.floor(min + rand() * (max - min + 1)); },
    pick(arr) { return arr[Math.floor(rand() * arr.length)]; },
    chance(p) { return rand() < p; },
    // Hash posisi jadi 0..1 yang stabil — untuk variasi tanpa menyimpan state.
    hash2(x, z) {
      let h = (Math.floor(x * 7.13) * 374761393 + Math.floor(z * 9.71) * 668265263) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    },
  };
}
