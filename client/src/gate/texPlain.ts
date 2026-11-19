/**
 * LaTeX inside question text, as readable plain characters for one-line
 * previews (question lists, queues, notebooks): `4 \times 5` → `4 × 5`,
 * `n \ge 1` → `n ≥ 1`, `\frac{a}{b}` → `a/b`. Dropping the commands, as the
 * previews used to, turned `n \ge 1` into `n 1`.
 */
const SYMBOLS: Record<string, string> = {
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', ast: '∗', star: '⋆', circ: '∘', bullet: '•',
  ge: '≥', geq: '≥', le: '≤', leq: '≤', ne: '≠', neq: '≠', approx: '≈', equiv: '≡', sim: '∼', simeq: '≃', cong: '≅', propto: '∝',
  ll: '≪', gg: '≫', lt: '<', gt: '>',
  to: '→', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔', Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔',
  implies: '⇒', iff: '⇔', mapsto: '↦', uparrow: '↑', downarrow: '↓',
  in: '∈', notin: '∉', ni: '∋', subset: '⊂', subseteq: '⊆', supset: '⊃', supseteq: '⊇', cup: '∪', cap: '∩',
  emptyset: '∅', varnothing: '∅', setminus: '∖', forall: '∀', exists: '∃', nexists: '∄',
  neg: '¬', lnot: '¬', land: '∧', wedge: '∧', lor: '∨', vee: '∨', oplus: '⊕', otimes: '⊗', odot: '⊙',
  top: '⊤', bot: '⊥', vdash: '⊢', models: '⊨', mid: '|', nmid: '∤', parallel: '∥', perp: '⊥', angle: '∠',
  infty: '∞', partial: '∂', nabla: '∇', sum: 'Σ', prod: 'Π', int: '∫', oint: '∮',
  lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', langle: '⟨', rangle: '⟩',
  ldots: '…', dots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱', prime: '′', degree: '°',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ',
  iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ',
  phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  log: 'log', ln: 'ln', lg: 'lg', exp: 'exp', min: 'min', max: 'max', gcd: 'gcd', mod: 'mod', bmod: 'mod', pmod: 'mod',
  sin: 'sin', cos: 'cos', tan: 'tan', lim: 'lim', det: 'det', deg: 'deg',
}

export function texToPlain(tex: string): string {
  // Escaped braces are real braces (a set); park them while grouping braces go.
  let s = tex.replace(/\\\{/g, '\u0001').replace(/\\\}/g, '\u0002')
  // Structures with arguments first, innermost out (a few rounds covers nesting).
  for (let i = 0; i < 3; i++) {
    s = s
      .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2')
      .replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, '$1√($2)')
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)')
      .replace(/\\(?:text|textbf|textit|mathrm|mathit|mathbf|mathsf|mathtt|mathcal|mathbb|operatorname|boldsymbol|bar|overline|hat|tilde|vec)\s*\{([^{}]*)\}/g, '$1')
  }
  return (
    s
      // Spacing and sizing commands carry no meaning in a preview.
      .replace(/\\(?:left|right|big|Big|bigg|Bigg)(?![a-zA-Z])/g, '')
      .replace(/\\[,;:! ]/g, ' ')
      .replace(/\\(?:quad|qquad)(?![a-zA-Z])/g, ' ')
      .replace(/\\([%$&#_])/g, '$1')
      .replace(/\\([a-zA-Z]+)/g, (_, name: string) => (name in SYMBOLS ? SYMBOLS[name] : ''))
      // Exponents and subscripts: keep the content, drop the braces.
      .replace(/\^\{([^{}]*)\}/g, '^$1')
      .replace(/_\{([^{}]*)\}/g, '_$1')
      .replace(/[{}]/g, '')
      .replace(/\u0001/g, '{')
      .replace(/\u0002/g, '}')
  )
}
