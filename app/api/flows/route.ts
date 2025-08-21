import { NextResponse } from 'next/server'

// Static flow data for deployment without database
const staticFlows = [
  {
    id: 'flow-1',
    name: 'Νεοδιόριστος (1η χρονιά)',
    slug: 'neodioristos',
    flowCriteria: [
      { criterion: { key: 'marriage', label: 'Γάμος / Σύμφωνο συμβίωσης / Χηρεία' }, config: { points: 4 } },
      { criterion: { key: 'children', label: 'Τέκνα' }, config: { first: 4, second: 4, third: 6, fourthPlus: 7 } },
      { criterion: { key: 'synypiretisi', label: 'Συνυπηρέτηση' }, config: { points: 4 } },
      { criterion: { key: 'entopiotita', label: 'Εντοπιότητα' }, config: { points: 2 } },
      { criterion: { key: 'proypiresia', label: 'Προϋπηρεσία (έτη)' }, config: { perYear: 2 } },
    ]
  },
  {
    id: 'flow-2',
    name: 'Μετάθεση / Οριστική Τοποθέτηση',
    slug: 'metathesi',
    flowCriteria: [
      { criterion: { key: 'marriage', label: 'Γάμος / Σύμφωνο συμβίωσης / Χηρεία' }, config: { points: 4 } },
      { criterion: { key: 'children', label: 'Τέκνα' }, config: { first: 4, second: 4, third: 6, fourthPlus: 7 } },
      { criterion: { key: 'synypiretisi', label: 'Συνυπηρέτηση' }, config: { points: 4 } },
      { criterion: { key: 'entopiotita', label: 'Εντοπιότητα' }, config: { points: 2 } },
      { criterion: { key: 'proypiresia', label: 'Προϋπηρεσία (έτη)' }, config: { perYear: 2.5 } },
      { criterion: { key: 'msd', label: 'Συνθήκες Διαβίωσης (ΜΣΔ)' }, config: { perYear: true } },
      { criterion: { key: 'dysprosita', label: 'Δυσπρόσιτα' }, config: { doublesMsd: true, threshold: 10 } },
      { criterion: { key: 'prisons', label: 'Κατάστημα Κράτησης / Φυλακές' }, config: { extraMsd: 5 } },
      { criterion: { key: 'firstPreference', label: 'Πρώτη Προτίμηση' }, config: { points: 2 } },
    ]
  },
  {
    id: 'flow-3',
    name: 'Απόσπαση',
    slug: 'apospasi',
    flowCriteria: [
      { criterion: { key: 'marriage', label: 'Γάμος / Σύμφωνο συμβίωσης / Χηρεία' }, config: { points: 4 } },
      { criterion: { key: 'children', label: 'Τέκνα' }, config: { first: 5, second: 6, third: 8, fourthPlus: 10 } },
      { criterion: { key: 'synypiretisi', label: 'Συνυπηρέτηση' }, config: { points: 4 } },
      { criterion: { key: 'entopiotita', label: 'Εντοπιότητα' }, config: { points: 2 } },
      { criterion: { key: 'proypiresia', label: 'Προϋπηρεσία (έτη)' }, config: { perYear: 2 } },
      { criterion: { key: 'studies', label: 'Σπουδές' }, config: { points: 2 } },
      { criterion: { key: 'ivf', label: 'Εξωσωματική' }, config: { points: 3 } },
    ]
  }
]

export async function GET() {
  return NextResponse.json(staticFlows)
}


