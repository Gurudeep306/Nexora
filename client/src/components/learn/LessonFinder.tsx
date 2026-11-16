import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { iconComponent } from '@/components/icon/iconComponent'
import { SearchCombobox, type ComboboxItem } from '@/components/ui'
import { LESSON_GROUP, LESSON_ICON, useLessonSearch } from '@/lib/lessonSearch'
import { pushRecentSearch } from '@/lib/recentSearches'

/**
 * "Find a lesson": one field that finds any written lesson (GATE notes in
 * full text, DSA chapters), subject or skill, and opens it. The same index
 * as the top bar and the command palette.
 */
export function LessonFinder({ className }: { className?: string }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const { hits, loading } = useLessonSearch(q, { limit: 6 })
  const items: ComboboxItem[] = hits.map((h) => ({
    id: h.id,
    group: LESSON_GROUP[h.kind],
    label: h.label,
    hint: h.hint,
    icon: iconComponent(LESSON_ICON[h.kind]),
    onSelect: () => {
      pushRecentSearch({ kind: 'page', label: h.label, to: h.to, icon: LESSON_ICON[h.kind] })
      navigate(h.to)
    },
  }))
  return (
    <SearchCombobox
      items={items}
      value={q}
      onValueChange={setQ}
      onSelect={() => setQ('')}
      loading={loading}
      openOnFocus={false}
      placeholder="Find a lesson, subject or skill"
      emptyText="No lesson, subject or skill matches. Try a shorter word."
      aria-label="Find a lesson, subject or skill"
      containerClassName={className}
      className="!h-12 !text-[17px]"
    />
  )
}
