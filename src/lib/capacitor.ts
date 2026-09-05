// Capacitor native mobile runtime helper utilities
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

/**
 * Checks if running inside a native mobile runtime (iOS or Android)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): 'ios' | 'android' | 'web' => {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
};

/**
 * Initialize mobile environment styling and classes for safe area handling
 */
export const initAppEnvironment = (): void => {
  if (typeof document === 'undefined') return;

  const isAndroid =
    Capacitor.getPlatform() === 'android' ||
    (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent));

  if (isAndroid) {
    document.documentElement.classList.add('is-android');
    document.body.classList.add('is-android');
  }

  if (Capacitor.isNativePlatform()) {
    document.documentElement.classList.add('is-native');
    document.body.classList.add('is-native');
    if (isAndroid) {
      document.documentElement.classList.add('is-native-android');
      document.body.classList.add('is-native-android');
    }
  }
};

// Run automatically on module load
initAppEnvironment();

/**
 * Configure native mobile status bar to match app dark/light theme
 */
export const updateNativeStatusBar = async (isDark: boolean): Promise<void> => {
  if (!Capacitor.isPluginAvailable('StatusBar')) return;

  try {
    // Style.Dark shows light text/icons (for dark background)
    // Style.Light shows dark text/icons (for light background)
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light,
    });

    if (Capacitor.getPlatform() === 'android') {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch {
        // ignore
      }
      try {
        await StatusBar.setBackgroundColor({
          color: isDark ? '#09090b' : '#f4f4f6',
        });
      } catch {
        // ignore
      }
    }
  } catch {
    // Graceful fallback if running in non-native or unsupported environment
  }
};

/**
 * Haptic feedback helper - completely removed/disabled for phone as requested
 */
export const triggerHaptic = async (
  _type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light'
): Promise<void> => {
  // Haptic feedback removed for phone per user request
  return;
};

/**
 * Hardware back button listener registration for Android Capacitor
 */
export const registerNativeBackButton = (onBack: () => boolean | Promise<boolean>) => {
  if (!Capacitor.isPluginAvailable('App')) {
    return () => {};
  }

  let handlePromise = CapApp.addListener('backButton', async (data) => {
    // If our app handled the back action (e.g. closed a modal), do not exit
    const handled = await onBack();
    if (!handled && data.canGoBack) {
      window.history.back();
    } else if (!handled && !data.canGoBack) {
      CapApp.exitApp();
    }
  });

  return () => {
    handlePromise.then((handle) => handle.remove()).catch(() => {});
  };
};

/**
 * Fetch native app version and build number, with fallback for web
 */
export const getAppVersion = async (): Promise<{ version: string; build: string; name: string }> => {
  if (Capacitor.isPluginAvailable('App')) {
    try {
      const info = await CapApp.getInfo();
      return {
        name: info.name || 'Memento',
        version: info.version || '1.0.0',
        build: info.build || '1',
      };
    } catch {
      // ignore
    }
  }
  return {
    name: 'Memento',
    version: '1.0.0',
    build: '1',
  };
};

