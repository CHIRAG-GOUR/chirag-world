# World Map

Units: metres. Origin = centre of Central Plaza. −Z is north (top of the map).

```
                         N
                 [7 SKYLINE TOWER]
                     (0, -210)
   [6 INNOVATION LAB]   |   [5 CAREER DISTRICT]
      (-150, -130)      |      (150, -130)
                        |
 [2 DEVELOPER] ---- [1 CENTRAL PLAZA] ---- [3 PROJECT MUSEUM]
   (-170, 0)            (0, 0)              (170, 0)
                        |
   [4 PRODUCT DISTRICT] |      Riverside park
      (-150, 140)       |       (150, 140)
                  South gate boulevard
```

## Road network
- **Plaza ring**: circular promenade, outer radius 46 m, pedestrian-only stone paving.
- **Boulevards** (14 m wide, 2 lanes + tree-lined sidewalks) run N/E/S/W from the ring to each district.
- **Grid streets** (10 m) form city blocks of ~60 m between boulevards; generic modular buildings fill these blocks.
- **Diagonal avenues** link the ring to the four corner districts.

## Districts
| # | District | Centre | Hero landmark | Content source |
|---|---|---|---|---|
| 1 | Central Plaza | (0, 0) | Name monument, city map table, mission board, info kiosk | profile, missions |
| 2 | Developer District | (−170, 0) | Stack Tower: frontend → API → backend → data floors, live request demo | verified technologies |
| 3 | Project Museum | (170, 0) | Museum hall with exhibit rooms per project | verified projects |
| 4 | Product District | (−150, 140) | Product studio: problem → flow → prototype walkthrough | product work (POA activities, SkilliZee) |
| 5 | Career District | (150, −130) | Timeline promenade: B.Tech → BSNL → Birla White → SkilliZee | career table |
| 6 | Innovation Lab | (−150, −130) | Lab pavilion: AI pipeline, procedural generation, physics sandbox | AI/3D projects |
| 7 | Skyline | (0, −210) | Observation tower with lift and viewing deck; résumé and contact | profile/contact |

## Build order
Milestone 2–3: Central Plaza + ring + four boulevards + surrounding generic blocks (playable, lit, landscaped).
Milestone 4+: district volumes, hero landmarks, map/minimap fed from this table (`src/game/data/districts.ts`).
