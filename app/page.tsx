import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-3xl font-semibold">Μεταθέσεις / Αποσπάσεις - Υπολογισμός Μορίων</h1>
        <div className="flex gap-4 justify-center">
          <Link href="/calculator" className="px-4 py-2 rounded bg-black text-white">Υπολογισμός</Link>
          <Link href="/admin" className="px-4 py-2 rounded border">Admin</Link>
        </div>
      </div>
    </main>
  )
}
