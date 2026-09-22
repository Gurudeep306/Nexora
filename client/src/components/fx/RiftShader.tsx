import { useEffect, useRef } from 'react'
import { Mesh, Program, Renderer, Triangle } from 'ogl'

/*
 * "The Rift" — a GPU-rendered synthwave aurora: domain-warped fbm light
 * curtains in violet / cyan / rose over a perspective horizon grid.
 * One fullscreen triangle, one fragment shader. DPR capped, pauses when
 * off-screen or the tab is hidden, and follows the cursor softly.
 */

const vertex = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uGrid;
uniform float uIntensity;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  vec2 m = (uMouse - 0.5) * vec2(aspect, 1.0);
  float t = uTime * 0.06;

  // Domain-warped aurora field
  vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t)), fbm(p * 1.4 + vec2(5.2, -t)));
  vec2 r = vec2(fbm(p * 1.8 + 3.0 * q + vec2(1.7, 9.2) + t * 1.3 + m * 0.35),
                fbm(p * 1.8 + 3.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p * 1.6 + 2.6 * r);

  vec3 violet = vec3(0.545, 0.361, 0.965);
  vec3 cyan   = vec3(0.133, 0.827, 0.933);
  vec3 rose   = vec3(0.957, 0.247, 0.369);
  vec3 ink    = vec3(0.035, 0.035, 0.051);

  vec3 col = mix(ink, violet, smoothstep(0.35, 0.95, f) * 0.9);
  col = mix(col, cyan, smoothstep(0.55, 1.05, length(q)) * 0.45);
  col = mix(col, rose, smoothstep(0.62, 1.0, r.x) * 0.35);

  // Vertical light curtains
  float curtain = pow(max(0.0, fbm(vec2(p.x * 3.0 + t * 2.0, t * 0.5))), 3.0);
  col += violet * curtain * 0.35 * smoothstep(-0.2, 0.5, p.y);

  // Cursor glow
  col += violet * 0.18 * exp(-6.0 * length(p - m));

  // Synthwave horizon grid (bottom third)
  float horizon = -0.18;
  if (uGrid > 0.0 && p.y < horizon) {
    float d = horizon - p.y;
    float z = 0.35 / d;
    vec2 g = vec2(p.x * z, z + uTime * 0.35);
    float px = 1.6 / uRes.y;
    vec2 w = vec2(px * z, px * z * z / 0.35);
    vec2 dist = 0.5 - abs(fract(g) - 0.5);
    vec2 l = 1.0 - smoothstep(vec2(0.0), w, dist);
    float line = max(l.x, l.y);
    float fade = smoothstep(0.0, 0.12, d) * smoothstep(0.9, 0.2, d);
    col += mix(violet, cyan, 0.3) * line * fade * 0.55 * uGrid;
    col *= 1.0 - 0.35 * smoothstep(0.0, 0.6, d);
  }
  // Horizon glow line
  col += rose * 0.25 * exp(-80.0 * abs(p.y - horizon)) * uGrid;

  // Vignette + intensity
  float vig = smoothstep(1.25, 0.25, length(p * vec2(0.8, 1.1)));
  col *= mix(0.35, 1.0, vig) * uIntensity;

  gl_FragColor = vec4(col, 1.0);
}
`

export default function RiftShader({
  className,
  grid = true,
  intensity = 1,
}: {
  className?: string
  grid?: boolean
  intensity?: number
}) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let renderer: Renderer
    try {
      renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 1.5), alpha: false, antialias: false })
    } catch {
      return // no WebGL — CSS fallback behind stays visible
    }
    const gl = renderer.gl
    gl.clearColor(0.035, 0.035, 0.051, 1)
    const canvas = gl.canvas as HTMLCanvasElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    el.appendChild(canvas)

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: [1, 1] },
        uMouse: { value: [0.5, 0.6] },
        uGrid: { value: grid ? 1 : 0 },
        uIntensity: { value: intensity },
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

    const resize = () => {
      const { width, height } = el.getBoundingClientRect()
      renderer.setSize(Math.max(1, width), Math.max(1, height))
      program.uniforms.uRes.value = [width, height]
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    const target = [0.5, 0.6]
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      target[0] = (e.clientX - r.left) / r.width
      target[1] = 1 - (e.clientY - r.top) / r.height
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let visible = true
    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting
    })
    io.observe(el)

    let raf = 0
    const start = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible || document.hidden) return
      const mouse = program.uniforms.uMouse.value as number[]
      mouse[0] += (target[0] - mouse[0]) * 0.04
      mouse[1] += (target[1] - mouse[1]) * 0.04
      program.uniforms.uTime.value = reduce ? 12 : (now - start) / 1000
      renderer.render({ scene: mesh })
      if (reduce) cancelAnimationFrame(raf) // single still frame
    }
    raf = requestAnimationFrame(frame)
    requestAnimationFrame(() => el.setAttribute('data-ready', ''))

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }, [grid, intensity])

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={
        'pointer-events-none absolute inset-0 overflow-hidden opacity-0 transition-opacity duration-1000 data-[ready]:opacity-100 ' +
        (className ?? '')
      }
    />
  )
}
