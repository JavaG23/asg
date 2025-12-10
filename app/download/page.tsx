'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DownloadPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detect Android
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);

    // Capture the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app was installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 sm:px-10">
            <h1 className="text-3xl font-bold text-white text-center">
              Install ASG App
            </h1>
            <p className="mt-2 text-blue-100 text-center">
              A Simple Gesture - Food Delivery Coordination
            </p>
          </div>

          <div className="px-6 py-8 sm:px-10">
            {/* Info Banner */}
            {!isInstalled && !deferredPrompt && !isIOS && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800">
                  <strong>Tip:</strong> When browsing this site from a mobile device using Chrome, you'll see an install prompt banner at the bottom of the page. Click "Install Now" to add ASG App to your device.
                </p>
              </div>
            )}

            {/* Installation Status */}
            {isInstalled ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex items-center">
                  <svg
                    className="h-6 w-6 text-green-600 mr-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h2 className="text-lg font-semibold text-green-900">
                      App Already Installed!
                    </h2>
                    <p className="text-green-700">
                      You can access it from your home screen or app drawer.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Install Button (Android/Desktop Chrome) */}
                {deferredPrompt && (
                  <div className="mb-8">
                    <button
                      onClick={handleInstallClick}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
                    >
                      <svg
                        className="h-6 w-6 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Install App Now
                    </button>
                    <p className="text-sm text-gray-600 text-center mt-2">
                      Click to install the app on your device
                    </p>
                  </div>
                )}

                {/* iOS Instructions */}
                {isIOS && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <svg
                        className="h-6 w-6 mr-2 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      Install on iOS (iPhone/iPad)
                    </h2>
                    <ol className="space-y-3 text-gray-700">
                      <li className="flex items-start">
                        <span className="font-semibold mr-2 text-blue-600">1.</span>
                        <span>
                          Tap the <strong>Share</strong> button{' '}
                          <svg
                            className="inline h-5 w-5 mx-1"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z" />
                          </svg>
                          at the bottom of Safari
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2 text-blue-600">2.</span>
                        <span>
                          Scroll down and tap <strong>"Add to Home Screen"</strong>
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2 text-blue-600">3.</span>
                        <span>
                          Tap <strong>"Add"</strong> in the top right corner
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2 text-blue-600">4.</span>
                        <span>The app icon will appear on your home screen</span>
                      </li>
                    </ol>
                  </div>
                )}

                {/* Android Instructions (if no install prompt) */}
                {isAndroid && !deferredPrompt && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <svg
                        className="h-6 w-6 mr-2 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.46 11.46 0 00-8.94 0L5.65 5.67c-.19-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C2.92 12.13 1.11 16.28 1 20.92h22c-.11-4.64-1.92-8.79-5.4-11.44zM7 19.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm10 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                      </svg>
                      Install on Android
                    </h2>
                    <ol className="space-y-3 text-gray-700">
                      <li className="flex items-start">
                        <span className="font-semibold mr-2 text-green-600">1.</span>
                        <span>
                          Tap the <strong>menu</strong> button (three dots) in Chrome
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2 text-green-600">2.</span>
                        <span>
                          Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2 text-green-600">3.</span>
                        <span>
                          Tap <strong>"Install"</strong> in the popup
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2 text-green-600">4.</span>
                        <span>The app will be added to your app drawer</span>
                      </li>
                    </ol>
                  </div>
                )}

                {/* Desktop Instructions */}
                {!isIOS && !isAndroid && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <svg
                        className="h-6 w-6 mr-2 text-purple-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      Install on Desktop
                    </h2>
                    <ol className="space-y-3 text-gray-700">
                      <li className="flex items-start">
                        <span className="font-semibold mr-2 text-purple-600">1.</span>
                        <span>
                          Look for the install icon in your browser's address bar
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2 text-purple-600">2.</span>
                        <span>
                          Or open the browser menu and select <strong>"Install ASG App"</strong>
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2 text-purple-600">3.</span>
                        <span>The app will open in its own window</span>
                      </li>
                    </ol>
                  </div>
                )}
              </>
            )}

            {/* Benefits */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Why Install?
              </h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <svg
                    className="h-6 w-6 text-green-500 mr-3 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>
                    <strong>Works offline</strong> - Access features even without internet
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-6 text-green-500 mr-3 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>
                    <strong>Faster loading</strong> - Instant startup like a native app
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-6 text-green-500 mr-3 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>
                    <strong>Easy access</strong> - Launch from your home screen or app drawer
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-6 w-6 text-green-500 mr-3 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>
                    <strong>Full screen experience</strong> - No browser UI distractions
                  </span>
                </li>
              </ul>
            </div>

            {/* Return to App */}
            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <svg
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Return to App
              </Link>
            </div>

            {/* Technical Note */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> This is a Progressive Web App (PWA). It installs
                directly from your browser - no app store needed. For the best experience,
                use Chrome on Android or Safari on iOS.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
