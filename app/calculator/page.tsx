"use client"
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'

type FlowSummary = {
  id: string
  name: string
  slug: string
  flowCriteria: { criterion: { key: string }; config: unknown }[]
}

function readNumber(obj: unknown, key: string): number {
  if (!obj || typeof obj !== 'object') return 0
  const value = (obj as Record<string, unknown>)[key]
  return typeof value === 'number' ? value : 0
}

function readBoolean(obj: unknown, key: string): boolean {
  if (!obj || typeof obj !== 'object') return false
  const value = (obj as Record<string, unknown>)[key]
  return value === true
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CalculatorPage() {
  const { data: flows } = useSWR<FlowSummary[]>("/api/flows", fetcher)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [selectedFlowId, setSelectedFlowId] = useState<string>('')
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [yearsList, setYearsList] = useState<Array<{
    id: string
    year: number
    isSubstitute: boolean
    totalWeeklyHours: number
    substituteMonths: number
    placements: Array<{ schoolName: string; months: number; msd: number; isPrison: boolean; weeklyHours: number }>
  }>>([
    {
      id: 'y0',
      year: new Date().getFullYear(),
      isSubstitute: false,
      totalWeeklyHours: 23,
      substituteMonths: 10,
      placements: [{ schoolName: '', months: 12, msd: 1, isPrison: false, weeklyHours: 23 }],
    },
  ])
  const [selectedYearIdx, setSelectedYearIdx] = useState(0)

  const [hasMarriage, setHasMarriage] = useState(false)
  const [childrenCount, setChildrenCount] = useState(0)
  const [hasSynypiretisi, setHasSynypiretisi] = useState(false)
  const [hasEntopiotita, setHasEntopiotita] = useState(false)

  const [hasStudies, setHasStudies] = useState(false)
  const [hasIvf, setHasIvf] = useState(false)
  const [hasFirstPreference, setHasFirstPreference] = useState(false)

  // Active year helpers
  const activeYear = yearsList[selectedYearIdx]
  const updateActiveYear = (updater: (y: typeof activeYear) => typeof activeYear) => {
    setYearsList((arr) => arr.map((it, i) => (i === selectedYearIdx ? updater(it) : it)))
  }

  const selectedFlow = useMemo(() => flows?.find((f) => f.id === selectedFlowId), [flows, selectedFlowId])
  const enabledKeys = useMemo(() => new Set<string>(selectedFlow?.flowCriteria?.map((fc) => fc.criterion.key) ?? []), [selectedFlow])
  const supportsSubstitute = useMemo(() => selectedFlow?.slug === 'metathesi' || selectedFlow?.slug === 'apospasi', [selectedFlow])
  const sumWeeklyHours = useMemo(() => (activeYear?.placements || []).reduce((sum, p) => sum + (p.weeklyHours ?? 0), 0), [activeYear])

  useEffect(() => {
    if (flows && flows.length && !selectedFlowId) {
      setSelectedFlowId(flows[0].id)
    }
  }, [flows, selectedFlowId])

  // Keep main year in sync with selected in list
  useEffect(() => {
    const y = yearsList[selectedYearIdx]?.year
    if (typeof y === 'number') setYear(y)
  }, [selectedYearIdx, yearsList])

  const addPlacement = () => {
    updateActiveYear((y) => ({
      ...y,
      placements: [...y.placements, { schoolName: '', months: 12, msd: 1, isPrison: false, weeklyHours: 23 }],
    }))
  }

  const computeClientSide = (): number => {
    if (!selectedFlow) return 0
    const configByKey = new Map<string, unknown>()
    for (const fc of selectedFlow.flowCriteria) {
      configByKey.set(fc.criterion.key, fc.config)
    }
    let points = 0
    const getCfg = (k: string): unknown => configByKey.get(k)
    if (hasMarriage) points += readNumber(getCfg('marriage'), 'points')
    for (let i = 1; i <= childrenCount; i++) {
      const c = getCfg('children')
      points += i === 1 ? readNumber(c, 'first') : i === 2 ? readNumber(c, 'second') : i === 3 ? readNumber(c, 'third') : readNumber(c, 'fourthPlus')
    }
    if (hasSynypiretisi) points += readNumber(getCfg('synypiretisi'), 'points')
    if (hasEntopiotita) points += readNumber(getCfg('entopiotita'), 'points')
    
    // Calculate total months from all years
    let totalMonths = 0
    for (const year of yearsList) {
      if (supportsSubstitute && year.isSubstitute) {
        // For substitute years, use substituteMonths
        totalMonths += year.substituteMonths
      } else {
        // For regular years, sum all placement months
        totalMonths += year.placements.reduce((sum, p) => sum + p.months, 0)
      }
    }
    
    // Apply flow-specific calculation (convert months to years)
    const perYearBase = readNumber(getCfg('proypiresia'), 'perYear')
    const totalYears = totalMonths / 12
    points += perYearBase * totalYears
    const dys = getCfg('dysprosita')
    const pris = getCfg('prisons')
    const msd = getCfg('msd')
    if (msd && activeYear) {
      for (const pl of activeYear.placements) {
        let val = pl.msd
        const threshold = readNumber(dys, 'threshold') || 10
        const isDys = pl.msd >= threshold
        if (isDys && readBoolean(dys, 'doublesMsd')) val *= 2
        const extra = readNumber(pris, 'extraMsd')
        if (pl.isPrison && extra) val += extra
        const monthsFactor = (supportsSubstitute && activeYear.isSubstitute) ? (activeYear.substituteMonths / 12) : (pl.months / 12)
        points += val * monthsFactor
      }
    }
    if (hasStudies) points += readNumber(getCfg('studies'), 'points')
    if (hasIvf) points += readNumber(getCfg('ivf'), 'points')
    if (hasFirstPreference) points += readNumber(getCfg('firstPreference'), 'points')
    return points
  }

  const total = computeClientSide()

  if (!mounted) return null

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Υπολογισμός Μορίων</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm">Ροή</span>
          <select value={selectedFlowId} onChange={(e) => setSelectedFlowId(e.target.value)} className="border rounded p-2">
            {flows?.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Κριτήρια (μια φορά) */}
      <section className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {enabledKeys.has('marriage') && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={hasMarriage} onChange={(e) => setHasMarriage(e.target.checked)} /> Γάμος</label>
          )}
          {enabledKeys.has('children') && (
            <label className="flex items-center gap-2">
              Παιδιά
              <input type="number" min={0} value={childrenCount} onChange={(e) => setChildrenCount(parseInt(e.target.value))} className="border rounded p-1 w-20" />
            </label>
          )}
          {enabledKeys.has('synypiretisi') && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={hasSynypiretisi} onChange={(e) => setHasSynypiretisi(e.target.checked)} /> Συνυπηρέτηση</label>
          )}
          {enabledKeys.has('entopiotita') && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={hasEntopiotita} onChange={(e) => setHasEntopiotita(e.target.checked)} /> Εντοπιότητα</label>
          )}



          {enabledKeys.has('studies') && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={hasStudies} onChange={(e) => setHasStudies(e.target.checked)} /> Σπουδές</label>
          )}
          {enabledKeys.has('ivf') && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={hasIvf} onChange={(e) => setHasIvf(e.target.checked)} /> Εξωσωματική</label>
          )}
          {enabledKeys.has('firstPreference') && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={hasFirstPreference} onChange={(e) => setHasFirstPreference(e.target.checked)} /> Πρώτη προτίμηση</label>
          )}
        </div>
      </section>

      {/* Διαχείριση Ετών (δυναμική λίστα) */}
      {selectedFlowId !== flows?.find(f => f.slug === 'neodioristos')?.id && (
        <section className="space-y-3">
                  <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="font-medium">Έτη εργασίας</div>
            {enabledKeys.has('proypiresia') && selectedFlowId !== flows?.find(f => f.slug === 'neodioristos')?.id && (
              <div className="text-xs text-gray-600">
                {(() => {
                  let totalMonths = 0
                  for (const year of yearsList) {
                    if (supportsSubstitute && year.isSubstitute) {
                      totalMonths += year.substituteMonths
                    } else {
                      totalMonths += year.placements.reduce((sum, p) => sum + p.months, 0)
                    }
                  }
                  const totalYears = totalMonths / 12
                  return totalMonths > 0 ? `Προϋπηρεσία: ${totalMonths}μ = ${totalYears.toFixed(1)}έτη` : null
                })()}
              </div>
            )}
          </div>
          <button
              type="button"
              className="px-3 py-1 rounded bg-black text-white"
              onClick={() => {
                              const next = {
                id: Math.random().toString(36).slice(2),
                year: (yearsList[yearsList.length - 1]?.year || new Date().getFullYear()) + 1,
                isSubstitute: false,
                totalWeeklyHours: 23,
                substituteMonths: 10,
                placements: [{ schoolName: '', months: 12, msd: 1, isPrison: false, weeklyHours: 23 }],
              }
                setYearsList((arr) => [...arr, next])
                setSelectedYearIdx(yearsList.length)
              }}
            >
              + Προσθήκη έτους
            </button>
          </div>
        <div className="space-y-2">
          {yearsList.map((y, idx) => {
            const isActive = idx === selectedYearIdx
            const duplicate = yearsList.filter((yy) => yy.year === y.year).length > 1
            const rowSum = (y.placements || []).reduce((sum, p) => sum + (p.weeklyHours || 0), 0)
            return (
              <div key={y.id} className={`border rounded p-3 space-y-3 ${isActive ? 'bg-black/[.03]' : ''}`}>
                <div className="flex items-center gap-3">
                  <button type="button" className={`px-2 py-1 rounded border ${isActive ? 'bg-black text-white' : ''}`} onClick={() => setSelectedYearIdx(idx)}>
                    Επιλογή
                  </button>
                  <label className="flex items-center gap-2">
                    Έτος
                    <input
                      type="number"
                      value={y.year}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0
                        setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, year: val } : it)))
                        if (isActive) setYear(val)
                      }}
                      className={`border rounded p-1 w-28 ${duplicate ? 'border-red-600' : ''}`}
                    />
                  </label>
                  {duplicate && <span className="text-sm text-red-700">Διπλότυπο έτος</span>}
                  <button
                    type="button"
                    className="ml-auto px-2 py-1 text-sm border rounded"
                    onClick={() => {
                      setYearsList((arr) => arr.filter((_, i) => i !== idx))
                      if (idx === selectedYearIdx) setSelectedYearIdx(0)
                    }}
                  >
                    Διαγραφή
                  </button>
                </div>

                {supportsSubstitute && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label className="flex items-center gap-2 md:col-span-1">
                      <input type="checkbox" checked={y.isSubstitute} onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, isSubstitute: e.target.checked } : it)))} /> Αναπληρωτής (έτος)
                    </label>
                    {y.isSubstitute && (
                      <>
                        <label className="flex items-center gap-2 md:col-span-1">
                          Συνολικές εβδομαδιαίες ώρες (ωράριο)
                          <input type="number" min={0} value={y.totalWeeklyHours} onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, totalWeeklyHours: parseInt(e.target.value) || 0 } : it)))} className="border rounded p-1 w-28" />
                        </label>
                        <label className="flex items-center gap-2 md:col-span-1">
                          Μήνες ως Αναπληρωτής
                          <input type="number" min={0} max={10} value={y.substituteMonths} onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, substituteMonths: parseInt(e.target.value) || 0 } : it)))} className="border rounded p-1 w-24" />
                        </label>
                        <div className={`text-sm md:col-span-3 ${rowSum === y.totalWeeklyHours ? 'text-green-700' : 'text-red-700'}`}>
                          Σύνολο ωρών από σχολεία: {rowSum} {rowSum === y.totalWeeklyHours ? '' : `(πρέπει να ισούται με ${y.totalWeeklyHours})`}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {(
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h2 className="font-medium">Σχολεία (έτος {y.year})</h2>
                      <button
                        type="button"
                        onClick={() => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, placements: [...it.placements, { schoolName: '', months: 12, msd: 1, isPrison: false, weeklyHours: 23 }] } : it)))}
                        className="px-3 py-1 rounded border"
                      >
                        + Σχολείο
                      </button>
                    </div>
                    <div className="space-y-3">
                      {y.placements.map((p, pIdx) => (
                        <div key={pIdx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                          <input className="border rounded p-2 md:col-span-2" placeholder="Σχολείο" value={p.schoolName} onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, placements: it.placements.map((pp, j) => (j === pIdx ? { ...pp, schoolName: e.target.value } : pp)) } : it)))} />
                          {y.isSubstitute && (
                            <label className="flex items-center gap-2">Ώρες/εβδ. <input type="number" min={0} value={p.weeklyHours ?? 0} onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, placements: it.placements.map((pp, j) => (j === pIdx ? { ...pp, weeklyHours: parseInt(e.target.value) || 0 } : pp)) } : it)))} className="border rounded p-1 w-24" /></label>
                          )}
                          <label className="flex items-center gap-2">ΜΣΔ <input type="number" min={1} max={14} value={p.msd} onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, placements: it.placements.map((pp, j) => (j === pIdx ? { ...pp, msd: parseInt(e.target.value) || 0 } : pp)) } : it)))} className="border rounded p-1 w-20" /></label>
                          <label className="flex items-center gap-2"><input type="checkbox" checked={p.isPrison} onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, placements: it.placements.map((pp, j) => (j === pIdx ? { ...pp, isPrison: e.target.checked } : pp)) } : it)))} /> Φυλακή</label>
                          <button type="button" className="px-2 py-1 text-sm border rounded" onClick={() => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, placements: it.placements.filter((_, j) => j !== pIdx) } : it)))}>Διαγραφή</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
      )}



      <div className="text-xl">Σύνολο μόρια: <span className="font-semibold">{total.toFixed(2)}</span></div>
    </main>
  )
}


