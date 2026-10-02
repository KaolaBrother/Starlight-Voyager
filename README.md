# Starlight Voyager

A 3D space flight game that runs in the browser. The playable game is a single file: `index.html`.

## Play

Open `index.html` in a modern browser (WebGL 2 required). Works with mouse/keyboard on desktop and has on-screen touch controls on phones and tablets.

To host it, enable GitHub Pages (Settings → Pages → Deploy from branch → `main` / root).

Graphics settings are picked per device: iPhone and iPad use Medium; Android devices are matched by graphics chip (flagship Adreno 640+, Mali-G76–G79/G710+, Immortalis and Xclipse get Medium, others start on Low), and frame-rate monitoring lowers resolution or quality automatically if needed. If the game cannot start, the error screen names the graphics chip and browser and offers a safe mode with lighter graphics.

## Development

`index.html` is generated. Edit the source, then rebuild:

```
python3 tools/build.py
```

- `src/shell.html` – page markup, HUD, menus and styles
- `src/js/*.js` – game code, concatenated in filename order:
  `00_util` math · `01_gl` WebGL helpers · `02_shaders` GLSL · `03_geo` geometry · `04_render` renderer and bloom ·
  `05_models` ships and props · `06_world` galaxy, planets, stations · `07_fx` particles · `08_audio` synthesized sound and music ·
  `09_combat` weapons and projectiles · `10_player` input, ship and chase camera · `11_enemies` enemy AI and bosses ·
  `12_items` pickups and loot · `13_ui` HUD, radar, map, shop · `14_game` game flow, saving, main loop

The build also writes `dist/artifact.html` (page body only, for publishing as a Claude artifact) and `dist/test.html` (no web fonts, for headless testing). `dist/` is not committed.
