// ======================= CAMERA SYSTEM ===========================
import * as THREE from 'three';
import { getEagleState } from './eagleControls.js';

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

const moveSpeed = 6;
const boostMultiplier = 3;


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
        console.log(sceneFrozen ? 'Scene frozen (menu shown)' :
                                  'Scene running (menu hidden)');
        break;

      // ---------- CAMERA MODE 1: FREE ----------
      case '1':
        cameraMode = 'free';
        controls.enabled = true;
        camera.position.set(0, 2.5, 8);
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
        console.log('Mode: EAGLE TAIL CAM');
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
      center.y + 40,
      center.z + 65
    );

    camera.position.lerp(desiredPos, 0.05);
    camera.lookAt(center);
  }

  // ---------- MODE 3: EAGLE TAIL CAM (LOCKED) ----------
  else if (cameraMode === 'tailCam') {
    const eagle = getEagleState();
    if (!eagle || !eagle.model) return;

    const model    = eagle.model;
    const eaglePos = model.position.clone();

    // Eagle forward & up directions
    const forward = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(model.quaternion)
      .normalize();

    const up = new THREE.Vector3(0, 1, 0)
      .applyQuaternion(model.quaternion)
      .normalize();

    // Camera rigidly locked behind eagle
    const camPos = eaglePos.clone()
      .add(up.multiplyScalar(0.8))
      .add(forward.clone().multiplyScalar(-4.5));

    camera.position.copy(camPos);

    const lookAt = eaglePos.clone()
      .add(forward.clone().multiplyScalar(30));

    camera.lookAt(lookAt);
  }
}
