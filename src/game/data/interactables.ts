// Data-driven interactables. The interaction system, prompts, panels and progress all read this table;
// no building has hand-written interaction logic.
import { districts, type DistrictId } from './world';

export type PanelKind = 'profile' | 'map' | 'missions' | 'about' | 'district' | 'action' | 'zone';

export type Interactable = {
  id: string;
  label: string; // prompt text: "Press E to <label>"
  title: string;
  kind: PanelKind;
  position: [number, number, number];
  radius: number;
  district: DistrictId;
  ref?: string; // content id for the panel (district id, project id, …)
};

export const interactables: Interactable[] = [
  // home: the desk is an action (stand up), the yard is a walk-in zone (no key press)
  { id: 'desk', label: 'get up from the desk', title: 'Desk', kind: 'action', position: [30, 0, 89.9], radius: 1.6, district: 'home' },
  { id: 'yard', label: '', title: 'Front yard', kind: 'zone', position: [30, 0, 74], radius: 4.5, district: 'home' },
  { id: 'monument', label: 'meet the developer', title: 'Chirag Gour', kind: 'profile', position: [0, 0, -21], radius: 6, district: 'plaza' },
  { id: 'map-table', label: 'read the city map', title: 'City Map', kind: 'map', position: [17, 0, 8], radius: 4, district: 'plaza' },
  { id: 'mission-board', label: 'view missions', title: 'Mission Board', kind: 'missions', position: [-17, 0, 8], radius: 4, district: 'plaza' },
  { id: 'kiosk', label: 'learn how this city works', title: 'Visitor Information', kind: 'about', position: [7, 0, 25], radius: 3.5, district: 'plaza' },
  // district gateways: a signed arch where each boulevard meets the district
  ...districts.filter(d => d.id !== 'plaza' && d.id !== 'home').map((d): Interactable => {
    const [cx, cz] = d.center;
    const len = Math.hypot(cx, cz);
    // inside the district's reserved land, on the side facing the plaza
    const k = (len - (d.radius - 14)) / len;
    return { id: `gate-${d.id}`, label: `read about the ${d.name}`, title: d.name, kind: 'district', position: [cx * k, 0, cz * k], radius: 5, district: d.id, ref: d.id };
  }),
];

export const interactableById = Object.fromEntries(interactables.map(i => [i.id, i])) as Record<string, Interactable>;
