// World layout, missions and quality presets — all data, no rendering.

export type DistrictId = 'home' | 'plaza' | 'developer' | 'museum' | 'product' | 'career' | 'innovation' | 'skyline';

export type District = {
  id: DistrictId;
  name: string;
  short: string;
  center: [number, number]; // x, z (metres)
  radius: number; // discovery radius
  color: string; // map colour (muted, architectural)
  blurb: string;
  built: boolean; // false = district volume exists but hero landmark arrives in a later milestone
};

export const districts: District[] = [
  { id: 'home', name: "Chirag's Home", short: 'Home', center: [30, 90], radius: 22, color: '#C2A878', blurb: 'Where every day starts: a desk, a laptop and a wall of posters.', built: true },
  { id: 'plaza', name: 'Central Plaza', short: 'Plaza', center: [0, 0], radius: 46, color: '#C9B79C', blurb: 'Where the city begins. Meet the developer, read the map, pick a mission.', built: true },
  { id: 'developer', name: 'Developer District', short: 'Developer', center: [-120, 0], radius: 40, color: '#7A8C99', blurb: 'The technical stack, built as architecture.', built: false },
  { id: 'museum', name: 'Project Museum', short: 'Museum', center: [120, 0], radius: 40, color: '#B08968', blurb: 'One exhibit per real project.', built: false },
  { id: 'product', name: 'Product District', short: 'Product', center: [-120, 120], radius: 38, color: '#8A9A5B', blurb: 'How problems become products.', built: false },
  { id: 'career', name: 'Career District', short: 'Career', center: [120, -120], radius: 38, color: '#A47551', blurb: 'B.Tech to Product Associate, as a walk.', built: false },
  { id: 'innovation', name: 'Innovation Lab', short: 'Lab', center: [-120, -120], radius: 38, color: '#6F8F8B', blurb: 'AI, automation and 3D experiments.', built: false },
  { id: 'skyline', name: 'The Skyline', short: 'Skyline', center: [0, -150], radius: 36, color: '#9C8F80', blurb: 'The view ahead: ambitions, résumé, contact.', built: false },
];

export const districtById = Object.fromEntries(districts.map(d => [d.id, d])) as Record<DistrictId, District>;

export type Mission = { id: string; title: string; hint: string; target: { type: 'interact' | 'district'; id: string } };

export const missions: Mission[] = [
  { id: 'wake', title: 'Get up from your desk', hint: 'Press E to stand up and stretch.', target: { type: 'interact', id: 'desk' } },
  { id: 'outside', title: 'Step outside', hint: 'Walk out of the front door into the yard.', target: { type: 'interact', id: 'yard' } },
  { id: 'drive', title: 'Take your car for a spin', hint: 'The yellow supercar is parked by the gate. Press F to get in.', target: { type: 'interact', id: 'car' } },
  { id: 'meet', title: 'Meet the Developer', hint: 'Walk to the name monument in the Central Plaza and press E.', target: { type: 'interact', id: 'monument' } },
  { id: 'map', title: 'Read the City Map', hint: 'Find the map table on the plaza.', target: { type: 'interact', id: 'map-table' } },
  { id: 'developer', title: 'Explore the Developer District', hint: 'Head west along the boulevard.', target: { type: 'district', id: 'developer' } },
  { id: 'museum', title: 'Discover the Project Museum', hint: 'Head east along the boulevard.', target: { type: 'district', id: 'museum' } },
  { id: 'career', title: 'Visit the Career District', hint: 'North-east of the plaza.', target: { type: 'district', id: 'career' } },
  { id: 'product', title: 'Explore the Product District', hint: 'South-west of the plaza.', target: { type: 'district', id: 'product' } },
  { id: 'innovation', title: 'Visit the Innovation Lab', hint: 'North-west of the plaza.', target: { type: 'district', id: 'innovation' } },
  { id: 'skyline', title: 'Reach the Skyline', hint: 'Follow the north boulevard to the tower.', target: { type: 'district', id: 'skyline' } },
];

export type QualityId = 'low' | 'medium' | 'high' | 'ultra';
export type Quality = {
  id: QualityId;
  label: string;
  dpr: number;
  shadows: 0 | 1024 | 2048 | 4096;
  ao: 'off' | 'half' | 'full' | 'ultra';
  bloom: boolean;
  smaa: boolean;
  drawDistance: number;
  vegetation: number; // 0..1
};

export const qualities: Record<QualityId, Quality> = {
  low: { id: 'low', label: 'Low', dpr: 0.75, shadows: 0, ao: 'off', bloom: false, smaa: false, drawDistance: 220, vegetation: 0.35 },
  medium: { id: 'medium', label: 'Medium', dpr: 1, shadows: 1024, ao: 'half', bloom: false, smaa: true, drawDistance: 320, vegetation: 0.6 },
  high: { id: 'high', label: 'High', dpr: 1.5, shadows: 2048, ao: 'full', bloom: true, smaa: true, drawDistance: 450, vegetation: 1 },
  ultra: { id: 'ultra', label: 'Ultra', dpr: 2, shadows: 4096, ao: 'ultra', bloom: true, smaa: true, drawDistance: 600, vegetation: 1 },
};

/** Pick a sensible default from device signals; the player can override in Settings. */
export function detectQuality(): QualityId {
  if (typeof navigator === 'undefined') return 'high';
  const touch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (touch || mem <= 2 || cores <= 2) return 'low';
  if (mem <= 4 || cores <= 4) return 'medium';
  return 'high';
}
