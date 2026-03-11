// --- CONFIGURAÇÃO DA CENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Céu azul claro
scene.fog = new THREE.Fog(0x87CEEB, 1, 40);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let cameraPitch = 0;
let cameraYaw = 0;
const eyeHeight = 1.7;

// --- ESTADO DO JOGO ---
let playerMaxHealth = 200;
let playerHealth = playerMaxHealth;
let missionComplete = false;
let isDead = false;
let bullets = [];
let enemies = [];
let enemyBullets = [];
let traps = [];
let footprints = [];
let colliders = [];
const clock = new THREE.Clock();

// --- ESTATÍSTICAS ---
let startTime = 0;
let enemiesKilled = 0;
let deathCount = 0;

let playerVelocityY = 0;
const gravity = -0.008;
let isGrounded = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(50, 100, 50);
sunLight.castShadow = true;
scene.add(sunLight);

const groundGeo = new THREE.PlaneGeometry(2000, 2000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a2e1a });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const playerGroup = new THREE.Group();
scene.add(playerGroup);

const playerWeapon = new THREE.Group();
const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
playerWeapon.add(gunBody);
const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
muzzle.rotation.x = Math.PI / 2;
muzzle.position.z = -0.3;
playerWeapon.add(muzzle);
scene.add(playerWeapon);

// --- ASSETS DA FLORESTA ---
const forestGroup = new THREE.Group();
scene.add(forestGroup);
const TREE_COUNT = 4000;
const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.7, 1, 8), new THREE.MeshStandardMaterial({ color: 0x2b1d0e }), TREE_COUNT);
const leafMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshStandardMaterial({ color: 0x0a2b0a }), TREE_COUNT * 4);
trunkMesh.castShadow = leafMesh.castShadow = true;

const dummy = new THREE.Object3D();
const forestColliders = [];
for (let i = 0; i < TREE_COUNT; i++) {
    const rx = (Math.random() - 0.5) * 850;
    const rz = (Math.random() - 0.5) * 850;
    if (Math.abs(rx) < 5 && Math.abs(rz) < 10) { i--; continue; }
    const trunkH = 12 + Math.random() * 25;
    dummy.position.set(rx, trunkH / 2, rz);
    dummy.scale.set(1, trunkH, 1);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 4; j++) {
        dummy.position.set(rx + (Math.random() - 0.5) * 4, trunkH * 0.75 + Math.random() * 6, rz + (Math.random() - 0.5) * 4);
        const scale = 6 + Math.random() * 4;
        dummy.scale.set(scale, scale * 0.7, scale);
        dummy.updateMatrix();
        leafMesh.setMatrixAt(i * 4 + j, dummy.matrix);
    }
    forestColliders.push({ type: 'circle', x: rx, z: rz, radius: 0.8 });
}
forestGroup.add(trunkMesh);
forestGroup.add(leafMesh);

const artifactPos = { x: 0, z: -180 };
const artifact = new THREE.Mesh(new THREE.OctahedronGeometry(2, 0), new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 5 }));
artifact.position.set(artifactPos.x, 3, artifactPos.z);
forestGroup.add(artifact);

// --- ASSETS DO CARRO (FINAL) ---
let escapeCar;
function createEscapeCar(x, z) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    body.position.y = 1; car.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 2.5), new THREE.MeshStandardMaterial({ color: 0x444444 }));
    roof.position.set(0, 2, 0); car.add(roof);
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (let i = 0; i < 4; i++) {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(i < 2 ? 1.3 : -1.3, 0.5, i % 2 === 0 ? 1.8 : -1.8);
        car.add(w);
    }
    car.position.set(x, 0, z);
    scene.add(car);
    escapeCar = car;
}

createEscapeCar(0, -300); // Carro direto na floresta

// --- PEGADAS ---
const footGeo = new THREE.CircleGeometry(0.2, 8);
const footMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 });

function createFootprintTrail(startPos, targetPos) {
    footprints.forEach(f => scene.remove(f));
    footprints = [];
    const dir = new THREE.Vector3(targetPos.x - startPos.x, 0, targetPos.z - startPos.z);
    const totalDist = dir.length();
    const normDir = dir.normalize();
    const stepCount = Math.floor(totalDist / 4);

    for (let i = 1; i < stepCount; i++) {
        const foot = new THREE.Mesh(footGeo, footMat);
        const pos = startPos.clone().addScaledVector(normDir, i * 4);
        foot.position.set(pos.x + (i % 2 === 0 ? 0.3 : -0.3), 0.02, pos.z);
        foot.rotation.x = -Math.PI / 2;
        foot.rotation.z = Math.atan2(normDir.x, normDir.z);
        scene.add(foot);
        footprints.push(foot);
    }
}

function saveRanking(t, k, d) {
    const r = JSON.parse(localStorage.getItem('amazonas_best_runs') || '[]');
    r.push({ time: t, kills: k, deaths: d, date: new Date().toLocaleDateString() });
    r.sort((a, b) => a.time - b.time || b.kills - a.kills || a.deaths - b.deaths);
    localStorage.setItem('amazonas_best_runs', JSON.stringify(r.slice(0, 5))); return r.slice(0, 5);
}

function showResultScreen(timeSec) {
    const top5 = saveRanking(timeSec, enemiesKilled, deathCount);
    const resDiv = document.createElement('div'); resDiv.id = 'mission-complete-screen';
    resDiv.style = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#ffff00;font-size:1.6rem;text-align:center;font-weight:bold;z-index:2000;background:rgba(0,0,0,0.95);padding:30px;border-radius:20px;width:400px;border:2px solid #ffff00;";
    let h = "<div style='color:#00ffff;font-size:1.2rem;margin-top:15px;'>🏆 GLOBAL RANKING</div>";
    top5.forEach((run, i) => { h += `<div style='font-size:0.8rem;color:white;text-align:left;margin:6px 0;'>${i + 1}. ${Math.floor(run.time / 60)}m ${run.time % 60}s | 🎯 ${run.kills} | 💀 ${run.deaths}</div>`; });
    resDiv.innerHTML = `<div style='font-size:2rem;'>MISSION COMPLETE!</div><div style='font-size:1rem;color:white;margin:15px 0;background:rgba(255,255,255,0.1);padding:10px;'>⏱️ Time: ${Math.floor(timeSec / 60)}m ${timeSec % 60}s<br>🎯 Kills: ${enemiesKilled}<br>💀 Deaths: ${deathCount}</div>${h}<button onclick="location.reload()" style='margin-top:20px;padding:12px 25px;font-size:1.1rem;background:#ffff00;color:black;border:none;cursor:pointer;font-weight:bold;'>NEW RUN</button>`;
    document.body.appendChild(resDiv);
}

// --- INIMIGOS ---
function createEnemy(x, z, type = 'rifle') {
    const enemy = new THREE.Group();
    let colorBody = 0x111111;
    let hp = 60;
    let speed = 0.08;

    if (type === 'knife') colorBody = 0x224422;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.3), new THREE.MeshStandardMaterial({ color: colorBody }));
    body.position.y = 1.15; enemy.add(body);
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    lLeg.position.set(-0.15, 0.35, 0); enemy.add(lLeg);
    const rLeg = lLeg.clone(); rLeg.position.set(0.15, 0.35, 0); enemy.add(rLeg);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xd2b48c }));
    head.position.y = 1.7; enemy.add(head);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), new THREE.MeshStandardMaterial({ color: 0xd2b48c }));
    lArm.position.set(-0.35, 1.2, 0); enemy.add(lArm);
    const rArm = lArm.clone(); rArm.position.set(0.35, 1.2, 0.2); enemy.add(rArm);

    let weapon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.9), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    weapon.position.set(0.4, 1.1, 0.4); enemy.add(weapon);

    const barFill = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    barFill.position.y = 2.1; barFill.position.z = 0.01; enemy.add(barFill);

    enemy.position.set(x, 0, z);
    enemy.userData = { type, maxHealth: hp, health: hp, lastShot: 0, animTime: Math.random() * 10, lLeg, rLeg, lArm, rArm, barFill, speed };
    scene.add(enemy); enemies.push(enemy);
    return enemy;
}

function spawnForestEntities() {
    enemies.forEach(e => scene.remove(e)); enemies = [];
    traps.forEach(t => scene.remove(t)); traps = [];
    colliders = [...forestColliders];

    for (let i = 0; i < 150; i++) {
        const type = i < 70 ? 'rifle' : 'knife';
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 400;
        createEnemy(artifactPos.x + Math.cos(angle) * dist, artifactPos.z + Math.sin(angle) * dist, type);
    }

    for (let i = 0; i < 400; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 380;
        const rx = artifactPos.x + Math.cos(angle) * dist;
        const rz = artifactPos.z + Math.sin(angle) * dist;
        createTrap(rx, rz, Math.random() > 0.5 ? 'spike' : 'blade');
    }
}

function createTrap(x, z, type) {
    const trap = new THREE.Group();
    if (type === 'spike') {
        const spikeGeo = new THREE.ConeGeometry(0.3, 2, 4);
        for (let j = 0; j < 4; j++) {
            const s = new THREE.Mesh(spikeGeo, new THREE.MeshStandardMaterial({ color: 0x555555 }));
            s.position.set((j % 2 - 0.5) * 0.8, -1.5, (Math.floor(j / 2) - 0.5) * 0.8); trap.add(s);
        }
        trap.userData = { type: 'spike', state: 'waiting', timer: Math.random() * 2 };
    } else if (type === 'blade') {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0x999999 }));
        blade.position.y = 0.5; trap.add(blade); trap.userData = { type: 'blade' };
    }
    trap.position.set(x, 0, z);
    scene.add(trap); traps.push(trap);
}

// --- LÓGICA DE TIRO ---
function shootBullet(isPlayer, startPos, direction) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: isPlayer ? 0xffff00 : 0xff0000 }));
    mesh.position.copy(startPos);
    const bd = { mesh, direction: direction.clone().normalize(), speed: 0.8, isPlayer, life: 100 };
    scene.add(mesh);
    if (isPlayer) bullets.push(bd); else enemyBullets.push(bd);
}

// --- TELAS E RESPAWN ---
function openDeathScreen() {
    isDead = true; deathCount++; document.getElementById('death-count-hud').innerText = deathCount;
    document.getElementById('game-over').style.display = 'flex'; document.exitPointerLock();
}

function respawnPlayer() {
    const penalty = deathCount * 40;
    playerGroup.position.set((Math.random() - 0.5) * 20, 0, 150 + penalty);
    playerHealth = playerMaxHealth; playerVelocityY = 0; isDead = false;
    document.getElementById('health-bar').style.width = '100%'; document.getElementById('game-over').style.display = 'none';
    spawnForestEntities(); createFootprintTrail(playerGroup.position, artifact.position);
}

window.resetGame = function () { respawnPlayer(); document.body.requestPointerLock(); }

const keys = {};
document.getElementById('start-screen').addEventListener('click', () => {
    document.body.requestPointerLock(); document.getElementById('start-screen').style.display = 'none';
    if (startTime === 0) startTime = Date.now();
    respawnPlayer();
});

window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);
window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body && !isDead) {
        cameraYaw -= e.movementX * 0.003; cameraPitch = Math.max(-0.9, Math.min(0.9, cameraPitch - e.movementY * 0.003));
    }
});
window.addEventListener('mousedown', () => {
    if (document.pointerLockElement === document.body && !missionComplete && !isDead) shootBullet(true, camera.position.clone(), new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
});

function animate() {
    requestAnimationFrame(animate); const delta = clock.getDelta();
    if (missionComplete || isDead) { renderer.render(scene, camera); return; }
    if (playerHealth <= 0) { openDeathScreen(); return; }

    playerVelocityY += gravity; playerGroup.position.y += playerVelocityY;
    if (playerGroup.position.y < 0) { playerGroup.position.y = 0; playerVelocityY = 0; isGrounded = true; }
    if (isGrounded && keys['Space']) { playerVelocityY = 0.18; isGrounded = false; }

    const mZ = (keys['KeyW'] ? -1 : 0) - (keys['KeyS'] ? -1 : 0); const mX = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    if (mX !== 0 || mZ !== 0) {
        const moveDir = new THREE.Vector3(mX, 0, mZ).normalize().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw));
        let nextX = playerGroup.position.x + moveDir.x * 0.22; let nextZ = playerGroup.position.z + moveDir.z * 0.22;
        let canMoveX = true; let canMoveZ = true;
        for (const col of colliders) {
            if (col.type === 'circle') {
                if ((nextX - col.x) ** 2 + (playerGroup.position.z - col.z) ** 2 < (col.radius + 0.5) ** 2) canMoveX = false;
                if ((playerGroup.position.x - col.x) ** 2 + (nextZ - col.z) ** 2 < (col.radius + 0.5) ** 2) canMoveZ = false;
            }
        }
        if (canMoveX) playerGroup.position.x = nextX; if (canMoveZ) playerGroup.position.z = nextZ;
    }

    camera.position.set(playerGroup.position.x, playerGroup.position.y + eyeHeight, playerGroup.position.z);
    camera.rotation.set(cameraPitch, cameraYaw, 0, 'YXZ');
    playerWeapon.position.copy(camera.position); playerWeapon.quaternion.copy(camera.quaternion);
    playerWeapon.translateZ(-0.5); playerWeapon.translateX(0.3); playerWeapon.translateY(-0.25);

    bullets.forEach(b => {
        b.mesh.position.addScaledVector(b.direction, b.speed); b.life--;
        enemies.forEach((en, j) => {
            if (b.mesh.position.distanceTo(en.position.clone().add(new THREE.Vector3(0, 1.2, 0))) < 1.3) {
                en.userData.health -= 20; b.life = 0; const pct = Math.max(0, en.userData.health / en.userData.maxHealth); en.userData.barFill.scale.x = pct;
                if (en.userData.health <= 0) { scene.remove(en); enemies.splice(j, 1); enemiesKilled++; document.getElementById('kill-count-hud').innerText = enemiesKilled; }
            }
        });
    });
    enemyBullets.forEach(b => {
        b.mesh.position.addScaledVector(b.direction, b.speed); b.life--;
        if (b.mesh.position.distanceTo(playerGroup.position.clone().add(new THREE.Vector3(0, 1, 0))) < 0.8) {
            playerHealth -= 12; b.life = 0; document.getElementById('health-bar').style.width = (playerHealth / playerMaxHealth * 100) + '%';
        }
    });
    bullets = bullets.filter(b => { if (b.life <= 0) scene.remove(b.mesh); return b.life > 0; });
    enemyBullets = enemyBullets.filter(b => { if (b.life <= 0) scene.remove(b.mesh); return b.life > 0; });

    traps.forEach(trap => {
        const ud = trap.userData; const d = playerGroup.position.distanceTo(trap.position);
        if (ud.type === 'spike') {
            if (ud.state === 'waiting') { ud.timer -= delta; if (ud.timer <= 0) ud.state = 'rising'; }
            else if (ud.state === 'rising') { trap.children.forEach(s => s.position.y += 0.4); if (trap.children[0].position.y >= 1.5) ud.state = 'falling'; }
            else if (ud.state === 'falling') { trap.children.forEach(s => s.position.y -= 0.1); if (trap.children[0].position.y <= -1.5) { ud.state = 'waiting'; ud.timer = 1.2; } }
            if (trap.children[0].position.y > 0 && d < 1.5 && playerGroup.position.y < 0.5) openDeathScreen();
        } else if (ud.type === 'blade') { trap.rotation.y += 0.25; if (d < 2.0 && playerGroup.position.y < 0.4) openDeathScreen(); }
    });

    enemies.forEach(en => {
        const ud = en.userData; const d = en.position.distanceTo(playerGroup.position);
        if (d < 45) {
            en.lookAt(playerGroup.position);
            if (d > (ud.type === 'rifle' ? 12 : 1.3)) {
                en.position.addScaledVector(playerGroup.position.clone().sub(en.position).normalize(), ud.speed);
                ud.animTime += delta * 12; ud.lLeg.rotation.x = Math.sin(ud.animTime) * 0.5; ud.rLeg.rotation.x = -Math.sin(ud.animTime) * 0.5;
            } else if (Date.now() - ud.lastShot > 1400) {
                shootBullet(false, en.position.clone().add(new THREE.Vector3(0, 1.5, 0)), playerGroup.position.clone().sub(en.position).normalize()); ud.lastShot = Date.now();
            }
        }
    });

    if (playerGroup.position.distanceTo(artifact.position) < 2.5 && artifact.visible) {
        artifact.visible = false;
        missionComplete = true;
        showResultScreen(Math.floor((Date.now() - startTime) / 1000));
        document.exitPointerLock();
    }
    renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
