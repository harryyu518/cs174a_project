// ======================= EAGLE FLIGHT CONTROLS ===========================
import * as THREE from 'three';

const eagleInput = { left: false, right: false, up: false, down: false };
let inputSetup = false;

const state = {
  model: null,
  yaw: Math.PI,
  pitch: 0,
  velocity: new THREE.Vector3(),
  angularVelocity: 0,
  forwardSpeed: 4.5,
  lookHelper: null,
  visualYaw: Math.PI  // separate yaw for visual rotation only
};

const tmpVec1 = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();
const tmpVec3 = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpMat = new THREE.Matrix4();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const MODEL_ALIGN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); // rotate model 90deg around Y to match forward/pitch axes

function setupInput() {
  if (inputSetup) return;
  inputSetup = true;

  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft': 
        eagleInput.left = true; 
        console.log('Left pressed - angularVelocity:', state.angularVelocity);
        break;
      case 'ArrowRight': 
        eagleInput.right = true; 
        console.log('Right pressed - angularVelocity:', state.angularVelocity);
        break;
      case 'ArrowUp': 
        eagleInput.up = true; 
        console.log('Up pressed - angularVelocity:', state.angularVelocity);
        break;
      case 'ArrowDown': 
        eagleInput.down = true; 
        console.log('Down pressed - angularVelocity:', state.angularVelocity);
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.key) {
      case 'ArrowLeft': eagleInput.left = false; break;
      case 'ArrowRight': eagleInput.right = false; break;
      case 'ArrowUp': eagleInput.up = false; break;
      case 'ArrowDown': eagleInput.down = false; break;
    }
  });
}

export function setEagleModel(model) {
  setupInput();
  state.model = model;
  state.yaw = model.rotation.y;

  // Visualize the look vector with an arrow helper in the scene
  if (!state.lookHelper) {
    state.lookHelper = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      model.position.clone(),
      2.5,
      0xff4444
    );
  }
  if (model.parent && !state.lookHelper.parent) {
    model.parent.add(state.lookHelper);
  }
}

export function updateEagleFlight(delta) {
  if (!state.model) return;

  const TURN_ACCEL = 1.5;
  const TURN_DAMP = 2.5;
  const MAX_TURN_SPEED = 1.2;
  const PITCH_ACCEL = 2.5;
  const PITCH_DAMP = 2.5;
  const MAX_PITCH = Math.PI / 2;
  const BASE_FORWARD_SPEED = 4.5;
  const TARGET_FORWARD_SPEED = 9.0;
  const FORWARD_ACCEL = 6.5; // Regular acceleration for other inputs
  const FORWARD_DAMP = 3.0;
  const MIN_HEIGHT = -2.5;

  // Handle turning
  if (eagleInput.left) {
    state.angularVelocity = Math.min(state.angularVelocity + TURN_ACCEL * delta, MAX_TURN_SPEED);
  } else if (eagleInput.right) {
    state.angularVelocity = Math.max(state.angularVelocity - TURN_ACCEL * delta, -MAX_TURN_SPEED);
    
    // INCREASED forward acceleration ONLY for right turns
    const RIGHT_TURN_FORWARD_ACCEL = 50.0; // ← Higher value for right turns only
    state.forwardSpeed = Math.min(state.forwardSpeed + RIGHT_TURN_FORWARD_ACCEL * delta, TARGET_FORWARD_SPEED);
  } else {
    state.angularVelocity = THREE.MathUtils.damp(state.angularVelocity, 0, TURN_DAMP, delta);
  }

  // Handle pitch
  if (eagleInput.up) {
    state.pitch = Math.min(state.pitch + PITCH_ACCEL * delta, MAX_PITCH);
  } else if (eagleInput.down) {
    state.pitch = Math.max(state.pitch - PITCH_ACCEL * delta, -MAX_PITCH);
  } else {
    state.pitch = THREE.MathUtils.damp(state.pitch, 0, PITCH_DAMP, delta);
  }

  // Forward speed for other inputs (left, up, down) - uses regular FORWARD_ACCEL
  const hasOtherInput = eagleInput.left || eagleInput.up || eagleInput.down;
  if (hasOtherInput && !eagleInput.right) { // Don't double-accelerate if right is also pressed
    state.forwardSpeed = Math.min(state.forwardSpeed + FORWARD_ACCEL * delta, TARGET_FORWARD_SPEED);
  }

  // Slow down when no keys are pressed
  if (!eagleInput.left && !eagleInput.right && !eagleInput.up && !eagleInput.down) {
    state.forwardSpeed = THREE.MathUtils.damp(state.forwardSpeed, BASE_FORWARD_SPEED, FORWARD_DAMP, delta);
  }


  // Update orientation
  state.yaw += state.angularVelocity * delta;
  state.visualYaw = state.yaw;

  // Calculate forward direction
  const cosPitch = Math.cos(state.pitch);
  const sinPitch = Math.sin(state.pitch);
  const forward = tmpVec1.set(
    Math.sin(state.yaw) * cosPitch,
    sinPitch,
    Math.cos(state.yaw) * cosPitch
  ).normalize();

  // Apply movement
  state.velocity.copy(forward).multiplyScalar(state.forwardSpeed);
  state.model.position.addScaledVector(state.velocity, delta);

  // Debug to verify right turn gets forward acceleration
  if (eagleInput.right) {
    console.log('RIGHT TURN - Speed:', state.forwardSpeed, 'Angular:', state.angularVelocity);
  }

  // Prevent tunneling into ground
  if (state.model.position.y < MIN_HEIGHT) {
    state.model.position.y = MIN_HEIGHT;
    state.pitch = Math.max(state.pitch, -0.2);
  }

  // Use the ACTUAL flight direction for the model's orientation
  const dir = forward.clone();

  const right = tmpVec2.crossVectors(WORLD_UP, dir).normalize();
  const up = tmpVec3.crossVectors(dir, right).normalize();

  tmpMat.lookAt(new THREE.Vector3(0, 0, 0), dir, up);
  tmpQuat.setFromRotationMatrix(tmpMat);

  // Check if we have speed for the roll effect
  const hasSpeed = state.velocity.lengthSq() > 0.0001;
  
  // Bank roll effect
  const roll = -state.angularVelocity * 0.08;
  if (hasSpeed && Math.abs(roll) > 1e-5) {
    tmpQuat.multiply(new THREE.Quaternion().setFromAxisAngle(dir, roll * 0.4));
  }

  state.model.quaternion.copy(tmpQuat).multiply(MODEL_ALIGN);

  // Update look helper arrow
  if (state.lookHelper) {
    const forwardDir = state.model.getWorldDirection(tmpVec3).normalize();
    forwardDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

    const noseOffset = -2;
    const sideOffset = -2;
    const xOffset = 3.64;

    state.model.getWorldPosition(tmpVec2);
    tmpVec2.addScaledVector(forwardDir, noseOffset);
    tmpVec2.x += xOffset;
    tmpVec2.z += sideOffset;

    state.lookHelper.position.copy(tmpVec2);
    state.lookHelper.setDirection(forwardDir);
    state.lookHelper.setLength(2.5);
  }
}

export function getEagleState() {
  return state;
}
