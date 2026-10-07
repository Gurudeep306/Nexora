import React, { useState } from 'react'
import type { SystemDesignModel } from '../types'
import { Layers, Search } from 'lucide-react'

interface TopologyMatrixProps {
  systems: SystemDesignModel[]
  selectedSystemId: string
  onSelectSystem: (id: string) => void
}

export const InfrastructureTopologyMatrix: React.FC<TopologyMatrixProps> = ({
  systems,
  selectedSystemId,
  onSelectSystem,
}) => {
  const [filterQuery, setFilterQuery] = useState<string>('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All')

  const filtered = systems.filter((s) => {
    const matchesDiff = selectedDifficulty === 'All' || s.difficulty === selectedDifficulty
    const matchesQuery =
      filterQuery === '' ||
      s.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.tagline.toLowerCase().includes(filterQuery.toLowerCase())
    return matchesDiff && matchesQuery
  })

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-b from-[#0e091b] via-[#090611] to-[#040207] p-6 text-white shadow-xl space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-purple-400" />
            <h4 className="font-mono text-[14px] font-bold tracking-wider text-purple-400 uppercase">
              31 Production Systems Architecture & Infrastructure Matrix
            </h4>
          </div>
          <p className="text-[12.5px] text-text-muted mt-0.5">
            Compare throughput, storage scales, database choices, and latency SLAs across all 31 distributed systems.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-bg-surface-1 p-0.5 ring-1 ring-border text-[11px] font-mono">
            {['All', 'Intermediate', 'Advanced', 'Expert'].map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`rounded px-2.5 py-1 transition ${
                  selectedDifficulty === diff
                    ? 'bg-purple-500 text-white font-bold'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Filter matrix..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full rounded-lg bg-bg-surface-1 pl-8 pr-3 py-1 text-[11.5px] text-text-primary ring-1 ring-border placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-purple-400"
            />
          </div>
        </div>
      </div>

      {/* Systems Grid Table */}
      <div className="overflow-x-auto rounded-xl ring-1 ring-border">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead className="bg-bg-surface-3/80 font-mono text-[10.5px] uppercase tracking-wider text-text-muted">
            <tr>
              <th className="p-3">System Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Difficulty</th>
              <th className="p-3">Target Throughput</th>
              <th className="p-3">Latency SLA</th>
              <th className="p-3">Microservices</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-black/40">
            {filtered.map((sys) => {
              const isSelected = sys.id === selectedSystemId
              return (
                <tr
                  key={sys.id}
                  className={`transition-colors hover:bg-purple-500/10 ${
                    isSelected ? 'bg-purple-500/15 ring-1 ring-inset ring-purple-500/50' : ''
                  }`}
                >
                  <td className="p-3 font-semibold text-text-primary">
                    <div className="flex items-center gap-2">
                      <span className="flex size-2 rounded-full bg-accent-brand" />
                      <span>{sys.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-text-muted font-mono text-[11px]">{sys.category}</td>
                  <td className="p-3">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                        sys.difficulty === 'Expert'
                          ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30'
                          : sys.difficulty === 'Advanced'
                          ? 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                      }`}
                    >
                      {sys.difficulty}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-sky-300">{sys.throughput.split('·')[0]}</td>
                  <td className="p-3 font-mono text-[11px] text-amber-300">{sys.latency.split('·')[0]}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {sys.services.slice(0, 3).map((srv) => (
                        <span
                          key={srv.id}
                          className="rounded bg-bg-surface-2 px-1.5 py-0.2 font-mono text-[9px] text-text-muted ring-1 ring-border"
                        >
                          {srv.name.split(' ')[0]}
                        </span>
                      ))}
                      {sys.services.length > 3 && (
                        <span className="font-mono text-[9px] text-text-muted self-center">
                          +{sys.services.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onSelectSystem(sys.id)}
                      className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition ${
                        isSelected
                          ? 'bg-purple-500 text-white shadow'
                          : 'bg-bg-surface-1 text-text-muted hover:text-white hover:bg-bg-surface-2 ring-1 ring-border'
                      }`}
                    >
                      {isSelected ? 'Active' : 'Inspect'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
