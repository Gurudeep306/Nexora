# Teacher Maker player (lab)

Browser pages that show and film a Teacher Maker model. Serve this folder on port 8765 with:

- `three/` → `client/node_modules/three`, `vrmlib/` → `client/node_modules/@pixiv/three-vrm`
- `anim/UAL1_Standard.glb` → Quaternius Universal Animation Library (CC0, from quaternius.itch.io)
- `out/` → built `.vrm` files, `demo/` → voice lines (`l1.wav` + `l1.json` from HeadTTS) and photo thumbnails

Pages: `look.html` (plain render), `anime.html` (styled render: `?style=paint` for the painted look),
`demo.html` (the scripted demo: `window.renderAt(t)` draws any moment exactly).
`render.cjs <out dir> <fps> <from> <to>` films `demo.html` frame by frame; `shot.cjs` takes stills.
`retarget.js` moves Quaternius clips onto any VRM's humanoid bones.
