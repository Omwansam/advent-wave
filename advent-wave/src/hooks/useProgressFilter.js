import { useMemo, useState } from 'react'
import { progressStatus, useProgressMap } from '../store/useProgressStore'

export const PROGRESS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'unplayed', label: 'Unplayed' },
]

/**
 * The All / In progress / Unplayed filter over a list of sermons or episodes. In progress is
 * ordered most-recently-listened first: it is a "carry on where I was" list, and the sermon
 * from last night belongs above the one from last month.
 *
 * @param {object[]} items
 */
export function useProgressFilter(items) {
  const [filter, setFilter] = useState('all')
  const progress = useProgressMap()

  const visible = useMemo(() => {
    if (filter === 'all') return items
    const matching = items.filter((t) => progressStatus(progress[t.id]) === filter)
    if (filter === 'in-progress') {
      matching.sort((a, b) => progress[b.id].updatedAt - progress[a.id].updatedAt)
    }
    return matching
  }, [items, filter, progress])

  return { filter, setFilter, visible, progress }
}
