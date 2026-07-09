'use client'

import Link from 'next/link'
import { Calendar, ChevronRight, HeartHandshake, MapPin } from 'lucide-react'

// 65j: compact, clickable opportunity tile (icon + title + basic info).
// Opens the opportunity detail page. Full description / actions live there.

export interface OpportunityTileInfo {
  id: number
  name: string
  iconUrl: string | null
  imageUrl: string | null
  kind: 'shifts' | 'routes' | 'self-reported' | 'registration'
}

export function OpportunityTile({
  type,
  dateInfo,
  locationInfo,
}: {
  type: OpportunityTileInfo
  dateInfo?: string | null
  locationInfo?: string | null
}) {
  // Prefer the dedicated icon; fall back to the cover, then a generic glyph
  const thumb = type.iconUrl || type.imageUrl

  return (
    <Link
      href={`/volunteer/opportunities/${type.id}`}
      className="card flex items-center gap-3 hover:bg-gray-50 transition-colors"
    >
      <div className="w-14 h-14 rounded-lg bg-green-50 flex items-center justify-center overflow-hidden flex-shrink-0">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <HeartHandshake className="w-7 h-7 text-green-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{type.name}</h3>
        <div className="mt-0.5 space-y-0.5">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{dateInfo || 'Ongoing'}</span>
          </p>
          {locationInfo && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{locationInfo}</span>
            </p>
          )}
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
    </Link>
  )
}
