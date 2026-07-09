'use client'

import Link from 'next/link'
import { Calendar, HeartHandshake, MapPin } from 'lucide-react'

// 65j/65m: clickable opportunity tile. Responsive by design:
//   - mobile (< sm): compact LIST row (thumbnail left, title + meta right) so a
//     phone shows many opportunities without endless scrolling.
//   - sm+ : CARD with a full-bleed cover image banner across the top, title +
//     meta below. Title wraps to a second line instead of truncating with "…".
// Opens the opportunity detail page; the full description / actions live there.

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
  // Banner prefers the wide cover image; the small list thumbnail prefers the icon
  const cover = type.imageUrl || type.iconUrl
  const thumb = type.iconUrl || type.imageUrl

  const meta = (
    <div className="space-y-0.5">
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Calendar className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{dateInfo || 'Ongoing'}</span>
      </p>
      {locationInfo && (
        <p className="text-xs text-gray-500 flex items-center gap-1 min-w-0">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{locationInfo}</span>
        </p>
      )}
    </div>
  )

  return (
    <Link href={`/volunteer/opportunities/${type.id}`} className="block h-full">
      {/* Mobile: compact list row */}
      <div className="card flex sm:hidden items-center gap-3 hover:bg-gray-50 transition-colors">
        <div className="w-14 h-14 rounded-lg bg-green-50 flex items-center justify-center overflow-hidden flex-shrink-0">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="w-full h-full object-cover" />
          ) : (
            <HeartHandshake className="w-7 h-7 text-green-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 leading-snug">{type.name}</h3>
          <div className="mt-1">{meta}</div>
        </div>
      </div>

      {/* sm+: card with full-bleed cover banner */}
      <div className="card p-0 overflow-hidden h-full hidden sm:flex flex-col hover:bg-gray-50 transition-colors">
        <div className="w-full h-28 bg-green-100 flex-shrink-0">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <HeartHandshake className="w-10 h-10 text-green-600" />
            </div>
          )}
        </div>
        <div className="p-4 flex-1 flex flex-col gap-2">
          <h3 className="font-semibold text-gray-900 leading-snug">{type.name}</h3>
          <div className="mt-auto">{meta}</div>
        </div>
      </div>
    </Link>
  )
}
