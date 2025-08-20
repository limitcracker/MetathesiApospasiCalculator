import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const placement = await prisma.placementEntry.create({ data: body })
  return NextResponse.json(placement)
}


