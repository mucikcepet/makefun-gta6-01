# Costa Verde — Kota Panas, Jalan Panas

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/mucikcepet/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/mucikcepet/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Game open-world crime orisinal di kota pantai **Costa Verde**. Kamu **Dana Cruz**,
kurir lepas yang berutang pada Marco Vela, bos pelabuhan. Selesaikan tiga pekerjaan
berbahaya sebelum matahari terbenam — antar paket, kabur dari patroli, dan kumpulkan
peti di dermaga — sambil menjelajahi kota dengan berjalan kaki atau di balik kemudi.

## Yang ada di game

- **Kota terbuka** — grid jalan, gedung pastel, alun-alun dengan air mancur, pohon
  palem, pantai dan laut yang berombak, lampu jalan, dan dermaga timur.
- **Jalan kaki & mengemudi** — curi mobil apa pun di jalan (tombol E), kemudi arcade
  dengan rem tangan, kamera chase yang mengikuti.
- **Lalu lintas & pejalan kaki** — mobil AI mengikuti jalan dan belok di persimpangan;
  warga berjalan di trotoar dan panik saat ada kejahatan.
- **Wanted level 1–5 bintang** — polisi mengejar, menabrak, dan menyalakan sirene;
  bintang memudar kalau kamu lama menghilang.
- **3 misi + cerita** — Paket Kilat ($250), Kabur dari Patroli ($400),
  Peti di Pelabuhan ($600), dengan beacon emas, objektif HUD, dan hadiah uang.
- **Combat sederhana** — pukul (F), tabrak dengan mobil; nyawa dan regenerasi saat aman.
- **HUD lengkap** — bintang wanted, uang, nyawa, kecepatan, objektif misi,
  dan minimap top-down live.
- **Suara prosedural WebAudio** — dengung mesin, sirene dua nada, blip misi,
  bunyi tabrakan. Tanpa file audio.
- **Efek partikel** — debu jalan, percikan tabrakan, kilau peti.
- **Menu & simpanan** — start screen, jeda (P), progres tersimpan di localStorage.

## Kontrol

| Tombol | Aksi |
| --- | --- |
| W A S D / panah | Jalan / mengemudi |
| Shift | Lari |
| E | Masuk / keluar mobil |
| F | Pukul |
| Spasi | Rem tangan |
| P / Esc | Jeda |
| M | Suara nyala / mati |
| Seret mouse | Putar kamera |

## Run it

```sh
node serve.ts
```

Lalu buka http://localhost:8080 di desktop Chrome. Atau sajikan `game/` dengan
server statis apa pun dan buka `game/index.html`. Game tidak memakai jaringan:
semua file lokal di bawah `game/` (three.js divendor sebagai
`game/vendor/three.module.min.js`).

## Struktur kode

- `game/src/config.js` — penyeimbang & palet
- `game/src/random.js` — RNG seeded (kota deterministik)
- `game/src/world.js` — kota: jalan, gedung, pantai, laut, landmark
- `game/src/vehicles.js` — model mobil, lalu lintas AI, polisi
- `game/src/pedestrians.js` — pejalan kaki
- `game/src/player.js` — Dana Cruz: jalan kaki, mengemudi, kamera
- `game/src/missions.js` — misi, cerita, simpanan
- `game/src/hud.js` — HUD & minimap
- `game/src/audio.js` — suara prosedural WebAudio
- `game/src/effects.js` — partikel
- `game/src/shots.js` — staging deterministik untuk screenshot
- `game/src/main.js` — loop & wiring

Kota, karakter, kendaraan, nama, dan cerita semuanya orisinal — bukan tiruan
game komersial apa pun.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0vawvfxh&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
