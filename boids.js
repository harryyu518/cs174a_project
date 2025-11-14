// ======================= BOIDS SYSTEM ===========================
import * as THREE from 'three';

// Boid parameters
export const BOID = {
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

// Helper vectors reused
const tempVec1 = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();
const tempVec3 = new THREE.Vector3();

// Limit vector to max length
function limitVector(v, max) {
  const l = v.length();
  if (l > max) v.multiplyScalar(max / l);
}

// Boid rule: Separation
export function separation(index, birds) {
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
      tempVec1.subVectors(pos, other.position).normalize().divideScalar(d);
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

// Boid rule: Alignment
export function alignment(index, birds) {
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

// Boid rule: Cohesion
export function cohesion(index, birds) {
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
    tempVec1.subVectors(center, pos);
    tempVec1.setLength(self.userData.maxSpeed);
    tempVec1.sub(self.userData.velocity);
    limitVector(tempVec1, self.userData.maxForce);
    return tempVec1;
  }

  return new THREE.Vector3();
}

// Boundary handling
export function enforceBounds(bird) {
  const bsize = BOID.bounds.size;
  if (BOID.bounds.mode === 'wrap') {
    if (bird.position.x > bsize) bird.position.x = -bsize;
    if (bird.position.x < -bsize) bird.position.x = bsize;
    if (bird.position.y > bsize) bird.position.y = 1;
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

// Main flock update
export function updateFlock(birds, delta) {
  const steeringForces = new Array(birds.length).fill(null).map(() => new THREE.Vector3());

  for (let i = 0; i < birds.length; i++) {
    const sep = separation(i, birds).multiplyScalar(BOID.separationWeight);
    const ali = alignment(i, birds).multiplyScalar(BOID.alignmentWeight);
    const coh = cohesion(i, birds).multiplyScalar(BOID.cohesionWeight);
    steeringForces[i].add(sep).add(ali).add(coh);
  }

  for (let i = 0; i < birds.length; i++) {
    const b = birds[i];
    const acc = b.userData.acceleration;
    acc.copy(steeringForces[i]);

    b.userData.velocity.addScaledVector(acc, delta);
    limitVector(b.userData.velocity, b.userData.maxSpeed);
    b.position.addScaledVector(b.userData.velocity, delta);

    // Orientation
    if (b.userData.velocity.lengthSq() > 1e-4) {
      const vel = b.userData.velocity.clone().normalize();
      tempVec2.copy(b.position).add(vel);
      b.lookAt(tempVec2);
    }

    // Wing flap animation
    const t = performance.now() * 0.005;
    const tiltAngle = Math.sin(t) * (Math.PI / 4);

    const leftWingPivot = b.userData.leftWingPivot;
    const rightWingPivot = b.userData.rightWingPivot;

    if (leftWingPivot) leftWingPivot.rotation.z = tiltAngle;
    if (rightWingPivot) rightWingPivot.rotation.z = -tiltAngle;

    if (b.position.y < -0.8) b.position.y = -0.8;
    enforceBounds(b);
  }
}
