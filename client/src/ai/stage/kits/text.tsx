/*
  Stage kit: text. A code panel (the running line marked, the variables it
  has made so far) and a small table (cells can be marked). Page text, so it
  is crisp and selectable, pinned beside the scene.
*/
import { Html } from '@react-three/drei'
import type { StageElement } from '../spec'
import { at3, fmt, opOf, type ElCtx } from './shared'
import { useLabelHost } from '../../three/portal'

export function CodeEl({ el, c }: { el: Extract<StageElement, { type: 'code' }>; c: ElCtx }) {
  const o = opOf(el, c)
  const host = useLabelHost()
  const active = el.active == null ? -1 : Math.round(el.active)
  return (
    <Html portal={host} position={at3(el.at ?? [0, 0, 0], c.lift)} center zIndexRange={[12, 0]} style={{ opacity: o, visibility: o < 0.03 ? 'hidden' : undefined }}>
      <div className="ai3d-code" role="group" aria-label="Code">
        <pre>
          {el.lines.map((l, i) => (
            <div key={i} className={i === active ? 'is-active' : undefined} aria-current={i === active ? 'step' : undefined}>
              <span className="ai3d-code-n" aria-hidden="true">
                {i + 1}
              </span>
              {l || ' '}
            </div>
          ))}
        </pre>
        {el.vars && el.vars.length > 0 && (
          <dl className="ai3d-code-vars">
            {el.vars.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Html>
  )
}

export function TableEl({ el, c }: { el: Extract<StageElement, { type: 'table' }>; c: ElCtx }) {
  const o = opOf(el, c)
  const host = useLabelHost()
  const hl = new Set((el.highlight ?? []).map(([i, j]) => `${i},${j}`))
  return (
    <Html portal={host} position={at3(el.at ?? [0, 0, 0], c.lift)} center zIndexRange={[12, 0]} style={{ opacity: o, visibility: o < 0.03 ? 'hidden' : undefined }}>
      <table className="ai3d-table">
        {el.header && (
          <thead>
            <tr>
              {el.header.map((h, j) => (
                <th key={j} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {el.rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j} className={hl.has(`${i},${j}`) ? 'is-hl' : undefined}>
                  {typeof v === 'number' ? (Number.isInteger(v) ? String(v) : fmt(v)) : v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Html>
  )
}
