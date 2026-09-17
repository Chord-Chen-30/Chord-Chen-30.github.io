export interface VillainEntry {
  id: string
  name: string
  alias: string
  threat: 1 | 2 | 3 | 4 | 5
  notes: string
  lastSeen: string
}

export const villains: VillainEntry[] = [
  {
    id: 'v1',
    name: 'Otto O.',
    alias: 'Doc Arms',
    threat: 5,
    notes: 'Four mechanical limbs. Prefers labs and bridges. Do not engage alone.',
    lastSeen: 'Brooklyn waterfront',
  },
  {
    id: 'v2',
    name: 'Flint M.',
    alias: 'Sandstorm',
    threat: 4,
    notes: 'Can reform from particulate matter. Vacuum trucks oddly useful.',
    lastSeen: 'Construction site, Queens',
  },
  {
    id: 'v3',
    name: 'Max D.',
    alias: 'Electro',
    threat: 4,
    notes: 'Power grid anomalies precede appearances. Rubber soles recommended.',
    lastSeen: 'Substation near Times Square',
  },
  {
    id: 'v4',
    name: 'Adrian T.',
    alias: 'Winged One',
    threat: 3,
    notes: 'Aerial ambushes. Watch rooftops and museum roofs.',
    lastSeen: 'Metropolitan Museum vicinity',
  },
  {
    id: 'v5',
    name: 'Cletus K.',
    alias: 'Symbiote?',
    threat: 5,
    notes: 'Unconfirmed black-suit residue. Treat every rumor seriously.',
    lastSeen: 'Unknown',
  },
  {
    id: 'v6',
    name: 'Herman S.',
    alias: 'Shocker',
    threat: 2,
    notes: 'Vibro-gauntlets. Loud, obvious, still dangerous in alleys.',
    lastSeen: 'Financial District',
  },
]
