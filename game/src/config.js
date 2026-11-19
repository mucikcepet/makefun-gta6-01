// Costa Verde — konfigurasi pusat game. Satu tempat untuk semua angka penyeimbang,
// ukuran kota, hadiah misi, dan warna, supaya penalaan tidak tersebar di file lain.
export const CONFIG = {
  seed: 20261119,
  city: {
    halfSize: 200,        // kota membentang -200..200 di X dan Z
    roadSpacing: 40,      // jarak antar jalan
    roadWidth: 10,
    beachZ: 168,          // garis pantai: z > beachZ adalah pasir lalu laut
    seaZ: 186,
    blockInset: 8,
  },
  player: {
    walkSpeed: 6,
    runSpeed: 10,
    health: 100,
    radius: 0.7,
  },
  car: {
    accel: 22,
    brake: 34,
    maxSpeed: 34,
    reverseSpeed: 12,
    steer: 1.9,
    grip: 0.92,
  },
  traffic: {
    count: 14,
    speed: 8,
  },
  pedestrians: {
    count: 26,
    speed: 1.6,
  },
  police: {
    maxCars: 4,           // di wanted 5
    chaseSpeed: 30,
    spawnDistance: 55,
  },
  wanted: {
    decaySeconds: 22,     // tanpa kejahatan baru, satu bintang hilang tiap ini
    stealCar: 1,
    hitPedestrian: 1,
    punch: 1,
    hitCar: 0,            // tabrakan ringan tidak menaikkan bintang
  },
  missions: [
    { id: 1, name: 'Paket Kilat', reward: 250,
      brief: 'Antar paket Marco ke kios Pantai Surya. Cepat, jangan ditanya isinya.' },
    { id: 2, name: 'Kabur dari Patroli', reward: 400,
      brief: 'Patroli mengejarmu! Hilangkan mereka dan sampai ke rumah aman di Bukit Palma.' },
    { id: 3, name: 'Peti di Pelabuhan', reward: 600,
      brief: 'Kumpulkan 3 peti di dermaga timur, lalu kembali ke markas di Alun-Alun Verde.' },
  ],
  saveKey: 'costa-verde-save-v1',
};

// Palet warna kota — matahari terbenam di pantai, gedung pastel, laut biru.
export const PALETTE = {
  sky: 0x8fd3f4,
  fog: 0xa8d8ea,
  sun: 0xfff2cc,
  ground: 0x9aa578,
  road: 0x3a3f46,
  roadLine: 0xf5d76e,
  sidewalk: 0xb8b0a0,
  sand: 0xe8d29a,
  sea: 0x2e7fb8,
  seaDeep: 0x1d5f8f,
  building: [0xf2a65a, 0xe87a6b, 0x7fb8a4, 0xf2d16b, 0x9b8bd4, 0x6fa8d8, 0xe8b4b8, 0x8ecae6],
  palmTrunk: 0x8a6b4f,
  palmLeaf: 0x3f9e4d,
  carColors: [0xd94f3d, 0x3d7bd9, 0xf2c230, 0x7ac74f, 0xe8e8e8, 0x2b2b33, 0x9b59b6, 0xef8354],
  policeBody: 0x1c2733,
  policeDoor: 0xf2f2f2,
  beacon: 0xffd23e,
};
