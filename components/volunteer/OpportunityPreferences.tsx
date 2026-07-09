'use client'

// Volunteer portal build-out (#65)
// Toggle list of opportunity types the volunteer wants shown in their portal.
// Used on the profile page; also intended for the volunteer onboarding flow.
// Backend: GET/PUT /api/volunteer/opportunity-types.

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface TypeOption {
  id: number
  name: string
  description: string | null
  enabled: boolean
}

export function OpportunityPreferences() {
  const [types, setTypes] = useState<TypeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/volunteer/opportunity-types')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTypes(data.data.types)
        else setError(data.error || 'Failed to load opportunities')
      })
      .catch(() => setError('Failed to load opportunities'))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id: number) => {
    setSaved(false)
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const enabledTypeIds = types.filter((t) => t.enabled).map((t) => t.id)
      const response = await fetch('/api/volunteer/opportunity-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledTypeIds }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save preferences')
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading opportunity preferences...
      </div>
    )
  }

  if (types.length === 0) {
    return <p className="text-sm text-gray-500 py-2">No opportunity types are set up yet.</p>
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">
        Choose which opportunities appear in your portal.
      </p>
      <div className="space-y-2">
        {types.map((t) => (
          <label
            key={t.id}
            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <input
              type="checkbox"
              checked={t.enabled}
              onChange={() => toggle(t.id)}
              className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <span>
              <span className="font-medium text-gray-900 block">{t.name}</span>
              {t.description && (
                <span className="text-xs text-gray-500 line-clamp-2">{t.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={save}
          disabled={saving || !types.some((t) => t.enabled)}
          className="btn btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
        {!types.some((t) => t.enabled) && (
          <span className="text-xs text-gray-500">Select at least one opportunity</span>
        )}
      </div>
    </div>
  )
}
