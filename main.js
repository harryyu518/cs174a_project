import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f121a);

// axes helper
const axesHelper = new THREE.AxesHelper(2); // length = 2 units
scene.add(axesHelper);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 2.5, 8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// lights
scene.add(new THREE.HemisphereLight(0x88aaff, 0x223344, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 6);
scene.add(dir);

// ground grid 
const grid = new THREE.GridHelper(40, 40, 0x335577, 0x223344);
grid.position.y = -1;
scene.add(grid);

// --- BIRD MODEL PLACEHOLDER --------------------------------------------------
function makeBird() {
    const bird = new THREE.Group();

    // Beak (cone), points along +Z
    const beakGeom = new THREE.ConeGeometry(0.12, 0.6, 6, 1);
    beakGeom.rotateX(Math.PI / 2);  // align along +Z
    beakGeom.translate(0, 0, 0.25); // push forward so the tip is out front
    const beakMat = new THREE.MeshStandardMaterial({color: 0xffcc88, roughness: 0.5, metalness: 0.05, flatShading: true});
    const beak = new THREE.Mesh(beakGeom, beakMat);
    bird.add(beak);

    // Head (sphere) placed at the cone's base end
    // Cone base center is at z = -0.05 after the transforms above.
    const headR = 0.18;
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(headR, 16, 16),
        new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.6, metalness: 0.05, flatShading: true
        })
    );
    head.position.set(0, 0.05, -0.08); // slight Y lift and small overlap with beak base
    bird.add(head);

    // Body (scaled sphere)
    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16),
        new THREE.MeshStandardMaterial({
        color: 0xdddddd, roughness: 0.7, metalness: 0.05, flatShading: true
        })
    );
    body.scale.set(1, 0.7, 1.4); // elongate body
    body.position.set(0, 0.05, -0.5); // position behind head
    bird.add(body);

    // Simple eyes (black spheres)
    const eyeGeom = new THREE.SphereGeometry(0.03, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.5, metalness: 0.1 });
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.15, 0.1, -0.05);
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.15, 0.1, -0.05);
    bird.add(leftEye);
    bird.add(rightEye);

    // Wings (triangles extruded a bit)
    const wingShape = new THREE.Shape();
    const wingLength = 1;
    const wingHeight = 0.5;

    wingShape.moveTo(0, 0);
    wingShape.lineTo(wingLength, wingHeight / 2);
    wingShape.lineTo(wingLength, -wingHeight / 2);
    wingShape.lineTo(0, 0);

    const wingGeom = new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.03,
        bevelEnabled: false
    });
    const wingMat = new THREE.MeshStandardMaterial({color: 0xcccccc, roughness: 0.7, metalness: 0.05, flatShading: true});

    const leftWing = new THREE.Mesh(wingGeom, wingMat);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.position.set(-1.1, 0.07, -0.5);
    const rightWing = new THREE.Mesh(wingGeom, wingMat);
    rightWing.scale.x = -1;          
    rightWing.rotation.x = Math.PI / 2;
    rightWing.position.set(1.1, 0.07, -0.5);
    bird.add(leftWing);
    bird.add(rightWing);

    // --- tail (triangle along Y so it points along -Z after rotateX) ---
    const tailLen = 0.45;       // how far back
    const tailHalfW = 0.18;     // width at the end

    const tailShape = new THREE.Shape();
    tailShape.moveTo(0, 0);                         // root at body
    tailShape.lineTo(-tailHalfW, -tailLen);         // back-left
    tailShape.lineTo( tailHalfW, -tailLen);         // back-right
    tailShape.closePath();

    const tailGeom = new THREE.ExtrudeGeometry(tailShape, { depth: 0.03, bevelEnabled: false });
    const tailMat  = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.7, metalness: 0.05, flatShading: true });

    const tail = new THREE.Mesh(tailGeom, tailMat);
    tail.rotation.x = Math.PI / 2;                  // Y → Z (now points along -Z)
    tail.position.set(0, 0.07, -0.78);              // centered; straight back
    bird.add(tail);

    return bird;
}

// flock group
const flock = new THREE.Group();
scene.add(flock);

for (let i = 0; i < 1; i++) {
  const bird = makeBird();
  bird.position.set(
    // THREE.MathUtils.randFloatSpread(40),
    // THREE.MathUtils.randFloat(0, 20),
    // THREE.MathUtils.randFloatSpread(40)
    0, 0, 0
  );
  bird.userData.heading = new THREE.Euler(
    0,
    THREE.MathUtils.randFloat(0, Math.PI * 2),
    0
  );
  bird.rotation.copy(bird.userData.heading);
  flock.add(bird);
}

// simple idle motion so you can preview silhouettes while modeling
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  controls.update();
  renderer.render(scene, camera);
}
animate();

// resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


//  If using GLTF:
//    import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
//    const loader = new GLTFLoader();
//    loader.load('/bird.glb', (g) => { bird = g.scene; /* scale/rotate/etc */ });
