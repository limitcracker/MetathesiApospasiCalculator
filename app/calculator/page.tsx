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
  // const [year, setYear] = useState<number>(new Date().getFullYear()) // Unused
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
  
  // Accordion state for expanded years
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set(['y0']))

  // Active year helpers
  const activeYear = yearsList[selectedYearIdx]
  // const updateActiveYear = (updater: (y: typeof activeYear) => typeof activeYear) => {
  //   setYearsList((arr) => arr.map((it, i) => (i === selectedYearIdx ? updater(it) : it)))
  // } // Unused function

  const selectedFlow = useMemo(() => flows?.find((f) => f.id === selectedFlowId), [flows, selectedFlowId])
  const enabledKeys = useMemo(() => new Set<string>(selectedFlow?.flowCriteria?.map((fc) => fc.criterion.key) ?? []), [selectedFlow])
  const supportsSubstitute = useMemo(() => selectedFlow?.slug === 'metathesi' || selectedFlow?.slug === 'apospasi', [selectedFlow])
  // const sumWeeklyHours = useMemo(() => (activeYear?.placements || []).reduce((sum, p) => sum + (p.weeklyHours ?? 0), 0), [activeYear]) // Unused

  useEffect(() => {
    if (flows && flows.length && !selectedFlowId) {
      setSelectedFlowId(flows[0].id)
    }
  }, [flows, selectedFlowId])

  // Keep main year in sync with selected in list
  // useEffect(() => {
  //   const y = yearsList[selectedYearIdx]?.year
  //   if (typeof y === 'number') setYear(y)
  // }, [selectedYearIdx, yearsList]) // Unused since setYear is unused

  // const addPlacement = () => {
  //   updateActiveYear((y) => ({
  //     ...y,
  //     placements: [...y.placements, { schoolName: '', months: 12, msd: 1, isPrison: false, weeklyHours: 23 }],
  //   }))
  // } // Unused function

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
    
    // Calculate total months from all years (skip for Flow 1 - Νεοδιόριστος)
    if (selectedFlowId !== flows?.find(f => f.slug === 'neodioristos')?.id) {
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
      
      const totalYears = totalMonths / 12
      
      // Apply flow-specific calculation based on flow type
      if (selectedFlow?.slug === 'metathesi') {
        // Ροή 2: total working months / 12 * 2.5
        points += totalYears * 2.5
      } else if (selectedFlow?.slug === 'apospasi') {
        // Ροή 3: different multipliers based on years
        if (totalYears <= 10) {
          // Years 1-10: multiplier = 1
          points += totalYears * 1
        } else if (totalYears <= 20) {
          // Years 11-20: multiplier = 1.5
          points += totalYears * 1.5
        } else {
          // Years 20+: multiplier = 2
          points += totalYears * 2
        }
      } else {
        // Default calculation for other flows
        const perYearBase = readNumber(getCfg('proypiresia'), 'perYear')
        points += perYearBase * totalYears
      }
    }
    const dys = getCfg('dysprosita')
    const pris = getCfg('prisons')
    const msd = getCfg('msd')
    if (msd) {
      // Calculate MSD points for all years
      for (const year of yearsList) {
        if (supportsSubstitute && year.isSubstitute) {
          // For substitute teachers, calculate partition based on weekly hours
          const totalWeeklyHours = year.totalWeeklyHours
          for (const pl of year.placements) {
            let val = pl.msd
            const threshold = readNumber(dys, 'threshold') || 10
            const isDys = pl.msd >= threshold
            if (isDys && readBoolean(dys, 'doublesMsd')) val *= 2
            const extra = readNumber(pris, 'extraMsd')
            if (pl.isPrison && extra) val += extra
            
            // Calculate partition: (school weekly hours / total weekly hours) * MSD * substitute months / 12
            const schoolWeeklyHours = pl.weeklyHours || 0
            const partition = (schoolWeeklyHours / totalWeeklyHours) * val * (year.substituteMonths / 12)
            points += partition
          }
        } else {
          // For regular teachers, use the original calculation
          for (const pl of year.placements) {
            let val = pl.msd
            const threshold = readNumber(dys, 'threshold') || 10
            const isDys = pl.msd >= threshold
            if (isDys && readBoolean(dys, 'doublesMsd')) val *= 2
            const extra = readNumber(pris, 'extraMsd')
            if (pl.isPrison && extra) val += extra
            const monthsFactor = pl.months / 12
            points += val * monthsFactor
          }
        }
      }
    }
    if (hasStudies) points += readNumber(getCfg('studies'), 'points')
    if (hasIvf) points += readNumber(getCfg('ivf'), 'points')
    if (hasFirstPreference) points += readNumber(getCfg('firstPreference'), 'points')
    return points
  }

  // Calculate total by summing individual year MSD points plus one-time criteria and προϋπηρεσία
  const total = yearsList.reduce((sum, year) => sum + computeYearPoints(year), 0) + 
    // Add one-time criteria points
    (() => {
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
      if (hasStudies) points += readNumber(getCfg('studies'), 'points')
      if (hasIvf) points += readNumber(getCfg('ivf'), 'points')
      if (hasFirstPreference) points += readNumber(getCfg('firstPreference'), 'points')
      
      // Add προϋπηρεσία points (calculated once for total experience)
      if (selectedFlowId !== flows?.find(f => f.slug === 'neodioristos')?.id) {
        let totalMonths = 0
        for (const year of yearsList) {
          if (supportsSubstitute && year.isSubstitute) {
            totalMonths += year.substituteMonths
          } else {
            totalMonths += year.placements.reduce((sum, p) => sum + p.months, 0)
          }
        }
        
        const totalYears = totalMonths / 12
        
        // Apply flow-specific calculation based on flow type
        if (selectedFlow?.slug === 'metathesi') {
          // Ροή 2: total working months / 12 * 2.5
          points += totalYears * 2.5
        } else if (selectedFlow?.slug === 'apospasi') {
          // Ροή 3: different multipliers based on years
          if (totalYears <= 10) {
            // Years 1-10: multiplier = 1
            points += totalYears * 1
          } else if (totalYears <= 20) {
            // Years 11-20: multiplier = 1.5
            points += totalYears * 1.5
          } else {
            // Years 20+: multiplier = 2
            points += totalYears * 2
          }
        } else {
          // Default calculation for other flows
          const perYearBase = readNumber(getCfg('proypiresia'), 'perYear')
          points += perYearBase * totalYears
        }
      }
      
      return points
    })()

  // Export functionality
  const exportData = () => {
    const data = {
      selectedFlowId,
      yearsList,
      hasMarriage,
      childrenCount,
      hasSynypiretisi,
      hasEntopiotita,
      hasStudies,
      hasIvf,
      hasFirstPreference,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metathesi-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Import functionality
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        // Validate data structure
        if (data.version && data.yearsList && Array.isArray(data.yearsList)) {
          setSelectedFlowId(data.selectedFlowId || '')
          setYearsList(data.yearsList)
          setHasMarriage(data.hasMarriage || false)
          setChildrenCount(data.childrenCount || 0)
          setHasSynypiretisi(data.hasSynypiretisi || false)
          setHasEntopiotita(data.hasEntopiotita || false)
          setHasStudies(data.hasStudies || false)
          setHasIvf(data.hasIvf || false)
          setHasFirstPreference(data.hasFirstPreference || false)
          
          // Auto-expand the first year if any exist
          if (data.yearsList.length > 0) {
            setExpandedYears(new Set([data.yearsList[0].id]))
          }
          
          alert('Δεδομένα εισήχθησαν επιτυχώς!')
        } else {
          alert('Μη έγκυρο αρχείο δεδομένων.')
        }
      } catch (error) {
        alert('Σφάλμα κατά την ανάγνωση του αρχείου.')
      }
    }
    reader.readAsText(file)
    
    // Reset the input so the same file can be selected again
    event.target.value = ''
  }

  // Function to calculate points for a single year
  const computeYearPoints = (year: typeof yearsList[0]): number => {
    if (!selectedFlow) return 0
    const configByKey = new Map<string, unknown>()
    for (const fc of selectedFlow.flowCriteria) {
      configByKey.set(fc.criterion.key, fc.config)
    }
    let points = 0
    const getCfg = (k: string): unknown => configByKey.get(k)
    
    // Calculate MSD points for this year only
    const dys = getCfg('dysprosita')
    const pris = getCfg('prisons')
    const msd = getCfg('msd')
    if (msd) {
      if (supportsSubstitute && year.isSubstitute) {
        // For substitute teachers, calculate partition based on weekly hours
        const totalWeeklyHours = year.totalWeeklyHours
        for (const pl of year.placements) {
          let val = pl.msd
          const threshold = readNumber(dys, 'threshold') || 10
          const isDys = pl.msd >= threshold
          if (isDys && readBoolean(dys, 'doublesMsd')) val *= 2
          const extra = readNumber(pris, 'extraMsd')
          if (pl.isPrison && extra) val += extra
          
          // Calculate partition: (school weekly hours / total weekly hours) * MSD * substitute months / 12
          const schoolWeeklyHours = pl.weeklyHours || 0
          const partition = (schoolWeeklyHours / totalWeeklyHours) * val * (year.substituteMonths / 12)
          points += partition
        }
      } else {
        // For regular teachers, use the original calculation
        for (const pl of year.placements) {
          let val = pl.msd
          const threshold = readNumber(dys, 'threshold') || 10
          const isDys = pl.msd >= threshold
          if (isDys && readBoolean(dys, 'doublesMsd')) val *= 2
          const extra = readNumber(pris, 'extraMsd')
          if (pl.isPrison && extra) val += extra
          const monthsFactor = pl.months / 12
          points += val * monthsFactor
        }
      }
    }
    
         // Note: προϋπηρεσία points are calculated only once for total experience, not per year
     // This function only calculates MSD points for individual years
    
    return points
  }

  if (!mounted) return null

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8 bg-white rounded-lg shadow-sm">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Υπολογισμός Μορίων</h1>
        <p className="text-gray-600">Εκπαιδευτικοί Μεταθέσεις & Αποσπάσεις</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <label className="flex flex-col gap-2 flex-1">
            <span className="text-sm font-semibold text-blue-900">Επιλογή Ροής</span>
            <select 
              value={selectedFlowId} 
              onChange={(e) => setSelectedFlowId(e.target.value)} 
              className="border border-blue-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {flows?.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Εξαγωγή
            </button>
            
            <label className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Εισαγωγή
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Κριτήρια (μια φορά) */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Κριτήρια (Μια Φορά)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enabledKeys.has('marriage') && (
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={hasMarriage} 
                onChange={(e) => setHasMarriage(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-medium text-gray-900">Γάμος</span>
            </label>
          )}
          {enabledKeys.has('children') && (
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <span className="font-medium text-gray-900">Παιδιά:</span>
                             <input 
                 type="number" 
                 min={0} 
                 value={childrenCount} 
                 onChange={(e) => setChildrenCount(parseInt(e.target.value))} 
                 className="border border-gray-300 rounded-lg p-2 w-20 text-center text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               />
            </label>
          )}
          {enabledKeys.has('synypiretisi') && (
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={hasSynypiretisi} 
                onChange={(e) => setHasSynypiretisi(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-medium text-gray-900">Συνυπηρέτηση</span>
            </label>
          )}
          {enabledKeys.has('entopiotita') && (
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={hasEntopiotita} 
                onChange={(e) => setHasEntopiotita(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-medium text-gray-900">Εντοπιότητα</span>
            </label>
          )}
          {enabledKeys.has('studies') && (
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={hasStudies} 
                onChange={(e) => setHasStudies(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-medium text-gray-900">Σπουδές</span>
            </label>
          )}
          {enabledKeys.has('ivf') && (
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={hasIvf} 
                onChange={(e) => setHasIvf(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-medium text-gray-900">Εξωσωματική</span>
            </label>
          )}
          {enabledKeys.has('firstPreference') && (
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={hasFirstPreference} 
                onChange={(e) => setHasFirstPreference(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-medium text-gray-900">Πρώτη προτίμηση</span>
            </label>
          )}
        </div>
      </section>

      {/* Διαχείριση Ετών (δυναμική λίστα) */}
      {selectedFlowId !== flows?.find(f => f.slug === 'neodioristos')?.id && (
        <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">Έτη Εργασίας</h2>
              {enabledKeys.has('proypiresia') && selectedFlowId !== flows?.find(f => f.slug === 'neodioristos')?.id && (
                <div className="text-sm text-blue-700 bg-blue-100 px-3 py-1 rounded-full font-medium">
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
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
              onClick={() => {
                const nextId = Math.random().toString(36).slice(2)
                const next = {
                  id: nextId,
                  year: (yearsList[yearsList.length - 1]?.year || new Date().getFullYear()) + 1,
                  isSubstitute: false,
                  totalWeeklyHours: 23,
                  substituteMonths: 10,
                  placements: [{ schoolName: '', months: 12, msd: 1, isPrison: false, weeklyHours: 23 }],
                }
                setYearsList((arr) => [...arr, next])
                setSelectedYearIdx(yearsList.length)
                // Auto-expand only the new year (collapse others)
                setExpandedYears(new Set([nextId]))
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
            const isExpanded = expandedYears.has(y.id)
            
            return (
              <div key={y.id} className={`border border-gray-200 rounded-lg overflow-hidden ${isActive ? 'ring-2 ring-blue-500' : ''} bg-white shadow-sm`}>
                {/* Accordion Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                  <button 
                    type="button" 
                    className="flex items-center gap-3 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    onClick={() => {
                      if (isExpanded) {
                        // If already expanded, collapse it
                        setExpandedYears(new Set())
                      } else {
                        // If collapsed, expand only this one (collapse others)
                        setExpandedYears(new Set([y.id]))
                      }
                    }}
                  >
                    <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold">#{idx + 1}</span>
                    <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                    <span>Έτος {y.year}</span>
                    {duplicate && <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">Διπλότυπο</span>}
                  </button>
                  
                  <div className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {computeYearPoints(y).toFixed(1)} μόρια
                  </div>
                  
                  <button
                    type="button"
                    className="ml-auto px-3 py-1 text-sm border border-red-300 rounded-lg text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors font-medium"
                    onClick={() => {
                      setYearsList((arr) => arr.filter((_, i) => i !== idx))
                      if (idx === selectedYearIdx) setSelectedYearIdx(0)
                      // Remove from expanded set
                      const newExpanded = new Set(expandedYears)
                      newExpanded.delete(y.id)
                      setExpandedYears(newExpanded)
                    }}
                  >
                    Διαγραφή
                  </button>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="p-6 space-y-6 bg-gray-50">
                    {/* Year Input */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">Έτος:</span>
                                                  <input
                            type="number"
                            value={y.year}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0
                              setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, year: val } : it)))
                            }}
                            className={`border border-gray-300 rounded-lg p-2 w-32 text-center text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${duplicate ? 'border-red-500 ring-red-200' : ''}`}
                          />
                      </label>
                    </div>

                    {/* Substitute Teacher Fields */}
                    {supportsSubstitute && (
                      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                        <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">Αναπληρωτής Εκπαιδευτικός</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={y.isSubstitute} 
                              onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, isSubstitute: e.target.checked } : it)))}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="font-medium text-gray-900">Αναπληρωτής (έτος)</span>
                          </label>
                          {y.isSubstitute && (
                            <>
                              <label className="flex flex-col gap-2">
                                <span className="text-sm font-medium text-gray-700">Συνολικές εβδομαδιαίες ώρες (ωράριο)</span>
                                                                 <input 
                                   type="number" 
                                   min={0} 
                                   value={y.totalWeeklyHours} 
                                   onChange={(e) => {
                                     const newTotalHours = parseInt(e.target.value) || 0
                                     
                                     // If this is a substitute teacher and we have schools, redistribute hours
                                     if (y.isSubstitute && newTotalHours > 0 && y.placements.length > 0) {
                                       const hoursPerSchool = Math.floor(newTotalHours / y.placements.length)
                                       const extraHours = newTotalHours % y.placements.length
                                       
                                       const updatedPlacements = y.placements.map((placement, index) => ({
                                         ...placement,
                                         weeklyHours: hoursPerSchool + (index < extraHours ? 1 : 0)
                                       }))
                                       
                                       setYearsList((arr) => arr.map((it, i) => (i === idx ? { 
                                         ...it, 
                                         totalWeeklyHours: newTotalHours,
                                         placements: updatedPlacements 
                                       } : it)))
                                     } else {
                                       setYearsList((arr) => arr.map((it, i) => (i === idx ? { 
                                         ...it, 
                                         totalWeeklyHours: newTotalHours 
                                       } : it)))
                                     }
                                   }} 
                                   className="border border-gray-300 rounded-lg p-2 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                 />
                              </label>
                              <label className="flex flex-col gap-2">
                                <span className="text-sm font-medium text-gray-700">Μήνες ως Αναπληρωτής</span>
                                                                 <input 
                                   type="number" 
                                   min={0} 
                                   max={10} 
                                   value={y.substituteMonths} 
                                   onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, substituteMonths: parseInt(e.target.value) || 0 } : it)))} 
                                   className="border border-gray-300 rounded-lg p-2 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                 />
                              </label>
                              <div className={`text-sm p-3 rounded-lg border ${rowSum === y.totalWeeklyHours ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                                Σύνολο ωρών από σχολεία: <span className="font-semibold">{rowSum}</span> 
                                {rowSum === y.totalWeeklyHours ? '' : ` (πρέπει να ισούται με ${y.totalWeeklyHours})`}
                              </div>
                              
                              {/* Show partition calculation breakdown */}
                              {rowSum === y.totalWeeklyHours && y.totalWeeklyHours > 0 && (
                                <div className="text-sm p-3 rounded-lg border border-blue-200 bg-blue-50">
                                  <div className="font-semibold text-blue-900 mb-2">Υπολογισμός Μορίων ανά Σχολείο:</div>
                                  {y.placements.map((pl, plIdx) => {
                                    const schoolWeeklyHours = pl.weeklyHours || 0
                                    const partition = (schoolWeeklyHours / y.totalWeeklyHours) * pl.msd * (y.substituteMonths / 12)
                                    return (
                                      <div key={plIdx} className="text-blue-800 mb-1">
                                        <span className="font-medium">{pl.schoolName || `Σχολείο ${plIdx + 1}`}:</span>
                                        <span className="ml-2">
                                          ({schoolWeeklyHours}/{y.totalWeeklyHours} × {pl.msd} × {y.substituteMonths}/12) = {partition.toFixed(2)} μόρια
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Schools Section */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <h3 className="font-semibold text-gray-900">Σχολεία (έτος {y.year})</h3>
                        <button
                          type="button"
                          onClick={() => {
                            // Calculate remaining hours for substitute teachers
                            let newWeeklyHours = 23 // default value
                            if (y.isSubstitute && y.totalWeeklyHours > 0) {
                              const currentTotalHours = y.placements.reduce((sum, p) => sum + (p.weeklyHours || 0), 0)
                              const remainingHours = y.totalWeeklyHours - currentTotalHours
                              newWeeklyHours = Math.max(0, remainingHours)
                            }
                            
                            setYearsList((arr) => arr.map((it, i) => (i === idx ? { 
                              ...it, 
                              placements: [...it.placements, { 
                                schoolName: '', 
                                months: 12, 
                                msd: 1, 
                                isPrison: false, 
                                weeklyHours: newWeeklyHours 
                              }] 
                            } : it)))
                          }}
                          className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors shadow-sm"
                        >
                          + Σχολείο
                        </button>
                      </div>
                      <div className="space-y-3">
                        {y.placements.map((p, pIdx) => (
                          <div key={pIdx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3 md:col-span-2">
                              <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold">#{pIdx + 1}</span>
                              <input 
                                className="border border-gray-300 rounded-lg p-2 flex-1 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                placeholder="Όνομα σχολείου" 
                                value={p.schoolName} 
                                onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, placements: it.placements.map((pp, j) => (j === pIdx ? { ...pp, schoolName: e.target.value } : pp)) } : it)))} 
                              />
                            </div>
                            {y.isSubstitute && (
                              <label className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Ώρες/εβδ.</span>
                                                                 <input 
                                   type="number" 
                                   min={0} 
                                   value={p.weeklyHours ?? 0} 
                                   onChange={(e) => {
                                     const newHours = parseInt(e.target.value) || 0
                                     const updatedPlacements = y.placements.map((pp, j) => 
                                       j === pIdx ? { ...pp, weeklyHours: newHours } : pp
                                     )
                                     
                                     // If this is a substitute teacher and we have more than one school, 
                                     // automatically distribute remaining hours to the last school
                                     if (y.isSubstitute && y.totalWeeklyHours > 0 && updatedPlacements.length > 1) {
                                       const currentTotalHours = updatedPlacements.reduce((sum, p) => sum + (p.weeklyHours || 0), 0)
                                       const remainingHours = y.totalWeeklyHours - currentTotalHours
                                       
                                       if (remainingHours >= 0) {
                                         // Distribute remaining hours to the last school
                                         const lastIndex = updatedPlacements.length - 1
                                         updatedPlacements[lastIndex] = {
                                           ...updatedPlacements[lastIndex],
                                           weeklyHours: remainingHours
                                         }
                                       }
                                     }
                                     
                                     setYearsList((arr) => arr.map((it, i) => (i === idx ? { 
                                       ...it, 
                                       placements: updatedPlacements 
                                     } : it)))
                                   }} 
                                   className="border border-gray-300 rounded-lg p-2 w-20 text-center text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                 />
                              </label>
                            )}
                                                         <label className="flex items-center gap-2">
                               <span className="text-sm font-bold text-blue-900">ΜΣΔ</span>
                               <input 
                                 type="number" 
                                 min={1} 
                                 max={14} 
                                 value={p.msd} 
                                 onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, placements: it.placements.map((pp, j) => (j === pIdx ? { ...pp, msd: parseInt(e.target.value) || 0 } : pp)) } : it)))} 
                                 className="border border-gray-300 rounded-lg p-2 w-20 text-center text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                               />
                             </label>
                            <label className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={p.isPrison} 
                                onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, placements: it.placements.map((pp, j) => (j === pIdx ? { ...pp, isPrison: e.target.checked } : pp)) } : it)))}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-700">Φυλακή</span>
                            </label>
                            <button 
                              type="button" 
                              className="px-3 py-2 text-sm border border-red-300 rounded-lg text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors font-medium" 
                              onClick={() => {
                                // Remove the school
                                const newPlacements = y.placements.filter((_, j) => j !== pIdx)
                                
                                // If this is a substitute teacher and we have remaining schools, redistribute hours
                                if (y.isSubstitute && y.totalWeeklyHours > 0 && newPlacements.length > 0) {
                                  const remainingHours = y.totalWeeklyHours
                                  const hoursPerSchool = Math.floor(remainingHours / newPlacements.length)
                                  const extraHours = remainingHours % newPlacements.length
                                  
                                  const updatedPlacements = newPlacements.map((placement, index) => ({
                                    ...placement,
                                    weeklyHours: hoursPerSchool + (index < extraHours ? 1 : 0)
                                  }))
                                  
                                  setYearsList((arr) => arr.map((it, i) => (i === idx ? { 
                                    ...it, 
                                    placements: updatedPlacements 
                                  } : it)))
                                } else {
                                  setYearsList((arr) => arr.map((it, i) => (i === idx ? { 
                                    ...it, 
                                    placements: newPlacements 
                                  } : it)))
                                }
                              }}
                            >
                              Διαγραφή
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
      )}



      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 text-center shadow-lg">
        <div className="text-2xl font-bold">Σύνολο Μορίων</div>
        <div className="text-4xl font-bold mt-2">{total.toFixed(2)}</div>
        <div className="text-blue-100 text-sm mt-1">μορία</div>
      </div>
    </main>
  )
}


