// Configuração da Cena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020a02);
scene.fog = new THREE.Fog(0x020a02, 15, 45);

const aspect = window.innerWidth / window.innerHeight;
const d = 12;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x112211, 1.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff0dd, 2);
sunLight.position.set(10, 20, 10);
sunLight.castShadow = true;
scene.add(sunLight);

const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x142b14 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const playerGroup = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), new THREE.MeshStandardMaterial({ color: 0x3d2b1f }));
body.position.y = 1.2; body.castShadow = true; playerGroup.add(body);
const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xd2b48c }));
head.position.y = 1.8; head.castShadow = true; playerGroup.add(head);

const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const leftLeg = new THREE.Mesh(legGeo, legMat); leftLeg.position.set(-0.18, 0.4, 0); leftLeg.castShadow = true; playerGroup.add(leftLeg);
const rightLeg = new THREE.Mesh(legGeo, legMat); rightLeg.position.set(0.18, 0.4, 0); rightLeg.castShadow = true; playerGroup.add(rightLeg);

const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
const leftArm = new THREE.Mesh(armGeo, body.material); leftArm.position.set(-0.45, 1.2, 0); leftArm.castShadow = true; playerGroup.add(leftArm);
const rightArm = new THREE.Mesh(armGeo, body.material); rightArm.position.set(0.45, 1.2, 0); rightArm.castShadow = true; playerGroup.add(rightArm);
scene.add(playerGroup);

function createTree(x, z) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 8), new THREE.MeshStandardMaterial({ color: 0x2b1d0e }));
    trunk.position.y = 1.5; trunk.castShadow = true; tree.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0x0a3d0a }));
    leaves.position.y = 3; leaves.castShadow = true; tree.add(leaves);
    tree.position.set(x, 0, z); scene.add(tree);
}

for (let i = 0; i < 40; i++) createTree((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80);

const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

let walkCycle = 0;
const moveSpeed = 0.12;

function animate() {
    requestAnimationFrame(animate);
    const moveZ = (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) - (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0);
    const moveX = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);

    if (moveX !== 0 || moveZ !== 0) {
        playerGroup.position.x -= (moveX - moveZ) * 0.7 * moveSpeed;
        playerGroup.position.z -= (moveX + moveZ) * 0.7 * moveSpeed;
        playerGroup.rotation.y = Math.atan2(-(moveX - moveZ), -(moveX + moveZ));
        walkCycle += 0.2;
        leftLeg.rotation.x = Math.sin(walkCycle) * 0.5;
        rightLeg.rotation.x = Math.cos(walkCycle) * 0.5;
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
