// ======================= EAGLE FLIGHT CONTROLS ===========================
import * as THREE from 'three';
import { BOID } from './boids.js';

const eagleInput = { left: false, right: false, up: false, down: false };
let inputSetup = false;

const state = {
  model: null,
  yaw: Math.PI,
  pitch: 0,
  velocity: new THREE.Vector3(),
  angularVelocity: 0,
  pitchVelocity: 0,
  pitchVelocity: 0,
  forwardSpeed: 4.5,
  lookHelper: null,
  visualYaw: Math.PI
  visualYaw: Math.PI
};

const tmpVec1 = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();
const tmpVec3 = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpMat = new THREE.Matrix4();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const MODEL_ALIGN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
const MODEL_ALIGN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

function setupInput() {
  if (inputSetup) return;
  inputSetup = true;

  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft': eagleInput.left = true; break;
      case 'ArrowRight': eagleInput.right = true; break;
      case 'ArrowUp': eagleInput.up = true; break;
      case 'ArrowDown': eagleInput.down = true; break;
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

  // Physics constants - all directions use same acceleration pattern
  const TURN_ACCEL = 2.0;           // How fast turning speed builds up
  const TURN_DAMP = 3.0;            // How fast turning slows down when released
  const MAX_TURN_SPEED = 1.4;       // Maximum turning speed
  
  const PITCH_ACCEL = 2.0;          // How fast pitch speed builds up
  const PITCH_DAMP = 3.0;           // How fast pitch levels out when released
  const MAX_PITCH = Math.PI / 2.2;  // Maximum pitch angle
  
  const BASE_FORWARD_SPEED = 4.5;   // Speed when no input
  const MAX_FORWARD_SPEED = 10.0;   // Maximum forward speed
  const SPEED_ACCEL = 8.0;          // Speed gain per second of input
  const SPEED_DAMP = 3.0;           // How fast speed returns to base
  
  const MIN_HEIGHT = -2.5;          // Ground level
  const BANK_ROLL_FACTOR = 0.35;    // Banking angle during turns

  // === HANDLE TURNING (LEFT/RIGHT) ===
  // Physics constants - all directions use same acceleration pattern
  const TURN_ACCEL = 2.0;           // How fast turning speed builds up
  const TURN_DAMP = 3.0;            // How fast turning slows down when released
  const MAX_TURN_SPEED = 1.4;       // Maximum turning speed
  
  const PITCH_ACCEL = 2.0;          // How fast pitch speed builds up
  const PITCH_DAMP = 3.0;           // How fast pitch levels out when released
  const MAX_PITCH = Math.PI / 2.2;  // Maximum pitch angle
  
  const BASE_FORWARD_SPEED = 4.5;   // Speed when no input
  const MAX_FORWARD_SPEED = 10.0;   // Maximum forward speed
  const SPEED_ACCEL = 8.0;          // Speed gain per second of input
  const SPEED_DAMP = 3.0;           // How fast speed returns to base
  
  const MIN_HEIGHT = -2.5;          // Ground level
  const BANK_ROLL_FACTOR = 0.35;    // Banking angle during turns

  // === HANDLE TURNING (LEFT/RIGHT) ===
  if (eagleInput.left) {
    state.angularVelocity += TURN_ACCEL * delta;
    state.angularVelocity = Math.min(state.angularVelocity, MAX_TURN_SPEED);
    state.angularVelocity += TURN_ACCEL * delta;
    state.angularVelocity = Math.min(state.angularVelocity, MAX_TURN_SPEED);
  } else if (eagleInput.right) {
    state.angularVelocity -= TURN_ACCEL * delta;
    state.angularVelocity = Math.max(state.angularVelocity, -MAX_TURN_SPEED);
    state.angularVelocity -= TURN_ACCEL * delta;
    state.angularVelocity = Math.max(state.angularVelocity, -MAX_TURN_SPEED);
  } else {
    // Smoothly return to zero when no turning input
    state.angularVelocity = THREE.MathUtils.damp(
      state.angularVelocity, 
      0, 
      TURN_DAMP, 
      delta
    );
    // Smoothly return to zero when no turning input
    state.angularVelocity = THREE.MathUtils.damp(
      state.angularVelocity, 
      0, 
      TURN_DAMP, 
      delta
    );
  }

  // === HANDLE PITCH (UP/DOWN) ===
  // === HANDLE PITCH (UP/DOWN) ===
  if (eagleInput.up) {
    state.pitch = Math.min(state.pitch + PITCH_ACCEL * delta, MAX_PITCH);
  } else if (eagleInput.down) {
    state.pitch = Math.max(state.pitch - PITCH_ACCEL * delta, -MAX_PITCH);
  } else {
    // Level out to horizontal when no pitch input
    // Level out to horizontal when no pitch input
    state.pitch = THREE.MathUtils.damp(state.pitch, 0, PITCH_DAMP, delta);
  }

  // === HANDLE FORWARD SPEED ===
  // Check for any input
  const hasAnyInput = eagleInput.left || eagleInput.right || 
                      eagleInput.up || eagleInput.down;
  
  if (hasAnyInput) {
    // Right turns get extra acceleration to match left turn loop size
    const accelRate = eagleInput.right ? 15.0 : SPEED_ACCEL;
    const maxSpeed = eagleInput.right ? 20.0 : MAX_FORWARD_SPEED;
    state.forwardSpeed = Math.min(
      state.forwardSpeed + accelRate * delta, 
      maxSpeed
    );
  } else {
    // Return to base speed when no input
    state.forwardSpeed = THREE.MathUtils.damp(
      state.forwardSpeed, 
      BASE_FORWARD_SPEED, 
      SPEED_DAMP, 
      delta
    );
  // === HANDLE FORWARD SPEED ===
  // Check for any input
  const hasAnyInput = eagleInput.left || eagleInput.right || 
                      eagleInput.up || eagleInput.down;
  
  if (hasAnyInput) {
    // Right turns get extra acceleration to match left turn loop size
    const accelRate = eagleInput.right ? 15.0 : SPEED_ACCEL;
    const maxSpeed = eagleInput.right ? 20.0 : MAX_FORWARD_SPEED;
    state.forwardSpeed = Math.min(
      state.forwardSpeed + accelRate * delta, 
      maxSpeed
    );
  } else {
    // Return to base speed when no input
    state.forwardSpeed = THREE.MathUtils.damp(
      state.forwardSpeed, 
      BASE_FORWARD_SPEED, 
      SPEED_DAMP, 
      delta
    );
  }

  // === UPDATE ORIENTATION ===
  // === UPDATE ORIENTATION ===
  state.yaw += state.angularVelocity * delta;
  state.visualYaw = state.yaw;

  // Calculate forward direction based on yaw
  // Standard unit circle: 0 radians = positive Z, rotates counterclockwise
  // Calculate forward direction based on yaw
  // Standard unit circle: 0 radians = positive Z, rotates counterclockwise
  const forward = tmpVec1.set(
    Math.sin(state.yaw),
    0,
    Math.cos(state.yaw)
    Math.sin(state.yaw),
    0,
    Math.cos(state.yaw)
  ).normalize();

  // Apply pitch to create vertical component only when pitching
  if (Math.abs(state.pitch) > 0.001) {
    const pitchAxis = tmpVec2.set(-Math.cos(state.yaw), 0, Math.sin(state.yaw)).normalize();
    tmpQuat.setFromAxisAngle(pitchAxis, state.pitch);
    forward.applyQuaternion(tmpQuat);
  }

  // === APPLY MOVEMENT ===
  // Apply pitch to create vertical component only when pitching
  if (Math.abs(state.pitch) > 0.001) {
    const pitchAxis = tmpVec2.set(-Math.cos(state.yaw), 0, Math.sin(state.yaw)).normalize();
    tmpQuat.setFromAxisAngle(pitchAxis, state.pitch);
    forward.applyQuaternion(tmpQuat);
  }

  // === APPLY MOVEMENT ===
  state.velocity.copy(forward).multiplyScalar(state.forwardSpeed);
  const oldPos = state.model.position.clone();
  const oldPos = state.model.position.clone();
  state.model.position.addScaledVector(state.velocity, delta);
  const distance = state.model.position.distanceTo(oldPos);
  const distance = state.model.position.distanceTo(oldPos);

  // Debug logging
  if (eagleInput.left) {
    console.log('LEFT - Speed:', state.forwardSpeed.toFixed(2), 'AngVel:', state.angularVelocity.toFixed(2), 'Distance:', distance.toFixed(3), 'Yaw:', state.yaw.toFixed(2), 'Forward:', forward.x.toFixed(2), forward.y.toFixed(2), forward.z.toFixed(2));
  }
  // Debug logging
  if (eagleInput.left) {
    console.log('LEFT - Speed:', state.forwardSpeed.toFixed(2), 'AngVel:', state.angularVelocity.toFixed(2), 'Distance:', distance.toFixed(3), 'Yaw:', state.yaw.toFixed(2), 'Forward:', forward.x.toFixed(2), forward.y.toFixed(2), forward.z.toFixed(2));
  }
  if (eagleInput.right) {
    console.log('RIGHT - Speed:', state.forwardSpeed.toFixed(2), 'AngVel:', state.angularVelocity.toFixed(2), 'Distance:', distance.toFixed(3), 'Yaw:', state.yaw.toFixed(2), 'Forward:', forward.x.toFixed(2), forward.y.toFixed(2), forward.z.toFixed(2));
    console.log('RIGHT - Speed:', state.forwardSpeed.toFixed(2), 'AngVel:', state.angularVelocity.toFixed(2), 'Distance:', distance.toFixed(3), 'Yaw:', state.yaw.toFixed(2), 'Forward:', forward.x.toFixed(2), forward.y.toFixed(2), forward.z.toFixed(2));
  }

  // === GROUND COLLISION ===
  // === GROUND COLLISION ===
  if (state.model.position.y < MIN_HEIGHT) {
    state.model.position.y = MIN_HEIGHT;
    // Force pitch up slightly to prevent diving into ground
    if (state.pitch < -0.1) {
      state.pitch = -0.1;
      state.pitchVelocity = Math.max(state.pitchVelocity, 0);
    }
    // Force pitch up slightly to prevent diving into ground
    if (state.pitch < -0.1) {
      state.pitch = -0.1;
      state.pitchVelocity = Math.max(state.pitchVelocity, 0);
    }
  }

  // === UPDATE MODEL ORIENTATION ===
  const dir = forward.clone();
  const right = tmpVec2.crossVectors(WORLD_UP, dir).normalize();
  const up = tmpVec3.crossVectors(dir, right).normalize();

  tmpMat.lookAt(new THREE.Vector3(0, 0, 0), dir, up);
  tmpQuat.setFromRotationMatrix(tmpMat);

  // Add banking roll during turns
  const roll = -state.angularVelocity * BANK_ROLL_FACTOR;
  if (Math.abs(roll) > 1e-5) {
    tmpQuat.multiply(new THREE.Quaternion().setFromAxisAngle(dir, roll));
  // Add banking roll during turns
  const roll = -state.angularVelocity * BANK_ROLL_FACTOR;
  if (Math.abs(roll) > 1e-5) {
    tmpQuat.multiply(new THREE.Quaternion().setFromAxisAngle(dir, roll));
  }

  state.model.quaternion.copy(tmpQuat).multiply(MODEL_ALIGN);

  // === UPDATE LOOK HELPER ARROW ===
  // === UPDATE LOOK HELPER ARROW ===
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