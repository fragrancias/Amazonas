// Configuração da Cena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020a02);
scene.fog = new THREE.Fog(0x020a02, 15, 60);

const aspect = window.innerWidth / window.innerHeight;
const d = 15;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ILUMINAÇÃO
scene.add(new THREE.AmbientLight(0x112211, 2));
const sun = new THREE.DirectionalLight(0xfff0dd, 1.5);
sun.position.set(10, 20, 10);
sun.castShadow = true;
scene.add(sun);

// CHÃO
const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x142b14 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- SISTEMA DE COMBATE ---
const bullets = [];
const enemies = [];
const enemyBullets = [];
let playerHealth = 100;

// Efeito de Flash ao Atirar
function createMuzzleFlash(pos) {
    const flash = new THREE.PointLight(0xffaa00, 10, 2);
    flash.position.copy(pos);
    scene.add(flash);
    setTimeout(() => scene.remove(flash), 50);
}

// --- PERSONAGEM (LUCAS LOBO) ---
const playerGroup = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), new THREE.MeshStandardMaterial({ color: 0x3d2b1f }));
body.position.y = 1.2; body.castShadow = true; playerGroup.add(body);
const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xd2b48c }));
head.position.y = 1.8; head.castShadow = true; playerGroup.add(head);

const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), legMat);
leftLeg.position.set(-0.18, 0.4, 0); leftLeg.castShadow = true; playerGroup.add(leftLeg);
const rightLeg = leftLeg.clone(); rightLeg.position.x = 0.18; playerGroup.add(rightLeg);

// ARMA DO LUCAS
const gun = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
gun.position.set(0.45, 1.2, 0.3);
playerGroup.add(gun);

scene.add(playerGroup);

// --- INIMIGOS (MERCENÁRIOS) ---
function spawnEnemy() {
    const enemyGroup = new THREE.Group();
    const eBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), new THREE.MeshStandardMaterial({ color: 0x1a2421 })); // Cinza Militar
    eBody.position.y = 1.2; enemyGroup.add(eBody);
    const eHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x444444 })); // Capacete
    eHead.position.y = 1.8; enemyGroup.add(eHead);

    // Posição Aleatória
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 10;
    enemyGroup.position.set(playerGroup.position.x + Math.cos(angle) * dist, 0, playerGroup.position.z + Math.sin(angle) * dist);

    scene.add(enemyGroup);
    enemies.push({ mesh: enemyGroup, lastShot: Date.now(), health: 2 });
}

for (let i = 0; i < 5; i++) spawnEnemy();

// --- CONTROLES ---
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') shoot();
});
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('mousedown', () => shoot());

function shoot() {
    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
    bullet.position.copy(playerGroup.position);
    bullet.position.y = 1.2;
    // Direção baseada na rotação do jogador
    const velocity = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y).multiplyScalar(0.4);
    bullets.push({ mesh: bullet, vel: velocity });
    scene.add(bullet);
    createMuzzleFlash(bullet.position);
}

// --- SELVA ---
function addTree(x, z) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3), new THREE.MeshStandardMaterial({ color: 0x2b1d0e }));
    trunk.position.y = 1.5; tree.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2), new THREE.MeshStandardMaterial({ color: 0x0a3d0a }));
    leaves.position.y = 3; tree.add(leaves);
    tree.position.set(x, 0, z); scene.add(tree);
}
for (let i = 0; i < 60; i++) addTree((Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150);

// --- LOOP DE ANIMAÇÃO ---
let walk = 0;
function animate() {
    requestAnimationFrame(animate);

    // MOVIMENTAÇÃO (REVERTIDA PARA PADRÃO CONFORME PEDIDO)
    const moveZ = (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) - (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0);
    const moveX = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);

    if (moveX !== 0 || moveZ !== 0) {
        playerGroup.position.x += (moveX - moveZ) * 0.1;
        playerGroup.position.z += (moveX + moveZ) * 0.1;
        playerGroup.rotation.y = Math.atan2(moveX - moveZ, moveX + moveZ);
        walk += 0.2;
        leftLeg.rotation.x = Math.sin(walk) * 0.5;
        rightLeg.rotation.x = Math.cos(walk) * 0.5;
    }

    // ATUALIZAR BALAS DO JOGADOR
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].mesh.position.add(bullets[i].vel);
        if (bullets[i].mesh.position.distanceTo(playerGroup.position) > 40) {
            scene.remove(bullets[i].mesh);
            bullets.splice(i, 1);
            continue;
        }
        // Colisão com inimigos
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (bullets[i] && bullets[i].mesh.position.distanceTo(enemies[j].mesh.position) < 1.5) {
                enemies[j].health--;
                scene.remove(bullets[i].mesh);
                bullets.splice(i, 1);
                if (enemies[j].health <= 0) {
                    scene.remove(enemies[j].mesh);
                    enemies.splice(j, 1);
                    setTimeout(spawnEnemy, 2000); // Respawn
                }
                break;
            }
        }
    }

    // ATUALIZAR INIMIGOS
    enemies.forEach(enemy => {
        // Mover em direção ao jogador
        const dir = new THREE.Vector3().subVectors(playerGroup.position, enemy.mesh.position).normalize();
        if (enemy.mesh.position.distanceTo(playerGroup.position) > 10) {
            enemy.mesh.position.add(dir.multiplyScalar(0.05));
        }
        enemy.mesh.lookAt(playerGroup.position.x, 0, playerGroup.position.z);

        // Inimigos Atirando
        if (Date.now() - enemy.lastShot > 2000) {
            const eBullet = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xff4400 }));
            eBullet.position.copy(enemy.mesh.position);
            eBullet.position.y = 1.2;
            const eVel = new THREE.Vector3().subVectors(playerGroup.position, enemy.mesh.position).normalize().multiplyScalar(0.2);
            enemyBullets.push({ mesh: eBullet, vel: eVel });
            scene.add(eBullet);
            enemy.lastShot = Date.now();
        }
    });

    // ATUALIZAR BALAS DOS INIMIGOS
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].mesh.position.add(enemyBullets[i].vel);
        if (enemyBullets[i].mesh.position.distanceTo(playerGroup.position) < 1 && playerHealth > 0) {
            playerHealth -= 10;
            console.log("Health: " + playerHealth);
            scene.remove(enemyBullets[i].mesh);
            enemyBullets.splice(i, 1);
            document.querySelector('p').innerText = "Lucas Lobo | Vida: " + playerHealth;
            if (playerHealth <= 0) alert("Lucas Lobo caiu! Mas o amuleto o transportará novamente...");
        } else if (enemyBullets[i].mesh.position.distanceTo(playerGroup.position) > 50) {
            scene.remove(enemyBullets[i].mesh);
            enemyBullets.splice(i, 1);
        }
    }

    camera.position.x = playerGroup.position.x + 20;
    camera.position.z = playerGroup.position.z + 20;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -d * aspect; camera.right = d * aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
