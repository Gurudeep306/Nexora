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
      if (e.key >= '0' && e.key <= '9') handleInput(e.key)
      else if (e.key === '.') handleInput('.')
      else if (e.key === '+') handleInput('+')
      else if (e.key === '-') handleInput('-')
      else if (e.key === '*') handleInput('×')
      else if (e.key === '/') handleInput('÷')
      else if (e.key === 'Enter') handleEqual()
      else if (e.key === 'Backspace') handleBackspace()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, display])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-labelledby="calc-title"
      className={cn(
        'fixed z-50 rounded-2xl border border-border bg-[#181d28] text-white shadow-2xl backdrop-blur-xl transition-all duration-200 select-none font-sans',
        isMinimized
          ? 'bottom-6 right-6 w-72 p-3'
          : 'bottom-4 right-4 sm:bottom-8 sm:right-8 w-[380px] max-w-[95vw] p-3.5',
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-accent-brand/20 p-1 text-accent-brand">
            <CalcIcon className="size-4" />
          </div>
          <span id="calc-title" className="text-[12.5px] font-bold tracking-wide uppercase text-gray-200">
            TCS iON Scientific Calculator
          </span>
          {memory !== null && (
            <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-[10px] font-bold text-emerald-400">M</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-gray-400">
          <button
            type="button"
            onClick={() => setIsMinimized((m) => !m)}
            className="rounded p-1 hover:bg-white/10 hover:text-white"
            title="Minimize"
          >
            <Minus className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-red-500/20 hover:text-red-400"
            title="Close"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Calculator Body (Visible when not minimized) */}
      {!isMinimized && (
        <div className="mt-2 space-y-2">
          {/* LCD Display */}
          <div className="rounded-xl border border-white/10 bg-[#0f131a] p-2.5 text-right font-mono">
            <div className="h-4 text-[11px] text-gray-400 truncate">{expr}</div>
            <div className="text-[22px] font-bold text-white tracking-wide truncate">{display}</div>
          </div>

          {/* Rad / Deg Mode & Memory Controls */}
          <div className="grid grid-cols-6 gap-1 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setIsRad((r) => !r)}
              className={cn(
                'col-span-2 rounded-lg py-1 border transition-colors',
                isRad
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                  : 'bg-emerald-600/30 border-emerald-500 text-emerald-300',
              )}
            >
              {isRad ? 'RADIAN (Rad)' : 'DEGREE (Deg)'}
            </button>
            <button
              type="button"
              onClick={() => handleMemory('MC')}
              className="rounded-lg bg-white/5 py-1 text-gray-300 hover:bg-white/10"
            >
              MC
            </button>
            <button
              type="button"
              onClick={() => handleMemory('MR')}
              className="rounded-lg bg-white/5 py-1 text-gray-300 hover:bg-white/10"
            >
              MR
            </button>
            <button
              type="button"
              onClick={() => handleMemory('MS')}
              className="rounded-lg bg-white/5 py-1 text-gray-300 hover:bg-white/10"
            >
              MS
            </button>
            <button
              type="button"
              onClick={() => handleMemory('M+')}
              className="rounded-lg bg-white/5 py-1 text-gray-300 hover:bg-white/10"
            >
              M+
            </button>
          </div>

          {/* Scientific Operations Grid */}
          <div className="grid grid-cols-5 gap-1 text-[11.5px] font-medium text-gray-300">
            <button type="button" onClick={() => applyFunc('sin')} className="btn-calc-fn">sin</button>
            <button type="button" onClick={() => applyFunc('cos')} className="btn-calc-fn">cos</button>
            <button type="button" onClick={() => applyFunc('tan')} className="btn-calc-fn">tan</button>
            <button type="button" onClick={() => applyFunc('ln')} className="btn-calc-fn">ln</button>
            <button type="button" onClick={() => applyFunc('log10')} className="btn-calc-fn">log₁₀</button>

            <button type="button" onClick={() => applyFunc('asin')} className="btn-calc-fn">sin⁻¹</button>
            <button type="button" onClick={() => applyFunc('acos')} className="btn-calc-fn">cos⁻¹</button>
            <button type="button" onClick={() => applyFunc('atan')} className="btn-calc-fn">tan⁻¹</button>
            <button type="button" onClick={() => applyFunc('exp')} className="btn-calc-fn">eˣ</button>
            <button type="button" onClick={() => applyFunc('10x')} className="btn-calc-fn">10ˣ</button>

            <button type="button" onClick={() => applyFunc('sinh')} className="btn-calc-fn">sinh</button>
            <button type="button" onClick={() => applyFunc('cosh')} className="btn-calc-fn">cosh</button>
            <button type="button" onClick={() => applyFunc('tanh')} className="btn-calc-fn">tanh</button>
            <button type="button" onClick={() => applyFunc('sqrt')} className="btn-calc-fn">√x</button>
            <button type="button" onClick={() => applyFunc('cbrt')} className="btn-calc-fn">³√x</button>

            <button type="button" onClick={() => applyFunc('sqr')} className="btn-calc-fn">x²</button>
            <button type="button" onClick={() => applyFunc('cube')} className="btn-calc-fn">x³</button>
            <button type="button" onClick={() => handleInput('^')} className="btn-calc-fn">xʸ</button>
            <button type="button" onClick={() => applyFunc('inv')} className="btn-calc-fn">1/x</button>
            <button type="button" onClick={() => applyFunc('fact')} className="btn-calc-fn">n!</button>
          </div>

          {/* Standard Keypad & Operators */}
          <div className="grid grid-cols-5 gap-1 pt-1 border-t border-white/10 text-[13px] font-bold">
            <button type="button" onClick={() => handleInput('(')} className="btn-calc-op">(</button>
            <button type="button" onClick={() => handleInput(')')} className="btn-calc-op">)</button>
            <button type="button" onClick={() => handleInput('%')} className="btn-calc-op">mod</button>
            <button type="button" onClick={handleClear} className="btn-calc-danger">C</button>
            <button type="button" onClick={handleBackspace} className="btn-calc-danger">⌫</button>

            <button type="button" onClick={() => handleInput('7')} className="btn-calc-num">7</button>
            <button type="button" onClick={() => handleInput('8')} className="btn-calc-num">8</button>
            <button type="button" onClick={() => handleInput('9')} className="btn-calc-num">9</button>
            <button type="button" onClick={() => handleInput('÷')} className="btn-calc-op">÷</button>
            <button type="button" onClick={() => handleInput(String(Math.PI))} className="btn-calc-fn">π</button>

            <button type="button" onClick={() => handleInput('4')} className="btn-calc-num">4</button>
            <button type="button" onClick={() => handleInput('5')} className="btn-calc-num">5</button>
            <button type="button" onClick={() => handleInput('6')} className="btn-calc-num">6</button>
            <button type="button" onClick={() => handleInput('×')} className="btn-calc-op">×</button>
            <button type="button" onClick={() => handleInput(String(Math.E))} className="btn-calc-fn">e</button>

            <button type="button" onClick={() => handleInput('1')} className="btn-calc-num">1</button>
            <button type="button" onClick={() => handleInput('2')} className="btn-calc-num">2</button>
            <button type="button" onClick={() => handleInput('3')} className="btn-calc-num">3</button>
            <button type="button" onClick={() => handleInput('-')} className="btn-calc-op">−</button>
            <button type="button" onClick={handleNegate} className="btn-calc-op">±</button>

            <button type="button" onClick={() => handleInput('0')} className="btn-calc-num col-span-2">0</button>
            <button type="button" onClick={() => handleInput('.')} className="btn-calc-num">.</button>
            <button type="button" onClick={() => handleInput('+')} className="btn-calc-op">+</button>
            <button type="button" onClick={handleEqual} className="btn-calc-eq">=</button>
          </div>
        </div>
      )}
    </div>
  )
}
