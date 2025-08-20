import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type GroupInput = {
  year: number
  flowId: string
  hasMarriage?: boolean
  childrenCount?: number
  hasSynypiretisi?: boolean
  hasEntopiotita?: boolean
  hasStudies?: boolean
  hasIvf?: boolean
  hasFirstPreference?: boolean
  isSubstitute?: boolean
  totalWeeklyHours?: number
  substituteMonths?: number
}

export async function POST(req: NextRequest) {
  const items = (await req.json()) as GroupInput[]
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'Expected an array of groups' }, { status: 400 })
  }
  const results: Array<{ year: number; status: 'created' | 'exists' | 'error'; message?: string; id?: string }> = []
  for (const item of items) {
    try {
      const exists = await prisma.placementGroup.findFirst({ where: { flowId: item.flowId, year: item.year } })
      if (exists) {
        results.push({ year: item.year, status: 'exists', id: exists.id })
        continue
      }
      const created = await prisma.placementGroup.create({ data: item })
      results.push({ year: item.year, status: 'created', id: created.id })
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'unknown'
      results.push({ year: item.year, status: 'error', message: errorMessage })
    }
  }
  return NextResponse.json({ results })
}