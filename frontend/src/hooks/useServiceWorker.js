import { useEffect } from 'react';

/**
 * Custom hook to register the service worker
 * Handles registration, updates, and error states
 */
export function useServiceWorker() {
  useEffect(() => {
    // Only register service worker in production
    if (import.meta.env.DEV) {
      console.log('Service worker registration skipped in development mode');
      return;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers are not supported in this browser');
      return;
    }

    // Register the service worker
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('Service Worker registered successfully:', registration);

        // Check for updates on page load
        registration.update();

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              console.log('New service worker available');

              // Optionally, you can prompt the user to reload
              if (confirm('A new version is available. Reload to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });

        // Reload page when new service worker takes control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            window.location.reload();
            refreshing = true;
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerServiceWorker();
  }, []);
}
