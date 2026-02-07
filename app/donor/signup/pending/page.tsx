'use client'

import Link from 'next/link'
import { Heart, Clock, Mail, ArrowRight } from 'lucide-react'

export default function DonorSignupPendingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Application Submitted!
          </h1>

          <p className="text-gray-600 mb-6">
            Thank you for your interest in becoming a food donor with A Simple Gesture.
          </p>

          {/* Status Card */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium text-yellow-900">Pending Review</p>
                <p className="text-sm text-yellow-700">
                  Our team will review your application shortly.
                </p>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  1
                </span>
                <span>Our team reviews your application within 1-2 business days</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  2
                </span>
                <span>You'll receive an email with your account details once approved</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  3
                </span>
                <span>Log in to your donor dashboard to opt-in to pickup dates</span>
              </li>
            </ul>
          </div>

          {/* Email Note */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
            <Mail className="w-4 h-4" />
            <span>Check your email for confirmation</span>
          </div>

          {/* Back to Home */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
          >
            Return to home page
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
