import type { MedicationDef } from '../types'

/** PHECC Medication Formulary (2026 Edition) — aligned to clinical grades */
export const PHECC_FORMULARY: MedicationDef[] = [
  // ── EMT / Paramedic / AP ──────────────────────────────────────────
  { id: 'activated-charcoal', name: 'Activated Charcoal', presentation: '50 g oral suspension', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'bottle', defaultQty: 1, category: 'GI' },
  { id: 'adrenaline-1-1000', name: 'Adrenaline (1:1,000)', presentation: '1 mg/1 mL ampoule', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'amp', defaultQty: 5, category: 'Cardiac / Anaphylaxis' },
  { id: 'aspirin', name: 'Aspirin', presentation: '300 mg dispersible tablet', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'tab', defaultQty: 4, category: 'Cardiac' },
  { id: 'chlorphenamine', name: 'Chlorphenamine', presentation: '10 mg/1 mL ampoule', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'amp', defaultQty: 2, category: 'Allergy' },
  { id: 'cyclizine', name: 'Cyclizine', presentation: '50 mg/1 mL ampoule', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'amp', defaultQty: 2, category: 'Antiemetic' },
  { id: 'glucagon', name: 'Glucagon', presentation: '1 mg powder + solvent', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'kit', defaultQty: 2, category: 'Metabolic' },
  { id: 'glucose-gel', name: 'Glucose Gel', presentation: '40% oral gel tube', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'tube', defaultQty: 3, category: 'Metabolic' },
  { id: 'gtn', name: 'Glyceryl Trinitrate (GTN)', presentation: '400 mcg metered spray', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'spray', defaultQty: 1, category: 'Cardiac' },
  { id: 'ibuprofen', name: 'Ibuprofen', presentation: '200 mg tablet / 100 mg/5 mL susp.', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'pack', defaultQty: 1, category: 'Analgesia' },
  { id: 'methoxyflurane', name: 'Methoxyflurane', presentation: '3 mL Penthrox inhaler', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'inhaler', defaultQty: 2, category: 'Analgesia' },
  { id: 'naloxone', name: 'Naloxone', presentation: '400 mcg/1 mL ampoule', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'amp', defaultQty: 5, category: 'Antidote' },
  { id: 'entonox', name: 'Nitrous Oxide 50% / Oxygen 50% (Entonox®)', presentation: 'Cylinder + demand valve', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'cylinder', defaultQty: 1, category: 'Analgesia' },
  { id: 'oxygen', name: 'Oxygen', presentation: 'Medical O₂ cylinder', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'cylinder', defaultQty: 1, category: 'Airway' },
  { id: 'paracetamol', name: 'Paracetamol', presentation: '500 mg tab / 1 g IV / PR / susp.', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'pack', defaultQty: 2, category: 'Analgesia' },
  { id: 'salbutamol', name: 'Salbutamol', presentation: '2.5 mg/2.5 mL nebule', grades: ['EMT', 'Paramedic', 'AP'], controlled: false, unit: 'neb', defaultQty: 10, category: 'Respiratory' },

  // ── Paramedic / AP ────────────────────────────────────────────────
  { id: 'ceftriaxone', name: 'Ceftriaxone', presentation: '1 g powder for injection', grades: ['Paramedic', 'AP'], controlled: false, unit: 'vial', defaultQty: 2, category: 'Antibiotic' },
  { id: 'clopidogrel', name: 'Clopidogrel', presentation: '75 mg tablet', grades: ['Paramedic', 'AP'], controlled: false, unit: 'tab', defaultQty: 4, category: 'Cardiac' },
  { id: 'dexamethasone', name: 'Dexamethasone', presentation: '4 mg/1 mL ampoule', grades: ['Paramedic', 'AP'], controlled: false, unit: 'amp', defaultQty: 2, category: 'Steroid' },
  { id: 'glucose-10', name: 'Glucose 10% Solution', presentation: '500 mL bag', grades: ['Paramedic', 'AP'], controlled: false, unit: 'bag', defaultQty: 2, category: 'Metabolic' },
  { id: 'glucose-5', name: 'Glucose 5% Solution', presentation: '500 mL bag', grades: ['Paramedic', 'AP'], controlled: false, unit: 'bag', defaultQty: 1, category: 'IV Fluid' },
  { id: 'hydrocortisone', name: 'Hydrocortisone', presentation: '100 mg powder + solvent', grades: ['Paramedic', 'AP'], controlled: false, unit: 'vial', defaultQty: 2, category: 'Steroid' },
  { id: 'ipratropium', name: 'Ipratropium Bromide', presentation: '500 mcg/2 mL nebule', grades: ['Paramedic', 'AP'], controlled: false, unit: 'neb', defaultQty: 5, category: 'Respiratory' },
  { id: 'midazolam', name: 'Midazolam Solution', presentation: '5 mg/5 mL / 10 mg/2 mL', grades: ['Paramedic', 'AP'], controlled: true, schedule: '3', unit: 'amp', defaultQty: 4, category: 'Controlled Drug' },
  { id: 'ondansetron', name: 'Ondansetron', presentation: '4 mg/2 mL ampoule', grades: ['Paramedic', 'AP'], controlled: false, unit: 'amp', defaultQty: 4, category: 'Antiemetic' },
  { id: 'oxytocin', name: 'Oxytocin', presentation: '5 IU/1 mL ampoule', grades: ['Paramedic', 'AP'], controlled: false, unit: 'amp', defaultQty: 2, category: 'Obstetric' },
  { id: 'nacl', name: 'Sodium Chloride 0.9% (NaCl)', presentation: '500 mL / 10 mL flush', grades: ['Paramedic', 'AP'], controlled: false, unit: 'bag', defaultQty: 4, category: 'IV Fluid' },
  { id: 'tetracaine', name: 'Tetracaine 0.5% Eye Drops', presentation: '0.5% single-use drops', grades: ['Paramedic', 'AP'], controlled: false, unit: 'unit', defaultQty: 2, category: 'Ophthalmic' },
  { id: 'ticagrelor', name: 'Ticagrelor', presentation: '90 mg tablet', grades: ['Paramedic', 'AP'], controlled: false, unit: 'tab', defaultQty: 2, category: 'Cardiac' },

  // ── Advanced Paramedic only ───────────────────────────────────────
  { id: 'adenosine', name: 'Adenosine', presentation: '6 mg/2 mL ampoule', grades: ['AP'], controlled: false, unit: 'amp', defaultQty: 3, category: 'Cardiac' },
  { id: 'adrenaline-1-10000', name: 'Adrenaline (1:10,000)', presentation: '1 mg/10 mL prefill', grades: ['AP'], controlled: false, unit: 'prefill', defaultQty: 5, category: 'Cardiac' },
  { id: 'amiodarone', name: 'Amiodarone', presentation: '150 mg/3 mL ampoule', grades: ['AP'], controlled: false, unit: 'amp', defaultQty: 3, category: 'Cardiac' },
  { id: 'atropine', name: 'Atropine', presentation: '1 mg/1 mL / 3 mg/10 mL', grades: ['AP'], controlled: false, unit: 'amp', defaultQty: 3, category: 'Cardiac' },
  { id: 'diazepam-inj', name: 'Diazepam Injection', presentation: '10 mg/2 mL ampoule', grades: ['AP'], controlled: true, schedule: '4', unit: 'amp', defaultQty: 2, category: 'Controlled Drug' },
  { id: 'diazepam-rectal', name: 'Diazepam Rectal Solution', presentation: '5 mg / 10 mg rectal tube', grades: ['AP'], controlled: true, schedule: '4', unit: 'tube', defaultQty: 2, category: 'Controlled Drug' },
  { id: 'fentanyl', name: 'Fentanyl', presentation: '100 mcg/2 mL ampoule', grades: ['AP'], controlled: true, schedule: '2', unit: 'amp', defaultQty: 4, category: 'Controlled Drug' },
  { id: 'furosemide', name: 'Furosemide Injection', presentation: '20 mg/2 mL ampoule', grades: ['AP'], controlled: false, unit: 'amp', defaultQty: 2, category: 'Cardiac' },
  { id: 'glycopyrronium', name: 'Glycopyrronium Bromide', presentation: '200 mcg/1 mL ampoule', grades: ['AP'], controlled: false, unit: 'amp', defaultQty: 2, category: 'Anticholinergic' },
  { id: 'haloperidol', name: 'Haloperidol', presentation: '5 mg/1 mL ampoule', grades: ['AP'], controlled: false, unit: 'amp', defaultQty: 2, category: 'Sedation' },
  { id: 'hyoscine', name: 'Hyoscine Butylbromide', presentation: '20 mg/1 mL ampoule', grades: ['AP'], controlled: false, unit: 'amp', defaultQty: 2, category: 'GI' },
  { id: 'ketamine', name: 'Ketamine', presentation: '200 mg/20 mL vial', grades: ['AP'], controlled: true, schedule: '2', unit: 'vial', defaultQty: 2, category: 'Controlled Drug' },
  { id: 'lidocaine', name: 'Lidocaine', presentation: '1% / 2% injection', grades: ['AP'], controlled: false, unit: 'amp', defaultQty: 2, category: 'Local Anaesthetic' },
  { id: 'lorazepam', name: 'Lorazepam', presentation: '4 mg/1 mL ampoule', grades: ['AP'], controlled: true, schedule: '4', unit: 'amp', defaultQty: 2, category: 'Controlled Drug' },
  { id: 'magnesium', name: 'Magnesium Sulphate Injection', presentation: '50% 10 mL ampoule', grades: ['AP'], controlled: false, unit: 'amp', defaultQty: 2, category: 'Electrolyte' },
  { id: 'morphine', name: 'Morphine Sulphate', presentation: '10 mg/1 mL ampoule', grades: ['AP'], controlled: true, schedule: '2', unit: 'amp', defaultQty: 5, category: 'Controlled Drug' },
  { id: 'sodium-bicarb', name: 'Sodium Bicarbonate Injection BP', presentation: '8.4% 50 mL', grades: ['AP'], controlled: false, unit: 'vial', defaultQty: 1, category: 'Metabolic' },
  { id: 'txa', name: 'Tranexamic Acid', presentation: '500 mg/5 mL ampoule', grades: ['AP'], controlled: false, unit: 'amp', defaultQty: 2, category: 'Haemostatic' },
]

export function medsForGrade(grade: 'EMT' | 'Paramedic' | 'AP', controlledOnly = false) {
  return PHECC_FORMULARY.filter(
    (m) => m.grades.includes(grade) && (controlledOnly ? m.controlled : !m.controlled),
  )
}

export function controlledMedsForGrade(grade: 'Paramedic' | 'AP') {
  return PHECC_FORMULARY.filter((m) => m.controlled && m.grades.includes(grade))
}
