import { v4 as uuid } from 'uuid'
import type { ClinicalGrade, DrugBag, StaffMember, StockItem } from '../types'
import { controlledMedsForGrade, medsForGrade } from './formulary'

function lot() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return `${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}${Math.floor(1000 + Math.random() * 9000)}`
}

function expiry(monthsAhead: number) {
  const d = new Date()
  d.setMonth(d.getMonth() + monthsAhead)
  return d.toISOString().slice(0, 10)
}

function buildItems(grade: ClinicalGrade, controlledOnly: boolean): StockItem[] {
  const defs = controlledOnly
    ? controlledMedsForGrade(grade as 'Paramedic' | 'AP')
    : medsForGrade(grade, false)

  return defs.map((m, i) => ({
    id: uuid(),
    medicationId: m.id,
    name: m.name,
    presentation: m.presentation,
    quantity: m.defaultQty,
    parLevel: m.defaultQty,
    lotNumber: lot(),
    expiryDate: expiry(6 + (i % 18)),
    controlled: m.controlled,
    schedule: m.schedule,
    unit: m.unit,
  }))
}

function seal() {
  return `SL-${Math.floor(100000 + Math.random() * 900000)}`
}

export const STAFF: StaffMember[] = [
  {
    id: 'mgmt-1',
    name: 'Claire Byrne',
    grade: 'AP',
    role: 'management',
    pin: '9999',
    pheccNumber: 'MGMT-001',
  },
  {
    id: 'mgmt-2',
    name: 'Tom Fitzgerald',
    grade: 'Paramedic',
    role: 'management',
    pin: '8888',
    pheccNumber: 'MGMT-002',
  },
  { id: 'staff-1', name: 'Aoife Brennan', grade: 'EMT', role: 'staff', pin: '1111', pheccNumber: 'EMT-48291' },
  { id: 'staff-2', name: 'Conor Murphy', grade: 'EMT', role: 'staff', pin: '2222', pheccNumber: 'EMT-51902' },
  { id: 'staff-3', name: 'Siobhán O\'Neill', grade: 'Paramedic', role: 'staff', pin: '3333', pheccNumber: 'P-33814' },
  { id: 'staff-4', name: 'James Kelly', grade: 'Paramedic', role: 'staff', pin: '4444', pheccNumber: 'P-29107' },
  { id: 'staff-5', name: 'Niamh Walsh', grade: 'AP', role: 'staff', pin: '5555', pheccNumber: 'AP-17462' },
  { id: 'staff-6', name: 'Mark Doyle', grade: 'AP', role: 'staff', pin: '6666', pheccNumber: 'AP-15208' },
]

/** 10 DoseRX drug bags — standard + controlled drug pouches */
export function createInitialBags(): DrugBag[] {
  return [
    {
      id: 'bag-emt-01',
      code: 'DRX-EMT-01',
      name: 'EMT Drug Bag 1',
      grade: 'EMT',
      type: 'standard',
      sealNumber: seal(),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A01',
      items: buildItems('EMT', false),
    },
    {
      id: 'bag-emt-02',
      code: 'DRX-EMT-02',
      name: 'EMT Drug Bag 2',
      grade: 'EMT',
      type: 'standard',
      sealNumber: seal(),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A02',
      items: buildItems('EMT', false),
    },
    {
      id: 'bag-p-01',
      code: 'DRX-P-01',
      name: 'Paramedic Drug Bag 1',
      grade: 'Paramedic',
      type: 'standard',
      sealNumber: seal(),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A01',
      items: buildItems('Paramedic', false),
    },
    {
      id: 'bag-p-02',
      code: 'DRX-P-02',
      name: 'Paramedic Drug Bag 2',
      grade: 'Paramedic',
      type: 'standard',
      sealNumber: seal(),
      status: 'check_due',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A02',
      lastCheckedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      lastCheckedBy: 'Siobhán O\'Neill',
      items: buildItems('Paramedic', false),
    },
    {
      id: 'bag-p-03',
      code: 'DRX-P-03',
      name: 'Paramedic Drug Bag 3',
      grade: 'Paramedic',
      type: 'standard',
      sealNumber: seal(),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A03',
      items: buildItems('Paramedic', false),
    },
    {
      id: 'bag-ap-01',
      code: 'DRX-AP-01',
      name: 'Advanced Paramedic Drug Bag 1',
      grade: 'AP',
      type: 'standard',
      sealNumber: seal(),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A01',
      items: buildItems('AP', false),
    },
    {
      id: 'bag-ap-02',
      code: 'DRX-AP-02',
      name: 'Advanced Paramedic Drug Bag 2',
      grade: 'AP',
      type: 'standard',
      sealNumber: seal(),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A02',
      items: buildItems('AP', false),
    },
    {
      id: 'bag-ap-03',
      code: 'DRX-AP-03',
      name: 'Advanced Paramedic Drug Bag 3',
      grade: 'AP',
      type: 'standard',
      sealNumber: seal(),
      status: 'open',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'A03',
      lastCheckedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      lastCheckedBy: 'Niamh Walsh',
      items: buildItems('AP', false),
    },
    {
      id: 'bag-cd-p-01',
      code: 'DRX-CD-P-01',
      name: 'Paramedic Controlled Drugs',
      grade: 'Paramedic',
      type: 'controlled',
      sealNumber: seal(),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'CD Safe / A01',
      items: buildItems('Paramedic', true),
    },
    {
      id: 'bag-cd-ap-01',
      code: 'DRX-CD-AP-01',
      name: 'AP Controlled Drugs',
      grade: 'AP',
      type: 'controlled',
      sealNumber: seal(),
      status: 'sealed',
      tagStatus: 'green',
      activeShiftId: null,
      assignedVehicle: 'CD Safe / A01',
      items: buildItems('AP', true),
    },
  ]
}
