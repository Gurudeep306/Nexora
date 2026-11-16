/*
  Theme quality gate.

  Every colour theme, in every mode it offers, and every accent override on
  every theme, must meet the WCAG contrast rules in client/src/theme/audit.ts
  (body and secondary text ≥ 4.5, muted text ≥ 3, accent text and button
  labels ≥ 4.5, status colours ≥ 4.5, syntax colours ≥ 4.5 / comments ≥ 3,
  borders ≥ 1.5 and strong borders ≥ 2.2).

  Also covers the look model: validation, v1 → v2 migration, and that the
  validator can be serialised into the first-paint script and still behave
  identically.

  The theme modules are TypeScript; Node ≥ 22.18 strips the types natively.
*/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const theme = (f) => import(pathToFileURL(path.join(__dirname, '..', 'client', 'src', 'theme', f)).href);

test('ten themes, each a whole design with its own palette in both modes', async () => {
  const { PALETTES, PALETTE_BY_ID } = await theme('palettes.ts');
  const { THEMES, STYLES, PATTERNS, DISPLAY_FACES } = await theme('styles.ts');
  const { UI_FONTS, CODE_FONTS } = await theme('fonts.ts');
  assert.equal(THEMES.length, 10, 'there are exactly ten themes');
  assert.equal(new Set(THEMES.map((t) => t.id)).size, 10, 'theme ids are unique');
  assert.equal(THEMES[0].id, 'journal', 'Field Journal comes first');
  assert.equal(new Set(PALETTES.map((p) => p.id)).size, PALETTES.length, 'palette ids are unique');
  const usedPalettes = new Set();
  for (const t of THEMES) {
    assert.match(t.id, /^[a-z0-9-]+$/, `${t.id} is not a safe attribute value`);
    assert.equal(t.kit, 'journal', `${t.id} dresses the page kit`);
    const p = PALETTE_BY_ID.get(t.bundle.theme);
    assert.ok(p, `${t.id}: palette ${t.bundle.theme} exists`);
    assert.ok(p.light && p.dark, `${t.id}: has a light and a dark mode`);
    assert.ok(!usedPalettes.has(p.id), `${t.id}: its palette is its own`);
    usedPalettes.add(p.id);
    assert.ok(PATTERNS.some((x) => x.id === t.bundle.pattern), `${t.id}: pattern ${t.bundle.pattern} exists`);
    assert.ok(UI_FONTS.some((f) => f.id === t.bundle.font), `${t.id}: font ${t.bundle.font} exists`);
    assert.ok(CODE_FONTS.some((f) => f.id === t.bundle.codeFont), `${t.id}: code font ${t.bundle.codeFont} exists`);
    for (const f of [t.displayFont, t.readFont].filter(Boolean)) {
      assert.ok(UI_FONTS.some((u) => u.id === f) || f in DISPLAY_FACES, `${t.id}: face ${f} exists`);
    }
    assert.ok(t.tagline && t.about && t.forWho, `${t.id}: has words for the theme card`);
  }
  // The ten look different: no two share a display face and a pattern and an icon set.
  const signature = THEMES.map((t) => `${t.displayFont}|${t.bundle.pattern}|${t.bundle.iconSet}/${t.bundle.iconStyle}`);
  assert.equal(new Set(signature).size, 10, 'every theme has its own type, drawing and icons');
  // Hive's own look stays available but is never offered.
  const studio = STYLES.find((s) => s.id === 'studio');
  assert.ok(studio && studio.hidden && !THEMES.includes(studio));
});

test('every theme meets the contrast rules in both of its modes', async () => {
  const { PALETTES } = await theme('palettes.ts');
  const { auditMode } = await theme('audit.ts');
  const failures = [];
  let checks = 0;
  for (const p of PALETTES) {
    for (const mode of ['dark', 'light']) {
      if (!p[mode]) continue;
      for (const r of auditMode(p[mode])) {
        checks++;
        if (!r.ok) failures.push(`${p.id}/${mode}: ${r.rule} = ${r.ratio} (needs ${r.min})`);
      }
    }
  }
  // About 33 rules per mode; every theme has two modes.
  assert.ok(checks >= PALETTES.length * 2 * 30, `suspiciously few checks (${checks})`);
  assert.deepEqual(failures, [], `\n${failures.join('\n')}`);
});

test('every accent colour passes the accent rules on all ten themes, light and dark', async () => {
  const { ACCENTS, PALETTE_BY_ID } = await theme('palettes.ts');
  const { THEMES } = await theme('styles.ts');
  const { auditMode } = await theme('audit.ts');
  assert.ok(ACCENTS.length >= 10, 'a real choice of accents');
  assert.equal(new Set(ACCENTS.map((a) => a.id)).size, ACCENTS.length, 'accent ids are unique');
  const failures = [];
  for (const a of ACCENTS) {
    assert.match(a.id, /^[a-z0-9-]+$/);
    for (const t of THEMES) {
      const p = PALETTE_BY_ID.get(t.bundle.theme);
      for (const mode of ['dark', 'light']) {
        for (const r of auditMode(p[mode], a[mode])) if (!r.ok) failures.push(`${a.id} on ${t.id}/${mode}: ${r.rule} = ${r.ratio}`);
      }
    }
  }
  assert.deepEqual(failures, [], `\n${failures.join('\n')}`);
});

test('every text ink keeps 4.5:1 (muted text too) on all ten themes, light and dark', async () => {
  const { INKS, PALETTE_BY_ID } = await theme('palettes.ts');
  const { THEMES } = await theme('styles.ts');
  const { contrast, mixOklab, formatOklch } = await theme('color.ts');
  assert.ok(INKS.length >= 4);
  const failures = [];
  for (const ink of INKS) {
    for (const t of THEMES) {
      const p = PALETTE_BY_ID.get(t.bundle.theme);
      for (const mode of ['dark', 'light']) {
        const m = p[mode];
        const [fg0, fg1, fg2] = ink[mode];
        // Text on every surface it sits on, including the hover surface.
        for (const bg of m.bg.slice(0, 4)) if (contrast(fg0, bg) < 4.5) failures.push(`${ink.id} on ${t.id}/${mode}: text ${contrast(fg0, bg).toFixed(2)}`);
        for (const bg of m.bg.slice(0, 3)) {
          if (contrast(fg1, bg) < 4.5) failures.push(`${ink.id} on ${t.id}/${mode}: secondary ${contrast(fg1, bg).toFixed(2)}`);
          if (contrast(fg2, bg) < 4.5) failures.push(`${ink.id} on ${t.id}/${mode}: muted ${contrast(fg2, bg).toFixed(2)}`);
        }
        const selection = formatOklch(mixOklab(m.accent, m.bg[1], 0.2));
        if (contrast(fg0, selection) < 4.5) failures.push(`${ink.id} on ${t.id}/${mode}: text on selection`);
      }
    }
  }
  assert.deepEqual(failures, [], `\n${failures.join('\n')}`);
});

test('sanitizeLook v6: personal choices on top of a theme', async () => {
  const { sanitizeLook, DEFAULT_LOOK, lookAttributes } = await theme('look.ts');
  const own = { accent: 'theme', ink: 'theme', uiFont: 'theme', headingFont: 'theme', readFont: 'theme', corners: 'theme', drawings: 'theme' };
  for (const [k, v] of Object.entries(own)) assert.equal(DEFAULT_LOOK[k], v, `${k} defaults to the theme's own`);
  const mine = sanitizeLook({ v: 6, style: 'sakura', accent: 'ocean', ink: 'warm', uiFont: 'lexend', headingFont: 'cormorant', readFont: 'literata', corners: 'sharp', drawings: 'off' });
  assert.equal(mine.accent, 'ocean');
  assert.equal(mine.ink, 'warm');
  assert.equal(mine.uiFont, 'lexend');
  assert.equal(mine.font, 'lexend', 'the interface font replaces the theme\'s');
  assert.equal(mine.headingFont, 'cormorant');
  assert.equal(mine.readFont, 'literata');
  assert.equal(mine.corners, 'sharp');
  assert.equal(mine.pattern, 'none', 'drawings off hides the theme\'s pattern');
  assert.deepEqual(sanitizeLook(mine), mine, 'idempotent');
  const attrs = lookAttributes(mine, 'light');
  assert.equal(attrs['data-accent'], 'ocean');
  assert.equal(attrs['data-ink'], 'warm');
  assert.equal(attrs['data-heading-font'], 'cormorant');
  assert.equal(attrs['data-corners'], 'sharp');
  // Unknown or hostile values fall back to the theme's own.
  const bad = sanitizeLook({ v: 6, style: 'sakura', accent: '<script>', ink: 'red', uiFont: 'comic', headingFont: 7, readFont: null, corners: 'blob', drawings: 'maybe' });
  for (const [k, v] of Object.entries(own)) assert.equal(bad[k], v, `${k} rejects a bad value`);
  assert.equal(bad.font, 'nunito');
  assert.equal(bad.pattern, 'petals');
  assert.equal(lookAttributes(bad, 'dark')['data-ink'], undefined, 'no attribute when it is the theme\'s own');
  // Accents saved by the old style pack (before v5) reset.
  assert.equal(sanitizeLook({ v: 4, style: 'studio', theme: 'midnight', accent: 'violet' }).accent, 'theme');
});

test('colour maths: known WCAG ratios', async () => {
  const { contrast, hexToOklch, oklchToHex, formatOklch } = await theme('color.ts');
  assert.equal(Math.round(contrast('1 0 0', '0 0 0') * 10) / 10, 21);
  assert.equal(Math.round(contrast('1 0 0', '1 0 0') * 100) / 100, 1);
  // #767676 on white is the classic 4.54:1.
  const grey = formatOklch(hexToOklch('#767676'));
  assert.equal(Math.round(contrast(grey, '1 0 0') * 100) / 100, 4.54);
  assert.equal(oklchToHex(hexToOklch('#3a7bd5')), '#3a7bd5');
});

test('sanitizeLook: defaults, validation and a v5 round-trip', async () => {
  const { sanitizeLook, DEFAULT_LOOK, LOOK_TABLES } = await theme('look.ts');
  const { THEMES } = await theme('styles.ts');
  assert.deepEqual(sanitizeLook(null), DEFAULT_LOOK);
  assert.deepEqual(sanitizeLook('nope'), DEFAULT_LOOK);
  assert.deepEqual(sanitizeLook({ v: 5, style: '<script>', textSize: 42, codeFont: 'no-such-font' }), DEFAULT_LOOK);
  assert.equal(DEFAULT_LOOK.style, 'journal');
  assert.equal(DEFAULT_LOOK.theme, 'parchment');
  for (const t of THEMES) {
    const look = sanitizeLook({ v: 5, style: t.id, textSize: 'large', codeFont: 'fira', solutionFont: 'mali' });
    assert.equal(look.style, t.id);
    for (const [k, v] of Object.entries(t.bundle)) {
      if (k === 'codeFont') continue;
      assert.equal(look[k], v, `${t.id}: ${k} comes from the theme`);
    }
    assert.equal(look.textSize, 'large', 'text size is a personal choice');
    assert.equal(look.codeFont, 'fira', 'the code font is a personal choice');
    assert.equal(look.solutionFont, 'mali', 'the solution handwriting is a personal choice');
    assert.equal(look.accent, 'theme');
    assert.deepEqual(sanitizeLook(look), look, `${t.id}: idempotent`);
    assert.deepEqual(sanitizeLook({ v: 5, style: t.id }).codeFont, t.bundle.codeFont, `${t.id}: default code font`);
  }
  // A theme can't be bent: stored palette, fonts or shapes are ignored.
  const bent = sanitizeLook({ v: 5, style: 'sakura', theme: 'parchment', font: 'geist', radius: 'sharp', pattern: 'pixels', iconSet: 'remix' });
  assert.equal(bent.theme, 'sakura');
  assert.equal(bent.font, 'nunito');
  assert.equal(bent.radius, 'round');
  assert.equal(bent.pattern, 'petals');
  assert.equal(bent.iconSet, 'phosphor');
  // Solution fonts: every offered one round-trips; unknown ones are the default.
  const { SOLUTION_FONTS } = await theme('fonts.ts');
  assert.deepEqual(SOLUTION_FONTS.map((f) => f.id), ['shantell', 'patrick', 'architects', 'mali', 'off']);
  for (const f of SOLUTION_FONTS) assert.equal(sanitizeLook({ v: 5, solutionFont: f.id }).solutionFont, f.id);
  for (const bad of ['caveat', 'Shantell', '', 7, null, '<script>']) assert.equal(sanitizeLook({ v: 5, solutionFont: bad }).solutionFont, 'off');
  assert.ok(!LOOK_TABLES.styles.includes('studio'), 'Hive\'s internal look is never stored');
});

test('look migration v5: the old style pack folds into the ten themes', async () => {
  const { sanitizeLook } = await theme('look.ts');
  const style = (raw) => sanitizeLook(raw).style;
  // The untouched old default and the house style land on Field Journal.
  assert.equal(style({ v: 3, style: 'studio', theme: 'midnight' }), 'journal');
  assert.equal(style({ v: 4, style: 'journal', theme: 'parchment' }), 'journal');
  assert.equal(style({ v: 2 }), 'journal');
  // Each old style goes to the theme nearest in spirit.
  const expect = {
    editorial: 'journal', manuscript: 'journal', glass: 'sakura', washi: 'sakura', luxe: 'observatory', atelier: 'observatory',
    signal: 'arcade', poster: 'arcade', console: 'terminal', terminal: 'terminal', nordic: 'greenhouse', swiss: 'blueprint',
    blueprint: 'blueprint', canvas: 'sketchbook',
  };
  for (const [from, to] of Object.entries(expect)) assert.equal(style({ v: 4, style: from, theme: 'midnight' }), to, `${from} → ${to}`);
  // A palette picked on the old default style says more than the style.
  assert.equal(style({ v: 4, style: 'studio', theme: 'dracula' }), 'arcade');
  assert.equal(style({ v: 4, style: 'studio', theme: 'everforest' }), 'greenhouse');
  assert.equal(style({ v: 4, style: 'studio', theme: 'tokyo-night' }), 'observatory');
  assert.equal(style({ v: 4, style: 'studio', theme: 'rose-pine' }), 'sakura');
  assert.equal(style({ v: 4, style: 'studio', theme: 'phosphor' }), 'terminal');
  // Accessibility palettes always move to Clear, whatever the style was.
  for (const p of ['contrast-dark', 'contrast-light', 'colour-safe', 'tritan-safe', 'e-ink']) {
    assert.equal(style({ v: 4, style: 'washi', theme: p }), 'clear', `${p} → clear`);
  }
  // Personal settings survive; the old style's code font gives way to the theme's.
  const moved = sanitizeLook({ v: 4, style: 'washi', theme: 'washi', textSize: 'xl', solutionFont: 'patrick', codeFont: 'plex-mono' });
  assert.equal(moved.v, 6);
  assert.equal(moved.textSize, 'xl');
  assert.equal(moved.solutionFont, 'patrick');
  assert.equal(moved.codeFont, 'victor', 'Sakura\'s own code font');
  assert.deepEqual(sanitizeLook(moved), moved, 'idempotent');
});

test('sanitizeLook: migrates a v1 (wallpaper era) look', async () => {
  const { sanitizeLook } = await theme('look.ts');
  const out = sanitizeLook({ wallpaper: 'synthwave-grid', accent: 'purple', glass: 'frosted', cardStyle: 'neon', iconPack: 'clay', fontStyle: 'handwriting-caveat', fontSize: 'huge', solutionFont: 'shantell' });
  assert.equal(out.v, 6);
  assert.equal(out.style, 'journal');
  assert.equal(out.textSize, 'xl', 'the v1 text size is kept');
  assert.equal(out.solutionFont, 'off', 'the old handwriting default moves to plain text');
  for (const gone of ['wallpaper', 'glass', 'iconPack', 'fontStyle', 'fontSize', 'fontColor']) assert.ok(!(gone in out), `${gone} should not survive migration`);
});

test('the validator survives serialisation into the first-paint script', async () => {
  const { sanitizeLookWith, LOOK_TABLES } = await theme('look.ts');
  // index.html receives `(${fn.toString()})` plus JSON tables — emulate that.
  const fn = new Function(`return (${sanitizeLookWith.toString()})`)();
  const T = JSON.parse(JSON.stringify(LOOK_TABLES));
  const samples = [
    {},
    { wallpaper: 'deep-space', accent: 'ice', fontStyle: 'cinzel' },
    { v: 4, style: 'studio', theme: 'dracula' },
    { v: 4, style: 'washi', theme: 'contrast-light' },
    { v: 5, style: 'observatory', textSize: 'large', codeFont: 'fira' },
    { v: 5, style: 'nope' },
    { solutionFont: 'comic-sans' },
  ];
  for (const s of samples) assert.deepEqual(fn(s, T), sanitizeLookWith(s, LOOK_TABLES));
  assert.equal(fn({ v: 5, style: 'arcade' }, T).pattern, 'pixels');
});

test('the first-paint script sets data-solution-font, and the theme CSS defines every solution font', async () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.html'), 'utf8');
  assert.match(html, /d\.setAttribute\('data-solution-font', look\.solutionFont\)/);
  const { lookAttributes, DEFAULT_LOOK } = await theme('look.ts');
  assert.equal(lookAttributes(DEFAULT_LOOK, 'dark')['data-solution-font'], 'off');
  const { buildThemeCss } = await theme('themeCss.ts');
  const { SOLUTION_FONTS } = await theme('fonts.ts');
  const css = buildThemeCss();
  for (const f of SOLUTION_FONTS) {
    assert.match(css, new RegExp(`\\[data-solution-font="${f.id}"\\]\\{--font-solution:`), `no CSS for ${f.id}`);
  }
  assert.match(css, /\[data-solution-font="off"\]\{--font-solution:var\(--font-body\)/);
});

test('Hive keeps its own look (Studio on Midnight) whatever theme is on', async () => {
  const { hiveLook, isHivePath, DEFAULT_LOOK, sanitizeLook } = await theme('look.ts');
  const { THEMES } = await theme('styles.ts');
  for (const t of THEMES) {
    const shown = hiveLook(sanitizeLook({ v: 5, style: t.id, textSize: 'large' }));
    assert.equal(shown.style, 'studio', `${t.id} shows as Studio in Hive`);
    assert.equal(shown.theme, 'midnight');
    assert.equal(shown.cardStyle, 'soft');
    assert.equal(shown.textSize, 'large', 'personal settings stay');
  }
  // Personal colours, faces and corners don't reach Hive either.
  const mine = hiveLook(sanitizeLook({ v: 6, style: 'sakura', accent: 'ocean', ink: 'warm', uiFont: 'lexend', headingFont: 'cormorant', readFont: 'literata', corners: 'sharp', drawings: 'off' }));
  for (const k of ['accent', 'ink', 'uiFont', 'headingFont', 'readFont', 'corners', 'drawings']) assert.equal(mine[k], 'theme', `Hive ignores the personal ${k}`);
  assert.equal(hiveLook(DEFAULT_LOOK).style, 'studio');
  assert.ok(isHivePath('/hive') && isHivePath('/hive/projects/1'));
  assert.ok(!isHivePath('/hiveminds') && !isHivePath('/hub'));
});
