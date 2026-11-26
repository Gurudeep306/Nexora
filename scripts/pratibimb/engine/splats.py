"""Appearance: small soft 3D colour points (Gaussians) bound to the rig's triangles.

Each point sits on one triangle (soft barycentric position, a small offset along the normal), lies flat in the
triangle's plane with its own turn and two sizes relative to the triangle, and has a colour and an opacity. As
the rig moves (expression, head turn), every point moves with its triangle, so the learned look follows every
expression: the mouth-cavity triangles carry teeth and tongue, the shell carries hair, ears and neck.

render() is plain PyTorch (any computer, small sizes); on a CUDA GPU with gsplat (Apache-2.0) installed the
same points are drawn by gsplat at full size. Both take points already in image pixels (orthographic).
"""
import math

import torch

try:
    import gsplat  # noqa: F401
    HAVE_GSPLAT = torch.cuda.is_available()
except ImportError:
    HAVE_GSPLAT = False


class Splats(torch.nn.Module):
    def __init__(self, n_tri, per_tri=4, device="cpu"):
        super().__init__()
        N = n_tri * per_tri
        self.per_tri = per_tri
        self.register_buffer("tri_of", torch.arange(n_tri, device=device).repeat_interleave(per_tri))
        g = torch.Generator().manual_seed(7)
        self.bary = torch.nn.Parameter((torch.randn(N, 3, generator=g) * 0.5).to(device))
        self.off = torch.nn.Parameter(torch.zeros(N, 1, device=device))
        self.theta = torch.nn.Parameter((torch.rand(N, 1, generator=g) * math.pi).to(device))
        self.ls = torch.nn.Parameter(torch.full((N, 2), math.log(0.45), device=device))
        self.rgb = torch.nn.Parameter(torch.zeros(N, 3, device=device))
        self.op = torch.nn.Parameter(torch.full((N, 1), 2.0, device=device))

    def place(self, v, tri):
        """Point centres, in-plane axes and sizes for rig vertices v (V x 3, pixels) and triangles tri (T x 3)."""
        t = tri[self.tri_of]
        A, B, C = v[t[:, 0]], v[t[:, 1]], v[t[:, 2]]
        e1 = B - A
        n = torch.cross(e1, C - A, dim=1)
        k = (n.norm(dim=1, keepdim=True) / 2 + 1e-6).sqrt()
        e1 = e1 / (e1.norm(dim=1, keepdim=True) + 1e-9)
        n = n / (n.norm(dim=1, keepdim=True) + 1e-9)
        e2 = torch.cross(n, e1, dim=1)
        w = torch.softmax(self.bary, 1)
        mu = w[:, 0:1] * A + w[:, 1:2] * B + w[:, 2:3] * C + n * self.off * k
        ct, st = torch.cos(self.theta), torch.sin(self.theta)
        u, vv = ct * e1 + st * e2, -st * e1 + ct * e2
        su, sv = torch.exp(self.ls[:, :1]) * k, torch.exp(self.ls[:, 1:2]) * k
        return mu, u, vv, su, sv, n, k

    @torch.no_grad()
    def init_colours(self, v, tri, img):
        """Start every point with the colour under it in one frame (img: H x W x 3 in 0..1)."""
        mu = self.place(v, tri)[0]
        h, w = img.shape[:2]
        xi = mu[:, 0].round().long().clamp(0, w - 1)
        yi = mu[:, 1].round().long().clamp(0, h - 1)
        c = img[yi, xi].clamp(0.02, 0.98)
        self.rgb.copy_(torch.log(c / (1 - c)))

    def render(self, v, tri, hw, chunk=4096):
        mu, u, vv, su, sv, n, k = self.place(v, tri)
        col, op = torch.sigmoid(self.rgb), torch.sigmoid(self.op)
        if HAVE_GSPLAT and v.is_cuda:
            return _render_gsplat(mu, u, vv, su, sv, n, k, col, op, hw)
        return _render_torch(mu, u, vv, su, sv, col, op, hw, chunk)


def _render_torch(mu, u, vv, su, sv, col, op, hw, chunk):
    h, w = hw
    U, V = u[:, :2], vv[:, :2]
    S = su[:, :, None] ** 2 * U[:, :, None] * U[:, None, :] + sv[:, :, None] ** 2 * V[:, :, None] * V[:, None, :]
    S = S + 0.25 * torch.eye(2, device=mu.device)
    det = S[:, 0, 0] * S[:, 1, 1] - S[:, 0, 1] ** 2
    inv = torch.stack([S[:, 1, 1], -S[:, 0, 1], S[:, 0, 0]], 1) / det[:, None]
    # Cull points outside the picture (with a margin of 3 sigma).
    rad = 3 * torch.sqrt(torch.maximum(S[:, 0, 0], S[:, 1, 1]))
    keep = (mu[:, 0] + rad > 0) & (mu[:, 0] - rad < w) & (mu[:, 1] + rad > 0) & (mu[:, 1] - rad < h)
    mu, inv, col, op = mu[keep], inv[keep], col[keep], op[keep]
    idx = torch.argsort(mu[:, 2])  # front to back: smaller z is nearer
    mu2, inv, col, op = mu[idx, :2], inv[idx], col[idx], op[idx]
    ys, xs = torch.meshgrid(torch.arange(h, device=mu.device, dtype=torch.float32) + 0.5,
                            torch.arange(w, device=mu.device, dtype=torch.float32) + 0.5, indexing="ij")
    pix = torch.stack([xs.reshape(-1), ys.reshape(-1)], 1)
    out_c, out_a = [], []
    for s0 in range(0, pix.shape[0], chunk):
        d = pix[s0:s0 + chunk, None, :] - mu2[None]
        m = inv[None, :, 0] * d[..., 0] ** 2 + 2 * inv[None, :, 1] * d[..., 0] * d[..., 1] + inv[None, :, 2] * d[..., 1] ** 2
        al = (op[None, :, 0] * torch.exp(-0.5 * m)).clamp(max=0.99)
        Tr = torch.cumprod(torch.cat([torch.ones_like(al[:, :1]), 1 - al[:, :-1]], 1), 1)
        wgt = al * Tr
        out_c.append(wgt @ col)
        out_a.append(wgt.sum(1))
    return torch.cat(out_c).reshape(h, w, 3), torch.cat(out_a).reshape(h, w)


def _render_gsplat(mu, u, vv, su, sv, n, k, col, op, hw):
    """Full-size drawing on a GPU. Not yet run on a GPU: compare with _render_torch on the first GPU run."""
    from gsplat import rasterization
    h, w = hw
    sn = 0.05 * k
    S3 = (su[:, :, None] ** 2 * u[:, :, None] * u[:, None, :] + sv[:, :, None] ** 2 * vv[:, :, None] * vv[:, None, :]
          + sn[:, :, None] ** 2 * n[:, :, None] * n[:, None, :])
    means = mu.clone()
    means[:, 2] = means[:, 2] + 10_000.0
    viewmat = torch.eye(4, device=mu.device)[None]
    K = torch.eye(3, device=mu.device)[None]
    rgb, alpha, _ = rasterization(means, None, None, op[:, 0], col, viewmat, K, w, h, covars=S3, camera_model="ortho",
                                  packed=False, eps2d=0.25)
    return rgb[0], alpha[0, ..., 0]
