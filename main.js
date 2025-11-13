// ======================= IMPORTS ===========================
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ======================= RENDERER ===========================
const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f121a);

// ======================= CAMERA ===========================
const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.1, 500
);
camera.position.set(0, 2.5, 8);

// Orbit Controls (mouse navigation)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ======================= CAMERA MODES ===========================
let cameraMode = 'free'; // 'free' | 'chase' | 'birdPOV' | 'overview'
controls.enabled = true;

// Keyboard movement state (WASD + QE)
const keys = {
  forward: false, back: false,
  left: false, right: false,
  up: false, down: false
};

window.addEventListener('keydown', (e) => {
  switch (e.key) {
    // Movement keys
    case 'w': case 'W': case 'ArrowUp':    keys.forward = true; break;
    case 's': case 'S': case 'ArrowDown':  keys.back = true;    break;
    case 'a': case 'A': case 'ArrowLeft':  keys.left = true;    break;
    case 'd': case 'D': case 'ArrowRight': keys.right = true;   break;
    case 'q': case 'Q':                    keys.up = true;      break;
    case 'e': case 'E':                    keys.down = true;    break;

    // Camera mode keys
    case '1':
      cameraMode = 'free';
      controls.enabled = true; // re-enable mouse orbit
      camera.position.set(0, 2.5, 8);
      controls.target.set(0, 0, 0);
      console.log("Mode: FREE");
      break;

    case '2':
      cameraMode = 'chase';
      controls.enabled = false;
      console.log("Mode: CHASE");
      break;

    case '3':
      cameraMode = 'birdPOV';
      controls.enabled = false;
      console.log("Mode: BIRD POV");
      break;

    case '4':
      cameraMode = 'overview';
      controls.enabled = false;
      console.log("Mode: OVERVIEW");
      break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.key) {
    case 'w': case 'W': case 'ArrowUp':    keys.forward = false; break;
    case 's': case 'S': case 'ArrowDown':  keys.back = false;    break;
    case 'a': case 'A': case 'ArrowLeft':  keys.left = false;    break;
    case 'd': case 'D': case 'ArrowRight': keys.right = false;   break;
    case 'q': case 'Q':                    keys.up = false;      break;
    case 'e': case 'E':                    keys.down = false;    break;
  }
});

// ======================= LIGHTS ===========================
scene.add(new THREE.HemisphereLight(0x88aaff, 0x223344, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 6);
scene.add(dir);

// ======================= GRID ===========================
const grid = new THREE.GridHelper(40, 40, 0x335577, 0x223344);
grid.position.y = -1;
scene.add(grid);

// ======================= BIRD MODEL ===========================
function makeBird() {
  const bird = new THREE.Group();

  // Beak
  const beakGeom = new THREE.ConeGeometry(0.12, 0.6, 6);
  beakGeom.rotateX(Math.PI / 2);
  beakGeom.translate(0, 0, 0.25);
  const beak = new THREE.Mesh(
    beakGeom,
    new THREE.MeshStandardMaterial({
      color: 0xffcc88, roughness: 0.5, metalness: 0.05, flatShading: true
    })
  );
  bird.add(beak);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.6, metalness: 0.05, flatShading: true
    })
  );
  head.position.set(0, 0.05, -0.08);
  bird.add(head);

  // Body
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xdddddd, roughness: 0.7, metalness: 0.05, flatShading: true
    })
  );
  body.scale.set(1, 0.7, 1.4);
  body.position.set(0, 0.05, -0.5);
  bird.add(body);

  // Eyes
  const eyeGeom = new THREE.SphereGeometry(0.03, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x000000, roughness: 0.5, metalness: 0.1
  });
  const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
  const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
  leftEye.position.set(-0.15, 0.1, -0.05);
  rightEye.position.set(0.15, 0.1, -0.05);
  bird.add(leftEye, rightEye);

  // Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(1, 0.25);
  wingShape.lineTo(1, -0.25);
  wingShape.lineTo(0, 0);

  const wingGeom = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.03, bevelEnabled: false
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc, roughness: 0.7, metalness: 0.05, flatShading: true
  });

  const leftWing = new THREE.Mesh(wingGeom, wingMat);
  leftWing.rotation.x = Math.PI / 2;
  leftWing.position.set(-1.1, 0.07, -0.5);

  const rightWing = new THREE.Mesh(wingGeom, wingMat);
  rightWing.scale.x = -1;
  rightWing.rotation.x = Math.PI / 2;
  rightWing.position.set(1.1, 0.07, -0.5);

  bird.add(leftWing, rightWing);

  // Tail
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.lineTo(-0.18, -0.45);
  tailShape.lineTo(0.18, -0.45);
  tailShape.closePath();

  const tail = new THREE.Mesh(
    new THREE.ExtrudeGeometry(tailShape, { depth: 0.03, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({
      color: 0xbbbbbb, roughness: 0.7, metalness: 0.05, flatShading: true
    })
  );
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.07, -0.78);
  bird.add(tail);

  return bird;
}

// ======================= FLOCK ===========================
const flock = new THREE.Group();
scene.add(flock);

const birds = [];

for (let i = 0; i < 1; i++) {
  const bird = makeBird();
  bird.position.set(0, 0, 0);
  flock.add(bird);
  birds.push(bird);
}

// ======================= CAMERA HELPERS ===========================
const tmpForward = new THREE.Vector3();
const tmpRight   = new THREE.Vector3();
const tmpMove    = new THREE.Vector3();
const tmpUp      = new THREE.Vector3(0, 1, 0);
const tmpCenter  = new THREE.Vector3();
const moveSpeed  = 6;

// WASD/QE movement ONLY in free mode
function updateCameraMovement(delta) {
  if (cameraMode !== 'free') return;

  camera.getWorldDirection(tmpForward);
  tmpForward.y = 0;
  tmpForward.normalize();

  tmpRight.crossVectors(tmpForward, camera.up).normalize();

  tmpMove.set(0, 0, 0);
  if (keys.forward) tmpMove.add(tmpForward);
  if (keys.back)    tmpMove.sub(tmpForward);
  if (keys.left)    tmpMove.sub(tmpRight);
  if (keys.right)   tmpMove.add(tmpRight);
  if (keys.up)      tmpMove.y += 1;
  if (keys.down)    tmpMove.y -= 1;

  if (tmpMove.lengthSq() > 0) {
    tmpMove.normalize().multiplyScalar(moveSpeed * delta);
    camera.position.add(tmpMove);
    controls.target.add(tmpMove);
  }
}

// Camera modes logic
function updateCameraForMode() {
  // In free mode we don't touch the camera here
  if (cameraMode === 'free') return;

  const mainBird = birds[0];
  if (!mainBird) return;

  const birdPos = new THREE.Vector3();
  mainBird.getWorldPosition(birdPos);

  const forward = new THREE.Vector3(0, 0, 1);
  forward.applyQuaternion(mainBird.quaternion).normalize();

  // ---- Bird POV (mode 3) ----
  if (cameraMode === 'birdPOV') {
    const eyeOffsetUp   = 0.5;   // higher above the bird
    const eyeOffsetBack = 1.3;   // well behind the bird
    const lookAheadDist = 40;    // look far into distance

    const camPos = birdPos.clone()
      .add(tmpUp.clone().multiplyScalar(eyeOffsetUp))
      .add(forward.clone().multiplyScalar(-eyeOffsetBack));

    camera.position.lerp(camPos, 0.2);

    const lookAt = birdPos.clone()
      .add(forward.clone().multiplyScalar(lookAheadDist))
      .add(tmpUp.clone().multiplyScalar(-0.1));

    camera.lookAt(lookAt);
  }

  // ---- Chase cam (mode 2) ----
  else if (cameraMode === 'chase') {
    const desired = birdPos.clone()
      .add(tmpUp.clone().multiplyScalar(0.8))
      .add(forward.clone().multiplyScalar(-1.8));

    camera.position.lerp(desired, 0.12);
    camera.lookAt(birdPos);
  }

  // ---- Overview (mode 4) ----
  else if (cameraMode === 'overview') {
    tmpCenter.set(0, 0, 0);

    flock.children.forEach((b) => {
      const p = new THREE.Vector3();
      b.getWorldPosition(p);
      tmpCenter.add(p);
    });

    tmpCenter.multiplyScalar(1 / flock.children.length);

    const desired = tmpCenter.clone().add(new THREE.Vector3(0, 18, 20));
    camera.position.lerp(desired, 0.1);
    camera.lookAt(tmpCenter);
  }
}

// ======================= LOOP ===========================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  updateCameraMovement(delta);
  updateCameraForMode();

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ======================= RESIZE ===========================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
