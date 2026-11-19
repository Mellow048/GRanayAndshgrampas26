# Granny POV 3D Cartoon Studio

A zero-build Three.js (`v0.170.0`) first-person **Granny POV Kids-Comedy 3D Cartoon Studio** set inside the Granny 1 House (`./Assets/granny-1-house/source/GrannyHouse.fbx`), featuring Mixamo-retargeted Granny & Grandpa rigs, procedural 3D comedy props & 2D thought bubbles, a Web Audio BGM/SFX mixer (`./SoundEffects`), and a deterministic GitHub Actions cloud MP4 exporter (`16:9` widescreen & `9:16` vertical Shorts).

## Built-In POV Episodes
- **Grandpa Loses His Key & Granny's Mystery Box (44s, `16:9` POV)** — 3-skit first-person adventure: meet Grandpa in the living room, sneak past Granny and crouch-hide beside the bed, grab the glowing Golden Key from the kitchen, unlock the Mystery Chest, and survive Granny's rage chase!
- **Granny & Grandpa: Jump, Run, Walk (6s, `9:16` Short)** — quick jump, sprint, and stroll showcase.

## Studio Features
- **First-Person POV Camera (`src/playerCamera.js`)**: Eye-level A* indoor walking with head-bob, whip-pan double-takes (`player_look`), camera-head gestures (`nod_yes`, `shake_no`, `shake_panic`, `peek_lean`), crouch-hiding (`0.42m`), bottom-right FPS held-item viewmodel, fade-to-black, and `16:9` / `9:16` toggle.
- **Comedy Props & Thought Bubbles (`src/comedyProps.js`)**: `golden_key`, `padlock`, opening `treasure_chest`, `emoji_ball`, `toy_blaster`, `cookie_jar`, plus 8 comic thought bubbles (`key`, `question`, `exclamation`, `zzz`, `angry`, `laugh`, `food`, `heart`).
- **Web Audio BGM + 25-SFX Mixer (`src/sfxEngine.js`)**: Looping BGM, `cutBgm` comedy silence cuts, movement-synced footsteps, whip-pan whooshes, bubble pops, and a toggleable 1–2s kids-comedy pacer.
- **Waypoints & Live Skit Editor (`src/studioUI.js`)**: Click any indoor `SET_MAP` waypoint to teleport, scout new coordinates with `WASD + Q/E`, test animations/bubbles/SFX, or edit & play multi-skit JSON scripts live.

## Cloud Video Rendering (No Local Encoding Required)
Trigger **Actions → Export POV Episode (Cloud Render)** (`.github/workflows/export-video.yml`) or run:
```bash
gh workflow run export-video.yml --ref main -f preset=grandpa_key_pov_44s -f fps=30 -f sfx_pacer=true -f format=mp4
```
The rendered `.mp4` is automatically published to the `latest-export` GitHub Release.

## Run Locally
Start a static server from the repository root and open `http://localhost:8000`:
```bash
python3 -m http.server 8000
```
