// ======================= CAMERA SYSTEM ===========================
import * as THREE from 'three';
import { BOID } from './boids.js';
import { getEagleState } from './eagleControls.js';
import { playAmbientAudio, pauseAmbientAudio } from './audio.js';

let cameraMode = 'free';

// WASD free camera keys
const keys = {
  forward: false,
  back: false,
  left: false,
  right: false,
  up: false,
  down: false,
  boost: false
};

// Start FROZEN so we show menu first
let sceneFrozen = true;

const tmpForward = new THREE.Vector3();
const tmpRight   = new THREE.Vector3();
const tmpMove    = new THREE.Vector3();
const tmpUp      = new THREE.Vector3();
const tmpLook    = new THREE.Vector3();
const tmpQuat    = new THREE.Quaternion();
const tmpClamp   = new THREE.Vector3();

const moveSpeed = 6;
const boostMultiplier = 3;
const FPV_OFFSETS = { up: 0.75, forward: 0.35 };
const FPV_LOOK_AHEAD = 50;
const FPV_LERP = 0.35;

function clampToBounds(vec) {
  const size = BOID.bounds?.size ?? 80;
  const limit = size - 1;
  tmpClamp.copy(vec);
  tmpClamp.x = THREE.MathUtils.clamp(tmpClamp.x, -limit, limit);
  tmpClamp.y = THREE.MathUtils.clamp(tmpClamp.y, -1, limit);
  tmpClamp.z = THREE.MathUtils.clamp(tmpClamp.z, -limit, limit);
  vec.copy(tmpClamp);
}


// --------- helpers / accessors ----------
export function getCameraMode() {
  return cameraMode;
}

export function setCameraMode(mode) {
  cameraMode = mode;
}

export function isSceneFrozen() {
  return sceneFrozen;
}


// ======================= INPUT SETUP ===========================
export function setupCameraInput(controls, camera) {
  // Make sure overlay matches initial frozen state
  const overlay  = document.getElementById('ui-overlay');
  const mainText = document.getElementById('ui-main-text');
  if (overlay) overlay.style.display = 'flex';
  if (mainText) mainText.textContent = 'Press SPACE to start';

  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      // Free camera WASD
      case 'w': case 'W': keys.forward = true; break;
      case 's': case 'S': keys.back    = true; break;
      case 'a': case 'A': keys.left    = true; break;
      case 'd': case 'D': keys.right   = true; break;
      case 'q': case 'Q': keys.up      = true; break;
      case 'e': case 'E': keys.down    = true; break;
      case 'Shift':       keys.boost   = true; break;

      // SPACE = toggle freeze + menu
      case ' ':
        sceneFrozen = !sceneFrozen;
        {
          const ov  = document.getElementById('ui-overlay');
          const txt = document.getElementById('ui-main-text');
          if (ov) ov.style.display = sceneFrozen ? 'flex' : 'none';
          if (txt) {
            txt.textContent = sceneFrozen
              ? 'Paused — press SPACE to resume'
              : 'Press SPACE to pause';
          }
        }
        if (sceneFrozen) {
          pauseAmbientAudio();
        } else {
          playAmbientAudio();
        }
        console.log(sceneFrozen ? 'Scene frozen (menu shown)' :
                                  'Scene running (menu hidden)');
        break;

      // ---------- CAMERA MODE 1: FREE ----------
      case '1':
        cameraMode = 'free';
        controls.enabled = true;
        camera.position.set(40, 40, 40);
        controls.target.set(0, 0, 0);
        controls.update();
        console.log('Mode: FREE CAMERA');
        break;

      // ---------- CAMERA MODE 2: FLOCK ----------
      case '2':
        cameraMode = 'flock';
        controls.enabled = false;
        console.log('Mode: FLOCK CAMERA');
        break;

      // ---------- CAMERA MODE 3: EAGLE TAIL CAM ----------
      case '3':
        cameraMode = 'tailCam';
        controls.enabled = false;
        console.log('Mode: EAGLE FIRST-PERSON');
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.key) {
      case 'w': case 'W': keys.forward = false; break;
      case 's': case 'S': keys.back    = false; break;
      case 'a': case 'A': keys.left    = false; break;
      case 'd': case 'D': keys.right   = false; break;
      case 'q': case 'Q': keys.up      = false; break;
      case 'e': case 'E': keys.down    = false; break;
      case 'Shift':       keys.boost   = false; break;
    }
  });
}


// ======================= FREE CAMERA (MODE 1) ===================
export function updateCameraMovement(camera, controls, delta) {
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
    const speed = moveSpeed * (keys.boost ? boostMultiplier : 1);
    tmpMove.normalize().multiplyScalar(speed * delta);
    camera.position.add(tmpMove);
    controls.target.add(tmpMove);
    clampToBounds(camera.position);
    clampToBounds(controls.target);
  }
}


// ======================= MODES 2 & 3 ============================
export function updateCameraForMode(camera, birds, flock) {
  // ---------- MODE 2: FLOCK OVERVIEW ----------
  if (cameraMode === 'flock') {
    if (!birds || birds.length === 0) return;

    const center = new THREE.Vector3();
    birds.forEach((b) => {
      const p = new THREE.Vector3();
      b.getWorldPosition(p);
      center.add(p);
    });
    center.multiplyScalar(1 / birds.length);

    const desiredPos = new THREE.Vector3(
      center.x,
      center.y + 100,
      center.z + 80
    );

    camera.position.lerp(desiredPos, 0.05);
    camera.lookAt(center);
  }

  // ---------- MODE 3: EAGLE FIRST-PERSON ----------
  else if (cameraMode === 'tailCam') {
    const eagle = getEagleState();
    if (!eagle || !eagle.model) return;

    const model = eagle.model;
    model.updateMatrixWorld(true);

    // World-space forward/up so FPV follows pitch/roll
    model.getWorldQuaternion(tmpQuat);
    model.getWorldPosition(tmpMove);

    // Model is yaw-offset by 90 degrees (see MODEL_ALIGN in eagleControls),
    // so use +X as the local "nose" direction instead of +Z.
    const forward = tmpForward.set(1, 0, 0).applyQuaternion(tmpQuat).normalize();
    const up = tmpUp.set(0, 1, 0).applyQuaternion(tmpQuat).normalize();

    // Ride near the eagle's head for a first-person view
    tmpMove
      .addScaledVector(up, FPV_OFFSETS.up)
      .addScaledVector(forward, FPV_OFFSETS.forward);

    camera.position.lerp(tmpMove, FPV_LERP);

    tmpLook.copy(tmpMove).addScaledVector(forward, FPV_LOOK_AHEAD);
    camera.up.copy(up);
    camera.lookAt(tmpLook);
  }
}
