import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const groups = await prisma.placementGroup.findMany({
    orderBy: [{ year: 'desc' }],
    include: { flow: { select: { name: true, slug: true } } },
  })
  return NextResponse.json(groups)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // Enforce unique (flowId, year)
  const exists = await prisma.placementGroup.findFirst({ where: { flowId: body.flowId, year: body.year } })
  if (exists) {
    return NextResponse.json({ error: 'Έτος υπάρχει ήδη για τη ροή' }, { status: 409 })
  }
  const group = await prisma.placementGroup.create({ data: body })
  return NextResponse.json(group)
}


