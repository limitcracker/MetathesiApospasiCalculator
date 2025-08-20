import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const flows = await prisma.flow.findMany({
    include: {
      flowCriteria: {
        include: { criterion: true },
      },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(flows)
}


