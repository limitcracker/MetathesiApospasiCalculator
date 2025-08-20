import { Criterion, Flow, FlowCriterion, PlacementEntry, PlacementGroup } from '@prisma/client'

export type FlowWithCriteria = Flow & { flowCriteria: (FlowCriterion & { criterion: Criterion })[] }

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

export function computePointsForGroup(
  flow: FlowWithCriteria,
  group: PlacementGroup & { placements: PlacementEntry[] }
): number {
  const configByKey = new Map<string, unknown>()
  for (const fc of flow.flowCriteria) {
    configByKey.set(fc.criterion.key, fc.config)
  }

  let points = 0

  const getConfig = (key: string): unknown => configByKey.get(key)

  if (group.hasMarriage) {
    const cfg = getConfig('marriage')
    points += readNumber(cfg, 'points')
  }

  if (group.childrenCount > 0) {
    const cfg = getConfig('children')
    const children = group.childrenCount
    for (let i = 1; i <= children; i += 1) {
      if (i === 1) points += readNumber(cfg, 'first')
      else if (i === 2) points += readNumber(cfg, 'second')
      else if (i === 3) points += readNumber(cfg, 'third')
      else points += readNumber(cfg, 'fourthPlus')
    }
  }

  if (group.hasSynypiretisi) {
    const cfg = getConfig('synypiretisi')
    points += readNumber(cfg, 'points')
  }

  if (group.hasEntopiotita) {
    const cfg = getConfig('entopiotita')
    points += readNumber(cfg, 'points')
  }

  // Calculate proypiresia from placements (months converted to years)
  const cfg = getConfig('proypiresia')
  if (cfg) {
    const perYear = readNumber(cfg, 'perYear')
    let totalMonths = 0
    
    // Sum all months from placements
    for (const placement of group.placements) {
      if (group.isSubstitute) {
        // For substitute teachers, use substituteMonths
        totalMonths += group.substituteMonths
      } else {
        // For regular teachers, use placement months
        totalMonths += placement.months
      }
    }
    
    const totalYears = totalMonths / 12
    points += totalYears * perYear
  }

  const dysConfig = getConfig('dysprosita')
  const prisonsCfg = getConfig('prisons')
  const msdCfg = getConfig('msd')
  if (msdCfg) {
    for (const pl of group.placements) {
      let msdPoints = pl.msd
      const threshold = readNumber(dysConfig, 'threshold') || 10
      const isDysprosito = pl.msd >= threshold
      if (isDysprosito && readBoolean(dysConfig, 'doublesMsd')) {
        msdPoints *= 2
      }
      const extra = readNumber(prisonsCfg, 'extraMsd')
      if (pl.isPrison && extra) {
        msdPoints += extra
      }
      points += msdPoints * (pl.months / 12)
    }
  }

  if (group.hasStudies) {
    const cfg = getConfig('studies')
    points += readNumber(cfg, 'points')
  }

  if (group.hasIvf) {
    const cfg = getConfig('ivf')
    points += readNumber(cfg, 'points')
  }

  if (group.hasFirstPreference) {
    const cfg = getConfig('firstPreference')
    points += readNumber(cfg, 'points')
  }

  return points
}


