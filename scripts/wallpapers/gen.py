"""
Nexora wallpaper renderer — original, procedurally generated wallpapers.

Every image here is computed from scratch (no source artwork). Four styles:

  silk     folded, lit ribbons of fabric-like material
  bloom    soft light blooms with glassy caustic arcs
  dunes    layered stylised dune silhouettes under an atmospheric sky
  nebula   deep-space gradient with dust clouds and stars

Quality notes, because these are what separate a premium wallpaper from a
cheap gradient:
  * fields are computed at half resolution and upsampled — they are smooth, so
    nothing is lost, and rendering is ~4x faster;
  * shapes are *lit* (surface normal · light direction + a specular term), so
    they read as physical material instead of flat colour blends;
  * the result is dithered with triangular noise before quantising to 8 bit,
    which kills the banding that 8-bit gradients otherwise show;
  * a faint film grain is added last, which also helps the WebP encoder avoid
    blocking in large smooth areas.

Usage (needs numpy + Pillow):
    python3 scripts/wallpapers/gen.py client/public/wallpapers            # all
    python3 scripts/wallpapers/gen.py client/public/wallpapers aurora     # one
Each wallpaper is rendered as <id>-<light|dark>.webp (2560x1600), a -1280
variant for smaller screens and a -thumb for the picker. The looks are
defined in themes.json next to this file; their colours and accents are
mirrored in client/src/theme/catalog.ts.
"""
import sys, json, os
import numpy as np
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else 'client/public/wallpapers'
os.makedirs(OUT, exist_ok=True)

W, H = 2560, 1600          # final size (16:10, retina-friendly)
SW, SH = W // 2, H // 2    # internal field size


def hex2rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def ramp(t, stops):
    """Map t∈[0,1] through colour stops, interpolating in *linear* light so
    blends stay luminous instead of going muddy in the middle."""
    t = np.clip(t, 0, 1)
    pos = np.array([s[0] for s in stops], dtype=np.float32)
    cols = np.stack([srgb_to_lin(hex2rgb(s[1])) for s in stops])
    out = np.zeros(t.shape + (3,), dtype=np.float32)
    for ch in range(3):
        out[..., ch] = np.interp(t, pos, cols[:, ch])
    return out


def grid():
    y, x = np.mgrid[0:SH, 0:SW].astype(np.float32)
    return x / SW, y / SH


def smooth_noise(rng, scale, octaves=3):
    """Cheap smooth value-noise: random low-res grids, bicubic-upsampled and summed."""
    acc = np.zeros((SH, SW), dtype=np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        gw, gh = max(2, int(scale * (2 ** o) * 1.6)), max(2, int(scale * (2 ** o)))
        g = rng.random((gh, gw)).astype(np.float32)
        # Resample in 32-bit float ("F" mode). Going through uint8 first leaves
        # 1/255 steps in the field, and differentiating for the surface normals
        # amplifies those steps into a visible crosshatch along the highlights.
        img = Image.fromarray(g, mode='F').resize((SW, SH), Image.BICUBIC)
        acc += amp * np.asarray(img, dtype=np.float32)
        total += amp
        amp *= 0.5
    return acc / total


def lighting(h, relief=1.0, light=(-0.5, -0.7, 0.5), spec_pow=42, spec_amt=0.55):
    """Shade a height field: Lambert diffuse + Blinn specular sheen.

    `h` is normalised to 0..1, so its per-pixel slope is tiny; `relief` scales
    it into real surface slopes (≈0.5–1.5) or the normals come out flat and the
    material reads as a flat blend instead of folded fabric."""
    gy, gx = np.gradient(h)
    k = relief * SW * 0.12
    n = np.stack([-gx * k, -gy * k, np.ones_like(h)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    L = np.array(light, dtype=np.float32); L /= np.linalg.norm(L)
    V = np.array([0, 0, 1], dtype=np.float32)
    Hv = (L + V); Hv /= np.linalg.norm(Hv)
    diff = np.clip((n * L).sum(-1), 0, 1)
    spec = np.clip((n * Hv).sum(-1), 0, 1) ** spec_pow
    return diff, spec * spec_amt


def finish(lin, rng, grain=0.018, vignette=0.28):
    """Vignette, upsample, dither, grain, quantise."""
    x, y = grid()
    r = np.sqrt((x - 0.5) ** 2 * 1.2 + (y - 0.52) ** 2)
    lin = lin * (1 - vignette * np.clip(r * 1.25, 0, 1) ** 2.2)[..., None]
    srgb = lin_to_srgb(lin)
    # upsample the smooth field to full resolution
    up = np.stack([
        np.asarray(Image.fromarray((srgb[..., c] * 65535).astype(np.uint16))
                   .resize((W, H), Image.BICUBIC), dtype=np.float32) / 65535.0
        for c in range(3)
    ], axis=-1)
    # triangular-PDF dither (±1 LSB) — the anti-banding step
    d = (rng.random((H, W, 1), dtype=np.float32) - rng.random((H, W, 1), dtype=np.float32)) / 255.0
    # film grain, luminance-weighted so it never speckles the darks
    g = (rng.standard_normal((H, W, 1)).astype(np.float32)) * grain * (0.35 + 0.65 * up.mean(-1, keepdims=True))
    out = np.clip(up + d + g * 0.5, 0, 1)
    return (out * 255 + 0.5).astype(np.uint8)


# ─────────────────────────── styles ───────────────────────────

def silk(p, rng):
    """Folded fabric: one family of long, gently curving folds (the elegance
    comes from their being mostly parallel), a smaller secondary family for
    richness, then lit. Colour comes mostly from position, so the whole sheet
    reads as one continuous material rather than stripes of paint."""
    x, y = grid()
    ang = p.get('angle', 0.55)
    X, Y = x * 1.6, y
    u = X * np.cos(ang) + Y * np.sin(ang)
    v = -X * np.sin(ang) + Y * np.cos(ang)
    # Almost no random warp: coherent ribbons come from smooth, deterministic
    # curvature. Random warp is what broke the folds into lumps before.
    warp = (smooth_noise(rng, 0.8, 2) - 0.5) * p.get('warp', 0.06)
    bend = (0.38 * np.sin(2 * np.pi * (v * 0.55 + p.get('phase', 0.1)))
            + 0.12 * np.sin(2 * np.pi * (v * 1.3 + 0.4)))
    ph1 = 2 * np.pi * (u * p.get('folds', 1.05) + bend + warp)
    ph2 = 2 * np.pi * (u * 3.1 - v * 0.6 + bend * 0.7 + 0.31)
    h = 0.5 + 0.5 * np.sin(ph1)
    # soften valleys, keep crests round — how cloth actually drapes
    h = h * h * (3 - 2 * h)
    h = 0.92 * h + 0.08 * (0.5 + 0.5 * np.sin(ph2))
    h = (h - h.min()) / (h.max() - h.min())
    diff, spec = lighting(h, relief=p.get('relief', 1.0), spec_pow=p.get('spec_pow', 70), spec_amt=p.get('sheen', 0.34))
    pos = np.clip(0.55 * x + 0.45 * y + warp * 0.6, 0, 1)
    t = np.clip(0.34 * h + 0.66 * pos, 0, 1)
    base = ramp(t, p['stops'])
    amb = p.get('ambient', 0.42)
    shade = amb + (1 - amb) * diff
    return base * shade[..., None] + spec[..., None] * srgb_to_lin(hex2rgb(p.get('sheen_color', '#ffffff')))


def bloom(p, rng):
    """A mesh gradient: soft light blooms *mixed* (not added) into the base, so
    a light variant stays pastel instead of blowing out to white. A single
    broad, diagonal light sweep gives it the glassy depth that thin outline
    rings only imitated."""
    x, y = grid()
    lin = srgb_to_lin(hex2rgb(p['base'])) * np.ones((SH, SW, 3), dtype=np.float32)
    for (cx, cy, rad, col, amt) in p['orbs']:
        wob = (smooth_noise(rng, 1.4, 2) - 0.5) * 0.18
        d = np.sqrt(((x - cx) * 1.6) ** 2 + (y - cy + wob) ** 2)
        f = np.clip(np.exp(-(d / rad) ** 2) * amt, 0, 1)
        lin = lin * (1 - f[..., None]) + srgb_to_lin(hex2rgb(col)) * f[..., None]
    sweep = p.get('sweep', 0.0)
    if sweep:
        u = (x * 1.6 * 0.6 + y * 0.8) / 1.6
        band = np.exp(-((u - p.get('sweep_at', 0.55)) / 0.16) ** 2) * sweep
        lin = lin * (1 - band[..., None]) + srgb_to_lin(hex2rgb(p.get('sweep_color', '#ffffff'))) * band[..., None]
    return lin


def dunes(p, rng):
    x, y = grid()
    sky = ramp(np.clip(y * 1.35, 0, 1), p['sky'])
    lin = sky.copy()
    # sun / glow
    sx, sy = p.get('sun', (0.68, 0.36))
    d = np.sqrt(((x - sx) * 1.6) ** 2 + (y - sy) ** 2)
    lin += (np.exp(-(d / 0.09) ** 2) * 0.9 + np.exp(-(d / 0.35) ** 2) * 0.22)[..., None] * srgb_to_lin(hex2rgb(p['glow']))
    layers = p['layers']
    for i, (base_y, amp, freq, col, rim) in enumerate(layers):
        n = smooth_noise(rng, 1.2 + i * 0.6, 2)
        ridge = base_y + amp * (np.sin(x * freq * 6.28 + i * 1.7) * 0.6 + (n[0:1, :] - 0.5) * 1.4)
        mask = np.clip((y - ridge) * SH / 3.0, 0, 1)            # anti-aliased edge
        depth = np.clip((y - ridge) * 4.0, 0, 1)
        c = srgb_to_lin(hex2rgb(col))
        shaded = c * (1 - 0.35 * depth[..., None])
        # a lit rim along the crest
        rimv = np.exp(-(((y - ridge) * SH) / 3.5) ** 2) * rim
        shaded = shaded + rimv[..., None] * srgb_to_lin(hex2rgb(p['glow']))
        lin = lin * (1 - mask[..., None]) + shaded * mask[..., None]
    return lin


def ridged(rng, scale, octaves=5):
    """Ridged multifractal: 1-|2n-1| gives thin bright filaments where plain
    value noise only gives soft blobs — that is what makes gas clouds read."""
    acc = np.zeros((SH, SW), dtype=np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        n = smooth_noise(rng, scale * (2 ** o), 1)
        acc += amp * (1 - np.abs(2 * n - 1)) ** 2
        total += amp
        amp *= 0.55
    return acc / total


def nebula(p, rng):
    x, y = grid()
    lin = ramp(np.clip(0.6 * y + 0.4 * x, 0, 1), p['stops'])
    # domain warp for swirling structure
    wx = smooth_noise(rng, 1.3, 3) - 0.5
    for (col, scale, amt, bias) in p['clouds']:
        r = ridged(rng, scale, 5)
        mask = np.clip((smooth_noise(rng, 0.9, 2) + wx * 0.5 - bias) * 2.6, 0, 1)
        dens = np.clip((r - p.get('thresh', 0.28)) * 2.1, 0, 1) ** 1.25 * mask
        c = srgb_to_lin(hex2rgb(col))
        if p.get('mix', False):
            lin = lin * (1 - dens[..., None] * amt) + c * dens[..., None] * amt
        else:
            lin = lin + dens[..., None] * amt * c
    k = int(SW * SH * p.get('density', 0.0016))
    if k:
        stars = np.zeros((SH, SW), dtype=np.float32)
        sx = rng.integers(0, SW, k); sy = rng.integers(0, SH, k)
        stars[sy, sx] = rng.random(k).astype(np.float32) ** 3 * 2.4
        lin = lin + stars[..., None] * p.get('star_amt', 1.0)
        # a handful of bright stars with a soft halo
        for _ in range(p.get('bright', 9)):
            cx, cy = rng.random(), rng.random()
            d = np.sqrt(((x - cx) * 1.6) ** 2 + (y - cy) ** 2)
            b = 0.4 + rng.random() * 0.9
            sz = 0.0025 + rng.random() * 0.0025
            lin = lin + (np.exp(-(d / sz) ** 2) * 1.4 * b + np.exp(-(d / (sz * 5)) ** 2) * 0.06 * b)[..., None] * p.get('star_amt', 1.0)
    return lin


STYLES = {'silk': silk, 'bloom': bloom, 'dunes': dunes, 'nebula': nebula}

# ─────────────────────────── the collection ───────────────────────────

THEMES = json.load(open(os.path.join(os.path.dirname(__file__), 'themes.json')))

only = sys.argv[2:] if len(sys.argv) > 2 else None
for theme in THEMES:
    for variant in ('dark', 'light'):
        key = f"{theme['id']}-{variant}"
        if only and key not in only and theme['id'] not in only:
            continue
        spec = theme[variant]
        rng = np.random.default_rng(theme.get('seed', 7) + (0 if variant == 'dark' else 101))
        lin = STYLES[spec['style']](spec, rng)
        img = finish(lin, rng, grain=spec.get('grain', 0.018), vignette=spec.get('vignette', 0.28))
        im = Image.fromarray(img)
        im.save(f'{OUT}/{key}.webp', 'WEBP', quality=86, method=6)
        im.resize((1280, 800), Image.LANCZOS).save(f'{OUT}/{key}-1280.webp', 'WEBP', quality=84, method=6)
        im.resize((320, 200), Image.LANCZOS).save(f'{OUT}/{key}-thumb.webp', 'WEBP', quality=80, method=6)
        print(key, os.path.getsize(f'{OUT}/{key}.webp') // 1024, 'KB')
