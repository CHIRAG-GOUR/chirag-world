// Resolves the current objective (first unfinished task) to a label + live world position.
import * as THREE from 'three';
import { missions, type Mission } from '../data/world';
import { interactableById } from '../data/interactables';
import { runtime } from '../player/runtime';

export type Objective = { mission: Mission; label: string; position: THREE.Vector3 };

const tmp = new THREE.Vector3();

export function currentObjective(done: string[]): Objective | null {
  const mission = missions.find(m => !done.includes(m.id));
  if (!mission) return null;
  const { type, id } = mission.target;
  if (type === 'interact' && id === 'car') return { mission, label: 'Your car', position: tmp.copy(runtime.car.position) };
  if (type === 'interact') {
    const it = interactableById[id];
    if (!it) return null;
    return { mission, label: it.title, position: tmp.set(it.position[0], 0, it.position[2]) };
  }
  // district: aim for its gateway (nearest edge) rather than the empty centre
  const gate = interactableById[`gate-${id}`];
  if (gate) return { mission, label: gate.title, position: tmp.set(gate.position[0], 0, gate.position[2]) };
  return null;
}
