# Progress

## Completed
- **M1 — Research & architecture**: `docs/PROJECT_RESEARCH.md` (verified vs. unverified facts), game design, world map, asset pipeline, performance plan. Next.js 16 + R3F 9 + Rapier 2 + postprocessing + Zustand scaffold with modular `src/game/*` structure.
- **M2 — Player**: Rapier kinematic character controller (acceleration/deceleration, sprint, gravity, coyote time + jump buffer, auto-step, slope limits, snap-to-ground), camera-relative movement, third-person / first-person / cinematic camera with obstruction ray-casts, pointer-lock + drag + touch look, zoom.
- **M3 — First city**: Central Plaza (fountain, bronze name monument, map table, mission board, kiosk, planters, benches, lamps), procedural city grid with merged-geometry facades (4 styles), instanced trees/lamps, district gateways, warm late-afternoon lighting with player-following shadows, N8AO/SMAA/bloom/ACES.
- **Home start**: the game begins at Chirag's desk in his home (south of the plaza); stand up (E), walk out, front yard.
- **Car**: original yellow supercar parked outside; F to enter/exit; throttle/brake/reverse, speed-scaled steering, handbrake drift, chase camera, collisions.
- **Guidance**: data-driven to-do list (11 tasks), compass arrow + distance to the next goal, in-world beacon, minimap and full map with fast travel to discovered districts.
- **Progression**: versioned, validated local save (districts, interactions, tasks derived from real actions), reset option.
- **Recruiter mode**: tabbed tour (profile, projects, skills, experience, contact) over a cinematic camera.
- **Verified in browser**: sit → stand (E) → walk out → yard task → car (F) → 56 km/h in 2.5 s.

## Currently working
- Dribbble-style cosy developer room (desk setup, foam panels, curtains, live clock).
- Blender-built rigged character (script in `assets/blender/scripts`), replacing the primitive avatar.

## Next steps
- District hero landmarks (Developer stack tower, Project Museum exhibits, Career timeline, Innovation Lab, Skyline tower).
- Opening city fly-through, audio (ambience/footsteps), quality auto-tuning.

## Known issues
- Character likeness: a photo-to-3D model (Meshy / Tripo / Avaturn) is needed for a true likeness; the character slot is swappable.
- Districts other than Plaza/Home are gateways only ("under construction").

## Decisions
- Original car design and original poster art (no licensed vehicles or copyrighted characters).
- Contact details beyond GitHub are withheld until the owner approves publishing them.
