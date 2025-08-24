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
      isSubstitute: false,
      totalWeeklyHours: 23,
      substituteMonths: 10,
      placements: [{ schoolName: '', months: 12, msd: 1, isPrison: false, weeklyHours: 0 }],
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

  useEffect(() => {
    if (flows && flows.length && !selectedFlowId) {
      setSelectedFlowId(flows[0].id)
    }
  }, [flows, selectedFlowId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.dropdown-container')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Computed values
  const selectedFlow = useMemo(() => flows?.find((f) => f.id === selectedFlowId), [flows, selectedFlowId])
  const enabledKeys = useMemo(() => new Set<string>(selectedFlow?.flowCriteria?.map((fc) => fc.criterion.key) ?? []), [selectedFlow])
  const supportsSubstitute = useMemo(() => selectedFlow?.slug === 'metathesi' || selectedFlow?.slug === 'apospasi', [selectedFlow])

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
    <main className="max-w-4xl mx-auto p-6 space-y-8 bg-white rounded-lg shadow-sm">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Υπολογισμός Μορίων</h1>
        <p className="text-gray-600">Εκπαιδευτικοί Μεταθέσεις & Αποσπάσεις</p>
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
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
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
      {selectedFlow && (
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
                  onChange={(e) => setChildrenCount(parseInt(e.target.value) || 0)} 
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
      )}

      {/* Διαχείριση Ετών */}
      {selectedFlow && selectedFlow.slug !== 'neodioristos' && (
        <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Έτη Εργασίας</h2>
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
                  placements: [{ schoolName: '', months: 12, msd: 1, isPrison: false, weeklyHours: 0 }],
                }
                setYearsList((arr) => [...arr, next])
              }}
            >
              + Προσθήκη έτους
            </button>
          </div>
          
          <div className="space-y-2">
            {yearsList.map((y, idx) => (
              <div key={y.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold">#{idx + 1}</span>
                  <span className="font-medium">Έτος {y.year}</span>
                  <button
                    type="button"
                    className="px-3 py-1 text-sm border border-red-300 rounded-lg text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors font-medium"
                    onClick={() => setYearsList((arr) => arr.filter((_, i) => i !== idx))}
                  >
                    Διαγραφή
                  </button>
                </div>
                
                {/* Basic year info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700">Έτος</span>
                    <input
                      type="number"
                      value={y.year}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0
                        setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, year: val } : it)))
                      }}
                      className="border border-gray-300 rounded-lg p-2 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </label>
                  
                                     {supportsSubstitute && (
                     <label className="flex flex-col gap-2">
                       <span className="text-sm font-medium text-gray-700">Κατάσταση</span>
                       <div className="flex bg-gray-200 rounded-lg p-1">
                         <button
                           type="button"
                           onClick={() => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, isSubstitute: false } : it)))}
                           className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                             !y.isSubstitute 
                               ? 'bg-white text-gray-900 shadow-sm' 
                               : 'text-gray-600 hover:text-gray-900'
                           }`}
                         >
                           Μόνιμος
                         </button>
                         <button
                           type="button"
                           onClick={() => setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, isSubstitute: true } : it)))}
                           className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
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
                   
                   {supportsSubstitute && y.isSubstitute && (
                     <>
                       <label className="flex flex-col gap-2">
                         <span className="text-sm font-medium text-gray-700">Συνολικές εβδομαδιαίες ώρες (ωράριο)</span>
                         <input 
                           type="number" 
                           min={0} 
                           value={y.totalWeeklyHours} 
                           onChange={(e) => {
                             const newTotalHours = parseInt(e.target.value) || 0
                             setYearsList((arr) => arr.map((it, i) => (i === idx ? { ...it, totalWeeklyHours: newTotalHours } : it)))
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
                     </>
                   )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 text-center shadow-lg">
        <div className="text-2xl font-bold">Σύνολο Μορίων</div>
        <div className="text-4xl font-bold mt-2">0.00</div>
        <div className="text-blue-100 text-sm mt-1">μόρια</div>
      </div>
    </main>
  )
}