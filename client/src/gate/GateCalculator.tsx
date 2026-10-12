import { useState, useEffect } from 'react'
import { Calculator as CalcIcon, X, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function GateCalculator({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [expr, setExpr] = useState('')
  const [display, setDisplay] = useState('0')
  const [isRad, setIsRad] = useState(false)
  const [memory, setMemory] = useState<number | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)

  // Fact helper
  const factorial = (n: number): number => {
    if (n < 0 || !Number.isInteger(n)) return NaN
    if (n === 0 || n === 1) return 1
    let r = 1
    for (let i = 2; i <= n; i++) r *= i
    return r
  }

  const handleInput = (val: string) => {
    if (display === '0' && !isNaN(Number(val))) {
      setDisplay(val)
    } else {
      setDisplay((prev) => prev + val)
    }
  }

  const handleClear = () => {
    setDisplay('0')
    setExpr('')
  }

  const handleBackspace = () => {
    if (display.length <= 1) {
      setDisplay('0')
    } else {
      setDisplay((prev) => prev.slice(0, -1))
    }
  }

  const handleNegate = () => {
    const num = Number(display)
    if (!isNaN(num)) {
      setDisplay(String(-num))
    }
  }

  // Evaluate current display using Math
  const handleEqual = () => {
    try {
      // Clean string for safe evaluation
      let sanitized = display
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/π/g, `${Math.PI}`)
        .replace(/\be\b/g, `${Math.E}`)
        .replace(/\^/g, '**')

      // Handle simple math evaluation safely
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized})`)()
      if (typeof result === 'number' && !isNaN(result)) {
        setExpr(display + ' =')
        setDisplay(String(Number(result.toFixed(8))))
      } else {
        setDisplay('Error')
      }
    } catch {
      setDisplay('Error')
    }
  }

  // Scientific function applier
  const applyFunc = (fnName: string) => {
    const val = Number(display)
    if (isNaN(val)) return

    let res = NaN
    const toAngle = (radVal: number) => (isRad ? radVal : (radVal * Math.PI) / 180)
    const fromAngle = (radVal: number) => (isRad ? radVal : (radVal * 180) / Math.PI)

    switch (fnName) {
      case 'sin':
        res = Math.sin(toAngle(val))
        break
      case 'cos':
        res = Math.cos(toAngle(val))
        break
      case 'tan':
        res = Math.tan(toAngle(val))
        break
      case 'asin':
        res = fromAngle(Math.asin(val))
        break
      case 'acos':
        res = fromAngle(Math.acos(val))
        break
      case 'atan':
        res = fromAngle(Math.atan(val))
        break
      case 'sinh':
        res = Math.sinh(val)
        break
      case 'cosh':
        res = Math.cosh(val)
        break
      case 'tanh':
        res = Math.tanh(val)
        break
      case 'sqrt':
        res = Math.sqrt(val)
        break
      case 'cbrt':
        res = Math.cbrt(val)
        break
      case 'sqr':
        res = val * val
        break
      case 'cube':
        res = val * val * val
        break
      case 'inv':
        res = 1 / val
        break
      case 'ln':
        res = Math.log(val)
        break
      case 'log10':
        res = Math.log10(val)
        break
      case 'exp':
        res = Math.exp(val)
        break
      case '10x':
        res = Math.pow(10, val)
        break
      case 'fact':
        res = factorial(val)
        break
      default:
        break
    }

    if (!isNaN(res)) {
      setExpr(`${fnName}(${val}) =`)
      setDisplay(String(Number(res.toFixed(8))))
    } else {
      setDisplay('Error')
    }
  }

  // Memory operations
  const handleMemory = (op: 'MC' | 'MR' | 'MS' | 'M+' | 'M-') => {
    const cur = Number(display) || 0
    switch (op) {
      case 'MC':
        setMemory(null)
        break
      case 'MR':
        if (memory !== null) setDisplay(String(memory))
        break
      case 'MS':
        setMemory(cur)
        break
      case 'M+':
        setMemory((prev) => (prev ?? 0) + cur)
        break
      case 'M-':
        setMemory((prev) => (prev ?? 0) - cur)
        break
    }
  }

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && t.closest('input, textarea, [contenteditable="true"]')) return
      if (e.key >= '0' && e.key <= '9') handleInput(e.key)
      else if (e.key === '.') handleInput('.')
      else if (e.key === '+') handleInput('+')
      else if (e.key === '-') handleInput('-')
      else if (e.key === '*') handleInput('×')
      else if (e.key === '/') handleInput('÷')
      else if (e.key === '(' || e.key === ')') handleInput(e.key)
      else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault()
        handleEqual()
      }
      else if (e.key === 'Backspace') handleBackspace()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, display])

  if (!isOpen) return null

  const key = 'h-8 rounded-md border text-[12.5px] transition-colors active:translate-y-px'
  const fn = cn(key, 'border-border bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-3 hover:text-text-primary')
  const op = cn(key, 'border-border bg-bg-surface-3 font-semibold text-text-primary hover:border-border-hover')
  const num = cn(key, 'border-border bg-bg-surface font-mono text-[14px] font-semibold text-text-primary hover:bg-bg-surface-2')
  const danger = cn(key, 'border-state-error/40 bg-state-error/10 font-semibold text-state-error hover:bg-state-error/15')
  const eq = cn(key, 'border-accent-brand bg-accent-brand font-semibold text-on-accent-brand hover:bg-accent-brand-hover')

  const F = (label: string, name: string) => (
    <button type="button" onClick={() => applyFunc(name)} className={fn}>
      {label}
    </button>
  )
  const I = (label: string, value: string, cls = num) => (
    <button type="button" onClick={() => handleInput(value)} className={cls}>
      {label}
    </button>
  )

  return (
    <div
      role="dialog"
      aria-labelledby="calc-title"
      className={cn(
        'pop-surface fixed z-[110] rounded-2xl border border-border shadow-2xl select-none',
        isMinimized ? 'bottom-4 left-4 w-64 p-2.5' : 'bottom-2 left-2 w-[360px] max-w-[calc(100vw-1rem)] p-3 sm:bottom-6 sm:left-6',
      )}
    >
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <CalcIcon className="size-4 text-text-muted" />
          <span id="calc-title" className="text-[12.5px] font-semibold text-text-primary">
            Scientific calculator
          </span>
          {memory !== null && <span className="rounded bg-bg-surface-3 px-1 text-[10px] font-bold text-text-secondary">M</span>}
        </div>
        <div className="flex items-center gap-0.5 text-text-muted">
          <button type="button" onClick={() => setIsMinimized((m) => !m)} className="rounded p-1 hover:bg-bg-surface-2 hover:text-text-primary" aria-label={isMinimized ? 'Expand calculator' : 'Minimise calculator'}>
            <Minus className="size-3.5" />
          </button>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-bg-surface-2 hover:text-text-primary" aria-label="Close calculator">
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="mt-2 space-y-2">
          <div className="rounded-lg border border-border bg-bg-field px-2.5 py-2 text-right font-mono" aria-live="polite">
            <div className="h-4 truncate text-[11px] text-text-muted">{expr}</div>
            <div className="truncate text-[22px] font-semibold text-text-primary">{display}</div>
          </div>

          <div className="grid grid-cols-6 gap-1">
            <button type="button" onClick={() => setIsRad((r) => !r)} className={cn(fn, 'col-span-2 font-semibold')} aria-label={`Angle mode: ${isRad ? 'radians' : 'degrees'}`}>
              {isRad ? 'Rad' : 'Deg'}
            </button>
            {(['MC', 'MR', 'MS', 'M+'] as const).map((m) => (
              <button key={m} type="button" onClick={() => handleMemory(m)} className={fn}>
                {m}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-1">
            {F('sin', 'sin')}
            {F('cos', 'cos')}
            {F('tan', 'tan')}
            {F('ln', 'ln')}
            {F('log', 'log10')}
            {F('sin⁻¹', 'asin')}
            {F('cos⁻¹', 'acos')}
            {F('tan⁻¹', 'atan')}
            {F('eˣ', 'exp')}
            {F('10ˣ', '10x')}
            {F('sinh', 'sinh')}
            {F('cosh', 'cosh')}
            {F('tanh', 'tanh')}
            {F('√x', 'sqrt')}
            {F('∛x', 'cbrt')}
            {F('x²', 'sqr')}
            {F('x³', 'cube')}
            {I('xʸ', '^', fn)}
            {F('1/x', 'inv')}
            {F('n!', 'fact')}
          </div>

          <div className="grid grid-cols-5 gap-1 border-t border-border pt-2">
            {I('(', '(', op)}
            {I(')', ')', op)}
            {I('mod', '%', op)}
            <button type="button" onClick={handleClear} className={danger}>
              C
            </button>
            <button type="button" onClick={handleBackspace} className={danger} aria-label="Backspace">
              ⌫
            </button>
            {I('7', '7')}
            {I('8', '8')}
            {I('9', '9')}
            {I('÷', '÷', op)}
            {I('π', String(Math.PI), fn)}
            {I('4', '4')}
            {I('5', '5')}
            {I('6', '6')}
            {I('×', '×', op)}
            {I('e', String(Math.E), fn)}
            {I('1', '1')}
            {I('2', '2')}
            {I('3', '3')}
            {I('−', '-', op)}
            <button type="button" onClick={handleNegate} className={op} aria-label="Change sign">
              ±
            </button>
            <button type="button" onClick={() => handleInput('0')} className={cn(num, 'col-span-2')}>
              0
            </button>
            {I('.', '.')}
            {I('+', '+', op)}
            <button type="button" onClick={handleEqual} className={eq}>
              =
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
