import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const criteriaDefinitions = [
    { key: 'marriage', label: 'Γάμος / Σύμφωνο συμβίωσης / Χηρεία' },
    { key: 'children', label: 'Τέκνα' },
    { key: 'synypiretisi', label: 'Συνυπηρέτηση' },
    { key: 'entopiotita', label: 'Εντοπιότητα' },
    { key: 'proypiresia', label: 'Προϋπηρεσία (έτη)' },
    { key: 'msd', label: 'Συνθήκες Διαβίωσης (ΜΣΔ)' },
    { key: 'dysprosita', label: 'Δυσπρόσιτα' },
    { key: 'prisons', label: 'Κατάστημα Κράτησης / Φυλακές' },
    { key: 'studies', label: 'Σπουδές' },
    { key: 'ivf', label: 'Εξωσωματική' },
    { key: 'firstPreference', label: 'Πρώτη Προτίμηση' },
  ]

  for (const c of criteriaDefinitions) {
    await prisma.criterion.upsert({
      where: { key: c.key },
      update: { label: c.label },
      create: { key: c.key, label: c.label },
    })
  }

  const flows = [
    {
      slug: 'neodioristos',
      name: 'Νεοδιόριστος (1η χρονιά)',
      description: 'Ροή 1',
      criteria: {
        marriage: { points: 4 },
        children: { first: 4, second: 4, third: 6, fourthPlus: 7 },
        synypiretisi: { points: 4 },
        entopiotita: { points: 2 },
        proypiresia: { perYear: 2 },
        msd: { perYear: true },
      },
      enabledKeys: ['marriage', 'children', 'synypiretisi', 'entopiotita', 'proypiresia'],
    },
    {
      slug: 'metathesi',
      name: 'Μετάθεση / Οριστική Τοποθέτηση',
      description: 'Ροή 2',
      criteria: {
        marriage: { points: 4 },
        children: { first: 4, second: 4, third: 6, fourthPlus: 7 },
        synypiretisi: { points: 4 },
        entopiotita: { points: 2 },
        proypiresia: { perYear: 2.5 },
        msd: { perYear: true },
        dysprosita: { doublesMsd: true, threshold: 10 },
        prisons: { extraMsd: 5 },
        firstPreference: { points: 2 },
      },
      enabledKeys: [
        'marriage',
        'children',
        'synypiretisi',
        'entopiotita',
        'proypiresia',
        'msd',
        'dysprosita',
        'prisons',
        'firstPreference',
      ],
    },
    {
      slug: 'apospasi',
      name: 'Απόσπαση',
      description: 'Ροή 3',
      criteria: {
        marriage: { points: 4 },
        children: { first: 5, second: 6, third: 8, fourthPlus: 10 },
        synypiretisi: { points: 4 },
        entopiotita: { points: 2 },
        proypiresia: { perYear: 2 },
        studies: { points: 2 },
        ivf: { points: 3 },
      },
      enabledKeys: [
        'marriage',
        'children',
        'synypiretisi',
        'entopiotita',
        'proypiresia',
        'studies',
        'ivf',
      ],
    },
  ]

  for (const flowDef of flows) {
    const flow = await prisma.flow.upsert({
      where: { slug: flowDef.slug },
      update: { name: flowDef.name, description: flowDef.description ?? null },
      create: { slug: flowDef.slug, name: flowDef.name, description: flowDef.description ?? null },
    })

    // Attach criteria with config (only for enabled keys)
    for (const key of flowDef.enabledKeys as readonly string[]) {
      const criterion = await prisma.criterion.findUniqueOrThrow({ where: { key } })
      const config = (flowDef as any).criteria[key]
      await prisma.flowCriterion.upsert({
        where: { flowId_criterionId: { flowId: flow.id, criterionId: criterion.id } },
        update: { enabled: flowDef.enabledKeys.includes(key), config },
        create: {
          flowId: flow.id,
          criterionId: criterion.id,
          enabled: flowDef.enabledKeys.includes(key),
          config,
        },
      })
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })


