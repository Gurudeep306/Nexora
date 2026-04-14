#!/usr/bin/env python3
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
  <linearGradient id="bgG" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#0a0f1e"/>
    <stop offset="100%" stop-color="#111827"/>
  </linearGradient>
  <linearGradient id="nG" x1="180" y1="130" x2="340" y2="380" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#60a5fa"/>
    <stop offset="50%" stop-color="#a78bfa"/>
    <stop offset="100%" stop-color="#38bdf8"/>
  </linearGradient>
  <linearGradient id="ringG" x1="100" y1="100" x2="412" y2="412" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.3"/>
  </linearGradient>
  <radialGradient id="coreG" cx="256" cy="256" r="60" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.25"/>
    <stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/>
  </radialGradient>
  <filter id="glow">
    <feGaussianBlur stdDeviation="3" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>

<!-- Background circle -->
<circle cx="256" cy="256" r="250" fill="url(#bgG)" stroke="#1e3a5f" stroke-width="2"/>

<!-- Outer orbit ring -->
<ellipse cx="256" cy="256" rx="220" ry="220" fill="none" stroke="url(#ringG)" stroke-width="1.5" stroke-dasharray="8 12" opacity="0.5"/>

<!-- Inner orbit ring -->
<ellipse cx="256" cy="256" rx="170" ry="170" fill="none" stroke="url(#ringG)" stroke-width="1" stroke-dasharray="4 8" opacity="0.35"/>

<!-- Binary fragments around the edge -->
<g font-family="monospace" font-size="11" fill="#334155" opacity="0.35">
  <text x="256" y="52" text-anchor="middle">10110</text>
  <text x="440" y="200" text-anchor="middle">01101</text>
  <text x="440" y="340" text-anchor="middle">11010</text>
  <text x="256" y="478" text-anchor="middle">00101</text>
  <text x="72" y="340" text-anchor="middle">10011</text>
  <text x="72" y="200" text-anchor="middle">01110</text>
</g>

<!-- CS symbol nodes on orbit -->
<g font-family="serif" font-size="16" font-weight="bold" filter="url(#glow)">
  <!-- Sigma - top -->
  <text x="256" y="80" text-anchor="middle" fill="#f472b6">&#x3A3;</text>
  <!-- Lambda - right -->
  <text x="440" y="262" text-anchor="middle" fill="#34d399">&#x3BB;</text>
  <!-- Infinity - bottom -->
  <text x="256" y="448" text-anchor="middle" fill="#fbbf24">&#x221E;</text>
  <!-- Partial diff - left -->
  <text x="72" y="262" text-anchor="middle" fill="#f87171">&#x2202;</text>
  <!-- Big-O - top right -->
  <text x="390" y="110" text-anchor="middle" fill="#a78bfa" font-family="monospace" font-size="12">O(n)</text>
  <!-- Hex - bottom left -->
  <text x="122" y="415" text-anchor="middle" fill="#22d3ee" font-family="monospace" font-size="12">0x4E</text>
  <!-- Pi - top left -->
  <text x="120" y="120" text-anchor="middle" fill="#fb923c">&#x3C0;</text>
  <!-- Braces - bottom right -->
  <text x="395" y="415" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="14">{}</text>
</g>

<!-- Data structure icons -->
<!-- Binary tree (top-right) -->
<g opacity="0.45" stroke="#a78bfa" fill="none" stroke-width="1.2">
  <circle cx="370" cy="155" r="3.5" fill="#a78bfa"/>
  <circle cx="355" cy="175" r="3" fill="#a78bfa"/>
  <circle cx="385" cy="175" r="3" fill="#a78bfa"/>
  <line x1="367" y1="158" x2="357" y2="172"/>
  <line x1="373" y1="158" x2="383" y2="172"/>
</g>

<!-- Stack (bottom-left) -->
<g opacity="0.45" stroke="#34d399" fill="none" stroke-width="1.2">
  <rect x="125" y="340" width="22" height="8" rx="1"/>
  <rect x="125" y="350" width="22" height="8" rx="1"/>
  <rect x="125" y="360" width="22" height="8" rx="1"/>
  <line x1="136" y1="335" x2="136" y2="340"/>
  <polygon points="132,335 136,329 140,335" fill="#34d399" stroke="none"/>
</g>

<!-- Graph (bottom-right) -->
<g opacity="0.45">
  <circle cx="385" cy="340" r="3.5" fill="#fbbf24"/>
  <circle cx="400" cy="360" r="3.5" fill="#fbbf24"/>
  <circle cx="370" cy="360" r="3.5" fill="#fbbf24"/>
  <line x1="385" y1="343" x2="400" y2="357" stroke="#fbbf24" stroke-width="1.2"/>
  <line x1="385" y1="343" x2="370" y2="357" stroke="#fbbf24" stroke-width="1.2"/>
  <line x1="370" y1="360" x2="400" y2="360" stroke="#fbbf24" stroke-width="1.2"/>
</g>

<!-- Hash table (top-left) -->
<g opacity="0.45" stroke="#60a5fa" stroke-width="1" fill="none">
  <rect x="130" y="155" width="24" height="24" rx="2"/>
  <line x1="130" y1="163" x2="154" y2="163"/>
  <line x1="130" y1="171" x2="154" y2="171"/>
  <line x1="142" y1="155" x2="142" y2="179"/>
</g>

<!-- Center nexus glow -->
<circle cx="256" cy="256" r="30" fill="url(#coreG)" opacity="0.5"/>

<!-- Main N letterform - bold, clean, NO blur -->
<path d="M195 340 L195 172 L215 172 L310 310 L310 172 L330 172 L330 340 L310 340 L215 202 L215 340 Z"
      fill="url(#nG)" stroke="none" opacity="1"/>

<!-- Thin glow behind N -->
<path d="M195 340 L195 172 L215 172 L310 310 L310 172 L330 172 L330 340 L310 340 L215 202 L215 340 Z"
      fill="none" stroke="url(#nG)" stroke-width="4" opacity="0.4" filter="url(#glow)"/>

</svg>'''

with open('/Users/gurudeeppaidipati/Desktop/coderift/public/nexora-logo.svg', 'w') as f:
    f.write(svg)
print("DONE - wrote", len(svg), "bytes")
