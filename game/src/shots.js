// shots.js — staging deterministik untuk screenshot (?shot=cover|street|chase|mission).
// Setiap shot menempatkan pemain, kendaraan, polisi, dan misi pada posisi yang sama
// setiap kali, lalu membiarkan game berjalan beberapa detik supaya debu, sirene,
// dan animasi terlihat hidup. Dipakai juga oleh play-test otomatis.
export function stageShot(game, name) {
  const { player, traffic, police, missions, hud } = game;
  const params = new URLSearchParams(location.search);
  const settleSeconds = Number(params.get('settle') || 2.5);

  function placePlayerInCar(x, z, heading) {
    const car = traffic.nearestTo(x, z, 200, false);
    if (!car) return;
    car.driven = true;
    car.speed = 14;
    car.setPose(x, z, heading);
    player.car = car;
    player.mesh.visible = false;
    player.camYaw = heading;
    player.x = x; player.z = z;
  }
  function placePlayerOnFoot(x, z, heading) {
    if (player.car) player.exitCar();
    player.x = x; player.z = z;
    player.heading = heading;
    player.camYaw = heading;
    player.mesh.position.set(x, 0, z);
    player.mesh.rotation.y = heading;
  }

  if (name === 'cover') {
    // Mengemudi di jalan utama kota, HUD lengkap, wanted 2, satu polisi mengejar.
    placePlayerInCar(0, 120, Math.PI);
    game.setWanted(2);
    police.update(0.1, 2, player.pos, 0, null);
    if (police.cars[0]) police.cars[0].setPose(-6, 132, Math.PI);
    missions.index = 0;
    missions.money = 250;
    missions.start();
    hud.setMoney(250);
  } else if (name === 'street') {
    // Jalan kaki di alun-alun Verde, pejalan kaki dan lalu lintas di sekitar.
    placePlayerOnFoot(6, -8, Math.PI * 0.75);
    game.setWanted(0);
    missions.index = 0;
    missions.start();
  } else if (name === 'chase') {
    // Kejar-kejaran: wanted 4, dua polisi menempel di belakang mobil pemain.
    placePlayerInCar(-40, 40, Math.PI / 2);
    missions.index = 1;
    missions.start();
    // start() misi 2 mengatur wanted 3; untuk shot ini naikkan ke 4.
    game.setWanted(4);
    police.update(0.1, 4, player.pos, 0, null);
    if (police.cars[0]) police.cars[0].setPose(-40, 56, Math.PI / 2);
    if (police.cars[1]) police.cars[1].setPose(-48, 52, Math.PI / 2);
    if (police.cars[2]) police.cars[2].setPose(-32, 54, Math.PI / 2);
  } else if (name === 'mission') {
    // Misi 3 di dermaga: peti emas dan beacon terlihat, pemain jalan kaki mendekat.
    missions.index = 2;
    missions.completed = [1, 2];
    missions.money = 650;
    placePlayerOnFoot(170, 70, -Math.PI / 2);
    game.setWanted(1);
    missions.start();
    hud.setMoney(650);
  }
  game.started = true;
  hud.showGame();
  return settleSeconds;
}
