# Performance

Target: 60 fps on a mid-range desktop GPU at HIGH, 30+ fps on integrated GPUs at LOW.

## Quality presets (`src/game/data/quality.ts`) — each changes real renderer parameters
| Setting | LOW | MEDIUM | HIGH | ULTRA |
|---|---|---|---|---|
| Device pixel ratio cap | 0.75 | 1 | 1.5 | 2 |
| Shadows | off | 1024 | 2048 | 4096 |
| Ambient occlusion (N8AO) | off | half-res | full | full + high quality |
| Bloom | off | off | subtle | subtle |
| Draw distance (fog far / camera far) | 220 m | 320 m | 450 m | 600 m |
| Vegetation density | 35 % | 60 % | 100 % | 100 % |
| Antialiasing | none | SMAA | SMAA | SMAA + MSAA |

Default preset is picked from device signals (touch, `deviceMemory`, `hardwareConcurrency`) and can be changed in Settings.

## Techniques in use
- Instancing for trees, lamps, benches, bollards, windows-as-shader (no per-window geometry).
- Shared material instances (`src/game/world/materials.ts`); procedural textures generated once.
- Buildings: simple box colliders; render meshes are merged per building.
- Shadow camera tightly fitted around the player and moved with them.
- Fog + camera far plane tied to the draw-distance preset; districts outside it are not mounted (Milestone 4).
- Post-processing only what earns its cost: AO for form, SMAA for edges, very light bloom only for lamps.

## Measurements
Recorded in PROGRESS.md per milestone.
