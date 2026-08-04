import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { BagCard } from './BagCard'

export function BagsView({ onOpenBag }: { onOpenBag: (id: string) => void }) {
  const { state } = useApp()
  const [filter, setFilter] = useState<'all' | 'EMT' | 'Paramedic' | 'AP' | 'CD'>('all')

  const bags = useMemo(() => {
    return state.bags.filter((b) => {
      if (filter === 'all') return true
      if (filter === 'CD') return b.type === 'controlled'
      return b.grade === filter && b.type === 'standard'
    })
  }, [state.bags, filter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['all', 'EMT', 'Paramedic', 'AP', 'CD'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              filter === f ? 'bg-sea text-mint' : 'bg-panel border border-line text-ink-soft hover:border-sea-mid'
            }`}
          >
            {f === 'all' ? 'All 10 bags' : f === 'CD' ? 'Controlled Drugs' : f === 'AP' ? 'Adv. Paramedic' : f}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {bags.map((bag) => (
          <BagCard key={bag.id} bag={bag} onOpen={() => onOpenBag(bag.id)} />
        ))}
      </div>
    </div>
  )
}
