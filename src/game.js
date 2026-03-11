// --- CONFIGURAÇÃO DA CENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Céu azul claro
scene.fog = new THREE.Fog(0x87CEEB, 1, 35);

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
let levelState = 'FOREST'; // 'FOREST' ou 'TOMB'
let playerMaxHealth = 200;
let playerHealth = playerMaxHealth;
let missionComplete = false;
let isDead = false;
let bullets = [];
let enemies = [];
let enemyBullets = [];
let traps = [];
let footprints = [];
let tombObjects = [];
let tombGates = [];
let colliders = [];
let tombTimer = 0;
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
playerGroup.position.y = 0;
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
const TREE_COUNT = 2200; // Redução drástica para visibilidade total e facilidade de movimento na floresta
const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.7, 1, 8), new THREE.MeshStandardMaterial({ color: 0x2b1d0e }), TREE_COUNT);
const leafMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshStandardMaterial({ color: 0x0a2b0a }), TREE_COUNT * 4);
trunkMesh.castShadow = leafMesh.castShadow = true;

const dummy = new THREE.Object3D();
const forestColliders = [];
for (let i = 0; i < TREE_COUNT; i++) {
    const rx = (Math.random() - 0.5) * 850;
    const rz = (Math.random() - 0.5) * 850;

    // Evitar spawnar árvores na cara do player (em 0,150) ou no artefato (0,-180)
    const distToPlayerSpawn = Math.sqrt(rx ** 2 + (rz - 150) ** 2);
    const distToArtifact = Math.sqrt(rx ** 2 + (rz + 180) ** 2);
    if (distToPlayerSpawn < 10 || distToArtifact < 8) { i--; continue; }

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

const artifactPos = { x: 0, z: -90 }; // Artefato agora está bem mais perto (antes -150) para acelerar a entrada na tumba
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

// --- INIMIGOS ---
function createEnemy(x, z, type = 'rifle') {
    const enemy = new THREE.Group();
    let colorBody = 0x111111;
    let colorSkin = 0xd2b48c;
    let hp = 70;
    let speed = 0.09;

    if (levelState === 'TOMB') {
        if (type === 'mummy') {
            colorBody = 0xa89078; colorSkin = 0x8a7662;
            hp = 180; speed = 0.12;
        } else if (type === 'skeleton') {
            colorBody = 0xe3dac9; colorSkin = 0xe3dac9;
            hp = 50; speed = 0.20;
        }
    } else {
        if (type === 'knife') { colorBody = 0x224422; speed = 0.08; hp = 50; }
        else { speed = 0.06; hp = 45; }
    }

    const legMat = new THREE.MeshStandardMaterial({ color: type === 'skeleton' ? 0xe3dac9 : 0x111111 });
    const armMat = new THREE.MeshStandardMaterial({ color: colorSkin });
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorBody });
    const boneThickness = type === 'skeleton' ? 0.08 : 0.15;

    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(boneThickness, 0.7, boneThickness), legMat);
    lLeg.position.set(-0.15, 0.35, 0); enemy.add(lLeg);
    const rLeg = lLeg.clone(); rLeg.position.set(0.15, 0.35, 0); enemy.add(rLeg);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.3), bodyMat);
    body.position.y = 1.15; enemy.add(body);

    if (type === 'mummy') {
        const bandageMat = new THREE.MeshStandardMaterial({ color: 0xc2b280 });
        for (let i = 0; i < 7; i++) {
            const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.35), bandageMat);
            b.position.y = 0.8 + (i * 0.13); b.rotation.y = (Math.random() - 0.5) * 0.4; enemy.add(b);
        }
    } else if (type === 'skeleton') {
        const ribMat = new THREE.MeshStandardMaterial({ color: 0xd3cac0 });
        for (let i = 0; i < 5; i++) {
            const rib = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.33), ribMat);
            rib.position.y = 0.85 + (i * 0.12); enemy.add(rib);
        }
    }

    const lArm = new THREE.Mesh(new THREE.BoxGeometry(boneThickness, 0.7, boneThickness), armMat);
    lArm.position.set(-0.35, 1.2, 0); enemy.add(lArm);
    const rArm = lArm.clone(); rArm.position.set(0.35, 1.2, 0.2); enemy.add(rArm);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), armMat);
    head.position.y = 1.7; enemy.add(head);

    if (type === 'mummy') {
        const hBand = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.35), new THREE.MeshStandardMaterial({ color: 0xc2b280 }));
        hBand.position.y = 1.75; head.add(hBand);
    }

    if (type !== 'skeleton' && type !== 'mummy') {
        const beret = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.35), new THREE.MeshStandardMaterial({ color: type === 'knife' ? 0x8b0000 : 0x000000 }));
        beret.position.y = 1.9; enemy.add(beret);
    }

    let weapon;
    if (type === 'knife' || type === 'skeleton' || type === 'mummy') {
        weapon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
        weapon.position.set(0.4, 1.1, 0.2);
    } else {
        weapon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.9), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        weapon.position.set(0.4, 1.1, 0.4);
    }
    enemy.add(weapon);

    const barFill = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.08), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    barFill.position.y = 2.1; barFill.position.z = 0.01; enemy.add(barFill);

    enemy.position.set(x, 0, z);
    enemy.userData = { type, maxHealth: hp, health: hp, lastShot: 0, animTime: Math.random() * 10, lLeg, rLeg, lArm, rArm, barFill, speed };

    if (levelState === 'TOMB') enemy.visible = false;
    else { scene.add(enemy); enemies.push(enemy); }
    return enemy;
}

// --- GERAÇÃO DE NÍVEIS ---
function clearEntities() {
    enemies.forEach(e => scene.remove(e)); enemies = [];
    traps.forEach(t => scene.remove(t)); traps = [];
    tombObjects.forEach(o => scene.remove(o)); tombObjects = [];
    tombGates.forEach(g => scene.remove(g)); tombGates = [];
    if (escapeCar) { scene.remove(escapeCar); escapeCar = null; }
    colliders = [];
}

function spawnForestEntities() {
    clearEntities();
    levelState = 'FOREST';
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 1, 40);
    ambientLight.intensity = 0.8;
    sunLight.intensity = 1.2;
    forestGroup.visible = true;
    colliders.push(...forestColliders);

    const pX = playerGroup.position.x;
    const pZ = playerGroup.position.z;

    for (let i = 0; i < 70; i++) { // Reduzido drásticamente de 130 para 70 inimigos na floresta
        const type = i < 90 ? 'rifle' : 'knife';
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 450;
        const ex = artifactPos.x + Math.cos(angle) * dist;
        const ez = artifactPos.z + Math.sin(angle) * dist;
        // Evitar inimigos colados no spawn
        if (Math.abs(ex - pX) < 15 && Math.abs(ez - pZ) < 15) { i--; continue; }
        createEnemy(ex, ez, type);
    }

    for (let i = 0; i < 150; i++) { // Reduzido drásticamente de 300 para 150 armadilhas na floresta
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 430;
        const rx = artifactPos.x + Math.cos(angle) * dist;
        const rz = artifactPos.z + Math.sin(angle) * dist;
        // Evitar armadilhas no spawn
        if (Math.abs(rx - pX) < 12 && Math.abs(rz - pZ) < 12) { i--; continue; }
        createTrap(rx, rz, Math.random() > 0.5 ? 'spike' : 'blade');
    }
}

let pendingTombEnemies = [];

function spawnTombLevel() {
    clearEntities();
    levelState = 'TOMB';
    tombTimer = 2;
    pendingTombEnemies = [];
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.Fog(0x111111, 1, 60);
    ambientLight.intensity = 0.7; // Mais luz
    sunLight.intensity = 0;
    forestGroup.visible = false;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f });
    function addWall(x, z, w, d) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 8, d), wallMat);
        wall.position.set(x, 4, z);
        scene.add(wall); tombObjects.push(wall);
        const col = { type: 'box', minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
        colliders.push(col);
        wall.userData = { collider: col };
        return wall;
    }

    function addTorch(x, y, z) {
        const torch = new THREE.Group();
        torch.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x2b1d0e })));
        const fire = new THREE.PointLight(0xffaa22, 30, 35); fire.position.y = 0.3; torch.add(fire);
        torch.position.set(x, y, z); scene.add(torch); tombObjects.push(torch);
    }

    const numRooms = 5 + Math.floor(Math.random() * 6); // Agora entre 5 e 10 salas procedurais como solicitado
    const baseRoomSize = 25;
    const corridorLen = 12;

    // Sala Inicial SEGURA
    addWall(0, baseRoomSize / 2 + 2, baseRoomSize + 4, 2); addWall(-baseRoomSize / 2 - 2, 0, 2, baseRoomSize + 4); addWall(baseRoomSize / 2 + 2, 0, 2, baseRoomSize + 4); addWall(0, -baseRoomSize / 2 - 2, baseRoomSize + 4, 2);
    addTorch(baseRoomSize / 2, 3, 0); addTorch(-baseRoomSize / 2, 3, 0);

    let currentZ = -baseRoomSize / 2 - 2;

    for (let i = 0; i < numRooms; i++) {
        const currentRoomW = 22 + Math.random() * 12;
        const currentRoomD = 22 + Math.random() * 12;
        const trapCount = 5 + Math.floor(Math.random() * 5);
        const enemyCount = 8 + Math.floor(Math.random() * 8);

        addWall(-3, currentZ - corridorLen / 2, 2, corridorLen); addWall(3, currentZ - corridorLen / 2, 2, corridorLen);
        const gate = addWall(0, currentZ, 6, 1.2);
        gate.userData.isGate = true; gate.userData.roomIndex = i; tombGates.push(gate);
        currentZ -= corridorLen;

        const centerZ = currentZ - currentRoomD / 2;
        addWall(0, centerZ - currentRoomD / 2 - 2, currentRoomW + 4, 2); addWall(-currentRoomW / 2 - 2, centerZ, 2, currentRoomD + 4); addWall(currentRoomW / 2 + 2, centerZ, 2, currentRoomD + 4); addWall(0, centerZ + currentRoomD / 2 + 2, currentRoomW + 4, 2);

        addTorch(currentRoomW / 2, 3, centerZ); addTorch(-currentRoomW / 2, 3, centerZ); addTorch(0, 5, centerZ);

        for (let e = 0; e < enemyCount; e++) {
            const t = ['mummy', 'skeleton', 'rifle', 'knife'][Math.floor(Math.random() * 4)];
            // Margem aumentada ( -10 ) para evitar que apareçam "atrás" ou dentro de paredes
            const ex = (Math.random() - 0.5) * (currentRoomW - 10);
            const ez = centerZ + (Math.random() - 0.5) * (currentRoomD - 10);
            const en = createEnemy(ex, ez, t);
            en.userData.roomIndex = i;
            en.userData.targetZ = centerZ + currentRoomD / 2; // Marco de entrada da sala
            en.userData.isTombEnemy = true;
            en.userData.activated = false; // Começam parados/invisíveis
            pendingTombEnemies.push(en);
        }

        for (let t = 0; t < trapCount; t++) {
            createTrap((Math.random() - 0.5) * (currentRoomW - 6), centerZ + (Math.random() - 0.5) * (currentRoomD - 6), ['spike', 'pressure_plate', 'blade'][Math.floor(Math.random() * 3)]);
        }
        currentZ -= (currentRoomD + 2);
    }
    createEscapeCar(0, currentZ - 20);
}

function createTrap(x, z, type) {
    const trap = new THREE.Group();
    if (type === 'spike') {
        const spikeGeo = new THREE.ConeGeometry(0.3, 2, 4);
        for (let j = 0; j < 4; j++) {
            const s = new THREE.Mesh(spikeGeo, new THREE.MeshStandardMaterial({ color: 0x555555 }));
            s.position.set((j % 2 - 0.5) * 0.8, -1.8, (Math.floor(j / 2) - 0.5) * 0.8); trap.add(s);
        }
        trap.userData = { type: 'spike', state: 'waiting', timer: Math.random() * 2 };
    } else if (type === 'blade') {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0x999999 }));
        blade.position.y = 0.5; trap.add(blade); trap.userData = { type: 'blade' };
    } else if (type === 'pressure_plate') {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 1.5), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        trap.add(plate); trap.userData = { type: 'pressure_plate' };
    }
    trap.position.set(x, 0, z);
    scene.add(trap); traps.push(trap);
}

// --- LÓGICA DE TIRO ---
function shootBullet(isPlayer, startPos, direction, type = 'bullet') {
    let mesh;
    if (type === 'knife' || type === 'skeleton' || type === 'mummy') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), new THREE.MeshBasicMaterial({ color: 0xcccccc }));
        mesh.rotation.x = Math.PI / 2;
    } else {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: isPlayer ? 0xffff00 : 0xff0000 }));
    }
    mesh.position.copy(startPos);
    const bd = { mesh, direction: direction.clone().normalize(), speed: 0.8, isPlayer, life: 100, type };
    scene.add(mesh);
    if (isPlayer) bullets.push(bd); else enemyBullets.push(bd);
}

// --- TELAS E RESPAWN ---
function openDeathScreen() {
    isDead = true; deathCount++; document.getElementById('death-count-hud').innerText = deathCount;
    document.getElementById('game-over').innerHTML = `<h1 style="color: #ef4444; font-size: 4rem; margin-bottom:10px;">MISSION FAILED</h1><p style="font-size:1.2rem;">Wolf fell. Respawning in the jungle...</p><p style="color:#fbbf24;">Penalty: +${deathCount * 40}m distance</p><button onclick="resetGame()" style="margin-top: 30px; padding: 15px 30px; font-size: 1.4rem; cursor: pointer; background: #166534; color: white; border: none; border-radius: 8px; font-weight:bold;">Try Again</button>`;
    document.getElementById('game-over').style.display = 'flex'; document.exitPointerLock();
}

function respawnPlayer() {
    isDead = false; deathCount = deathCount || 0;
    const penalty = deathCount * 40;
    playerGroup.position.set(0, 0, 150 + penalty); // Fixar posição segura no spawn
    playerHealth = playerMaxHealth; playerVelocityY = 0;
    document.getElementById('health-bar').style.width = '100%'; document.getElementById('game-over').style.display = 'none';
    spawnForestEntities(); createFootprintTrail(playerGroup.position, artifact.position);
}

window.resetGame = function () { respawnPlayer(); document.body.requestPointerLock(); }

const keys = {};
document.getElementById('start-screen').addEventListener('click', () => {
    document.body.requestPointerLock(); document.getElementById('start-screen').style.display = 'none';
    if (startTime === 0) startTime = Date.now(); respawnPlayer();
});

window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);
window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body && !isDead) {
        cameraYaw -= e.movementX * 0.003; cameraPitch = Math.max(-0.9, Math.min(0.9, cameraPitch - e.movementY * 0.003));
    }
});
window.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement === document.body && !missionComplete && !isDead) shootBullet(true, camera.position.clone(), new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
});

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

function animate() {
    requestAnimationFrame(animate); const delta = clock.getDelta();
    if (missionComplete || isDead) { renderer.render(scene, camera); return; }
    if (playerHealth <= 0) { openDeathScreen(); return; }

    playerVelocityY += gravity; playerGroup.position.y += playerVelocityY;
    if (playerGroup.position.y < 0) { playerGroup.position.y = 0; playerVelocityY = 0; isGrounded = true; }
    if (isGrounded && keys['Space'] && levelState === 'FOREST') { playerVelocityY = 0.18; isGrounded = false; }

    const mZ = (keys['KeyW'] ? -1 : 0) - (keys['KeyS'] ? -1 : 0); const mX = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    if (mX !== 0 || mZ !== 0) {
        const moveDir = new THREE.Vector3(mX, 0, mZ).normalize().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw));
        const moveSpeed = levelState === 'TOMB' ? 0.18 : 0.22;
        let nextX = playerGroup.position.x + moveDir.x * moveSpeed; let nextZ = playerGroup.position.z + moveDir.z * moveSpeed;

        // Melhoria Colisão: permite sair de dentro de objetos caso fique preso
        let canMoveX = true; let canMoveZ = true;
        for (const col of colliders) {
            if (col.type === 'circle') {
                const curDistSq = (playerGroup.position.x - col.x) ** 2 + (playerGroup.position.z - col.z) ** 2;
                const nextDistSqX = (nextX - col.x) ** 2 + (playerGroup.position.z - col.z) ** 2;
                if (nextDistSqX < (col.radius + 0.5) ** 2 && nextDistSqX < curDistSq) canMoveX = false;
                const nextDistSqZ = (playerGroup.position.x - col.x) ** 2 + (nextZ - col.z) ** 2;
                if (nextDistSqZ < (col.radius + 0.5) ** 2 && nextDistSqZ < curDistSq) canMoveZ = false;
            } else if (col.type === 'box') {
                const buffer = 0.5;
                const inX = playerGroup.position.x > col.minX - buffer && playerGroup.position.x < col.maxX + buffer;
                const inZ = playerGroup.position.z > col.minZ - buffer && playerGroup.position.z < col.maxZ + buffer;
                const nextInX = nextX > col.minX - buffer && nextX < col.maxX + buffer;
                const nextInZ = nextZ > col.minZ - buffer && nextZ < col.maxZ + buffer;

                if (nextInX && inZ && !inX) canMoveX = false;
                if (inX && nextInZ && !inZ) canMoveZ = false;
            }
        }
        if (canMoveX) playerGroup.position.x = nextX; if (canMoveZ) playerGroup.position.z = nextZ;
    }

    camera.position.set(playerGroup.position.x, playerGroup.position.y + eyeHeight, playerGroup.position.z);
    camera.rotation.set(cameraPitch, cameraYaw, 0, 'YXZ');
    playerWeapon.position.copy(camera.position); playerWeapon.quaternion.copy(camera.quaternion);
    playerWeapon.translateZ(-0.5); playerWeapon.translateX(0.3); playerWeapon.translateY(-0.25);

    if (levelState === 'TOMB' && tombTimer > 0) {
        tombTimer -= delta;
        if (tombTimer <= 0) {
            pendingTombEnemies.forEach(en => { scene.add(en); enemies.push(en); en.visible = true; });
            pendingTombEnemies = [];
        }
    }

    if (levelState === 'TOMB') {
        tombGates.forEach((gate, idx) => {
            if (!scene.children.includes(gate)) return;
            const roomIdx = gate.userData.roomIndex;
            const remainingPrevEnemies = enemies.filter(en => en.userData.roomIndex === roomIdx - 1).length;
            if (roomIdx === 0 || remainingPrevEnemies === 0) {
                scene.remove(gate);
                if (gate.userData.collider) {
                    const colIdx = colliders.indexOf(gate.userData.collider);
                    if (colIdx !== -1) colliders.splice(colIdx, 1);
                }
            }
        });
    }

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
            playerHealth -= (b.type === 'bullet' ? 12 : 18); b.life = 0; document.getElementById('health-bar').style.width = (playerHealth / playerMaxHealth * 100) + '%';
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
        else if (ud.type === 'pressure_plate') { if (d < 1.2) openDeathScreen(); }
    });

    enemies.forEach(en => {
        const ud = en.userData; const d = en.position.distanceTo(playerGroup.position);

        // Ativação por sala na Tumba
        if (levelState === 'TOMB' && ud.isTombEnemy && !ud.activated) {
            // Ativa quando o jogador passa da entrada (Z) da sala dele
            if (playerGroup.position.z <= ud.targetZ) ud.activated = true;
        }

        if (d < 45) {
            // Se for inimigo da tumba, só ataca se estiver ativado (jogador entrou na sala)
            if (levelState === 'TOMB' && ud.isTombEnemy && !ud.activated) return;

            en.lookAt(playerGroup.position);
            en.position.addScaledVector(playerGroup.position.clone().sub(en.position).normalize(), ud.speed);
            ud.animTime += delta * 12; ud.lLeg.rotation.x = Math.sin(ud.animTime) * 0.5; ud.rLeg.rotation.x = -Math.sin(ud.animTime) * 0.5;
            if (Date.now() - ud.lastShot > (ud.type === 'rifle' ? 1400 : 1000)) {
                shootBullet(false, en.position.clone().add(new THREE.Vector3(0, 1.5, 0)), playerGroup.position.clone().sub(en.position).normalize(), ud.type); ud.lastShot = Date.now();
            }
        }
    });

    if (levelState === 'FOREST' && playerGroup.position.distanceTo(artifact.position) < 2.5) {
        spawnTombLevel(); playerGroup.position.set(0, 0, 0); createFootprintTrail(playerGroup.position, escapeCar.position);
    }
    if (levelState === 'TOMB' && escapeCar && playerGroup.position.distanceTo(escapeCar.position) < 3.5) {
        missionComplete = true; showResultScreen(Math.floor((Date.now() - startTime) / 1000)); document.exitPointerLock();
    }
    renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
