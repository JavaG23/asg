'use client'

interface RouteProgressProps {
  completedStops: number
  totalStops: number
  progress: number
}

export default function RouteProgress({
  completedStops,
  totalStops,
  progress,
}: RouteProgressProps) {
  return (
    <div className="card">
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Route Progress
          </span>
          <span className="text-sm font-bold text-primary-600">
            {progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-primary-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <p className="text-sm text-gray-600">
        Completed: <span className="font-semibold">{completedStops}</span> of{' '}
        <span className="font-semibold">{totalStops}</span> stops
      </p>
    </div>
  )
}
