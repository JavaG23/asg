import { AlertCircle, XCircle } from 'lucide-react'

interface ErrorMessageProps {
  title?: string
  message: string
  variant?: 'error' | 'warning'
  onDismiss?: () => void
}

export function ErrorMessage({
  title,
  message,
  variant = 'error',
  onDismiss
}: ErrorMessageProps) {
  const styles = {
    error: {
      container: 'bg-danger-50 border-danger-200 text-danger-700',
      icon: 'text-danger-500',
    },
    warning: {
      container: 'bg-warning-50 border-warning-200 text-warning-700',
      icon: 'text-warning-500',
    },
  }

  return (
    <div className={`p-4 border rounded-lg ${styles[variant].container}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles[variant].icon}`} />
        <div className="flex-1">
          {title && <h4 className="font-medium mb-1">{title}</h4>}
          <p className="text-sm">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
