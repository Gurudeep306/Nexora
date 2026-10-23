/*
  Group Lab (Discrete Mathematics, Chapter 5 Live Lab). Two tabs:

    table      a preset (ℤ_n, ℤ_n*, × mod n on a chosen set, S₃, the Klein group)
               or a typed Cayley table; the lab checks closure, associativity,
               identity, inverses and commutativity (showing the failing
               elements), names the structure (magma … abelian group) and lists
               element orders, inverses and generators
    subgroups  every subgroup; pick one to colour its left cosets (Lagrange:
               equal blocks that tile the group); a^k mod n by square-and-multiply

  All logic is in ./groupLogic.ts (tested against the Python checks in
  content/gate-notes/_checks/dm/grouplib.py).
*/
import { useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  PRESETS,
  associativeFailure,
  closureFailure,
  commutativeFailure,
  generators,
  identity,
  inverse,
  isGroup,
  kind,
  leftCosets,
  order,
  orderMod,
  parseTable,
  powMod,
  subgroups,
  type Struct,
} from './groupLogic'

export type GroupTab = 'table' | 'subgroups'
const TABS: { id: GroupTab; label: string }[] = [
  { id: 'table', label: 'Cayley table' },
  { id: 'subgroups', label: 'Subgroups & cosets' },
]
const CUSTOM = 'e a b c\na e c b\nb c e a\nc b a e'

export default function GroupLab({ tab: initial = 'table', title }: { tab?: string; title?: string }) {
  const [tab, setTab] = useState<GroupTab>(initial === 'subgroups' ? 'subgroups' : 'table')
  const [preset, setPreset] = useState(PRESETS[0]!.id)
  const [custom, setCustom] = useState(CUSTOM)
  const uid = useId()
  const pid = useId()
  const tid = useId()
  const res = useMemo((): { S: Struct | null; err: string | null } => {
    if (preset !== 'custom') return { S: PRESETS.find((p) => p.id === preset)!.make(), err: null }
    try {
      return { S: parseTable(custom), err: null }
    } catch (e) {
      return { S: null, err: (e as Error).message }
    }
  }, [preset, custom])
  return (
    <div className="lab">
      <div className="lab-head">
        <span className="lab-kicker">Live Lab</span>
        <span className="lab-title">{title || 'Group Lab'}</span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Group Lab tools">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${uid}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${uid}-panel`}
            className={cn('lab-tab', tab === t.id && 'is-on')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="lab-row">
        <label htmlFor={pid}>Structure</label>
        <select id={pid} className="lab-select" value={preset} onChange={(e) => setPreset(e.target.value)}>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value="custom">Type a Cayley table…</option>
        </select>
      </div>
      {preset === 'custom' && (
        <div className="lab-row">
          <label htmlFor={tid}>Table (names, then one row per element)</label>
          <textarea id={tid} className="lab-input grp-text" rows={5} value={custom} spellCheck={false} onChange={(e) => setCustom(e.target.value)} />
        </div>
      )}
      {res.err && <p className="lab-warn">{res.err}</p>}
      {res.S && (
        <div className="lab-panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
          {tab === 'table' ? <TableTool S={res.S} /> : <SubgroupTool S={res.S} />}
        </div>
      )}
    </div>
  )
}

function Cayley({ S, tone }: { S: Struct; tone?: (x: number) => number | undefined }) {
  const L = (x: number) => (x < 0 ? '∉' : S.labels[x]!)
  return (
    <div className="lab-tt-wrap">
      <table className="lab-tt">
        <caption className="sr-only">Cayley table: row a, column b holds a ∗ b</caption>
        <thead>
          <tr>
            <th scope="col">∗</th>
            {S.labels.map((l) => (
              <th key={l} scope="col">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {S.t.map((row, a) => (
            <tr key={a}>
              <th scope="row">{S.labels[a]}</th>
              {row.map((x, b) => (
                <td key={b} className={cn(x < 0 && 'grp-out', tone && tone(x) !== undefined && `grp-c${tone(x)! % 6}`)}>
                  {L(x)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableTool({ S }: { S: Struct }) {
  const L = (x: number) => S.labels[x]!
  const cf = closureFailure(S)
  const af = associativeFailure(S)
  const e = cf ? null : identity(S)
  const comm = commutativeFailure(S)
  const k = kind(S)
  const grp = isGroup(S)
  return (
    <div className="lab-grid">
      <div className="lab-col">
        <Cayley S={S} />
      </div>
      <div className="lab-col">
        <ul className="rel-props" aria-live="polite">
          <li className={cf ? 'is-bad' : 'is-good'}>
            <strong>closure</strong>: {cf ? `no — ${L(cf[0])} ∗ ${L(cf[1])} is outside the set` : 'yes'}
          </li>
          {!cf && (
            <li className={af ? 'is-bad' : 'is-good'}>
              <strong>associative</strong>: {af ? `no — (${L(af[0])} ∗ ${L(af[1])}) ∗ ${L(af[2])} ≠ ${L(af[0])} ∗ (${L(af[1])} ∗ ${L(af[2])})` : 'yes'}
            </li>
          )}
          {!cf && (
            <li className={e === null ? 'is-bad' : 'is-good'}>
              <strong>identity</strong>: {e === null ? 'none' : L(e)}
            </li>
          )}
          {!cf && e !== null && (
            <li className={S.labels.every((_, a) => inverse(S, a) !== null) ? 'is-good' : 'is-bad'}>
              <strong>inverses</strong>: {S.labels.map((l, a) => `${l}⁻¹ = ${inverse(S, a) === null ? '–' : L(inverse(S, a)!)}`).join(', ')}
            </li>
          )}
          <li className={comm ? 'is-bad' : 'is-good'}>
            <strong>commutative</strong>: {comm ? `no — ${L(comm[0])} ∗ ${L(comm[1])} ≠ ${L(comm[1])} ∗ ${L(comm[0])}` : 'yes'}
          </li>
        </ul>
        <p className="lab-result">
          This is {k === 'not closed' ? 'not even a binary operation on the set' : `a${/^[aeiou]/.test(k) ? 'n' : ''} ${k}`}.
        </p>
        {grp && (
          <div className="lab-lists">
            <div>Orders: {S.labels.map((l, a) => `|${l}| = ${order(S, a)}`).join(', ')}</div>
            <div>Generators: {generators(S).map(L).join(', ') || 'none (not cyclic)'}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function SubgroupTool({ S }: { S: Struct }) {
  const grp = isGroup(S)
  const subs = useMemo(() => (grp ? subgroups(S) : []), [S, grp])
  const [pick, setPick] = useState(1)
  const [a, setA] = useState(13)
  const [k, setK] = useState(99)
  const [n, setN] = useState(17)
  const fid = useId()
  const H = subs[Math.min(pick, subs.length - 1)] ?? []
  const cos = grp ? leftCosets(S, H) : []
  const which = (x: number) => cos.findIndex((c) => c.includes(x))
  const pm = n > 1 && k >= 0 ? powMod(((a % n) + n) % n, k, n) : null
  const om = n > 1 ? orderMod(((a % n) + n) % n, n) : null
  return (
    <>
      {!grp && <p className="lab-warn">Not a group, so subgroups and cosets are not defined here.</p>}
      {grp && (
        <div className="lab-grid">
          <div className="lab-col">
            <Cayley S={S} tone={(x) => (x < 0 ? undefined : which(x))} />
          </div>
          <div className="lab-col">
            <div className="lab-row" role="group" aria-label="Choose a subgroup">
              {subs.map((h, i) => (
                <button key={i} type="button" className={cn('lab-toggle', i === Math.min(pick, subs.length - 1) && 'is-on')} aria-pressed={i === pick} onClick={() => setPick(i)}>
                  {'{'}
                  {h.map((x) => S.labels[x]).join(', ')}
                  {'}'}
                </button>
              ))}
            </div>
            <p className="lab-lists" aria-live="polite">
              |G| = {S.labels.length}, |H| = {H.length}: {cos.length} left cosets of {H.length} elements each ({cos.length} × {H.length} = {S.labels.length}).
            </p>
            <ul className="rel-props">
              {cos.map((c, i) => (
                <li key={i} className={`grp-c${i % 6}`}>
                  {'{'}
                  {c.map((x) => S.labels[x]).join(', ')}
                  {'}'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="lab-row">
        <span>Power mod:</span>
        <label className="sr-only" htmlFor={`${fid}-a`}>
          a
        </label>
        <input id={`${fid}-a`} className="lab-input grp-num" type="number" value={a} onChange={(e) => setA(Number(e.target.value) || 0)} />
        <span>^</span>
        <label className="sr-only" htmlFor={`${fid}-k`}>
          k
        </label>
        <input id={`${fid}-k`} className="lab-input grp-num" type="number" min={0} value={k} onChange={(e) => setK(Math.max(0, Math.min(10 ** 9, Number(e.target.value) || 0)))} />
        <span>mod</span>
        <label className="sr-only" htmlFor={`${fid}-n`}>
          n
        </label>
        <input id={`${fid}-n`} className="lab-input grp-num" type="number" min={2} value={n} onChange={(e) => setN(Math.max(2, Math.min(10 ** 6, Number(e.target.value) || 2)))} />
      </div>
      {pm && (
        <p className="lab-lists" aria-live="polite">
          {a}^{k} mod {n} = <strong>{pm.value}</strong>. Square-and-multiply over the bits of {k} ({k.toString(2)}): {pm.steps.map(([b, v]) => `${b}→${v}`).join(', ')}.
          {om !== null && ` The order of ${a} mod ${n} is ${om}.`}
        </p>
      )}
    </>
  )
}
