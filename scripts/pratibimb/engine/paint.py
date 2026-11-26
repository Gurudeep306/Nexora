"""Our painter: turns a rendered frame of the character into the painted look of the brief (references 1–8:
hand-painted skin and hair, visible brush work, warm light and cool shadows, crisp painted features, rim light).

  painted = paint(rgb, alpha=None, strength=1.0)        # rgb: H x W x 3 uint8 (BGR), alpha: H x W 0..1

Steps (all our own, built from image basics):
1. Flow: the structure tensor gives every pixel the direction of the form (along hair, around the cheek).
2. Planes: edge-preserving smoothing (bilateral, repeated) removes photo detail and pores, leaving painted
   planes of colour; luminance is pulled towards soft bands so light and shadow read as painted shapes.
3. Palette: shadows lean cool (blue-violet), lights lean warm, mid-tones keep the person's own colour.
4. Brush work: noise smeared along the flow (line integral convolution) gives strokes that follow the form,
   laid lightly over the planes.
5. Lines: a difference of Gaussians on the original brightness finds eyes, brows, lids, lips and contours;
   they are drawn as soft dark painted lines, thicker where the edge is strong.
6. Rim light: a coloured edge on the lit side of the silhouette (needs alpha).
"""
import cv2
import numpy as np


def _flow(gray):
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    J = [cv2.GaussianBlur(x, (0, 0), 3.0) for x in (gx * gx, gx * gy, gy * gy)]
    ang = 0.5 * np.arctan2(2 * J[1], J[0] - J[2])  # gradient direction
    return ang + np.pi / 2  # along the form (perpendicular to the gradient)


def _lic(noise, ang, length=9):
    """Line integral convolution: average the noise along the flow direction."""
    h, w = noise.shape
    acc = noise.copy()
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx, dy = np.cos(ang).astype(np.float32), np.sin(ang).astype(np.float32)
    for sgn in (1, -1):
        px, py = xx.copy(), yy.copy()
        for _ in range(length):
            px += sgn * dx
            py += sgn * dy
            acc += cv2.remap(noise, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return acc / (2 * length + 1)


def paint(bgr, alpha=None, strength=1.0, seed=3):
    img = bgr.astype(np.float32) / 255.0
    h, w = img.shape[:2]
    scale = max(h, w) / 512.0
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    ang = _flow(gray)
    # 2. painted planes
    planes = bgr.copy()
    d = max(5, int(9 * scale)) | 1
    for _ in range(7):  # large clean painted planes, no photo detail
        planes = cv2.bilateralFilter(planes, d, 36, 7 * scale)
    pl = planes.astype(np.float32) / 255.0
    lab = cv2.cvtColor(pl, cv2.COLOR_BGR2LAB)
    L = lab[..., 0] / 100.0
    bands = 5.0
    Lq = np.floor(L * bands + 0.5) / bands
    soft = 0.4 * strength
    L2 = L * (1 - soft) + (Lq * 0.6 + L * 0.4) * soft
    lab[..., 0] = np.clip(L2, 0, 1) * 100
    # 3. palette: cool shadows, warm lights
    shade = np.clip((0.55 - L2) / 0.4, 0, 1)
    light = np.clip((L2 - 0.6) / 0.35, 0, 1)
    lab[..., 1] += (6 * shade - 1 * light) * strength   # a: + magenta in shadows
    lab[..., 2] += (-14 * shade + 8 * light) * strength  # b: blue in shadows, yellow in lights
    out = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    # 4. brush work along the form
    rng = np.random.default_rng(seed)
    noise = rng.random((h, w)).astype(np.float32)
    noise = cv2.GaussianBlur(noise, (0, 0), 0.8 * scale)
    strokes = _lic(noise, ang, length=max(6, int(10 * scale)))
    strokes = (strokes - strokes.mean()) / (strokes.std() + 1e-6)
    strokes = cv2.GaussianBlur(strokes, (0, 0), 1.2 * scale)
    out = out * (1 + 0.018 * strength * strokes[..., None])  # barely there, like a painted texture
    # 5. painted lines
    g1 = cv2.GaussianBlur(gray, (0, 0), 1.0 * scale)
    g2 = cv2.GaussianBlur(gray, (0, 0), 1.6 * scale)
    dog = g1 - 0.98 * g2
    line = np.clip(-dog * 18 - 0.15, 0, 1)  # only the strong feature edges
    line = cv2.GaussianBlur(line, (0, 0), 0.6 * scale)
    ink = np.array([0.16, 0.10, 0.12], np.float32)  # deep warm brown-violet, not black
    out = out * (1 - 0.75 * line[..., None] * strength) + ink * 0.75 * line[..., None] * strength
    # 6. rim light on the lit side of the silhouette
    if alpha is not None:
        a = alpha.astype(np.float32)
        inner = cv2.GaussianBlur(a, (0, 0), 6 * scale)
        rim = np.clip((a - inner) * 4, 0, 1)
        side = np.clip((np.mgrid[0:h, 0:w][1] / w - 0.35) * 2, 0, 1)  # light from the right
        out = out + rim[..., None] * side[..., None] * np.array([0.35, 0.3, 0.18], np.float32) * strength
    return (np.clip(out, 0, 1) * 255).astype(np.uint8)
