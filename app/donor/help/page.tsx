'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Book, Home } from 'lucide-react'

export default function DonorHelpPage() {
  const router = useRouter()
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/help/donor')
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
    { id: 'about-a-simple-gesture', title: 'About ASG' },
    { id: 'how-it-works', title: 'How It Works' },
    { id: 'preparing-your-donation', title: 'Preparing Donations' },
    { id: 'pickup-days', title: 'Pickup Days' },
    { id: 'donation-guidelines', title: 'Guidelines' },
    { id: 'frequently-asked-questions', title: 'FAQ' },
  ]

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(id)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Book className="w-5 h-5 text-primary-600" />
                Donor Guide
              </h1>
            </div>
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Home"
            >
              <Home className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Quick Navigation (Mobile) */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 lg:hidden overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <div className="flex gap-8">
          {/* Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Contents</h3>
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

          {/* Content */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <article className="prose prose-gray max-w-none prose-headings:scroll-mt-24 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-h2:pt-6 first:prose-h2:pt-0 prose-table:text-sm prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2">
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
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
