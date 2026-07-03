import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

/**
 * PWA Install Prompt Component
 * Shows a banner prompting users to install the app on their device
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;

    if (isInstalled) {
      return;
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Listen for the beforeinstallprompt event (Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the default mini-infobar from appearing
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
      // Show the custom install prompt
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show the prompt after a delay (no beforeinstallprompt event on iOS)
    if (iOS && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds

      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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

    console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember that user dismissed the prompt
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-highlight-900 to-brand-900 text-white shadow-lg md:bottom-4 md:left-4 md:right-auto md:max-w-md md:rounded-lg">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <ArrowDownTrayIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Install Music Dashboard</h3>
              {isIOS ? (
                <p className="mt-1 text-xs text-surface-200">
                  Tap the Share button <ArrowUpTrayIcon className="inline-block w-3 h-3" /> then "Add to Home Screen"
                </p>
              ) : (
                <p className="mt-1 text-xs text-surface-200">
                  Add to your home screen for quick access and offline support
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-3 flex-shrink-0 text-white hover:text-surface-300"
            aria-label="Dismiss"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        {!isIOS && (
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleInstallClick}
              className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-highlight-900 hover:bg-surface-100 transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-sm font-medium text-white hover:text-surface-300 transition-colors"
            >
              Not now
            </button>
          </div>
        )}
        {isIOS && (
          <div className="mt-4">
            <button
              onClick={handleDismiss}
              className="w-full px-4 py-2 text-sm font-medium text-white hover:text-surface-300 transition-colors text-center"
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
