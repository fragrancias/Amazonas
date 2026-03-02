// Configuração da Cena (THREE já está disponível globalmente)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020a02); // Escuridão da mata densa
scene.fog = new THREE.Fog(0x020a02, 15, 45);

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
const clock = new THREE.Clock();

// ILUMINAÇÃO
const ambientLight = new THREE.AmbientLight(0x112211, 1.5); // Luz ambiente esverdeada
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff0dd, 2); // Luz do sol quente
sunLight.position.set(10, 20, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
scene.add(sunLight);

// CHÃO DA SELVA
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x142b14 });
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

    // Tronco
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 3, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2b1d0e });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Folhagem
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x0a3d0a });
    for (let i = 0; i < 3; i++) {
        const leafGeo = new THREE.SphereGeometry(1.2 - (i * 0.2), 8, 8);
        const leaves = new THREE.Mesh(leafGeo, leafMat);
        leaves.position.y = 2.5 + (i * 0.8);
        leaves.castShadow = true;
        tree.add(leaves);
    }

    tree.position.set(x, 0, z);
    scene.add(tree);
}

function createRuins(x, z) {
    const stoneGeo = new THREE.BoxGeometry(1 + Math.random(), 2 + Math.random() * 2, 1 + Math.random());
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.set(x, stone.geometry.parameters.height / 2, z);
    stone.rotation.y = Math.random() * Math.PI;
    stone.castShadow = true;
    stone.receiveShadow = true;
    scene.add(stone);
}

// Gerar Selva Aleatória
for (let i = 0; i < 60; i++) {
    const rx = (Math.random() - 0.5) * 80;
    const rz = (Math.random() - 0.5) * 80;
    if (Math.abs(rx) > 3 || Math.abs(rz) > 3) {
        createTree(rx, rz);
    }
}

// --- INIMIGOS E COMBATE ---
function createEnemy(x, z) {
    const enemyGroup = new THREE.Group();

    // Corpo do Inimigo (Cor diferente para distinguir)
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

    enemyGroup.position.set(x, 0, z);
    enemyGroup.userData = { health: 50, lastShot: 0 };
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

// Função para Gerar Inimigos com delay de 5 segundos
function spawnInitialEnemies() {
    console.log("Inimigos aparecendo em 5 segundos...");
    setTimeout(() => {
        for (let i = 0; i < 5; i++) {
            createEnemy((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
        }
        console.log("Inimigos em campo!");
    }, 5000);
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

document.body.addEventListener('mousedown', (e) => {
    // Só atira se o mouse estiver travado (evita disparar ao clicar em menus)
    if (document.pointerLockElement === document.body && e.button === 0 && playerHealth > 0) {
        // Atirar na direção da câmera
        const shootDir = new THREE.Vector3(0, 0, -1);
        shootDir.applyQuaternion(camera.quaternion);

        // A bala sai da posição da câmera
        const startPos = camera.position.clone();
        shootBullet(true, startPos, shootDir);
    }
});

let walkCycle = 0;
const moveSpeed = 0.12;
let bodyTilt = 0; // Inclinação lateral

function animate() {
    requestAnimationFrame(animate);
    if (playerHealth <= 0) return; // Parar se estiver morto

    const delta = clock.getDelta();

    // Movimento relativo à câmera (INVERTIDO: W vai pra frente, S pra trás)
    const moveZInput = (keys['KeyW'] || keys['ArrowUp'] ? -1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? -1 : 0);
    const moveXInput = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);

    // Aplicar rotação do mouse
    playerGroup.rotation.y = cameraYaw;

    // Atualizar Câmera
    camera.position.x = playerGroup.position.x;
    camera.position.y = playerGroup.position.y + eyeHeight;
    camera.position.z = playerGroup.position.z;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = cameraYaw;
    camera.rotation.x = cameraPitch;

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
            if (now - enemy.userData.lastShot > 2000) {
                const dir = playerGroup.position.clone().sub(enemy.position).normalize();
                shootBullet(false, enemy.position.clone().add(new THREE.Vector3(0, 1.2, 0)), dir);
                enemy.userData.lastShot = now;
            }
        }
    });

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

                // Mostrar tela de Game Over
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
