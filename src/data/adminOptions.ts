/** PHECC-aligned dose / route / indication options for administration dropdowns */
export interface AdminOptions {
  doses: string[]
  routes: string[]
  indications: string[]
}

const DEFAULTS: AdminOptions = {
  doses: ['As per CPG', 'Titrated to effect'],
  routes: ['PO', 'IM', 'IV', 'IO', 'IN', 'NEB', 'SL', 'PR', 'Inhaled', 'Topical'],
  indications: ['As per CPG', 'Other (see notes)'],
}

export const ADMIN_OPTIONS: Record<string, AdminOptions> = {
  'activated-charcoal': {
    doses: ['50 g', '25 g (paediatric)', 'As per CPG'],
    routes: ['PO'],
    indications: ['Oral poisoning / overdose', 'As per CPG'],
  },
  'adrenaline-1-1000': {
    doses: [
      '0.5 mg (adult)',
      '0.3 mg (auto-injector)',
      '0.15 mg (paediatric auto-injector)',
      '0.05 mg IM (<6 months)',
      '0.125 mg IM (6 months–5 yrs)',
      '0.25 mg IM (6–8 yrs)',
      '0.5 mg IM (>8 yrs)',
      'As per CPG',
    ],
    routes: ['IM', 'Nebulised'],
    indications: ['Anaphylaxis', 'Severe asthma / stridor', 'As per CPG'],
  },
  aspirin: {
    doses: ['300 mg'],
    routes: ['PO'],
    indications: ['STEMI', 'NSTEMI / unstable angina', 'Suspected ACS', 'As per CPG'],
  },
  chlorphenamine: {
    doses: ['10 mg (adult)', 'Paediatric weight-based', 'As per CPG'],
    routes: ['IM', 'IV', 'PO'],
    indications: ['Allergic reaction', 'Anaphylaxis (adjunct)', 'As per CPG'],
  },
  cyclizine: {
    doses: ['50 mg (adult)', 'Paediatric weight-based', 'As per CPG'],
    routes: ['IM', 'IV'],
    indications: ['Nausea / vomiting', 'As per CPG'],
  },
  glucagon: {
    doses: ['1 mg (adult / ≥8 yrs)', '0.5 mg (1–8 yrs)', 'As per CPG'],
    routes: ['IM'],
    indications: ['Hypoglycaemia (unconscious / unable to swallow)', 'As per CPG'],
  },
  'glucose-gel': {
    doses: ['1 tube', '2 tubes', 'As per CPG'],
    routes: ['Buccal / PO'],
    indications: ['Hypoglycaemia (conscious)', 'As per CPG'],
  },
  gtn: {
    doses: ['400 mcg (1 spray)', '800 mcg (2 sprays)', 'As per CPG'],
    routes: ['SL (spray)'],
    indications: ['Angina / suspected MI', 'Pulmonary oedema (P/AP)', 'As per CPG'],
  },
  ibuprofen: {
    doses: ['400 mg PO (mild pain)', '600 mg PO (moderate pain)', '10 mg/kg PO (paediatric)', 'As per CPG'],
    routes: ['PO'],
    indications: ['Mild–moderate pain', 'Pyrexia', 'As per CPG'],
  },
  methoxyflurane: {
    doses: ['3 mL (1 inhaler)', 'As per CPG'],
    routes: ['Inhaled'],
    indications: ['Moderate–severe pain', 'Trauma analgesia', 'As per CPG'],
  },
  naloxone: {
    doses: ['400 mcg', '800 mcg', 'Titrated to effect', 'Paediatric weight-based', 'As per CPG'],
    routes: ['IM', 'IV', 'IO', 'IN'],
    indications: ['Opioid overdose / respiratory depression', 'As per CPG'],
  },
  entonox: {
    doses: ['Self-administered PRN', 'As per CPG'],
    routes: ['Inhaled (demand valve)'],
    indications: ['Moderate–severe pain', 'Labour pain', 'As per CPG'],
  },
  oxygen: {
    doses: ['Target SpO₂ 94–98%', 'Target SpO₂ 88–92% (COPD)', '15 L/min NRB', 'As per CPG'],
    routes: ['Inhaled (mask / NC / BVM)'],
    indications: ['Hypoxia', 'Cardiac arrest', 'Major trauma', 'As per CPG'],
  },
  paracetamol: {
    doses: ['1 g PO/IV (adult)', '500 mg', '15 mg/kg (paediatric)', 'PR dose as per CPG', 'As per CPG'],
    routes: ['PO', 'IV', 'PR'],
    indications: ['Mild–moderate pain', 'Pyrexia', 'As per CPG'],
  },
  salbutamol: {
    doses: ['2.5 mg nebule', '5 mg (2 × 2.5 mg)', 'MDI via spacer (as per CPG)', 'As per CPG'],
    routes: ['NEB', 'Inhaled (MDI)'],
    indications: ['Asthma', 'COPD exacerbation', 'Anaphylaxis (wheeze)', 'As per CPG'],
  },
  ceftriaxone: {
    doses: ['1 g', '2 g', 'Paediatric weight-based', 'As per CPG'],
    routes: ['IM', 'IV'],
    indications: ['Suspected meningococcal sepsis', 'As per CPG'],
  },
  clopidogrel: {
    doses: ['300 mg', '600 mg', 'As per CPG'],
    routes: ['PO'],
    indications: ['STEMI (PPCI pathway)', 'As per CPG'],
  },
  dexamethasone: {
    doses: ['8 mg (adult)', 'Paediatric weight-based', 'As per CPG'],
    routes: ['PO', 'IM', 'IV'],
    indications: ['Croup', 'Asthma / airway inflammation', 'As per CPG'],
  },
  'glucose-10': {
    doses: ['100 mL', '250 mL', 'Titrated to BGL', 'As per CPG'],
    routes: ['IV', 'IO'],
    indications: ['Hypoglycaemia', 'As per CPG'],
  },
  'glucose-5': {
    doses: ['As infusion carrier', 'As per CPG'],
    routes: ['IV'],
    indications: ['Medication diluent / infusion', 'As per CPG'],
  },
  hydrocortisone: {
    doses: ['100 mg (adult)', 'Paediatric weight-based', 'As per CPG'],
    routes: ['IM', 'IV'],
    indications: ['Adrenal insufficiency / Addisonian crisis', 'Anaphylaxis (refractory)', 'Severe asthma', 'As per CPG'],
  },
  ipratropium: {
    doses: ['500 mcg nebule', '250 mcg (paediatric)', 'As per CPG'],
    routes: ['NEB'],
    indications: ['Asthma (with salbutamol)', 'COPD exacerbation', 'As per CPG'],
  },
  midazolam: {
    doses: [
      '5 mg (adult IM/buccal as per CPG)',
      '10 mg (adult)',
      '2.5 mg',
      'Paediatric weight-based',
      'Titrated to effect',
      'As per CPG',
    ],
    routes: ['IM', 'IV', 'IO', 'Buccal', 'IN'],
    indications: ['Prolonged seizure / status epilepticus', 'Sedation (AP)', 'As per CPG'],
  },
  ondansetron: {
    doses: ['4 mg (adult)', '8 mg', 'Paediatric weight-based', 'As per CPG'],
    routes: ['IM', 'IV', 'PO'],
    indications: ['Nausea / vomiting', 'As per CPG'],
  },
  oxytocin: {
    doses: ['5 IU', '10 IU', 'As per CPG'],
    routes: ['IM'],
    indications: ['Post-partum haemorrhage', 'As per CPG'],
  },
  nacl: {
    doses: ['250 mL', '500 mL', '10 mL flush', 'Titrated bolus', 'As per CPG'],
    routes: ['IV', 'IO'],
    indications: ['Hypovolaemia / fluid resuscitation', 'Medication flush', 'As per CPG'],
  },
  tetracaine: {
    doses: ['1–2 drops', 'As per CPG'],
    routes: ['Topical (ocular)'],
    indications: ['Eye injury / foreign body (analgesia)', 'As per CPG'],
  },
  ticagrelor: {
    doses: ['180 mg', 'As per CPG'],
    routes: ['PO'],
    indications: ['STEMI (PPCI pathway)', 'As per CPG'],
  },
  adenosine: {
    doses: ['6 mg', '12 mg', 'As per CPG'],
    routes: ['IV (rapid)', 'IO'],
    indications: ['SVT', 'As per CPG'],
  },
  'adrenaline-1-10000': {
    doses: ['1 mg (10 mL)', '0.01 mg/kg (paediatric)', 'As per CPG'],
    routes: ['IV', 'IO'],
    indications: ['Cardiac arrest', 'As per CPG'],
  },
  amiodarone: {
    doses: ['300 mg', '150 mg (repeat)', 'Paediatric weight-based', 'As per CPG'],
    routes: ['IV', 'IO'],
    indications: ['VF / pVT (refractory)', 'As per CPG'],
  },
  atropine: {
    doses: ['500 mcg', '1 mg', '3 mg (max)', 'Paediatric weight-based', 'As per CPG'],
    routes: ['IV', 'IO'],
    indications: ['Symptomatic bradycardia', 'Organophosphate poisoning', 'As per CPG'],
  },
  'diazepam-inj': {
    doses: ['5 mg', '10 mg', 'Titrated to effect', 'Paediatric weight-based', 'As per CPG'],
    routes: ['IV', 'IO'],
    indications: ['Prolonged seizure', 'Severe agitation (as per CPG)', 'As per CPG'],
  },
  'diazepam-rectal': {
    doses: ['5 mg PR', '10 mg PR', 'Paediatric age/weight dose', 'As per CPG'],
    routes: ['PR'],
    indications: ['Prolonged seizure (no IV access)', 'As per CPG'],
  },
  fentanyl: {
    doses: ['25 mcg', '50 mcg', '100 mcg', 'Titrated to effect', 'Paediatric weight-based', 'As per CPG'],
    routes: ['IV', 'IO', 'IN'],
    indications: ['Severe pain', 'As per CPG'],
  },
  furosemide: {
    doses: ['20 mg', '40 mg', 'As per CPG'],
    routes: ['IV'],
    indications: ['Acute pulmonary oedema', 'As per CPG'],
  },
  glycopyrronium: {
    doses: ['200 mcg', '400 mcg', 'As per CPG'],
    routes: ['IV', 'IM'],
    indications: ['Excessive secretions', 'As per CPG'],
  },
  haloperidol: {
    doses: ['5 mg', '2.5 mg', 'As per CPG'],
    routes: ['IM', 'IV'],
    indications: ['Acute behavioural disturbance', 'As per CPG'],
  },
  hyoscine: {
    doses: ['20 mg', 'As per CPG'],
    routes: ['IM', 'IV'],
    indications: ['Abdominal colic / spasm', 'As per CPG'],
  },
  ketamine: {
    doses: ['0.1–0.3 mg/kg (analgesia)', 'Sedation dose as per CPG', 'Titrated to effect', 'As per CPG'],
    routes: ['IV', 'IO', 'IM'],
    indications: ['Severe pain', 'Procedural sedation', 'As per CPG'],
  },
  lidocaine: {
    doses: ['Local infiltration as required', 'As per CPG'],
    routes: ['SC / local infiltration', 'IV (as per CPG)'],
    indications: ['Local anaesthesia', 'IO infusion pain', 'As per CPG'],
  },
  lorazepam: {
    doses: ['1 mg', '2 mg', '4 mg', 'Titrated to effect', 'As per CPG'],
    routes: ['IV', 'IM', 'IO'],
    indications: ['Prolonged seizure', 'Severe agitation', 'As per CPG'],
  },
  magnesium: {
    doses: ['2 g', '4 g (eclampsia)', 'As per CPG'],
    routes: ['IV'],
    indications: ['Eclampsia', 'Severe asthma (refractory)', 'Torsades de pointes', 'As per CPG'],
  },
  morphine: {
    doses: ['2.5 mg', '5 mg', '10 mg', 'Titrated to effect', 'Paediatric weight-based', 'As per CPG'],
    routes: ['IV', 'IO', 'IM'],
    indications: ['Severe pain', 'ACS / cardiac chest pain', 'As per CPG'],
  },
  'sodium-bicarb': {
    doses: ['50 mL (8.4%)', 'As per CPG'],
    routes: ['IV'],
    indications: ['Cardiac arrest (special circumstances)', 'TCA overdose / severe acidosis', 'As per CPG'],
  },
  txa: {
    doses: ['1 g', '15 mg/kg (paediatric)', 'As per CPG'],
    routes: ['IV', 'IO'],
    indications: ['Major haemorrhage / trauma', 'Post-partum haemorrhage', 'As per CPG'],
  },
}

export function getAdminOptions(medicationId: string): AdminOptions {
  return ADMIN_OPTIONS[medicationId] ?? DEFAULTS
}

export const WASTE_REASONS = [
  'Broken ampoule / vial',
  'Expired',
  'Contaminated',
  'Partially used — remainder wasted',
  'Failed administration',
  'Temperature excursion',
  'Other (see notes)',
]
