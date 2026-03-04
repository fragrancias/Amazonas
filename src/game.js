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
let playerMaxHealth = 200;
let playerHealth = playerMaxHealth;
let missionComplete = false;
let isDead = false;
let bullets = [];
let enemies = [];
let enemyBullets = [];
let traps = [];
let footprints = []; // Pegadas estáticas (trilha no chão)
const colliders = [];
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

const groundGeo = new THREE.PlaneGeometry(1000, 1000);
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

const TREE_COUNT = 3000;
const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.7, 1, 8), new THREE.MeshStandardMaterial({ color: 0x2b1d0e }), TREE_COUNT);
const leafMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshStandardMaterial({ color: 0x0a2b0a }), TREE_COUNT * 4);
trunkMesh.castShadow = leafMesh.castShadow = trunkMesh.receiveShadow = leafMesh.receiveShadow = true;

const dummy = new THREE.Object3D();
for (let i = 0; i < TREE_COUNT; i++) {
    const rx = (Math.random() - 0.5) * 600;
    const rz = (Math.random() - 0.5) * 600;
    if (Math.abs(rx) < 4 && Math.abs(rz) < 4) { i--; continue; }
    const trunkH = 10 + Math.random() * 20;
    dummy.position.set(rx, trunkH / 2, rz);
    dummy.scale.set(1, trunkH, 1);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 4; j++) {
        dummy.position.set(rx + (Math.random() - 0.5) * 4, trunkH * 0.75 + Math.random() * 6, rz + (Math.random() - 0.5) * 4);
        const scale = 5 + Math.random() * 3;
        dummy.scale.set(scale, scale * 0.7, scale);
        dummy.updateMatrix();
        leafMesh.setMatrixAt(i * 4 + j, dummy.matrix);
    }
    colliders.push({ type: 'circle', x: rx, z: rz, radius: 0.7 }); // Ajuste para o raio real da base do tronco
}
scene.add(trunkMesh);
scene.add(leafMesh);

const artifactPos = { x: 0, z: -100 };
const artifact = new THREE.Mesh(new THREE.OctahedronGeometry(2, 0), new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 5 }));
artifact.position.set(artifactPos.x, 3, artifactPos.z);
scene.add(artifact);

// --- PEGADAS ESTÁTICAS (TRILHA FIXA NO CHÃO) ---
const footGeo = new THREE.CircleGeometry(0.2, 8);
const footMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 });

function createFootprintTrail(startPos) {
    footprints.forEach(f => scene.remove(f));
    footprints = [];
    const dir = new THREE.Vector3(artifactPos.x - startPos.x, 0, artifactPos.z - startPos.z);
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

function createEnemy(x, z) {
    const enemy = new THREE.Group();
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const armMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c });
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), legMat);
    lLeg.position.set(-0.15, 0.35, 0); enemy.add(lLeg);
    const rLeg = lLeg.clone(); rLeg.position.set(0.15, 0.35, 0); enemy.add(rLeg);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    body.position.y = 1.15; enemy.add(body);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), armMat);
    lArm.position.set(-0.4, 1.2, 0); enemy.add(lArm);
    const rArm = lArm.clone(); rArm.position.set(0.4, 1.2, 0.2); enemy.add(rArm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.35), armMat);
    head.position.y = 1.7; enemy.add(head);
    const beret = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4), new THREE.MeshStandardMaterial({ color: 0x000000 }));
    beret.position.y = 1.95; beret.rotation.z = -0.2; enemy.add(beret);
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 1.0), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    rifle.position.set(0.45, 1.1, 0.4); enemy.add(rifle);
    const hbContainer = new THREE.Group();
    hbContainer.add(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.1), new THREE.MeshBasicMaterial({ color: 0x333333 })));
    const barFill = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.1), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    barFill.position.z = 0.01; hbContainer.add(barFill);
    healthBarContainer = hbContainer; // global fix if needed
    hbContainer.position.y = 2.2; enemy.add(hbContainer);
    enemy.position.set(x, 0, z);
    enemy.userData = { maxHealth: 60, health: 60, lastShot: 0, animTime: Math.random() * 10, lLeg, rLeg, lArm, rArm, barFill };
    scene.add(enemy); enemies.push(enemy);
}

function spawnEntities() {
    enemies.forEach(e => scene.remove(e)); enemies = [];
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 22;
        createEnemy(artifactPos.x + Math.cos(angle) * dist, artifactPos.z + Math.sin(angle) * dist);
    }
    for (let i = 0; i < 190; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 340;
        const ex = artifactPos.x + Math.cos(angle) * dist;
        const ez = artifactPos.z + Math.sin(angle) * dist;
        // Evitar spawnar em cima da posição atual do player (dinâmico)
        if (Math.abs(ez - playerGroup.position.z) < 15 && Math.abs(ex - playerGroup.position.x) < 15) { i--; continue; }
        createEnemy(ex, ez);
    }
}

function spawnTraps() {
    traps.forEach(t => scene.remove(t)); traps = [];
    for (let i = 0; i < 300; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 25 + Math.random() * 275;
        const rx = artifactPos.x + Math.cos(angle) * dist;
        const rz = artifactPos.z + Math.sin(angle) * dist;
        if (Math.abs(rx) < 8 && Math.abs(rz - 50) < 8) continue;
        const trap = new THREE.Group();
        if (Math.random() > 0.6) {
            const spikeGeo = new THREE.ConeGeometry(0.4, 2.5, 4);
            for (let j = 0; j < 9; j++) {
                const s = new THREE.Mesh(spikeGeo, new THREE.MeshStandardMaterial({ color: 0x555555 }));
                s.position.set((j % 3 - 1) * 0.8, -1.8, (Math.floor(j / 3) - 1) * 0.8); trap.add(s);
            }
            trap.userData = { type: 'spike', state: 'waiting', timer: Math.random() * 2 };
        } else {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x999999 }));
            blade.position.y = 0.05; trap.add(blade); trap.userData = { type: 'spinning_blade' };
        }
        trap.position.set(rx, 0, rz); scene.add(trap); traps.push(trap);
    }
}

function shootBullet(isPlayer, startPos, direction) {
    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: isPlayer ? 0xffff00 : 0xff0000 }));
    bullet.position.copy(startPos);
    const bd = { mesh: bullet, direction: direction.clone().normalize(), speed: 0.8, isPlayer, life: 100 };
    scene.add(bullet);
    if (isPlayer) bullets.push(bd); else enemyBullets.push(bd);
}

function openDeathScreen() {
    isDead = true;
    deathCount++;
    document.getElementById('death-count-hud').innerText = deathCount;

    const penaltyMsg = `<br><span style="color:#fbbf24;font-size:1.2rem;">Penalty: +${deathCount * 30}m distance from artifact</span>`;

    document.getElementById('game-over').innerHTML = `
        <h1 style="color: #ef4444; font-size: 4rem; margin-bottom:10px;">MISSION FAILED</h1>
        <p style="font-size:1.2rem;">Luke "Wolf" fell in combat. Repositioning in field...</p>
        ${penaltyMsg}
        <p style="color:#aaa;">Current Goal: Reach the artifact at ${Math.abs(artifactPos.z)}m</p>
        <button onclick="resetGame()"
            style="margin-top: 30px; padding: 15px 30px; font-size: 1.4rem; cursor: pointer; background: #166534; color: white; border: none; border-radius: 8px; font-weight:bold; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">Try Again</button>
    `;
    document.getElementById('game-over').style.display = 'flex';
    document.exitPointerLock();
}

function respawnPlayer() {
    // Distance penalty: Luke starts at 100m (Z=0) and recedes 30m per death.
    const penalty = deathCount * 30;
    let rx, rz;
    let safeSpawn = false;
    let attempts = 0;

    // Look for a safe spot away from trees
    while (!safeSpawn && attempts < 50) {
        rx = (Math.random() - 0.5) * 40;
        rz = penalty + (Math.random() - 0.5) * 20;

        // Check if this spot overlaps with a tree (0.7 radius + 0.8 safety margin)
        let collision = false;
        for (const col of colliders) {
            const dx = rx - col.x;
            const dz = rz - col.z;
            if ((dx * dx + dz * dz) < (col.radius + 0.8) ** 2) {
                collision = true;
                break;
            }
        }
        if (!collision) safeSpawn = true;
        attempts++;
    }

    playerGroup.position.set(rx, 0, rz);
    playerHealth = playerMaxHealth; playerVelocityY = 0; isDead = false;
    document.getElementById('health-bar').style.width = '100%';
    document.getElementById('game-over').style.display = 'none';
    spawnEntities(); spawnTraps();
    createFootprintTrail(playerGroup.position);
}

// FIX: resetGame global function for index.html button
window.resetGame = function () {
    respawnPlayer();
    document.body.requestPointerLock();
}

const keys = {};
document.getElementById('start-screen').addEventListener('click', () => {
    document.body.requestPointerLock();
    document.getElementById('start-screen').style.display = 'none';
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
window.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement === document.body && !missionComplete && !isDead) {
        shootBullet(true, camera.position.clone(), new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
    }
});

// Ranking order: less time -> more kills -> less deaths
function saveRanking(t, k, d) {
    const r = JSON.parse(localStorage.getItem('amazonas_best_runs') || '[]');
    r.push({ time: t, kills: k, deaths: d, date: new Date().toLocaleDateString() });
    r.sort((a, b) => a.time - b.time || b.kills - a.kills || a.deaths - b.deaths);
    localStorage.setItem('amazonas_best_runs', JSON.stringify(r.slice(0, 5)));
    return r.slice(0, 5);
}

function showResultScreen(timeSec) {
    const top5 = saveRanking(timeSec, enemiesKilled, deathCount);
    const resDiv = document.createElement('div');
    resDiv.id = 'mission-complete-screen';
    resDiv.style = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#ffff00;font-size:1.6rem;text-align:center;font-weight:bold;z-index:2000;background:rgba(0,0,0,0.95);padding:30px;border-radius:20px;font-family:sans-serif;width:400px;border:2px solid #ffff00;";

    let h = "<div style='color:#00ffff;font-size:1.2rem;margin-top:15px;text-decoration:underline;'>🏆 GLOBAL RANKING</div>";
    top5.forEach((run, i) => {
        h += `<div style='font-size:0.8rem;color:white;text-align:left;margin:6px 0;'>${i + 1}. ${Math.floor(run.time / 60)}m ${run.time % 60}s | 🎯 ${run.kills} | 💀 ${run.deaths} | <small>${run.date}</small></div>`;
    });

    resDiv.innerHTML = `
        <div style='font-size:2rem;margin-bottom:10px;'>MISSION COMPLETE!</div>
        <div style='font-size:1rem;color:white;margin:15px 0;background:rgba(255,255,255,0.1);padding:10px;border-radius:10px;'>
            ⏱️ Time: ${Math.floor(timeSec / 60)}m ${timeSec % 60}s<br>
            🎯 Kills: ${enemiesKilled}<br>
            💀 Deaths: ${deathCount}
        </div>
        ${h}
        <button id='restart-btn' style='margin-top:20px;padding:12px 25px;font-size:1.1rem;background:#ffff00;color:black;border:none;border-radius:10px;cursor:pointer;font-weight:bold;'>NEW RUN</button>
    `;
    document.body.appendChild(resDiv);

    document.getElementById('restart-btn').onclick = () => {
        document.body.removeChild(resDiv);
        missionComplete = false;
        enemiesKilled = 0;
        deathCount = 0;
        document.getElementById('kill-count-hud').innerText = "0";
        document.getElementById('death-count-hud').innerText = "0";
        startTime = Date.now();
        respawnPlayer();
        document.body.requestPointerLock();
    };
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (missionComplete || isDead) { renderer.render(scene, camera); return; }
    if (playerHealth <= 0) { openDeathScreen(); return; }

    playerVelocityY += gravity;
    playerGroup.position.y += playerVelocityY;
    if (playerGroup.position.y < 0) { playerGroup.position.y = 0; playerVelocityY = 0; isGrounded = true; }
    if (isGrounded && keys['Space']) { playerVelocityY = 0.18; isGrounded = false; }

    const mZ = (keys['KeyW'] ? -1 : 0) - (keys['KeyS'] ? -1 : 0);
    const mX = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    if (mX !== 0 || mZ !== 0) {
        const moveDir = new THREE.Vector3(mX, 0, mZ).normalize().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw));
        const moveSpeed = 0.22;

        // Tentar mover no eixo X primeiro
        let nextPosX = playerGroup.position.x + moveDir.x * moveSpeed;
        let canMoveX = true;
        for (const col of colliders) {
            const distSq = (nextPosX - col.x) ** 2 + (playerGroup.position.z - col.z) ** 2;
            if (distSq < (col.radius + 0.5) ** 2) { canMoveX = false; break; }
        }
        if (canMoveX) {
            for (const en of enemies) { if (new THREE.Vector3(nextPosX, 0, playerGroup.position.z).distanceTo(en.position) < 1.0) { canMoveX = false; break; } }
        }
        if (canMoveX) playerGroup.position.x = nextPosX;

        // Tentar mover no eixo Z
        let nextPosZ = playerGroup.position.z + moveDir.z * moveSpeed;
        let canMoveZ = true;
        for (const col of colliders) {
            const distSq = (playerGroup.position.x - col.x) ** 2 + (nextPosZ - col.z) ** 2;
            if (distSq < (col.radius + 0.5) ** 2) { canMoveZ = false; break; }
        }
        if (canMoveZ) {
            for (const en of enemies) { if (new THREE.Vector3(playerGroup.position.x, 0, nextPosZ).distanceTo(en.position) < 1.0) { canMoveZ = false; break; } }
        }
        if (canMoveZ) playerGroup.position.z = nextPosZ;
    }

    camera.position.set(playerGroup.position.x, playerGroup.position.y + eyeHeight, playerGroup.position.z);
    camera.rotation.set(cameraPitch, cameraYaw, 0, 'YXZ');
    playerWeapon.position.copy(camera.position); playerWeapon.quaternion.copy(camera.quaternion);
    playerWeapon.translateZ(-0.5); playerWeapon.translateX(0.3); playerWeapon.translateY(-0.25);

    bullets.forEach((b) => {
        b.mesh.position.addScaledVector(b.direction, b.speed); b.life--;
        enemies.forEach((en, j) => {
            if (b.mesh.position.distanceTo(en.position.clone().add(new THREE.Vector3(0, 1.2, 0))) < 1.3) {
                en.userData.health -= 20; b.life = 0;
                const pct = Math.max(0, en.userData.health / en.userData.maxHealth);
                en.userData.barFill.scale.x = pct; en.userData.barFill.position.x = -0.4 * (1 - pct);
                if (en.userData.health <= 0) {
                    scene.remove(en);
                    enemies.splice(j, 1);
                    enemiesKilled++;
                    document.getElementById('kill-count-hud').innerText = enemiesKilled;
                }
            }
        });
    });
    enemyBullets.forEach((b) => {
        b.mesh.position.addScaledVector(b.direction, b.speed); b.life--;
        if (b.mesh.position.distanceTo(playerGroup.position.clone().add(new THREE.Vector3(0, 1, 0))) < 0.8) {
            playerHealth -= 10; b.life = 0;
            document.getElementById('health-bar').style.width = (playerHealth / playerMaxHealth * 100) + '%';
        }
    });
    bullets = bullets.filter(b => { if (b.life <= 0) scene.remove(b.mesh); return b.life > 0; });
    enemyBullets = enemyBullets.filter(b => { if (b.life <= 0) scene.remove(b.mesh); return b.life > 0; });

    traps.forEach(trap => {
        const ud = trap.userData; const d = playerGroup.position.distanceTo(trap.position);
        if (ud.type === 'spike') {
            if (ud.state === 'waiting') { ud.timer -= delta; if (ud.timer <= 0) ud.state = 'rising'; }
            else if (ud.state === 'rising') { trap.children.forEach(s => s.position.y += 0.4); if (trap.children[0].position.y >= 1.5) ud.state = 'falling'; }
            else if (ud.state === 'falling') { trap.children.forEach(s => s.position.y -= 0.1); if (trap.children[0].position.y <= -1.8) { ud.state = 'waiting'; ud.timer = 1.2; } }
            if (trap.children[0].position.y > 0 && d < 1.8 && playerGroup.position.y < 0.5) openDeathScreen();
        } else {
            trap.rotation.y += 0.25; if (d < 2.5 && playerGroup.position.y < 0.4) openDeathScreen();
        }
    });

    enemies.forEach(en => {
        const ud = en.userData; const d = en.position.distanceTo(playerGroup.position);
        if (d < 45) {
            en.lookAt(playerGroup.position); en.children[en.children.length - 1].lookAt(camera.position);
            if (d > 12) {
                en.position.addScaledVector(playerGroup.position.clone().sub(en.position).normalize(), 0.07);
                ud.animTime += delta * 12; ud.lLeg.rotation.x = Math.sin(ud.animTime) * 0.5; ud.rLeg.rotation.x = -Math.sin(ud.animTime) * 0.5;
            } else if (Date.now() - ud.lastShot > 1600) {
                shootBullet(false, en.position.clone().add(new THREE.Vector3(0, 1.5, 0)), playerGroup.position.clone().sub(en.position).normalize());
                ud.lastShot = Date.now();
            }
        }
    });

    if (playerGroup.position.distanceTo(artifact.position) < 2.5) {
        missionComplete = true;
        const totalSec = Math.floor((Date.now() - startTime) / 1000);
        showResultScreen(totalSec);
        document.exitPointerLock();
    }
    renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
