# Asset Pipeline

```
assets/blender/            ← source of truth (kept out of the web bundle)
  scripts/*.py             ← Blender Python that builds each asset procedurally (re-runnable)
  source/*.blend           ← saved Blender files written by the scripts
public/models/*.glb        ← optimised runtime exports (only these ship)
```

## Tooling
- Blender 5.3 at `G:\blender.exe` (CLI: `blender --background --python assets/blender/scripts/<asset>.py`).
- Each script: clears the scene, models with modifiers / Geometry Nodes, assigns PBR materials (Principled BSDF), applies transforms, saves `.blend`, exports GLB (`export_format='GLB'`, Draco compression, Y-up, apply modifiers).
- `npm run assets` runs every script in sequence (to be added in Milestone 5).

## Conventions
- 1 unit = 1 metre, origin at ground centre of the asset, +Y up after export.
- Materials named `M_<Surface>` (M_Concrete, M_Glass, M_Stone, M_Wood, M_Metal…) so the runtime can swap or reuse them.
- Collision is authored separately (simple boxes/hulls in code), never from render meshes.
- Hero landmarks: hand-built per asset. Generic buildings: modular kit (podium, floor module, setback, roof cap) instanced at runtime.
- LOD: hero assets export `LOD0` + simplified `LOD1` (Decimate) objects; runtime switches by distance.

## Until Blender assets land
The runtime builds the city procedurally from the same parameters (src/game/world/buildings), so every Blender export is a drop-in replacement, not a rewrite.
