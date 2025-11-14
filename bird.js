// ======================= BIRD MODEL ===========================
import * as THREE from 'three';

export function makeBird() {
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

  leftWing.position.x = -1.0;
  leftWing.rotation.x = Math.PI / 2;

  leftWingPivot.add(leftWing);
  leftWingPivot.position.set(-0.1, 0.07, -0.5);
  bird.add(leftWingPivot);

  // --- RIGHT WING ---
  const rightWingPivot = new THREE.Object3D();
  const rightWing = new THREE.Mesh(wingGeom, wingMat);

  rightWing.scale.x = -1;
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
