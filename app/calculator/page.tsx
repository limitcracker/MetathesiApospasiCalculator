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
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
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

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 text-center shadow-lg">
        <div className="text-2xl font-bold">Σύνολο Μορίων</div>
        <div className="text-4xl font-bold mt-2">0.00</div>
        <div className="text-blue-100 text-sm mt-1">μόρια</div>
      </div>
    </main>
  )
}