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
  lookHelper: null
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
      case 'ArrowLeft': eagleInput.left = true; break;
      case 'ArrowRight': eagleInput.right = true; break;
      case 'ArrowUp': eagleInput.up = true; break;
      case 'ArrowDown': eagleInput.down = true; break;
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

  const hasInput = eagleInput.left || eagleInput.right || eagleInput.up || eagleInput.down;

  const TURN_ACCEL = 3.5;
  const TURN_DAMP = 2.5;
  const MAX_TURN_SPEED = 2.6;
  const PITCH_ACCEL = 2.5;
  const PITCH_DAMP = 2.5;
  const MAX_PITCH = Math.PI / 2; // 90 degrees
  const BASE_FORWARD_SPEED = 4.5;
  const TARGET_FORWARD_SPEED = 9.0;
  const FORWARD_ACCEL = 6.5;
  const FORWARD_DAMP = 3.0;
  const MIN_HEIGHT = -2.5;

  // Longer press builds turn / climb velocity
  if (eagleInput.left) {
    state.angularVelocity = Math.min(state.angularVelocity + TURN_ACCEL * delta, MAX_TURN_SPEED);
  } else if (eagleInput.right) {
    state.angularVelocity = Math.max(state.angularVelocity - TURN_ACCEL * delta, -MAX_TURN_SPEED);
  } else {
    state.angularVelocity = THREE.MathUtils.damp(state.angularVelocity, 0, TURN_DAMP, delta);
  }

  if (eagleInput.up) {
    state.pitch = Math.min(state.pitch + PITCH_ACCEL * delta, MAX_PITCH);
  } else if (eagleInput.down) {
    state.pitch = Math.max(state.pitch - PITCH_ACCEL * delta, -MAX_PITCH);
  } else {
    state.pitch = THREE.MathUtils.damp(state.pitch, 0, PITCH_DAMP, delta);
  }

  // Forward speed ramps with input, rests to zero when AFK
  if (hasInput) {
    state.forwardSpeed = Math.min(state.forwardSpeed + FORWARD_ACCEL * delta, TARGET_FORWARD_SPEED);
  } else {
    state.forwardSpeed = THREE.MathUtils.damp(state.forwardSpeed, BASE_FORWARD_SPEED, FORWARD_DAMP, delta);
  }

  state.yaw += state.angularVelocity * delta;

  const cosPitch = Math.cos(state.pitch);
  const sinPitch = Math.sin(state.pitch);
  const forward = tmpVec1.set(
    Math.sin(state.yaw) * cosPitch,
    sinPitch,
    Math.cos(state.yaw) * cosPitch
  ).normalize();

  state.velocity.copy(forward).multiplyScalar(state.forwardSpeed);

  state.model.position.addScaledVector(state.velocity, delta);

  // Prevent tunneling into ground
  if (state.model.position.y < MIN_HEIGHT) {
    state.model.position.y = MIN_HEIGHT;
    state.pitch = Math.max(state.pitch, -0.2); // nudge nose up if we hit the floor
  }

  // Face where we are actually moving; compute orientation without gimbal flips
  const dir = tmpVec1.copy(state.velocity);
  const hasSpeed = dir.lengthSq() > 0.0001;
  if (hasSpeed) {
    dir.normalize();
    state.yaw = Math.atan2(dir.x, dir.z);
    state.pitch = Math.asin(dir.y); // keep pitch aligned to movement
  } else {
    dir.set(Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), Math.cos(state.yaw) * Math.cos(state.pitch));
  }

  const right = tmpVec2.crossVectors(WORLD_UP, dir).normalize();
  const up = tmpVec3.crossVectors(dir, right).normalize();

  tmpMat.lookAt(new THREE.Vector3(0, 0, 0), dir, up);
  tmpQuat.setFromRotationMatrix(tmpMat);

  // bank roll around the forward axis based on turn rate
  const roll = -state.angularVelocity * 0.12;
  if (hasSpeed && Math.abs(roll) > 1e-5) {
    tmpQuat.multiply(new THREE.Quaternion().setFromAxisAngle(dir, roll * 0.65));
  }

  state.model.quaternion.copy(tmpQuat).multiply(MODEL_ALIGN);

  // Update look helper arrow
  if (state.lookHelper) {
    const forwardDir = state.model.getWorldDirection(tmpVec3).normalize();
    forwardDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); // rotate 90deg CCW around Y

    const noseOffset = -2;
    const sideOffset = -2; // world Z shift
    const xOffset = 3.64;  // world X shift

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
