// Mutable per-frame player/camera/car state shared between systems without React re-renders.
import * as THREE from 'three';

export type AnimState = 'idle' | 'walk' | 'jog' | 'run' | 'sprint' | 'start' | 'stop' | 'turn' | 'jump' | 'fall' | 'land' | 'sit';

/** Real human gait speeds (m/s). The animation clips' strides are matched to the actual speed, so feet never slide. */
export const GAIT = { walk: 1.4, jog: 3.0, sprint: 5.2 };

export const HOME = {
  chair: new THREE.Vector3(30, 0, 89.9), // seated at the desk, facing the south wall (+Z)
  standUp: new THREE.Vector3(30, 1.3, 88.6),
  door: new THREE.Vector3(30.1, 0, 80),
  carSpot: new THREE.Vector3(22, 0, 63.4),
};

export const runtime = {
  position: HOME.chair.clone(), // feet position
  velocity: new THREE.Vector3(),
  facing: 0, // character yaw (0 = facing +Z)
  grounded: true,
  anim: 'sit' as AnimState,
  speed: 0, // horizontal ground speed, m/s
  accel: 0, // d(speed)/dt (start / stop lean)
  vy: 0, // vertical velocity (jump / fall blending)
  turnRate: 0, // facing angular velocity, rad/s (lean + turn-in-place clips)
  turningInPlace: 0, // -1 / +1 while pivoting on the spot, 0 otherwise
  walkMode: false, // CapsLock: relaxed walk instead of the default jog
  seated: true, // the day starts at the desk
  cameraYaw: Math.PI * 0.82, // behind-left of the chair, looking at the desk
  cameraPitch: 0.28,
  cameraDistance: 3.4,
  teleport: null as THREE.Vector3 | null, // set by fast travel; Player consumes it
  inputEnabled: true,
  // car
  driving: false,
  carNear: false,
  car: { position: HOME.carSpot.clone(), yaw: Math.PI / 2, speed: 0, steer: 0 },
};

export const SPAWN = HOME.standUp.clone();
