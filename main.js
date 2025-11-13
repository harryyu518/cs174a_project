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
// Realistic sunlight
const sunLight = new THREE.DirectionalLight(0xfffbf0, 1.2);
sunLight.position.set(50, 40, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.camera.far = 200;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
scene.add(sunLight);

// Sky ambient light (simulate sky reflection)
const skyLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.6);
scene.add(skyLight);

// Create the Sun sphere
const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({
  color: 0xfdb813,
  toneMapped: false
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.copy(sunLight.position);
scene.add(sun);

// Add a glowing effect around the sun
const glowGeometry = new THREE.SphereGeometry(3.5, 32, 32);
const glowMaterial = new THREE.MeshBasicMaterial({
  color: 0xffa500,
  transparent: true,
  opacity: 0.2,
  toneMapped: false
});
const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
sunGlow.position.copy(sunLight.position);
scene.add(sunGlow);

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

  // --- LEFT WING ---
  const leftWingPivot = new THREE.Object3D();
  const leftWing = new THREE.Mesh(wingGeom, wingMat);

  // Move geometry so the pivot (0,0,0) sits at the wing's base
  leftWing.position.x = -1.0; // shift wing back toward the body
  leftWing.rotation.x = Math.PI / 2;

  leftWingPivot.add(leftWing);
  leftWingPivot.position.set(-0.1, 0.07, -0.5); // attach near body
  bird.add(leftWingPivot);

  // --- RIGHT WING ---
  const rightWingPivot = new THREE.Object3D();
  const rightWing = new THREE.Mesh(wingGeom, wingMat);

  rightWing.scale.x = -1; // mirror geometry
  rightWing.position.x = 1.0;
  rightWing.rotation.x = Math.PI / 2;

  rightWingPivot.add(rightWing);
  rightWingPivot.position.set(0.1, 0.07, -0.5);
  bird.add(rightWingPivot);

  // Store pivots for animation
  bird.userData.leftWingPivot = leftWingPivot;
  bird.userData.rightWingPivot = rightWingPivot;


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

// ======================= FLOCK (Boids) ===========================
const NUM_BIRDS = 20; // change to 1..N as desired
const flock = new THREE.Group();
scene.add(flock);

const birds = [];

// Boid parameters (tweak these for different flock behaviour)
const BOID = {
  maxSpeed: 4.0,
  maxForce: 0.08,
  neighborRadius: 2.5,
  separationRadius: 0.7,
  alignmentWeight: 1.0,
  cohesionWeight: 0.9,
  separationWeight: 1.8,
  bounds: {
    mode: 'wrap', // 'wrap' or 'bounce' or 'none'
    size: 30
  }
};

// create birds and assign initial velocity/acceleration
for (let i = 0; i < NUM_BIRDS; i++) {
  const b = makeBird();
  // random spawn area
  b.position.set(
    (Math.random() - 0.5) * 10,
    Math.random() * 3 + 0.2,
    (Math.random() - 0.5) * 10
  );

  // initial small random velocity
  const v = new THREE.Vector3(
    (Math.random() - 0.5) * 0.6,
    (Math.random() - 0.2) * 0.4,
    (Math.random() - 0.5) * 0.6
  );

  b.userData.velocity = v;
  b.userData.acceleration = new THREE.Vector3();
  b.userData.maxSpeed = BOID.maxSpeed;
  b.userData.maxForce = BOID.maxForce;

  // optionally tag sub-parts for animation (wings)
  // we expect wing meshes are the 4th/5th children (leftWing,rightWing) from makeBird
  b.userData.leftWing = b.children.find((c) => c.name && c.name.includes('leftWing')) || null;
  b.userData.rightWing = b.children.find((c) => c.name && c.name.includes('rightWing')) || null;

  flock.add(b);
  birds.push(b);
}

// Helper vectors reused to avoid allocations
const steerVec = new THREE.Vector3();
const tempVec1 = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();
const tempVec3 = new THREE.Vector3();
const upVec = new THREE.Vector3(0, 1, 0);

// Compute steering force to limit vector length to max
function limitVector(v, max) {
  const l = v.length();
  if (l > max) v.multiplyScalar(max / l);
}

// Boid rule implementations
function separation(index) {
  const self = birds[index];
  const pos = self.position;
  const desiredSeparation = BOID.separationRadius;

  const steer = new THREE.Vector3();
  let count = 0;

  for (let i = 0; i < birds.length; i++) {
    if (i === index) continue;
    const other = birds[i];
    const d = pos.distanceTo(other.position);
    if (d > 0 && d < desiredSeparation) {
      tempVec1.subVectors(pos, other.position).normalize().divideScalar(d); // stronger when closer
      steer.add(tempVec1);
      count++;
    }
  }

  if (count > 0) {
    steer.divideScalar(count);
  }

  if (steer.lengthSq() > 0) {
    steer.setLength(self.userData.maxSpeed);
    steer.sub(self.userData.velocity);
    limitVector(steer, self.userData.maxForce);
  }

  return steer;
}

function alignment(index) {
  const self = birds[index];
  const pos = self.position;
  const neighDist = BOID.neighborRadius;

  const sum = new THREE.Vector3();
  let count = 0;
  for (let i = 0; i < birds.length; i++) {
    if (i === index) continue;
    const other = birds[i];
    const d = pos.distanceTo(other.position);
    if (d > 0 && d < neighDist) {
      sum.add(other.userData.velocity);
      count++;
    }
  }

  if (count > 0) {
    sum.divideScalar(count);
    sum.setLength(self.userData.maxSpeed);
    sum.sub(self.userData.velocity);
    limitVector(sum, self.userData.maxForce);
    return sum;
  }

  return new THREE.Vector3();
}

function cohesion(index) {
  const self = birds[index];
  const pos = self.position;
  const neighDist = BOID.neighborRadius;

  const center = new THREE.Vector3();
  let count = 0;
  for (let i = 0; i < birds.length; i++) {
    if (i === index) continue;
    const other = birds[i];
    const d = pos.distanceTo(other.position);
    if (d > 0 && d < neighDist) {
      center.add(other.position);
      count++;
    }
  }

  if (count > 0) {
    center.divideScalar(count);
    // seek towards center
    tempVec1.subVectors(center, pos);
    tempVec1.setLength(self.userData.maxSpeed);
    tempVec1.sub(self.userData.velocity);
    limitVector(tempVec1, self.userData.maxForce);
    return tempVec1;
  }

  return new THREE.Vector3();
}

// boundary handling
function enforceBounds(bird) {
  const bsize = BOID.bounds.size;
  if (BOID.bounds.mode === 'wrap') {
    if (bird.position.x > bsize) bird.position.x = -bsize;
    if (bird.position.x < -bsize) bird.position.x = bsize;
    if (bird.position.y > bsize) bird.position.y = 1; // keep above ground
    if (bird.position.y < -1) bird.position.y = -1;
    if (bird.position.z > bsize) bird.position.z = -bsize;
    if (bird.position.z < -bsize) bird.position.z = bsize;
  } else if (BOID.bounds.mode === 'bounce') {
    if (Math.abs(bird.position.x) > bsize) {
      bird.position.x = Math.sign(bird.position.x) * bsize;
      bird.userData.velocity.x *= -0.8;
    }
    if (bird.position.y > bsize) {
      bird.position.y = bsize;
      bird.userData.velocity.y *= -0.8;
    }
    if (bird.position.y < -1) {
      bird.position.y = -1;
      bird.userData.velocity.y *= -0.8;
    }
    if (Math.abs(bird.position.z) > bsize) {
      bird.position.z = Math.sign(bird.position.z) * bsize;
      bird.userData.velocity.z *= -0.8;
    }
  }
}

function updateFlock(delta) {
  // accumulate steering for each bird (so updates don't affect others mid-frame)
  const steeringForces = new Array(birds.length).fill(null).map(() => new THREE.Vector3());

  for (let i = 0; i < birds.length; i++) {
    const sep = separation(i).multiplyScalar(BOID.separationWeight);
    const ali = alignment(i).multiplyScalar(BOID.alignmentWeight);
    const coh = cohesion(i).multiplyScalar(BOID.cohesionWeight);
    steeringForces[i].add(sep).add(ali).add(coh);
  }

  // integrate
  for (let i = 0; i < birds.length; i++) {
    const b = birds[i];
    const acc = b.userData.acceleration;
    acc.copy(steeringForces[i]); // treat steering as acceleration directly

    // velocity += acceleration * dt
    b.userData.velocity.addScaledVector(acc, delta);

    // limit speed
    limitVector(b.userData.velocity, b.userData.maxSpeed);

    // position += velocity * dt
    b.position.addScaledVector(b.userData.velocity, delta);

    // orientation: make bird look along velocity direction if moving
    if (b.userData.velocity.lengthSq() > 1e-4) {
      const vel = b.userData.velocity.clone().normalize();
      tempVec1.copy(b.position).add(vel);
      b.lookAt(tempVec1);
    }

    // ====================================================
    // 🪽 Wing flap animation (pivot-based, synchronized)
    // ====================================================
    const t = performance.now() * 0.005;
    const tiltAngle = Math.sin(t) * (Math.PI / 4); // ±45°

    const leftWingPivot  = b.userData.leftWingPivot;
    const rightWingPivot = b.userData.rightWingPivot;

    if (leftWingPivot)  leftWingPivot.rotation.z =  tiltAngle;
    if (rightWingPivot) rightWingPivot.rotation.z = -tiltAngle;    

    // keep birds slightly above ground (avoid penetrating grid)
    if (b.position.y < -0.8) b.position.y = -0.8;

    enforceBounds(b);
  }
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

  // boids update
  updateFlock(delta);

  updateCameraMovement(delta);
  updateCameraForMode();

  // only update orbit controls if enabled (you already had this)
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
