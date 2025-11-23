// ======================= IMPORTS ===========================
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { makeBird } from './bird.js';
import { BOID, updateFlock } from './boids.js';
import { setupCameraInput, updateCameraMovement, updateCameraForMode, isSceneFrozen } from './camera.js';
import { setEagleModel, updateEagleFlight } from './eagleControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import eagleUrl from './white_eagle_animation_fast_fly.glb?url';
const skyboxUrl = new URL('./free_-_skybox_basic_sky.glb', import.meta.url).href;
const loader = new GLTFLoader();
const mixers = [];

// ======================= RENDERER ===========================
const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

// Setup camera input handling
setupCameraInput(controls, camera);

// ======================= LIGHTS ===========================
// Realistic sunlight
const sunLight = new THREE.DirectionalLight(0xfffbf0, 1.2);
sunLight.position.set(90, 45, -110);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.camera.far = 200;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
sunLight.shadow.bias = -0.0005;
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

// ======================= ENVIRONMENT ===========================
loader.load(
  skyboxUrl,
  (gltf) => {
    const sky = gltf.scene;
    sky.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.side = THREE.BackSide; // render from inside
        child.frustumCulled = false; // keep sky always drawn
      }
    });
    // Scale the sky shell so the camera stays inside it
    const box = new THREE.Box3().setFromObject(sky);
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    const scale = 500 / size;
    sky.scale.setScalar(scale);
    sky.position.set(0, 0, 0);
    scene.add(sky);
  },
  undefined,
  (error) => console.error('Failed to load skybox', error)
);

// ======================= GRID ===============================
// Invisible receiving plane plus a visible grid overlay for shadows
const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.25 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), groundMaterial);
ground.rotation.x = -Math.PI / 2; // make it a horizontal floor
ground.position.y = -3;
ground.receiveShadow = true;
scene.add(ground);

// ======================= EAGLE ===============================
const GLTF_ANIM_SPEED = 0.6;

loader.load(eagleUrl, (gltf) => {
    const model = gltf.scene;
  model.scale.set(0.1, 0.1, 0.1);       // adjust size
  model.position.set(0, 0, 0); // place at desired coordinates
  model.rotation.y = Math.PI;     // face direction you want
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  scene.add(model);
  setEagleModel(model);

  // if glTF contains animations, create mixer and play first clip
  if (gltf.animations && gltf.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(model);
    mixer.timeScale = GLTF_ANIM_SPEED; 
    mixers.push(mixer);
    mixer.clipAction(gltf.animations[0]).play();
  }
}, undefined, (error) => {
    console.error(error);
});


// ======================= FLOCK SETUP ===========================
const NUM_BIRDS = 20;
const flock = new THREE.Group();
scene.add(flock);
const birds = [];

// Create and initialize birds
for (let i = 0; i < NUM_BIRDS; i++) {
  const b = makeBird();
  b.castShadow = true;
  b.receiveShadow = false;
  b.position.set(
    (Math.random() - 0.5) * 10,
    Math.random() * 3 + 0.2,
    (Math.random() - 0.5) * 10
  );

  const v = new THREE.Vector3(
    (Math.random() - 0.5) * 0.6,
    (Math.random() - 0.2) * 0.4,
    (Math.random() - 0.5) * 0.6
  );

  b.userData.velocity = v;
  b.userData.acceleration = new THREE.Vector3();
  b.userData.maxSpeed = BOID.maxSpeed;
  b.userData.maxForce = BOID.maxForce;

  flock.add(b);
  birds.push(b);
}


// ======================= LOOP ===========================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const frozen = isSceneFrozen();

  // Update systems
  if (!frozen) {
    updateEagleFlight(delta);
    updateFlock(birds, delta);
  }
  updateCameraMovement(camera, controls, delta);
  updateCameraForMode(camera, birds, flock);

  // advance any glTF animation mixers
  if (!frozen && mixers.length > 0) mixers.forEach((m) => m.update(delta));

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
