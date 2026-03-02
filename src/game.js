// Configuração da Cena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x3a424d); // Cinza azulado (clima frio/nevoeiro)
scene.fog = new THREE.Fog(0x3a424d, 20, 70);

// Câmera Primeira Pessoa
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let cameraPitch = 0; // Inclinação vertical
let cameraYaw = 0;   // Rotação horizontal
const eyeHeight = 1.7;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- ESTADO DO JOGO ---
let playerHealth = 100;
const bullets = [];
const enemies = [];
const enemyBullets = [];
const traps = [];
let artifactFound = false;
const clock = new THREE.Clock();

// ILUMINAÇÃO
const ambientLight = new THREE.AmbientLight(0x667788, 1.2); // Luz ambiente fria
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff0dd, 1.5); // Sol mais suave
sunLight.position.set(10, 20, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
scene.add(sunLight);

// CHÃO (Mistura de terra e neve fina/geada)
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2f2a });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- CRIAÇÃO DO PERSONAGEM (LUCAS LOBO) ---
const playerGroup = new THREE.Group();

// Corpo
const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f }); // Camisa cáqui/marrom
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 1.2;
body.castShadow = true;
playerGroup.add(body);

// Cabeça - Invisível
const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
const headMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, visible: false });
const head = new THREE.Mesh(headGeo, headMat);
head.position.y = 1.8;
playerGroup.add(head);

// --- CABELO (Estilo Leon Kennedy / Lobo) ---
const hairMat = new THREE.MeshStandardMaterial({ color: 0x4b3621, transparent: true, opacity: 0 }); // Castanho escuro (oculto em FPS)

// Topo do cabelo
const hairTopGeo = new THREE.BoxGeometry(0.44, 0.2, 0.44);
const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
hairTop.position.y = 0.15;
head.add(hairTop);

// Franja (estilo característico)
const fringeGeo = new THREE.BoxGeometry(0.46, 0.3, 0.15);
const fringe = new THREE.Mesh(fringeGeo, hairMat);
fringe.position.set(0.05, -0.05, 0.2);
fringe.rotation.z = -0.15;
head.add(fringe);

// Cabelo nas laterais/atrás
const hairBackGeo = new THREE.BoxGeometry(0.44, 0.35, 0.15);
const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
hairBack.position.set(0, -0.1, -0.15);
head.add(hairBack);

// Pernas
const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 }); // Calça escura
const leftLeg = new THREE.Mesh(legGeo, legMat);
leftLeg.position.set(-0.18, 0.4, 0);
leftLeg.castShadow = true;
playerGroup.add(leftLeg);

const rightLeg = new THREE.Mesh(legGeo, legMat);
rightLeg.position.set(0.18, 0.4, 0);
rightLeg.castShadow = true;
playerGroup.add(rightLeg);

// Braços - Invisíveis
const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
const leftArm = new THREE.Mesh(armGeo, bodyMat);
leftArm.position.set(-0.45, 1.2, 0);
leftArm.visible = false;
playerGroup.add(leftArm);

const rightArm = new THREE.Mesh(armGeo, bodyMat);
rightArm.position.set(0.45, 1.2, 0);
rightArm.visible = false;
playerGroup.add(rightArm);

// Ocultar corpo e pernas também
body.visible = false;
leftLeg.visible = false;
rightLeg.visible = false;

scene.add(playerGroup);

// --- ELEMENTOS DO CENÁRIO (FLORESTA) ---
function createTree(x, z) {
    const tree = new THREE.Group();

    // Tronco Alto e Esguio (Mais alto agora)
    const trunkHeight = 8 + Math.random() * 7;
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.3, trunkHeight, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1a110a });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Folhagem Densa Apenas no Topo (Estilo dossel de selva)
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1b2b1b });
    const clusters = 10 + Math.floor(Math.random() * 5);

    for (let i = 0; i < clusters; i++) {
        const clusterGeo = new THREE.SphereGeometry(2.5 + Math.random() * 2, 8, 8);
        const leaves = new THREE.Mesh(clusterGeo, leafMat);

        // Posicionar APENAS no topo (Garantindo que fique acima da cabeça)
        const topStart = trunkHeight * 0.75;
        leaves.position.y = topStart + (Math.random() * (trunkHeight * 0.3));

        leaves.position.x = (Math.random() - 0.5) * 6;
        leaves.position.z = (Math.random() - 0.5) * 6;

        leaves.scale.y = 0.5;
        leaves.castShadow = true;
        tree.add(leaves);
    }

    tree.position.set(x, 0, z);
    scene.add(tree);
}

function createRuins(x, z) {
    const stoneGeo = new THREE.BoxGeometry(1 + Math.random(), 0.5 + Math.random() * 1.5, 1 + Math.random());
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(x, stone.geometry.parameters.height / 2, z);
    stone.rotation.y = Math.random() * Math.PI;
    stone.castShadow = true;
    stone.receiveShadow = true;
    scene.add(stone);
}

// --- TEMPLO E ARTEFATO (VERSÃO AMPLIADA) ---
function createTemple(x, z) {
    const temple = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

    // Base/Piso Gigante
    const floorGeo = new THREE.BoxGeometry(20, 0.5, 20);
    const floor = new THREE.Mesh(floorGeo, stoneMat);
    floor.position.y = 0.25;
    temple.add(floor);

    // Paredes Altas
    const wallGeo = new THREE.BoxGeometry(20, 10, 0.5);
    const backWall = new THREE.Mesh(wallGeo, stoneMat);
    backWall.position.set(0, 5, -9.75);
    temple.add(backWall);

    const leftWall = new THREE.Mesh(wallGeo, stoneMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-9.75, 5, 0);
    temple.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, stoneMat);
    rightWall.rotation.y = Math.PI / 2;
    rightWall.position.set(4.75, 2.75, 0); // Correção de posição no chunk anterior falhou, ajustando aqui
    rightWall.position.set(9.75, 5, 0);
    temple.add(rightWall);

    // Teto Massivo
    const roofGeo = new THREE.BoxGeometry(21, 0.5, 21);
    const roof = new THREE.Mesh(roofGeo, stoneMat);
    roof.position.y = 10.25;
    temple.add(roof);

    // Múltiplos Pilares Estilizados
    const pilarGeo = new THREE.CylinderGeometry(0.5, 0.5, 10, 8);
    for (let i = -8; i <= 8; i += 4) {
        const p = new THREE.Mesh(pilarGeo, stoneMat);
        p.position.set(i, 5, 9);
        temple.add(p);
    }

    // O ARTEFATO
    const artifactGeo = new THREE.OctahedronGeometry(0.8, 0);
    const artifactMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 3
    });
    const artifact = new THREE.Mesh(artifactGeo, artifactMat);
    artifact.position.set(0, 2.5, -4);
    artifact.name = "Artefato";
    temple.add(artifact);

    temple.position.set(x, 0, z);
    scene.add(temple);

    // CORREDOR DE ARMADILHAS (Muitas no templo grande)
    for (let i = -6; i <= 6; i += 3) {
        for (let j = -6; j <= 6; j += 4) {
            createTrap(x + i, z + j, Math.random() * 3);
        }
    }
}

function createTrap(x, z, offset) {
    const trapGroup = new THREE.Group();
    const spikeGeo = new THREE.ConeGeometry(0.3, 2, 4);
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x444444 });

    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    spike.rotation.x = Math.PI;
    spike.position.y = 10;
    trapGroup.add(spike);

    trapGroup.position.set(x, 0, z);
    trapGroup.userData = { initialY: 10, speed: 0.15, state: 'waiting', timer: offset };
    scene.add(trapGroup);
    traps.push(trapGroup);
}

const templePos = { x: 0, z: -80 };
createTemple(templePos.x, templePos.z);

// Gerar Floresta Super Densa (Fechando o céu)
for (let i = 0; i < 600; i++) {
    const rx = (Math.random() - 0.5) * 200;
    const rz = (Math.random() - 0.5) * 200;

    const distToTemple = Math.sqrt(Math.pow(rx - templePos.x, 2) + Math.pow(rz - templePos.z, 2));
    const distToPlayer = Math.sqrt(Math.pow(rx, 2) + Math.pow(rz, 2));

    // Evitar spawn no templo E no ponto inicial do jogador (0,0) para evitar "tela verde"
    if (distToTemple > 15 && distToPlayer > 5) {
        createTree(rx, rz);
    }
}

// --- INIMIGOS E COMBATE ---
function createEnemy(x, z) {
    const enemyGroup = new THREE.Group();

    // Pernas (para tocar o chão corretamente)
    const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const l1 = new THREE.Mesh(legGeo, legMat);
    l1.position.set(-0.18, 0.4, 0);
    enemyGroup.add(l1);
    const l2 = new THREE.Mesh(legGeo, legMat);
    l2.position.set(0.18, 0.4, 0);
    enemyGroup.add(l2);

    // Corpo do Inimigo
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 }); // Vermelho escuro
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    body.castShadow = true;
    enemyGroup.add(body);

    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.8;
    enemyGroup.add(head);

    // Detalhes Estéticos Inimigo (Capa/Colete)
    const vestGeo = new THREE.BoxGeometry(0.65, 0.5, 0.45);
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const vest = new THREE.Mesh(vestGeo, vestMat);
    vest.position.y = 1.3;
    enemyGroup.add(vest);

    enemyGroup.position.set(x, 0, z);
    // userData com munição (15) e recarga
    enemyGroup.userData = {
        health: 50,
        lastShot: 0,
        ammo: 15,
        isReloading: false,
        reloadStart: 0
    };
    scene.add(enemyGroup);
    enemies.push(enemyGroup);
}

function shootBullet(isPlayer, startPos, direction) {
    const bulletGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: isPlayer ? 0xffff00 : 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);

    bullet.position.copy(startPos);

    const bulletData = {
        mesh: bullet,
        direction: direction.clone().normalize(),
        speed: 0.5,
        isPlayer: isPlayer,
        life: 100
    };

    scene.add(bullet);
    if (isPlayer) bullets.push(bulletData);
    else enemyBullets.push(bulletData);
}

// --- LÓGICA DE REINÍCIO (MORTE) ---
function resetGame() {
    // Reposicionar Jogador Aleatoriamente (Longe do templo)
    playerGroup.position.set((Math.random() - 0.5) * 150, 0, (Math.random() * 80) + 10);
    playerHealth = 100;

    // Resetar UI
    const healthBar = document.getElementById('health-bar');
    if (healthBar) healthBar.style.width = '100%';
    document.getElementById('game-over').style.display = 'none';

    // Resetar posições de inimigos
    enemies.forEach(e => scene.remove(e));
    enemies.length = 0;
    spawnInitialEnemies();

    // Requerer trava do mouse após um pequeno delay
    setTimeout(() => {
        document.body.requestPointerLock();
    }, 100);

    console.log("Renascendo com controles ativos...");
}

// Inimigos em novas posições
function spawnInitialEnemies() {
    console.log("Iniciando spawn de inimigos...");
    for (let i = 0; i < 15; i++) {
        const ex = (Math.random() - 0.5) * 180;
        const ez = (Math.random() - 0.5) * 180;

        // Inimigos aparecem longe do templo (templePos em 0, -80)
        const distToTemple = Math.sqrt(Math.pow(ex - 0, 2) + Math.pow(ez - (-80), 2));

        if (distToTemple > 25) {
            createEnemy(ex, ez);
        }
    }
    console.log("Inimigos gerados!");
}
spawnInitialEnemies();

// --- CONTROLES E MOUSE ---
const keys = {};
const startScreen = document.getElementById('start-screen');
startScreen.addEventListener('click', () => {
    document.body.requestPointerLock();
    startScreen.style.display = 'none';
});

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

let mouseX = 0;
let mouseY = 0;
window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        cameraYaw -= e.movementX * 0.003;
        cameraPitch -= e.movementY * 0.003;
        cameraPitch = Math.max(-0.5, Math.min(0.5, cameraPitch)); // Limitar inclinação
    }
});

window.addEventListener('mousedown', (e) => {
    // Escuta na janela inteira para garantir captura do clique
    if (document.pointerLockElement === document.body && e.button === 0 && playerHealth > 0) {
        // Atirar na direção da câmera
        const shootDir = new THREE.Vector3(0, 0, -1);
        shootDir.applyQuaternion(camera.quaternion);

        // A bala sai da posição da câmera
        const startPos = camera.position.clone();
        shootBullet(true, startPos, shootDir);
        console.log("Player atirou!");
    }
});

let walkCycle = 0;
const moveSpeed = 0.12;
let bodyTilt = 0; // Inclinação lateral

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // SEMPRE permitir atualizar a rotação da câmera, mesmo se morto (para não travar no respawn)
    playerGroup.rotation.y = cameraYaw;
    camera.position.x = playerGroup.position.x;
    camera.position.y = playerGroup.position.y + eyeHeight;
    camera.position.z = playerGroup.position.z;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = cameraYaw;
    camera.rotation.x = cameraPitch;

    if (playerHealth <= 0) {
        renderer.render(scene, camera);
        return;
    }

    // Movimento relativo à câmera (INVERTIDO: W vai pra frente, S pra trás)
    const moveZInput = (keys['KeyW'] || keys['ArrowUp'] ? -1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? -1 : 0);
    const moveXInput = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);

    if (moveXInput !== 0 || moveZInput !== 0) {
        const speed = moveSpeed;
        const direction = new THREE.Vector3(moveXInput, 0, moveZInput).normalize();
        direction.applyQuaternion(playerGroup.quaternion);

        playerGroup.position.addScaledVector(direction, speed);

        // Animação de Caminhada (Braços apenas na visão)
        walkCycle += 0.2;
        leftLeg.rotation.x = Math.sin(walkCycle) * 0.5;
        rightLeg.rotation.x = Math.cos(walkCycle) * 0.5;

        // Pequeno balanço da câmera ao caminhar
        camera.position.y += Math.sin(walkCycle * 2) * 0.05;

        leftArm.rotation.x = -0.5 + Math.cos(walkCycle) * 0.1;
        rightArm.rotation.x = -0.5 + Math.sin(walkCycle) * 0.1;

        playerGroup.position.y = Math.abs(Math.sin(walkCycle)) * 0.02;
    } else {
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftArm.rotation.x = -0.3; // Posição de descanso pronta
        rightArm.rotation.x = -0.3;
        playerGroup.position.y = 0;
    }

    // --- LÓGICA DE TIROS DO JOGADOR ---
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.mesh.position.addScaledVector(b.direction, b.speed);
        b.life--;

        // Colisão com inimigos
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (b.mesh.position.distanceTo(enemy.position.clone().add(new THREE.Vector3(0, 1, 0))) < 0.8) {
                enemy.userData.health -= 25;
                scene.remove(b.mesh);
                bullets.splice(i, 1);

                if (enemy.userData.health <= 0) {
                    scene.remove(enemy);
                    enemies.splice(j, 1);
                }
                break;
            }
        }

        if (b.life <= 0 && bullets[i]) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
        }
    }

    // --- LÓGICA DE INIMIGOS E TIROS DELES ---
    enemies.forEach(enemy => {
        const dist = enemy.position.distanceTo(playerGroup.position);
        if (dist < 15) {
            enemy.lookAt(playerGroup.position);
            const now = Date.now();

            // Lógica de Recarga
            if (enemy.userData.isReloading) {
                if (now - enemy.userData.reloadStart > 3000) { // 3 segundos para recarregar
                    enemy.userData.ammo = 15;
                    enemy.userData.isReloading = false;
                }
                return;
            }

            if (now - enemy.userData.lastShot > 2000) {
                const dir = playerGroup.position.clone().sub(enemy.position).normalize();
                shootBullet(false, enemy.position.clone().add(new THREE.Vector3(0, 1.2, 0)), dir);
                enemy.userData.lastShot = now;
                enemy.userData.ammo--;

                if (enemy.userData.ammo <= 0) {
                    enemy.userData.isReloading = true;
                    enemy.userData.reloadStart = now;
                }
            }
        }
    });

    // --- LÓGICA DE ARMADILHAS ---
    traps.forEach(trap => {
        const ud = trap.userData;
        if (ud.state === 'waiting') {
            ud.timer -= delta;
            if (ud.timer <= 0) ud.state = 'falling';
        } else if (ud.state === 'falling') {
            trap.children[0].position.y -= 0.2;
            if (trap.children[0].position.y <= 0.5) ud.state = 'rising';
        } else if (ud.state === 'rising') {
            trap.children[0].position.y += 0.05;
            if (trap.children[0].position.y >= ud.initialY) {
                ud.state = 'waiting';
                ud.timer = 2; // Espera 2 segundos para cair de novo
            }
        }

        // Colisão Armadilha -> Jogador (Posição global do spike)
        const spikeWorldPos = new THREE.Vector3();
        trap.children[0].getWorldPosition(spikeWorldPos);
        if (spikeWorldPos.distanceTo(playerGroup.position.clone().add(new THREE.Vector3(0, 1, 0))) < 0.8) {
            playerHealth -= 100; // Morte Instantânea
        }
    });

    // --- LÓGICA DO ARTEFATO ---
    const artifact = scene.getObjectByName("Artefato");
    if (artifact && !artifactFound) {
        artifact.rotation.y += 0.02;
        const playerDist = playerGroup.position.distanceTo(artifact.getWorldPosition(new THREE.Vector3()));
        if (playerDist < 1.5) {
            artifactFound = true;
            artifact.visible = false;
            alert("ARTEFATO COLETADO! Missão central concluída.");
        }
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.mesh.position.addScaledVector(b.direction, b.speed);
        b.life--;

        if (b.mesh.position.distanceTo(playerGroup.position.clone().add(new THREE.Vector3(0, 1, 0))) < 0.6) {
            playerHealth -= 10;
            const healthBar = document.getElementById('health-bar');
            if (healthBar) healthBar.style.width = playerHealth + '%';
            scene.remove(b.mesh);
            enemyBullets.splice(i, 1);

            if (playerHealth <= 0) {
                playerHealth = 0;
                if (healthBar) healthBar.style.width = '0%';
                document.getElementById('game-over').style.display = 'flex';
                document.exitPointerLock();
            }
        }

        if (b.life <= 0 && enemyBullets[i]) {
            scene.remove(b.mesh);
            enemyBullets.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
console.log("Lucas Lobo explorando a Floresta Amazônica...");
