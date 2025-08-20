import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const group = await prisma.placementGroup.findUnique({
    where: { id },
    include: { placements: true, flow: { include: { flowCriteria: { include: { criterion: true } } } } },
  })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(group)
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await req.json()
  const group = await prisma.placementGroup.update({
    where: { id },
    data: body,
  })
  return NextResponse.json(group)
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  await prisma.placementGroup.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}


