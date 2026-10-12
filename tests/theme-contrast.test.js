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

test('there are 45+ distinct themes across all five categories', async () => {
  const { PALETTES, CATEGORIES } = await theme('palettes.ts');
  assert.ok(PALETTES.length >= 45, `only ${PALETTES.length} themes`);
  const ids = new Set(PALETTES.map((p) => p.id));
  assert.equal(ids.size, PALETTES.length, 'theme ids must be unique');
  for (const c of CATEGORIES) {
    assert.ok(PALETTES.some((p) => p.category === c.id), `no theme in category ${c.id}`);
  }
  for (const p of PALETTES) {
    assert.ok(p.dark || p.light, `${p.id} has no mode`);
    assert.match(p.id, /^[a-z0-9-]+$/, `${p.id} is not a safe attribute value`);
  }
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
  assert.ok(checks > 1000, `suspiciously few checks (${checks})`);
  assert.deepEqual(failures, [], `\n${failures.join('\n')}`);
});

test('every accent override holds contrast on every theme', async () => {
  const { PALETTES, ACCENTS } = await theme('palettes.ts');
  const { auditMode } = await theme('audit.ts');
  const failures = [];
  for (const a of ACCENTS) {
    for (const p of PALETTES) {
      for (const mode of ['dark', 'light']) {
        if (!p[mode]) continue;
        for (const r of auditMode(p[mode], a[mode])) {
          if (!r.ok) failures.push(`${a.id} on ${p.id}/${mode}: ${r.rule} = ${r.ratio} (needs ${r.min})`);
        }
      }
    }
  }
  assert.deepEqual(failures, [], `\n${failures.join('\n')}`);
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

test('sanitizeLook: defaults, validation and v2 round-trip', async () => {
  const { sanitizeLook, DEFAULT_LOOK } = await theme('look.ts');
  assert.deepEqual(sanitizeLook(null), DEFAULT_LOOK);
  assert.deepEqual(sanitizeLook('nope'), DEFAULT_LOOK);
  assert.deepEqual(sanitizeLook({ theme: 'no-such-theme', font: 42, radius: '<script>' }), DEFAULT_LOOK);

  const v2 = {
    v: 2, theme: 'nord', accent: 'teal', font: 'manrope', codeFont: 'fira', textSize: 'large',
    cardStyle: 'gradient', radius: 'sharp', iconSet: 'remix', iconStyle: 'fill', iconContainer: 'outline', iconShape: 'circle',
  };
  assert.deepEqual(sanitizeLook(v2), v2);
  assert.deepEqual(sanitizeLook(sanitizeLook(v2)), v2, 'idempotent');

  // A style that doesn't exist in the chosen set falls back to the set's default.
  assert.equal(sanitizeLook({ ...v2, iconSet: 'remix', iconStyle: 'duotone' }).iconStyle, 'line');
});

test('sanitizeLook: migrates a v1 (wallpaper era) look', async () => {
  const { sanitizeLook } = await theme('look.ts');
  const v1 = {
    wallpaper: 'synthwave-grid', accent: 'purple', glass: 'frosted', cardStyle: 'neon', iconPack: 'clay',
    iconShape: 'hexagon', fontStyle: 'handwriting-caveat', fontSize: 'huge', fontColor: 'cyan',
  };
  const out = sanitizeLook(v1);
  assert.equal(out.v, 2);
  assert.equal(out.theme, 'synthwave');
  assert.equal(out.accent, 'violet');
  assert.equal(out.cardStyle, 'glow');
  assert.equal(out.iconContainer, 'solid');
  assert.equal(out.iconShape, 'rounded');
  assert.equal(out.font, 'nunito');
  assert.equal(out.textSize, 'xl');
  for (const gone of ['wallpaper', 'glass', 'iconPack', 'fontStyle', 'fontSize', 'fontColor']) {
    assert.ok(!(gone in out), `${gone} should not survive migration`);
  }
  // The old default (Aurora wallpaper, multicolour accent) lands on the new default.
  const d = sanitizeLook({ wallpaper: 'aurora', accent: 'multicolor', iconShape: 'free' });
  assert.equal(d.theme, 'midnight');
  assert.equal(d.accent, 'theme');
  assert.equal(d.iconContainer, 'none');
});

test('the validator survives serialisation into the first-paint script', async () => {
  const { sanitizeLookWith, LOOK_TABLES } = await theme('look.ts');
  // index.html receives `(${fn.toString()})` plus JSON tables — emulate that.
  const fn = new Function(`return (${sanitizeLookWith.toString()})`)();
  const T = JSON.parse(JSON.stringify(LOOK_TABLES));
  const samples = [
    {},
    { wallpaper: 'deep-space', accent: 'ice', fontStyle: 'cinzel' },
    { theme: 'dracula', accent: 'theme', iconSet: 'phosphor', iconStyle: 'fill' },
    { theme: 'gruvbox', iconSet: 'lucide', iconStyle: 'fill' },
  ];
  for (const s of samples) assert.deepEqual(fn(s, T), sanitizeLookWith(s, LOOK_TABLES));
});
