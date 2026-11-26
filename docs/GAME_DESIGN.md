# Game Design — Chirag's City

## Pillars
1. **The city is the portfolio.** Every district maps to a real part of Chirag's work (see PROJECT_RESEARCH.md). Nothing is invented.
2. **Real control.** Physics-driven third-person character with weight, acceleration, jumping, collisions — not a floating camera.
3. **Free access, rewarded curiosity.** All content is reachable at any time (and instantly in Recruiter Mode); exploration adds discovery progress and achievements, never gates information.
4. **Architectural daylight.** Warm late-afternoon sun, PBR concrete/stone/glass/wood, calm palette. No neon, no purple gradients, no dark-everything.

## Modes
| Mode | Who | What |
|---|---|---|
| Explorer | curious visitors, developers | full control, missions, map, discovery |
| Recruiter | hiring managers | guided panel tour (profile → best projects → skills → experience → contact) with the camera flying to each location; skippable at any time |

## Controls
| Input | Action |
|---|---|
| W A S D / arrows | move (camera-relative) |
| Mouse (click to lock) / drag | orbit camera |
| Wheel | zoom |
| Shift | sprint |
| Space | jump |
| E | interact |
| Tab | full map |
| M | minimap toggle |
| C | camera mode (third-person → first-person → cinematic) |
| Esc | pause |
| Touch | left joystick move, right-side drag camera, buttons for jump / interact |

## Player model
- Rapier kinematic capsule + `KinematicCharacterController` (slopes, steps, snap-to-ground).
- Horizontal velocity eases toward input × speed (accel 18 m/s², decel 22 m/s²); walk 4.2 m/s, sprint 7.5 m/s.
- Gravity −24 m/s², jump velocity 8 m/s, coyote time 0.12 s, jump buffer 0.12 s.
- Animation states: idle, walk, run, jump, fall, land — blended in the character component; the character is a swappable component (`CharacterModel`) driven only by `{ state, speed, grounded }`.

## Camera
- Orbit yaw/pitch with sensitivity + invert-Y settings, zoom 3–12 m, critically-damped follow.
- Obstruction: ray-cast from the head to the desired camera position against the physics world; camera is pulled in front of the hit.
- Modes: third-person, first-person (head height), cinematic (slow orbit, no input needed).

## Interaction
- Data-driven `interactables` (id, kind, position, radius, label, content ref).
- Nearest in-range interactable shows a prompt; `E` or click opens the matching panel; `Esc` closes and restores pointer lock.
- Opening an interactable counts as a discovery (persisted).

## Progression (all counts derived from real actions)
- Districts discovered (entering a district volume), landmarks visited (interactions), projects/skills/career milestones viewed, missions, achievements.
- Missions: Meet the Developer, Explore the Developer District, Discover the Project Museum, Visit the Career District, Explore the Product District, Visit the Innovation Lab, Reach the Skyline.
- Saved locally (versioned, validated, reset option).

## UI language
Light, minimal: warm off-white panels (#F7F5F0), ink text (#1C1B19), single accent (terracotta #C2410C) + olive (#6B7A2E, Chirag's hoodie). Lucide icons, no emoji, no neon, restrained motion.
