export function daysUntil(dateStr: string) {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatRelative(iso?: string) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function gradeLabel(grade: string) {
  if (grade === 'AP') return 'Advanced Paramedic'
  return grade
}

export function gradeShort(grade: string) {
  if (grade === 'Paramedic') return 'P'
  return grade
}
