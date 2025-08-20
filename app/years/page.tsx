"use client"
import Link from 'next/link'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Group = {
  id: string
  year: number
  flowId: string
  isSubstitute: boolean
  substituteMonths: number
  flow?: {
    name: string
  }
}

export default function YearsPage() {
  const { data: groups, mutate } = useSWR<Group[]>('/api/groups', fetcher)

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Έτη</h1>
      <div className="space-y-2">
        {groups?.map((g: Group) => (
          <div key={g.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{g.year} <span className="opacity-70">— {g.flow?.name || g.flowId}</span></div>
              <div className="text-sm opacity-70 flex gap-2">
                <span>{g.isSubstitute ? 'Αναπληρωτής' : 'Μόνιμος'}</span>
                {g.isSubstitute && <span>{g.substituteMonths} μήνες</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/api/groups/${g.id}`} className="text-sm underline">JSON</Link>
              <button
                className="text-sm px-2 py-1 border rounded"
                onClick={async () => {
                  if (!confirm(`Διαγραφή έτους ${g.year};`)) return
                  await fetch(`/api/groups/${g.id}`, { method: 'DELETE' })
                  mutate()
                }}
              >
                Διαγραφή
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Link href="/calculator" className="px-3 py-2 rounded bg-black text-white">+ Νέο έτος</Link>
        <Link href="/" className="px-3 py-2 rounded border">Αρχική</Link>
      </div>
    </main>
  )
}