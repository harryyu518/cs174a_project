// ======================= CAMERA SYSTEM ===========================
import * as THREE from 'three';

let cameraMode = 'free';
const keys = {
  forward: false, back: false,
  left: false, right: false,
  up: false, down: false,
  boost: false
};
let sceneFrozen = false;

const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpMove = new THREE.Vector3();
const tmpUp = new THREE.Vector3(0, 1, 0);
const tmpCenter = new THREE.Vector3();
const moveSpeed = 6;
const boostMultiplier = 3; // Shift increases speed by 200% (3x total)

// Get current camera mode
export function getCameraMode() {
  return cameraMode;
}

// Set camera mode
export function setCameraMode(mode) {
  cameraMode = mode;
}

// Get keyboard state
export function getKeys() {
  return keys;
}

export function isSceneFrozen() {
  return sceneFrozen;
}

// Register keyboard listeners
export function setupCameraInput(controls, camera) {
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'w': case 'W': keys.forward = true; break;
      case 's': case 'S': keys.back = true; break;
      case 'a': case 'A': keys.left = true; break;
      case 'd': case 'D': keys.right = true; break;
      case 'q': case 'Q': keys.up = true; break;
      case 'e': case 'E': keys.down = true; break;
      case 'Shift': keys.boost = true; break;
      case ' ':
        sceneFrozen = !sceneFrozen;
        console.log(`Scene ${sceneFrozen ? 'frozen' : 'unfrozen'}`);
        break;

      case '1':
        cameraMode = 'free';
        controls.enabled = true;
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
      case 'w': case 'W': keys.forward = false; break;
      case 's': case 'S': keys.back = false; break;
      case 'a': case 'A': keys.left = false; break;
      case 'd': case 'D': keys.right = false; break;
      case 'q': case 'Q': keys.up = false; break;
      case 'e': case 'E': keys.down = false; break;
      case 'Shift': keys.boost = false; break;
    }
  });
}

// Update camera movement in free mode
export function updateCameraMovement(camera, controls, delta) {
  if (cameraMode !== 'free') return;

  camera.getWorldDirection(tmpForward);
  tmpForward.y = 0;
  tmpForward.normalize();

  tmpRight.crossVectors(tmpForward, camera.up).normalize();

  tmpMove.set(0, 0, 0);
  if (keys.forward) tmpMove.add(tmpForward);
  if (keys.back) tmpMove.sub(tmpForward);
  if (keys.left) tmpMove.sub(tmpRight);
  if (keys.right) tmpMove.add(tmpRight);
  if (keys.up) tmpMove.y += 1;
  if (keys.down) tmpMove.y -= 1;

  if (tmpMove.lengthSq() > 0) {
    const speed = moveSpeed * (keys.boost ? boostMultiplier : 1);
    tmpMove.normalize().multiplyScalar(speed * delta);
    camera.position.add(tmpMove);
    controls.target.add(tmpMove);
  }
}

// Update camera based on current mode
export function updateCameraForMode(camera, birds, flock) {
  if (cameraMode === 'free') return;

  const mainBird = birds[0];
  if (!mainBird) return;

  const birdPos = new THREE.Vector3();
  mainBird.getWorldPosition(birdPos);

  const forward = new THREE.Vector3(0, 0, 1);
  forward.applyQuaternion(mainBird.quaternion).normalize();

  if (cameraMode === 'birdPOV') {
    const eyeOffsetUp = 0.5;
    const eyeOffsetBack = 1.3;
    const lookAheadDist = 40;

    const camPos = birdPos.clone()
      .add(tmpUp.clone().multiplyScalar(eyeOffsetUp))
      .add(forward.clone().multiplyScalar(-eyeOffsetBack));

    camera.position.lerp(camPos, 0.2);

    const lookAt = birdPos.clone()
      .add(forward.clone().multiplyScalar(lookAheadDist))
      .add(tmpUp.clone().multiplyScalar(-0.1));

    camera.lookAt(lookAt);
  }

  else if (cameraMode === 'chase') {
    const desired = birdPos.clone()
      .add(tmpUp.clone().multiplyScalar(0.8))
      .add(forward.clone().multiplyScalar(-1.8));

    camera.position.lerp(desired, 0.12);
    camera.lookAt(birdPos);
  }

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
