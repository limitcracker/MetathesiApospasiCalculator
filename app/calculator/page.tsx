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
  const { data: flows, error, isLoading } = useSWR<FlowSummary[]>("/api/flows", fetcher)
  const [selectedFlowId, setSelectedFlowId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)
  
  // Basic state for the calculator
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
      isSubstitute: false, // Default to Μόνιμος
      totalWeeklyHours: 23,
      substituteMonths: 10,
      placements: [{ schoolName: '', months: 12, msd: 1, isPrison: false, weeklyHours: 23 }], // Set to totalWeeklyHours for regular teachers
    },
  ])
  
  // One-time criteria state
  const [hasMarriage, setHasMarriage] = useState(false)
  const [childrenCount, setChildrenCount] = useState(0)
  const [hasSynypiretisi, setHasSynypiretisi] = useState(false)
  const [hasEntopiotita, setHasEntopiotita] = useState(false)
  const [hasStudies, setHasStudies] = useState(false)
  const [hasIvf, setHasIvf] = useState(false)
  const [hasFirstPreference, setHasFirstPreference] = useState(false)
  const [expandedYearId, setExpandedYearId] = useState<string | null>(null)
  const [showUpcomingModal, setShowUpcomingModal] = useState(false)

  useEffect(() => {
    if (flows && flows.length && !selectedFlowId) {
      setSelectedFlowId(flows[0].id)
    }
  }, [flows, selectedFlowId])

  // Ensure weekly hours are set correctly for regular teachers with single school
  useEffect(() => {
    setYearsList(currentList => 
      currentList.map(year => {
        if (!year.isSubstitute && year.placements.length === 1) {
          // For regular teachers with single school, set weekly hours to total hours
          const updatedPlacements = year.placements.map(placement => ({
            ...placement,
            weeklyHours: year.totalWeeklyHours
          }))
          return { ...year, placements: updatedPlacements }
        }
        return year
      })
    )
  }, [])

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.dropdown-container')) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen])

  // Computed values
  const selectedFlow = useMemo(() => flows?.find((f) => f.id === selectedFlowId), [flows, selectedFlowId])
  const enabledKeys = useMemo(() => new Set<string>(selectedFlow?.flowCriteria?.map((fc) => fc.criterion.key) ?? []), [selectedFlow])
  const supportsSubstitute = useMemo(() => selectedFlow?.slug === 'metathesi' || selectedFlow?.slug === 'apospasi', [selectedFlow])

  // Function to check if there are at least 2 consecutive years with MSD >= 10 (for μόνιμος teachers only)
  const hasConsecutiveYearsWithHighMSD = (year: typeof yearsList[0]): boolean => {
    // Only apply to μόνιμος teachers
    if (year.isSubstitute) return false
    
    // Check if current year has high MSD (ALL placements must have MSD >= 10)
    const currentYearHasHighMSD = year.placements.length > 0 && year.placements.every(p => p.msd >= 10)
    if (!currentYearHasHighMSD) return false
    
    // Count how many μόνιμος years have high MSD (excluding the current year)
    let highMSDCount = 0
    
    for (const checkYear of yearsList) {
      // Skip the current year and substitute years
      if (checkYear.id === year.id || checkYear.isSubstitute) {
        continue
      }
      
      // Check if this year has high MSD
      const hasHighMSD = checkYear.placements.length > 0 && checkYear.placements.every(p => p.msd >= 10)
      if (hasHighMSD) {
        highMSDCount++
      }
    }
    
    // Need at least 1 other μόνιμος year with high MSD (plus current year = 2 total)
    return highMSDCount >= 1
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
          // Substitute teachers DO get x2 MSD points for MSD 10-14 (even in single year)
          const msdMultiplier = (pl.msd >= 10 && pl.msd <= 14) ? 2 : 1
          const partition = (schoolWeeklyHours / totalWeeklyHours) * val * msdMultiplier * (year.substituteMonths / 12)
          points += partition
        }
      } else {
        // For regular teachers, calculate weighted MSD points based on weekly hours
        const totalWeeklyHours = year.placements.reduce((sum, p) => sum + (p.weeklyHours || 0), 0)
        
        // Check if there are at least 2 consecutive years with MSD 10-14
        const hasConsecutiveHighMSD = hasConsecutiveYearsWithHighMSD(year)
        
        // Check if ALL schools in this year have MSD >= 10 (for x2 multiplier)
        const allSchoolsHaveHighMSD = year.placements.length > 0 && year.placements.every(p => p.msd >= 10)
        
        // Calculate weighted MSD points for each placement
        for (const pl of year.placements) {
          let val = pl.msd
          const threshold = readNumber(dys, 'threshold') || 10
          const isDys = pl.msd >= threshold
          if (isDys && readBoolean(dys, 'doublesMsd')) val *= 2
          const extra = readNumber(pris, 'extraMsd')
          if (pl.isPrison && extra) val += extra
          
          // Calculate weighted MSD: (school weekly hours / total weekly hours) * MSD
          const schoolWeeklyHours = pl.weeklyHours || 0
          const weightedMsd = totalWeeklyHours > 0 ? (schoolWeeklyHours / totalWeeklyHours) * val : val
          
          // Apply x2 multiplier if ALL schools have MSD >= 10 AND consecutive years condition is met
          const msdMultiplier = (allSchoolsHaveHighMSD && hasConsecutiveHighMSD) ? 2 : 1
          const monthsFactor = 12 / 12 // Always 12 months for regular teachers
          points += weightedMsd * msdMultiplier * monthsFactor
        }
      }
    }
    
    return points
  }

  // Calculate total points
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
      if (flows && selectedFlowId !== flows.find(f => f.slug === 'neodioristos')?.id) {
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
          
          alert('Δεδομένα εισήχθησαν επιτυχώς!')
        } else {
          alert('Μη έγκυρο αρχείο δεδομένων.')
        }
      } catch {
        alert('Σφάλμα κατά την ανάγνωση του αρχείου.')
      }
    }
    reader.readAsText(file)
    
    // Reset the input so the same file can be selected again
    event.target.value = ''
  }

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 bg-white rounded-lg shadow-sm">
      <div className="text-center space-y-4 relative">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Υπολογισμός Μορίων</h1>
        <p className="text-sm sm:text-base text-gray-600">Εκπαιδευτικοί Μεταθέσεις & Αποσπάσεις</p>
        <button
          onClick={() => setShowUpcomingModal(true)}
          className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Προσεχείς λειτουργίες & Σχετικά με τον προγραμματιστή"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <label className="flex flex-col gap-2 flex-1">
            <span className="text-sm font-semibold text-blue-900">Επιλογή Ροής</span>
            <div className="relative dropdown-container">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className="w-full border border-blue-300 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 text-left flex justify-between items-center"
              >
                <span>
                  {isLoading ? 'Φόρτωση...' : 
                   error ? 'Σφάλμα φόρτωσης' :
                   flows?.find(f => f.id === selectedFlowId)?.name || 'Επιλέξτε ροή'}
                </span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isOpen && flows && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto dropdown-container">
                  {flows.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSelectedFlowId(f.id)
                        setIsOpen(false)
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-gray-900"
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={exportData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Εξαγωγή
            </button>
            
            <label className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm">
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
      {selectedFlow && (
        <section className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Κριτήρια (Μια Φορά)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
              <label className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <span className="font-medium text-gray-900">Παιδιά:</span>
                <input 
                  type="number" 
                  min={0} 
                  value={childrenCount} 
                  onChange={(e) => setChildrenCount(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="border border-gray-300 rounded-lg p-2 w-full sm:w-20 text-center text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      )}

      {/* Διαχείριση Ετών */}
      {selectedFlow && selectedFlow.slug !== 'neodioristos' && (
        <section className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Έτη Εργασίας</h2>
              {(() => {
                let totalMonths = 0
                for (const year of yearsList) {
                  if (supportsSubstitute && year.isSubstitute) {
                    totalMonths += year.substituteMonths
                  } else {
                    totalMonths += year.placements.reduce((sum, p) => sum + p.months, 0)
                  }
                }
                const totalYears = Math.floor(totalMonths / 12)
                const remainingMonths = totalMonths % 12
                return (
                  <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    {totalYears > 0 && `${totalYears} έτη`}
                    {totalYears > 0 && remainingMonths > 0 && ' '}
                    {remainingMonths > 0 && `${remainingMonths} μήνες`}
                    {totalYears === 0 && remainingMonths === 0 && '0 μήνες'}
                  </span>
                )
              })()}
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
                                     onClick={() => {
                         const nextId = Math.random().toString(36).slice(2)
                         let nextYear = (yearsList[yearsList.length - 1]?.year || new Date().getFullYear()) + 1
                         
                         // Find the next available year
                         while (yearsList.some(y => y.year === nextYear)) {
                           nextYear++
                         }
                         
                         const next = {
                           id: nextId,
                           year: nextYear,
                           isSubstitute: false, // Default to Μόνιμος
                           totalWeeklyHours: 23,
                           substituteMonths: 10,
                           placements: [{ schoolName: '', months: 12, msd: 1, isPrison: false, weeklyHours: 0 }], // Always has at least one school
                         }
                         setYearsList((arr) => [...arr, next])
                       }}
            >
              + Προσθήκη έτους
            </button>
          </div>
          
          <div className="space-y-2">
            {yearsList.map((y, idx) => (
              <div key={y.id} className="border border-gray-200 rounded-lg bg-white shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold flex-shrink-0">#{idx + 1}</span>
                    <span className="font-medium text-gray-900 flex-shrink-0">Έτος {y.year}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm text-gray-600 break-words">
                      ({(() => {
                        // Calculate MSD points only
                        if (!selectedFlow) return '0.00'
                        const configByKey = new Map<string, unknown>()
                        for (const fc of selectedFlow.flowCriteria) {
                          configByKey.set(fc.criterion.key, fc.config)
                        }
                        let msdPoints = 0
                        const getCfg = (k: string): unknown => configByKey.get(k)
                        
                        const dys = getCfg('dysprosita')
                        const pris = getCfg('prisons')
                        const msd = getCfg('msd')
                        if (msd) {
                          if (supportsSubstitute && y.isSubstitute) {
                            const totalWeeklyHours = y.totalWeeklyHours
                            for (const pl of y.placements) {
                              let val = pl.msd
                              const threshold = readNumber(dys, 'threshold') || 10
                              const isDys = pl.msd >= threshold
                              if (isDys && readBoolean(dys, 'doublesMsd')) val *= 2
                              const extra = readNumber(pris, 'extraMsd')
                              if (pl.isPrison && extra) val += extra
                              
                              const schoolWeeklyHours = pl.weeklyHours || 0
                              // Substitute teachers DO get x2 MSD points for MSD 10-14 (even in single year)
                              const msdMultiplier = (pl.msd >= 10 && pl.msd <= 14) ? 2 : 1
                              const partition = (schoolWeeklyHours / totalWeeklyHours) * val * msdMultiplier * (y.substituteMonths / 12)
                              msdPoints += partition
                            }
                          } else {
                            // For regular teachers, calculate weighted MSD points based on weekly hours
                            const totalWeeklyHours = y.placements.reduce((sum, p) => sum + (p.weeklyHours || 0), 0)
                            
                            // Check if there are at least 2 consecutive years with MSD 10-14
                            const hasConsecutiveHighMSD = hasConsecutiveYearsWithHighMSD(y)
                            
                            // Check if ALL schools in this year have MSD >= 10 (for x2 multiplier)
                            const allSchoolsHaveHighMSD = y.placements.length > 0 && y.placements.every(p => p.msd >= 10)
                            

                            
                            // Calculate weighted MSD points for each placement
                            for (const pl of y.placements) {
                              let val = pl.msd
                              const threshold = readNumber(dys, 'threshold') || 10
                              const isDys = pl.msd >= threshold
                              if (isDys && readBoolean(dys, 'doublesMsd')) val *= 2
                              const extra = readNumber(pris, 'extraMsd')
                              if (pl.isPrison && extra) val += extra
                              
                              // Calculate weighted MSD: (school weekly hours / total weekly hours) * MSD
                              const schoolWeeklyHours = pl.weeklyHours || 0
                              const weightedMsd = totalWeeklyHours > 0 ? (schoolWeeklyHours / totalWeeklyHours) * val : val
                              
                              // Apply x2 multiplier if ALL schools have MSD >= 10 AND consecutive years condition is met
                              const msdMultiplier = (allSchoolsHaveHighMSD && hasConsecutiveHighMSD) ? 2 : 1
                              const monthsFactor = 12 / 12 // Always 12 months for regular teachers
                              msdPoints += weightedMsd * msdMultiplier * monthsFactor
                            }
                          }
                        }
                        
                        // Calculate duration points for this year only (not total experience)
                        let durationPoints = 0
                        if (flows && selectedFlowId !== flows.find(f => f.slug === 'neodioristos')?.id) {
                          let yearMonths = 0
                          if (supportsSubstitute && y.isSubstitute) {
                            yearMonths = y.substituteMonths
                          } else {
                            yearMonths = y.placements.reduce((sum, p) => sum + p.months, 0) // Sum all placement months
                          }
                          
                          const yearYears = yearMonths / 12
                          
                          if (selectedFlow?.slug === 'metathesi') {
                            durationPoints = yearYears * 2.5
                          } else if (selectedFlow?.slug === 'apospasi') {
                            if (yearYears <= 10) {
                              durationPoints = yearYears * 1
                            } else if (yearYears <= 20) {
                              durationPoints = yearYears * 1.5
                            } else {
                              durationPoints = yearYears * 2
                            }
                          } else {
                            const perYearBase = readNumber(getCfg('proypiresia'), 'perYear')
                            durationPoints = perYearBase * yearYears
                          }
                        }
                        
                        const totalYearPoints = msdPoints + durationPoints
                        return `${msdPoints.toFixed(2)} ΜΣΔ + ${durationPoints.toFixed(2)} ΠΡΟΫΠ = ${totalYearPoints.toFixed(2)} μόρια`
                      })()})
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const newYear = {
                          ...y,
                          id: Math.random().toString(36).slice(2),
                          year: y.year + 1,
                          placements: y.placements.map(p => ({ ...p, schoolName: '' }))
                        }
                        setYearsList((arr) => {
                          const newArr = [...arr]
                          newArr.splice(idx + 1, 0, newYear)
                          return newArr
                        })
                        setExpandedYearId(newYear.id)
                      }}
                      className="px-2 py-1 text-xs border border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors font-medium whitespace-nowrap"
                      title="Διπλασιασμός έτους"
                    >
                      Διπλ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (idx > 0) {
                          setYearsList((arr) => {
                            const newArr = [...arr]
                            const temp = newArr[idx]
                            newArr[idx] = newArr[idx - 1]
                            newArr[idx - 1] = temp
                            return newArr
                          })
                        }
                      }}
                      disabled={idx === 0}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Μετακίνηση πάνω"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (idx < yearsList.length - 1) {
                          setYearsList((arr) => {
                            const newArr = [...arr]
                            const temp = newArr[idx]
                            newArr[idx] = newArr[idx + 1]
                            newArr[idx + 1] = temp
                            return newArr
                          })
                        }
                      }}
                      disabled={idx === yearsList.length - 1}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Μετακίνηση κάτω"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs border border-red-300 rounded-lg text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors font-medium whitespace-nowrap"
                      onClick={() => setYearsList((arr) => arr.filter((_, i) => i !== idx))}
                    >
                      Διαγραφή
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedYearId(expandedYearId === y.id ? null : y.id)}
                      className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <svg 
                        className={`w-5 h-5 transition-transform ${expandedYearId === y.id ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {expandedYearId === y.id && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                
                                {/* Basic year info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Έτος</span>
                    <input
                      type="number"
                      value={y.year}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0
                        // Check if year already exists
                        const yearExists = yearsList.some((year, i) => i !== idx && year.year === val)
                        if (!yearExists) {
                          setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, year: val } : it)))
                        }
                      }}
                      className={`border rounded-lg p-2 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full ${
                        yearsList.some((year, i) => i !== idx && year.year === y.year) 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-300'
                      }`}
                    />
                  </label>
                  
                  {supportsSubstitute && (
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">Κατάσταση</span>
                      <div className="flex bg-gray-200 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, isSubstitute: false } : it)))}
                          className={`flex-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            !y.isSubstitute 
                              ? 'bg-white text-gray-900 shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Μόνιμος
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setYearsList((arr) => arr.map((it, i) => {
                              if (i === idx) {
                                // When switching to substitute, set the first school's weekly hours to total hours
                                const updatedPlacements = it.placements.map((p, pIdx) => 
                                  pIdx === 0 ? { ...p, weeklyHours: it.totalWeeklyHours } : p
                                )
                                return { ...it, isSubstitute: true, placements: updatedPlacements }
                              }
                              return it
                            }))
                          }}
                          className={`flex-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            y.isSubstitute 
                              ? 'bg-white text-gray-900 shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Αναπληρωτής
                        </button>
                      </div>
                    </label>
                  )}
                  
                  {/* Total Weekly Hours - Show for substitute OR for regular teachers with multiple schools */}
                  {(supportsSubstitute && y.isSubstitute) || (!y.isSubstitute && y.placements.length > 1) ? (
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">Συνολικές ώρες</span>
                      <input 
                        type="number" 
                        min={0} 
                        value={y.totalWeeklyHours} 
                        onChange={(e) => {
                          const newTotalHours = parseInt(e.target.value) || 0
                          setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, totalWeeklyHours: newTotalHours } : it)))
                        }}
                        onFocus={(e) => e.target.select()}
                        className="border border-gray-300 rounded-lg p-2 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      />
                    </label>
                  ) : null}
                  
                  {/* Months - Show for substitute teachers only */}
                  {supportsSubstitute && y.isSubstitute && (
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">Μήνες</span>
                      <input 
                        type="number" 
                        min={0} 
                        max={10} 
                        value={y.substituteMonths} 
                        onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, substituteMonths: parseInt(e.target.value) || 0 } : it)))}
                        onFocus={(e) => e.target.select()}
                        className="border border-gray-300 rounded-lg p-2 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                      />
                    </label>
                  )}
                  
                  {/* Months display for regular teachers (fixed at 12) */}
                  {!y.isSubstitute && (
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">Μήνες</span>
                      <div className="border border-gray-300 rounded-lg p-2 text-gray-900 font-medium bg-gray-50 w-full">
                        12
                      </div>
                    </label>
                  )}
                </div>
                 
                 {/* Schools Section */}
                 <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                   <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                     <h3 className="font-semibold text-gray-900">Σχολεία (έτος {y.year})</h3>
                     <button
                       type="button"
                       onClick={() => {
                         // Calculate remaining weekly hours for this year
                         const usedHours = y.placements.reduce((sum, p) => sum + (p.weeklyHours || 0), 0)
                         const remainingHours = y.totalWeeklyHours - usedHours
                         
                         setYearsList((arr) => arr.map((it, i) => (i === idx ? { 
                           ...it, 
                           placements: [...it.placements, { 
                             schoolName: '', 
                             months: 12, 
                             msd: 1, 
                             isPrison: false, 
                             weeklyHours: (y.isSubstitute || y.placements.length > 0) ? (y.placements.length === 0 ? y.totalWeeklyHours : Math.max(0, remainingHours)) : 0 
                           }] 
                         } : it)))
                       }}
                       className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors shadow-sm"
                     >
                       + Σχολείο
                     </button>
                   </div>
                   
                   {/* No Schools Warning */}
                   {y.placements.length === 0 && (
                     <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                       <div className="flex items-center gap-2">
                         <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                         </svg>
                         <span className="text-sm font-medium text-red-800">
                           Προσοχή: Απαιτείται τουλάχιστον ένα σχολείο για τον υπολογισμό των ΜΣΔ μορίων
                         </span>
                       </div>
                     </div>
                   )}
                   
                   {/* Weekly Hours Validation Warning */}
                   {(y.isSubstitute || (!y.isSubstitute && y.placements.length > 1)) && y.placements.length > 0 && (() => {
                     const totalSchoolHours = y.placements.reduce((sum, p) => sum + (p.weeklyHours || 0), 0)
                     const difference = y.totalWeeklyHours - totalSchoolHours
                     if (Math.abs(difference) > 0.1) {
                       return (
                         <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                           <div className="flex items-center gap-2">
                             <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                               <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                             </svg>
                             <span className="text-sm font-medium text-yellow-800">
                               Προσοχή: Το άθροισμα των ωρών ({totalSchoolHours}) δεν ταιριάζει με τις συνολικές ώρες ({y.totalWeeklyHours})
                               {difference > 0 ? ` (λείπουν ${difference.toFixed(1)} ώρες)` : ` (περισσεύουν ${Math.abs(difference).toFixed(1)} ώρες)`}
                             </span>
                           </div>
                         </div>
                       )
                     }
                     return null
                   })()}
                   
                   <div className="space-y-3">
                     {y.placements.map((p, pIdx) => (
                       <div key={pIdx} className="flex flex-col gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                         <div className="flex items-center gap-3 min-w-0 w-full">
                           <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold flex-shrink-0">#{pIdx + 1}</span>
                           <input 
                             className="border border-gray-300 rounded-lg p-2 flex-1 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-0 text-gray-900" 
                             placeholder="Όνομα σχολείου" 
                             value={p.schoolName} 
                             onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, placements: it.placements.map((pp, j) => (j === pIdx ? { ...pp, schoolName: e.target.value } : pp)) } : it)))} 
                           />
                         </div>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full">
                           {(y.isSubstitute || (!y.isSubstitute && y.placements.length > 1)) && (
                             <label className="flex flex-col gap-1">
                               <span className="text-sm font-medium text-gray-700">Ώρες/εβδ.</span>
                               <input 
                                 type="number" 
                                 min={0} 
                                 value={p.weeklyHours ?? 0} 
                                 onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, placements: it.placements.map((pp, j) => (j === pIdx ? { ...pp, weeklyHours: parseInt(e.target.value) || 0 } : pp)) } : it)))}
                                 onFocus={(e) => e.target.select()}
                                 className="border border-gray-300 rounded-lg p-2 text-center text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                               />
                             </label>
                           )}
                           
                           <label className="flex flex-col gap-1">
                             <span className="text-sm font-bold text-blue-900">ΜΣΔ</span>
                             <input 
                               type="number" 
                               min={1} 
                               max={14} 
                               value={p.msd} 
                               onChange={(e) => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, placements: it.placements.map((pp, j) => (j === pIdx ? { ...pp, msd: parseInt(e.target.value) || 0 } : pp)) } : it)))}
                               onFocus={(e) => e.target.select()}
                               className="border border-gray-300 rounded-lg p-2 text-center text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
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
                             className={`px-2 py-2 text-xs border rounded-lg transition-colors font-medium whitespace-nowrap ${
                               y.placements.length === 1 
                                 ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                                 : 'border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400'
                             }`}
                             onClick={() => {
                               if (y.placements.length > 1) {
                                 setYearsList((arr) => arr.map((it, i) => (i === idx ? { 
                                   ...it, 
                                   placements: it.placements.filter((_, j) => j !== pIdx) 
                                 } : it)))
                               }
                             }}
                             disabled={y.placements.length === 1}
                             title={y.placements.length === 1 ? "Απαιτείται τουλάχιστον ένα σχολείο" : "Διαγραφή σχολείου"}
                           >
                             Διαγραφή
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                   
                   {/* Weekly Hours Summary */}
                   {(y.isSubstitute || (!y.isSubstitute && y.placements.length > 1)) && (
                     <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm">
                         <span className="font-medium text-gray-700">Σύνολο ωρών σχολείων:</span>
                         <span className="font-bold text-gray-900">
                           {Math.round(y.placements.reduce((sum, p) => sum + (p.weeklyHours || 0), 0))} / {y.totalWeeklyHours}
                         </span>
                       </div>
                     </div>
                   )}
                 </div>
                  </div>
                )}
              </div>
            ))}
           </div>
         </section>
       )}

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-4 sm:p-6 text-center shadow-lg">
        <div className="text-xl sm:text-2xl font-bold">Σύνολο Μορίων</div>
        <div className="text-3xl sm:text-4xl font-bold mt-2">{total.toFixed(2)}</div>
        <div className="text-blue-100 text-sm mt-1">μόρια</div>
        <div className="text-blue-100 text-sm mt-2">
          {(() => {
            // Calculate total MSD points
            let totalMsdPoints = 0
            for (const year of yearsList) {
              if (!selectedFlow) continue
              const configByKey = new Map<string, unknown>()
              for (const fc of selectedFlow.flowCriteria) {
                configByKey.set(fc.criterion.key, fc.config)
              }
              const getCfg = (k: string): unknown => configByKey.get(k)
              
              const dys = getCfg('dysprosita')
              const pris = getCfg('prisons')
              const msd = getCfg('msd')
              if (msd) {
                if (supportsSubstitute && year.isSubstitute) {
                  const totalWeeklyHours = year.totalWeeklyHours
                  for (const pl of year.placements) {
                    let val = pl.msd
                    const threshold = readNumber(dys, 'threshold') || 10
                    const isDys = pl.msd >= threshold
                    if (isDys && readBoolean(dys, 'doublesMsd')) val *= 2
                    const extra = readNumber(pris, 'extraMsd')
                    if (pl.isPrison && extra) val += extra
                    
                    const schoolWeeklyHours = pl.weeklyHours || 0
                    // For substitute teachers, no consecutive year requirement for MSD 10-14
                    const msdMultiplier = (pl.msd >= 10 && pl.msd <= 14) ? 2 : 1
                    const partition = (schoolWeeklyHours / totalWeeklyHours) * val * msdMultiplier * (year.substituteMonths / 12)
                    totalMsdPoints += partition
                  }
                } else {
                  // For regular teachers, calculate weighted MSD points based on weekly hours
                  const totalWeeklyHours = year.placements.reduce((sum, p) => sum + (p.weeklyHours || 0), 0)
                  
                  // Check if there are at least 2 consecutive years with MSD 10-14
                  const hasConsecutiveHighMSD = hasConsecutiveYearsWithHighMSD(year)
                  
                  // Check if ALL schools in this year have MSD >= 10 (for x2 multiplier)
                  const allSchoolsHaveHighMSD = year.placements.length > 0 && year.placements.every(p => p.msd >= 10)
                  

                  
                  // Calculate weighted MSD points for each placement
                  for (const pl of year.placements) {
                    let val = pl.msd
                    const threshold = readNumber(dys, 'threshold') || 10
                    const isDys = pl.msd >= threshold
                    if (isDys && readBoolean(dys, 'doublesMsd')) val *= 2
                    const extra = readNumber(pris, 'extraMsd')
                    if (pl.isPrison && extra) val += extra
                    
                    // Calculate weighted MSD: (school weekly hours / total weekly hours) * MSD
                    const schoolWeeklyHours = pl.weeklyHours || 0
                    const weightedMsd = totalWeeklyHours > 0 ? (schoolWeeklyHours / totalWeeklyHours) * val : val
                    
                    // Apply x2 multiplier if ALL schools have MSD >= 10 AND consecutive years condition is met
                    const msdMultiplier = (allSchoolsHaveHighMSD && hasConsecutiveHighMSD) ? 2 : 1
                    const monthsFactor = 12 / 12 // Always 12 months for regular teachers
                    totalMsdPoints += weightedMsd * msdMultiplier * monthsFactor
                  }
                }
              }
            }
            
                         // Calculate total duration points
             let totalDurationPoints = 0
             if (flows && selectedFlowId !== flows.find(f => f.slug === 'neodioristos')?.id && selectedFlow) {
              let totalMonths = 0
              for (const year of yearsList) {
                if (supportsSubstitute && year.isSubstitute) {
                  totalMonths += year.substituteMonths
                } else {
                  totalMonths += year.placements.reduce((sum, p) => sum + p.months, 0)
                }
              }
              
              const totalYears = totalMonths / 12
              
              if (selectedFlow && selectedFlow.slug === 'metathesi') {
                totalDurationPoints = totalYears * 2.5
              } else if (selectedFlow && selectedFlow.slug === 'apospasi') {
                if (totalYears <= 10) {
                  totalDurationPoints = totalYears * 1
                } else if (totalYears <= 20) {
                  totalDurationPoints = totalYears * 1.5
                } else {
                  totalDurationPoints = totalYears * 2
                }
              } else {
                const configByKey = new Map<string, unknown>()
                for (const fc of selectedFlow.flowCriteria) {
                  configByKey.set(fc.criterion.key, fc.config)
                }
                const getCfg = (k: string): unknown => configByKey.get(k)
                const perYearBase = readNumber(getCfg('proypiresia'), 'perYear')
                totalDurationPoints = perYearBase * totalYears
              }
            }
            
            return `= ${totalMsdPoints.toFixed(2)} ΜΣΔ + ${totalDurationPoints.toFixed(2)} ΠΡΟΫΠ`
          })()}
        </div>
      </div>

      {/* Upcoming Features Modal */}
      {showUpcomingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Προσεχείς λειτουργίες</h2>
              <button
                onClick={() => setShowUpcomingModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h3 className="font-medium text-blue-900 mb-2">🚀 Προσεχείς λειτουργίες</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Εξαγωγή σε PDF</li>
                  <li>• Αυτόματη αναζήτηση Σχολείου → ΜΣΔ</li>
                  <li>• Ωρομίσθιοι</li>
                  <li>• Καλύτερο Web Mobile UI/UX</li>
                  <li>• Εισαγωγή στοιχείων από το teachers.minedu.gov.gr</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h3 className="font-medium text-gray-900 mb-2">👨‍💻 Σχετικά με τον προγραμματιστή</h3>
                <p className="text-sm text-gray-700">
                  Αυτή η εφαρμογή αναπτύχθηκε από τον <a href="https://giftakis.gr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Γυφτάκη Ιωάννη ΠΕ86</a> για να βοηθήσει τους εκπαιδευτικούς 
                  στον υπολογισμό των μορίων για μεταθέσεις και αποσπάσεις.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Εκδόσεις: v1.1<br/>
                  <a href="https://github.com/limitcracker/MetathesiApospasiCalculator" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                    Github repo 🔗
                  </a>
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowUpcomingModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}