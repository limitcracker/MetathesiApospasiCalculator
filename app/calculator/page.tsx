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

  // Debug logging
  console.log('Flows data:', flows)
  console.log('Selected flow ID:', selectedFlowId)
  console.log('Is loading:', isLoading)
  console.log('Error:', error)

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
        </div>
        
        {/* Debug info */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <div><strong>Debug Info:</strong></div>
          <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
          <div>Error: {error ? 'Yes' : 'No'}</div>
          <div>Flows count: {flows?.length || 0}</div>
          <div>Selected ID: {selectedFlowId}</div>
          <div>Available flows: {flows?.map(f => f.name).join(', ') || 'None'}</div>
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