// ======================= BOIDS SYSTEM ===========================
import * as THREE from 'three';
import { getEagleState } from './eagleControls.js';

// Boid parameters
export const BOID = {
  maxSpeed: 4.0,
  maxForce: 0.08,
  neighborRadius: 2.5,
  separationRadius: 1.4,
  alignmentWeight: 1.0,
  cohesionWeight: 0.9,
  separationWeight: 3.2,
  predatorRadius: 12.0,      // see the eagle from farther away
  predatorWeight: 3.2,
  predatorForceMultiplier: 2.0,
  predatorExp: 2.5,           // exponential sharpness as eagle gets close
  predatorMinSpeedLead: 1.35, // birds run at least this multiple of eagle speed
  predatorMaxSpeedBoost: 3.0, // max multiple of base speed when fleeing hard
  boundaryMargin: 6.0,
  boundaryWeight: 1.0,
  boundaryTangential: 0.6,
  boundarySlowdown: 0.4,
  boundarySoftness: 0.6,
  stallSpeed: 0.35,
  stallKick: 0.9,
  groundMin: -0.8,
  groundLiftHeight: 0.6,
  groundLiftBoost: 1.5,
  bounds: {
    mode: 'bounce', // 'wrap' or 'bounce' or 'none'
    size: 80
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
      // Stronger push when closer; smooth falloff to avoid jitter
      const dir = tempVec1.subVectors(pos, other.position).normalize();
      const falloff = 1 - THREE.MathUtils.smoothstep(d, 0, desiredSeparation);
      const strength = falloff * falloff; // ease-in for gentler onset, strong near
      steer.addScaledVector(dir, strength / Math.max(d, 0.0001));
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

// Boid rule: Predator avoidance (flee from eagle)
export function predatorAvoidance(index, birds, eagleState) {
  if (!eagleState?.model) return { force: new THREE.Vector3(), speedMult: 1 };

  const self = birds[index];
  const pos = self.position;
  const eaglePos = eagleState.model.position;
  const eagleVel = eagleState.velocity ?? tempVec3.set(0, 0, 0);
  const eagleSpeed = eagleVel.length();
  const avoidRadius = BOID.predatorRadius;

  const toBird = tempVec1.subVectors(pos, eaglePos);
  const d = toBird.length();
  if (d === 0 || d > avoidRadius) return { force: new THREE.Vector3(), speedMult: 1 };

  const toBirdNorm = toBird.normalize();
  const baseMax = self.userData.baseMaxSpeed ?? self.userData.maxSpeed;

  // Detect head-on closing: eagle moving toward bird AND/OR bird moving toward eagle
  const birdVel = self.userData.velocity ?? tempVec2.set(0, 0, 0);
  let closing = 0;
  if (eagleSpeed > 1e-5) {
    closing += Math.max(0, eagleVel.clone().normalize().dot(toBirdNorm));
  }
  const birdSpeed = birdVel.length();
  if (birdSpeed > 1e-5) {
    const birdDir = tempVec2.copy(birdVel).normalize();
    closing += Math.max(0, -birdDir.dot(toBirdNorm));
  }
  closing = THREE.MathUtils.clamp(closing, 0, 2); // 0 = diverging, 2 = both barreling head-on

  // Add a lateral dodge when closing head-on to avoid straight-line collisions
  const sideDir = tempVec3.crossVectors(toBirdNorm, new THREE.Vector3(0, 1, 0));
  if (sideDir.lengthSq() < 1e-6) sideDir.set(1, 0, 0).cross(toBirdNorm); // avoid degenerate up
  sideDir.normalize();

  const fleeDir = toBirdNorm.clone();
  if (closing > 0.2) fleeDir.addScaledVector(sideDir, closing * 0.6).normalize();

  // Urgency rises exponentially as the eagle gets closer
  const urgency = THREE.MathUtils.clamp((avoidRadius - d) / avoidRadius, 0, 1);
  const expBoost = Math.expm1(urgency * BOID.predatorExp) * (1 + 0.5 * closing); // boost more when head-on

  // Desired speed scales with urgency and guarantees an overtake margin vs eagle
  const desiredSpeed = Math.min(
    baseMax * (1 + expBoost),
    baseMax * BOID.predatorMaxSpeedBoost
  ) * (1 + 0.3 * closing);
  const minLeadSpeed = eagleSpeed * BOID.predatorMinSpeedLead;
  const targetSpeed = Math.max(desiredSpeed, minLeadSpeed);

  const desiredVel = fleeDir.multiplyScalar(targetSpeed);
  const steer = desiredVel.sub(self.userData.velocity);

  const forceLimit = self.userData.maxForce * (BOID.predatorForceMultiplier * (1 + expBoost) * (1 + 0.25 * closing));
  limitVector(steer, forceLimit);

  const speedMult = targetSpeed / baseMax;
  return { force: steer, speedMult };
}

// Boid rule: Boundary avoidance (steer away before hitting edges)
export function boundaryAvoidance(bird) {
  if (BOID.bounds.mode === 'none') return { force: new THREE.Vector3(), proximity: 0 };

  const margin = BOID.boundaryMargin;
  const size = BOID.bounds.size;
  const yMin = -1;
  const yMax = BOID.bounds.mode === 'wrap' ? 1 : size;
  const zMin = -size;
  const zMax = size;

  const steer = new THREE.Vector3();
  let proximity = 0;
  const ease = (v) => {
    const t = THREE.MathUtils.clamp(v / margin, 0, 1);
    // Smoothstep for softer onset
    return t * t * (3 - 2 * t);
  };

  function applyAxis(pos, min, max, axis) {
    const distMin = pos - min;
    if (distMin < margin) {
      const amt = ease(margin - distMin);
      steer[axis] += amt;
      proximity = Math.max(proximity, amt);
    }

    const distMax = max - pos;
    if (distMax < margin) {
      const amt = ease(margin - distMax);
      steer[axis] -= amt;
      proximity = Math.max(proximity, amt);
    }
  }

  applyAxis(bird.position.x, -size, size, 'x');
  applyAxis(bird.position.y, yMin, yMax, 'y');
  applyAxis(bird.position.z, zMin, zMax, 'z');

  if (steer.lengthSq() === 0) return { force: steer, proximity: 0 };

  const normal = steer.clone().normalize();

  // Add tangential deflection so birds arc along walls instead of aiming straight in
  if (bird.userData.velocity.lengthSq() > 1e-6) {
    tempVec1.copy(bird.userData.velocity).normalize();
    const tangent = tempVec2.copy(tempVec1).projectOnPlane(normal);
    if (tangent.lengthSq() > 1e-6) {
      tangent.normalize().multiplyScalar(BOID.boundaryTangential * proximity);
      steer.add(tangent);
    }
  }

  steer.normalize().multiplyScalar(bird.userData.maxSpeed);
  steer.sub(bird.userData.velocity);
  limitVector(steer, bird.userData.maxForce);

  return { force: steer, proximity };
}

// Boundary handling
export function enforceBounds(bird) {
  const bsize = BOID.bounds.size;
  const zMin = -bsize;
  if (BOID.bounds.mode === 'wrap') {
    if (bird.position.x > bsize) bird.position.x = -bsize;
    if (bird.position.x < -bsize) bird.position.x = bsize;
    if (bird.position.y > bsize) bird.position.y = 1;
    if (bird.position.y < -1) bird.position.y = -1;
    if (bird.position.z > bsize) bird.position.z = zMin;
    if (bird.position.z < zMin) bird.position.z = bsize;
  } else if (BOID.bounds.mode === 'bounce') {
    const softenBounceAxis = (axis, min, max) => {
      const pos = bird.position[axis];
      if (pos < min || pos > max) {
        const sign = pos < min ? -1 : 1;
        bird.position[axis] = sign === 1 ? max : min;
        const normal = new THREE.Vector3();
        normal[axis] = sign;
        const vDotN = bird.userData.velocity.dot(normal);
        if (vDotN > 0) {
          const outward = normal.clone().multiplyScalar(vDotN);
          const tangential = tempVec1.copy(bird.userData.velocity).sub(outward);
          // soften: slide along wall with mild inward component, damp overall speed
          bird.userData.velocity
            .copy(tangential)
            .addScaledVector(outward.negate(), BOID.boundarySoftness)
            .multiplyScalar(0.9);
        }
      }
    };

    softenBounceAxis('x', -bsize, bsize);
    softenBounceAxis('y', -1, bsize);
    softenBounceAxis('z', zMin, bsize);
  }
}

// Main flock update
export function updateFlock(birds, delta) {
  const eagleState = getEagleState();
  const eagleSpeed = eagleState?.velocity ? eagleState.velocity.length() : 0;
  const steeringForces = new Array(birds.length).fill(null).map(() => new THREE.Vector3());
  const fleeBoosts = new Array(birds.length).fill(1);
  const boundaryProximity = new Array(birds.length).fill(0);

  for (let i = 0; i < birds.length; i++) {
    const sep = separation(i, birds).multiplyScalar(BOID.separationWeight);
    const ali = alignment(i, birds).multiplyScalar(BOID.alignmentWeight);
    const coh = cohesion(i, birds).multiplyScalar(BOID.cohesionWeight);
    const { force: fleeForce, speedMult: fleeSpeedMult } = predatorAvoidance(i, birds, eagleState);
    fleeBoosts[i] = fleeSpeedMult;
    const flee = fleeForce.multiplyScalar(BOID.predatorWeight);
    const { force: boundForce, proximity } = boundaryAvoidance(birds[i]);
    boundaryProximity[i] = proximity;
    const bounds = boundForce.multiplyScalar(BOID.boundaryWeight);
    steeringForces[i].add(sep).add(ali).add(coh).add(flee).add(bounds);
  }

  for (let i = 0; i < birds.length; i++) {
    const b = birds[i];
    const acc = b.userData.acceleration;
    const prox = boundaryProximity[i];
    const baseMax = b.userData.baseMaxSpeed ?? b.userData.maxSpeed;
    const boundarySlow = THREE.MathUtils.clamp(1 - BOID.boundarySlowdown * prox, 0.4, 1);
    const fleeBoost = fleeBoosts[i];
    const minLead = eagleSpeed * BOID.predatorMinSpeedLead;
    const effectiveMaxSpeed = Math.max(
      baseMax * boundarySlow,
      baseMax * fleeBoost,
      minLead
    );

    acc.copy(steeringForces[i]);

    b.userData.velocity.addScaledVector(acc, delta);
    // Nudge stalled birds (nose-down/low speed) upward and forward-ish
    if (b.userData.velocity.length() < BOID.stallSpeed) {
      const kickDir = tempVec3.set(
        (Math.random() - 0.5) * 0.4,
        1,
        (Math.random() - 0.5) * 0.4
      ).normalize();
      b.userData.velocity.addScaledVector(kickDir, BOID.stallKick);
    }
    // If near ground and heading down, add lift and flatten out
    const groundMin = BOID.groundMin ?? -0.8;
    if (b.position.y <= groundMin + BOID.groundLiftHeight && b.userData.velocity.y < 0) {
      const forward = tempVec3.copy(b.userData.velocity).setY(0);
      if (forward.lengthSq() < 1e-6) forward.set(0, 0, 1);
      forward.normalize();
      forward.y = 0.3; // small upward component to influence orientation
      forward.normalize();
      b.userData.velocity.addScaledVector(forward, BOID.groundLiftBoost * delta);
      b.userData.velocity.y = Math.max(b.userData.velocity.y, BOID.groundLiftBoost * 0.5 * delta);
    }
    limitVector(b.userData.velocity, effectiveMaxSpeed);
    b.position.addScaledVector(b.userData.velocity, delta);

    // Orientation
    if (b.userData.velocity.lengthSq() > 1e-4) {
      const vel = b.userData.velocity.clone().normalize();
      tempVec2.copy(b.position).add(vel);
      b.lookAt(tempVec2);
    }

    // Wing flap animation (faster flaps at higher speed)
    const speed = b.userData.velocity.length();
    const speedNorm = THREE.MathUtils.clamp(speed / (baseMax * 1.2), 0, 2); // allow slight over-speed when fleeing
    const flapRate = 0.002 + 0.006 * speedNorm; // ms-based rate
    const t = performance.now() * flapRate;
    const tiltAngle = Math.sin(t) * (Math.PI / 4);

    const leftWingPivot = b.userData.leftWingPivot;
    const rightWingPivot = b.userData.rightWingPivot;

    if (leftWingPivot) leftWingPivot.rotation.z = tiltAngle;
    if (rightWingPivot) rightWingPivot.rotation.z = -tiltAngle;

    if (b.position.y < -0.8) b.position.y = -0.8;
    enforceBounds(b);
  }
}
