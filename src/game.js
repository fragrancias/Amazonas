// Configuração da Cena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x3a424d); // Cinza azulado (clima frio/nevoeiro)
scene.fog = new THREE.Fog(0x3a424d, 20, 70);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Câmera Primeira Pessoa
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let cameraPitch = 0; // Inclinação vertical
let cameraYaw = 0;   // Rotação horizontal
const eyeHeight = 1.7;

// --- ESTADO DO JOGO ---
let playerHealth = 100;
const bullets = [];
const enemies = [];
const enemyBullets = [];
const traps = [];
const trees = [];
const colliders = []; // Sistema de colisão física
let artifactFound = false;
const clock = new THREE.Clock();

// --- FÍSICA DE PULO ---
let playerVelocityY = 0;
const gravity = -0.008;
const jumpForce = 0.18;
let isGrounded = true;

// ILUMINAÇÃO
const ambientLight = new THREE.AmbientLight(0x667788, 1.2);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff0dd, 1.5);
sunLight.position.set(10, 20, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
scene.add(sunLight);

// CHÃO
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2f2a });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- PERSONAGEM (LUCAS LOBO) ---
const playerGroup = new THREE.Group();

// Corpo (Oculto em primeira pessoa)
const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, visible: false });
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 1.2;
body.castShadow = true;
playerGroup.add(body);

// Cabeça (Oculta em primeira pessoa)
const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
const headMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, visible: false });
const head = new THREE.Mesh(headGeo, headMat);
head.position.y = 1.8;
playerGroup.add(head);

// Cabelo (Oculto em primeira pessoa)
const hairMat = new THREE.MeshStandardMaterial({ color: 0x4b3621, visible: false });
const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.44), hairMat);
hairTop.position.y = 0.15;
head.add(hairTop);

const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.15), hairMat);
fringe.position.set(0.05, -0.05, 0.2);
fringe.rotation.z = -0.15;
head.add(fringe);

const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.35, 0.15), hairMat);
hairBack.position.set(0, -0.1, -0.15);
head.add(hairBack);

// Pernas (Ocultas em primeira pessoa)
const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
const legMat = new THREE.MeshStandardMaterial({ color: 0x222222, visible: false });
const leftLeg = new THREE.Mesh(legGeo, legMat);
leftLeg.position.set(-0.18, 0.4, 0);
leftLeg.castShadow = true;
playerGroup.add(leftLeg);

const rightLeg = new THREE.Mesh(legGeo, legMat);
rightLeg.position.set(0.18, 0.4, 0);
rightLeg.castShadow = true;
playerGroup.add(rightLeg);

// Arma (Visível em primeira pessoa)
const playerWeapon = new THREE.Group();
const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
playerWeapon.add(gunBody);
const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
muzzle.rotation.x = Math.PI / 2;
muzzle.position.z = -0.3;
playerWeapon.add(muzzle);

scene.add(playerWeapon);
scene.add(playerGroup);

// --- FLORESTA ---
function createTree(x, z) {
    const tree = new THREE.Group();
    const trunkHeight = 8 + Math.random() * 7;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, trunkHeight, 8), new THREE.MeshStandardMaterial({ color: 0x1a110a }));
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1b2b1b });
    for (let i = 0; i < 10; i++) {
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), leafMat);
        leaves.position.y = trunkHeight * 0.8 + (Math.random() * 2);
        leaves.position.x = (Math.random() - 0.5) * 6;
        leaves.position.z = (Math.random() - 0.5) * 6;
        leaves.scale.y = 0.5;
        tree.add(leaves);
    }
    tree.position.set(x, 0, z);
    scene.add(tree);
    trees.push(tree);
    colliders.push({ type: 'circle', x: x, z: z, radius: 0.5 });
}

// --- TEMPLO NAVEGÁVEL ---
function createTemple(x, z) {
    const temple = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const detailMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    // Plataforma
    const base = new THREE.Mesh(new THREE.BoxGeometry(110, 2, 110), stoneMat);
    base.position.y = 1;
    temple.add(base);

    // Escadaria
    for (let i = 0; i < 15; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 4), stoneMat);
        step.position.set(0, 2 + i * 1, 55 + i * 2);
        temple.add(step);
    }

    // Paredes
    const tWidth = 80;
    const tDepth = 80;
    const tHeight = 60;

    function addWall(wx, wz, w, d) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, tHeight, d), stoneMat);
        wall.position.set(wx, tHeight / 2 + 2, wz);
        temple.add(wall);
        colliders.push({ type: 'rect', minX: x + wx - w / 2, maxX: x + wx + w / 2, minZ: z + wz - d / 2, maxZ: z + wz + d / 2 });
    }

    addWall(-tWidth / 2, 0, 2, tDepth); // Lateral esq
    addWall(tWidth / 2, 0, 2, tDepth);  // Lateral dir
    addWall(0, -tDepth / 2, tWidth, 2); // Fundo
    addWall(-30, tDepth / 2, 20, 2);    // Frente Esq
    addWall(30, tDepth / 2, 20, 2);     // Frente Dir

    // Teto
    const roof = new THREE.Mesh(new THREE.BoxGeometry(tWidth + 2, 2, tDepth + 2), detailMat);
    roof.position.y = tHeight + 2;
    temple.add(roof);

    // Artefato (DENTRO do templo)
    const artifact = new THREE.Mesh(new THREE.OctahedronGeometry(2.5, 0), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 10 }));
    artifact.position.set(0, 5, 0);
    artifact.name = "Artefato";
    temple.add(artifact);

    temple.position.set(x, 0, z);
    scene.add(temple);

    // Armadilhas
    createTrap(x, z + 25, 'pendulum', 0);
    for (let i = -15; i <= 15; i += 15) {
        createTrap(x + i, z + 48, 'spike_fall', Math.random() * 2);
    }
}

function createTrap(x, z, type, offset) {
    const trapGroup = new THREE.Group();
    if (type === 'spike_fall') {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(1, 3, 4), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        spike.rotation.x = Math.PI; spike.position.y = 20;
        trapGroup.add(spike);
    } else if (type === 'floor_spike') {
        const spikeGeo = new THREE.ConeGeometry(0.3, 2, 4);
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        for (let i = 0; i < 4; i++) {
            const s = new THREE.Mesh(spikeGeo, spikeMat);
            s.position.set((i % 2 - 0.5) * 0.8, -1, (Math.floor(i / 2) - 0.5) * 0.8);
            trapGroup.add(s);
        }
    } else if (type === 'pendulum') {
        const pivot = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 0.5), new THREE.MeshStandardMaterial({ color: 0x888888 }));
        blade.position.y = -8;
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        rod.position.y = -4;
        pivot.add(blade); pivot.add(rod); pivot.position.y = 10;
        trapGroup.add(pivot);
    }
    trapGroup.position.set(x, 0, z);
    trapGroup.userData = { type, state: 'waiting', timer: offset, initialY: 20 };
    scene.add(trapGroup);
    traps.push(trapGroup);
}

const templePos = { x: 0, z: -80 };
createTemple(templePos.x, templePos.z);

for (let i = 0; i < 600; i++) {
    const rx = (Math.random() - 0.5) * 200;
    const rz = (Math.random() - 0.5) * 200;
    const distT = Math.sqrt(Math.pow(rx - templePos.x, 2) + Math.pow(rz - templePos.z, 2));
    if (distT > 50 && Math.sqrt(rx * rx + rz * rz) > 5) createTree(rx, rz);
}

// --- COMBATE ---
function createEnemy(x, z) {
    const enemyGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), new THREE.MeshStandardMaterial({ color: 0x8b0000 }));
    body.position.y = 1.2;
    enemyGroup.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    head.position.y = 1.8;
    enemyGroup.add(head);

    const weapon = new THREE.Group();
    const gBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.4), new THREE.MeshStandardMaterial({ color: 0x000000 }));
    weapon.add(gBody);
    const mzl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x000000 }));
    mzl.rotation.x = Math.PI / 2; mzl.position.z = -0.25;
    weapon.add(mzl);
    weapon.position.set(0.4, 1.2, 0.3);
    enemyGroup.add(weapon);

    enemyGroup.position.set(x, 0, z);
    enemyGroup.userData = { health: 50, lastShot: 0, ammo: 15, isReloading: false, reloadStart: 0, dodgeCooldown: 0 };
    scene.add(enemyGroup);
    enemies.push(enemyGroup);
}

function spawnInitialEnemies() {
    for (let i = 0; i < 40; i++) {
        const ex = (Math.random() - 0.5) * 180, ez = (Math.random() - 0.5) * 180;
        if (Math.sqrt(Math.pow(ex - templePos.x, 2) + Math.pow(ez - templePos.z, 2)) > 50) createEnemy(ex, ez);
    }
}

function shootBullet(isPlayer, startPos, direction) {
    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: isPlayer ? 0xffff00 : 0xff0000 }));
    bullet.position.copy(startPos);
    const bulletData = { mesh: bullet, direction: direction.clone().normalize(), speed: 0.5, isPlayer, life: 100 };
    scene.add(bullet);
    if (isPlayer) bullets.push(bulletData); else enemyBullets.push(bulletData);
}

function resetGame() {
    playerGroup.position.set((Math.random() - 0.5) * 40, 0, 150);
    playerHealth = 100; playerVelocityY = 0;
    const hb = document.getElementById('health-bar'); if (hb) hb.style.width = '100%';
    document.getElementById('game-over').style.display = 'none';
    enemies.forEach(e => scene.remove(e)); enemies.length = 0;
    setTimeout(() => { if (playerHealth > 0) spawnInitialEnemies(); }, 5000);
    setTimeout(() => document.body.requestPointerLock(), 100);
}

const keys = {};
document.getElementById('start-screen').addEventListener('click', () => {
    document.body.requestPointerLock();
    document.getElementById('start-screen').style.display = 'none';
    console.log("Iniciando aventura... Inimigos chegarão em 5 segundos!");
    setTimeout(() => {
        spawnInitialEnemies();
    }, 5000);
});
document.getElementById('game-over').addEventListener('click', resetGame);
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        cameraYaw -= e.movementX * 0.003;
        cameraPitch = Math.max(-0.8, Math.min(0.8, cameraPitch - e.movementY * 0.003));
    }
});

window.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement === document.body && e.button === 0 && playerHealth > 0) {
        const shootDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const muzzlePos = new THREE.Vector3(); muzzle.getWorldPosition(muzzlePos);
        shootBullet(true, muzzlePos, shootDir);
    }
});

let walkCycle = 0;
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Pulando
    if (!isGrounded) {
        playerVelocityY += gravity;
        playerGroup.position.y += playerVelocityY;
        if (playerGroup.position.y <= 0) { playerGroup.position.y = 0; playerVelocityY = 0; isGrounded = true; }
    }
    if (isGrounded && keys['Space']) { playerVelocityY = jumpForce; isGrounded = false; }

    // Rotação do Jogador
    playerGroup.rotation.y = cameraYaw;

    // Câmera Primeira Pessoa
    camera.position.set(playerGroup.position.x, playerGroup.position.y + eyeHeight, playerGroup.position.z);
    camera.rotation.set(cameraPitch, cameraYaw, 0, 'YXZ');

    // Arma do Jogador (Visão FPS)
    playerWeapon.position.copy(camera.position);
    playerWeapon.quaternion.copy(camera.quaternion);
    playerWeapon.translateZ(-0.5); playerWeapon.translateX(0.3); playerWeapon.translateY(-0.25);

    if (playerHealth <= 0) { playerWeapon.visible = false; renderer.render(scene, camera); return; }
    playerWeapon.visible = true;

    const mZ = (keys['KeyW'] ? -1 : 0) - (keys['KeyS'] ? -1 : 0);
    const mX = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    if (mX !== 0 || mZ !== 0) {
        const dir = new THREE.Vector3(mX, 0, mZ).normalize().applyQuaternion(playerGroup.quaternion);
        const nextPos = playerGroup.position.clone().addScaledVector(dir, 0.12);
        let canMove = true;
        for (const col of colliders) {
            if (col.type === 'circle') { if (Math.sqrt(Math.pow(nextPos.x - col.x, 2) + Math.pow(nextPos.z - col.z, 2)) < 0.9) { canMove = false; break; } }
            else if (col.type === 'rect') { if (nextPos.x + 0.4 > col.minX && nextPos.x - 0.4 < col.maxX && nextPos.z + 0.4 > col.minZ && nextPos.z - 0.4 < col.maxZ) { canMove = false; break; } }
        }
        if (canMove) { playerGroup.position.x = nextPos.x; playerGroup.position.z = nextPos.z; }
        walkCycle += 0.2;
        if (isGrounded) playerGroup.position.y = Math.abs(Math.sin(walkCycle)) * 0.02;
    } else { if (isGrounded) playerGroup.position.y = 0; }

    bullets.forEach(b => {
        b.mesh.position.addScaledVector(b.direction, b.speed); b.life--;
        enemies.forEach((en, i) => { if (b.mesh.position.distanceTo(en.position.clone().add(new THREE.Vector3(0, 1, 0))) < 0.8) { en.userData.health -= 25; b.life = 0; if (en.userData.health <= 0) { scene.remove(en); enemies.splice(i, 1); } } });
    });

    enemies.forEach(en => {
        const d = en.position.distanceTo(playerGroup.position);
        if (d < 25) {
            en.lookAt(playerGroup.position);
            if (d > 8) en.position.addScaledVector(playerGroup.position.clone().sub(en.position).normalize(), 0.05);
            bullets.forEach(b => {
                if (en.position.distanceTo(b.mesh.position) < 6 && en.userData.dodgeCooldown <= 0) {
                    let cTree = null; let minD = 10;
                    trees.forEach(t => { const dt = en.position.distanceTo(t.position); if (dt < minD) { minD = dt; cTree = t; } });
                    if (cTree) { en.userData.coverTarget = cTree.position.clone().add(en.position.clone().sub(playerGroup.position).normalize().multiplyScalar(0.7)); en.userData.dodgeCooldown = 60; }
                }
            });
            if (en.userData.coverTarget && en.userData.dodgeCooldown > 0) { en.position.addScaledVector(en.userData.coverTarget.clone().sub(en.position).normalize(), 0.1); en.userData.dodgeCooldown--; }
            if (Date.now() - en.userData.lastShot > 2000) { shootBullet(false, en.position.clone().add(new THREE.Vector3(0, 1.5, 0)), playerGroup.position.clone().sub(en.position).normalize()); en.userData.lastShot = Date.now(); }
        }
    });

    enemyBullets.forEach(b => {
        b.mesh.position.addScaledVector(b.direction, b.speed); b.life--;
        if (b.mesh.position.distanceTo(playerGroup.position.clone().add(new THREE.Vector3(0, 1, 0))) < 0.6) {
            playerHealth -= 10; b.life = 0; if (playerHealth <= 0) { playerHealth = 0; document.getElementById('game-over').style.display = 'flex'; document.exitPointerLock(); }
            const hb = document.getElementById('health-bar'); if (hb) hb.style.width = playerHealth + '%';
        }
    });

    [...bullets, ...enemyBullets].forEach((b, i, arr) => { if (b.life <= 0) { scene.remove(b.mesh); arr.splice(i, 1); } });

    traps.forEach(trap => {
        const ud = trap.userData;
        if (ud.type === 'spike_fall') {
            if (ud.state === 'waiting') { ud.timer -= delta; if (ud.timer <= 0) ud.state = 'falling'; }
            else if (ud.state === 'falling') { trap.children[0].position.y -= 0.4; if (trap.children[0].position.y <= 0.5) ud.state = 'rising'; }
            else if (ud.state === 'rising') { trap.children[0].position.y += 0.05; if (trap.children[0].position.y >= 20) ud.state = 'waiting'; }
        } else if (ud.type === 'floor_spike') {
            if (ud.state === 'waiting') { ud.timer -= delta; if (ud.timer <= 0) ud.state = 'rising'; }
            else if (ud.state === 'rising') { trap.children.forEach(s => s.position.y += 0.2); if (trap.children[0].position.y >= 1) ud.state = 'falling'; }
            else if (ud.state === 'falling') { trap.children.forEach(s => s.position.y -= 0.05); if (trap.children[0].position.y <= -1) { ud.state = 'waiting'; ud.timer = 3; } }
        } else if (ud.type === 'pendulum') { trap.children[0].rotation.z = Math.sin(Date.now() * 0.002) * 1.5; }
        trap.children.forEach(c => { if (c.getWorldPosition(new THREE.Vector3()).distanceTo(playerGroup.position.clone().add(new THREE.Vector3(0, 1, 0))) < 1.0) playerHealth = 0; });
    });

    const art = scene.getObjectByName("Artefato");
    if (art && !artifactFound) {
        art.rotation.y += 0.02;
        if (playerGroup.position.distanceTo(art.getWorldPosition(new THREE.Vector3())) < 2) { artifactFound = true; art.visible = false; alert("ARTEFATO COLETADO!"); }
    }

    renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
