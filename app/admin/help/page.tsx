'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Book, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'

export default function AdminHelpPage() {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/help/admin')
      .then((res) => res.text())
      .then((text) => {
        setContent(text)
        setLoading(false)
      })
      .catch(() => {
        setContent('# Help content could not be loaded\n\nPlease try refreshing the page.')
        setLoading(false)
      })
  }, [])

  const sections = [
    { id: 'getting-started', title: 'Getting Started' },
    { id: 'uploading-routes', title: 'Uploading Routes' },
    { id: 'uploading-driversvolunteers', title: 'Uploading Drivers' },
    { id: 'managing-routes', title: 'Managing Routes' },
    { id: 'managing-users', title: 'Managing Users' },
    { id: 'event-day-workflow', title: 'Event Day Workflow' },
    { id: 'reports', title: 'Reports' },
    { id: 'troubleshooting', title: 'Troubleshooting' },
  ]

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Book className="w-5 h-5 text-primary-600" />
              Contents
            </h3>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
            <article className="prose prose-gray max-w-none prose-headings:scroll-mt-24 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-h2:pt-8 first:prose-h2:pt-0 prose-table:text-sm prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown
                components={{
                  h2: ({ node, children, ...props }) => {
                    const id = children
                      ?.toString()
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '')
                    return (
                      <h2 id={id} {...props}>
                        {children}
                      </h2>
                    )
                  },
                  h3: ({ node, children, ...props }) => {
                    const id = children
                      ?.toString()
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '')
                    return (
                      <h3 id={id} {...props}>
                        {children}
                      </h3>
                    )
                  },
                  a: ({ node, children, href, ...props }) => (
                    <a
                      href={href}
                      target={href?.startsWith('http') ? '_blank' : undefined}
                      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-primary-600 hover:text-primary-700"
                      {...props}
                    >
                      {children}
                      {href?.startsWith('http') && (
                        <ExternalLink className="inline w-3 h-3 ml-1" />
                      )}
                    </a>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
          </div>
        </main>
      </div>
    </div>
  )
}
