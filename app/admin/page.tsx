import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const flows = await prisma.flow.findMany({
    include: { flowCriteria: { include: { criterion: true } } },
    orderBy: { name: 'asc' },
  })
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin: Διαχείριση Ροών & Κριτηρίων</h1>
      <div className="space-y-4">
        {flows.map((f) => (
          <div key={f.id} className="border rounded p-4">
            <div className="font-medium">{f.name}</div>
            <ul className="mt-2 space-y-1">
              {f.flowCriteria.map((fc) => (
                <li key={fc.id} className="text-sm">
                  <span className="font-semibold">{fc.criterion.label}</span>{' '}
                  <span className="opacity-70">({fc.criterion.key})</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-sm opacity-70">Σημ.: Επεξεργασία τιμών θα προστεθεί επόμενο βήμα.</p>
    </main>
  )
}


