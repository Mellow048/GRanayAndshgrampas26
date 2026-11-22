# Test-run renders

## `cookie-heist-15s-gag-showcase.mp4`

Headless render of the `cookie_heist_15s` preset — the 15 s reference episode —
produced from this branch's own export pipeline.

- Source of truth: `node scripts/export-video.mjs --preset cookie_heist_15s --fps 30`
- 1280×720 · 30 fps · 15.0 s · H.264 + AAC (28 SFX events + 2 BGM segments with the cartoon pacer)
- Rendered in headless Chromium with SwiftShader WebGL2, encoded with ffmpeg — no GPU, no CDN
- Staging gate at render time: 0 errors left, 5 auto-fixes, 3 warnings

**Known defect visible in the render:** Granny's dress mesh collapses toward her hips.
That is a Bip01 skin-bind inconsistency in `GrannyTest6.fbx` and persists even when she
is driven by her own authored `Walk` / `idle` clips. Grandpa is unaffected.

This file is committed rather than published as a release asset because the cloud
render workflow (`export-video.yml`) owns the `latest-export` release, and release-asset
uploads are not reachable from every environment.
