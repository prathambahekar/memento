import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
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
      await StatusBar.setBackgroundColor({
        color: isDark ? '#09090b' : '#f4f4f6',
      });
    }
  } catch {
    // Graceful fallback if running in non-native or unsupported environment
  }
};

/**
 * Haptic feedback helpers for native feel, with graceful fallback on web
 */
export const triggerHaptic = async (
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light'
): Promise<void> => {
  if (Capacitor.isPluginAvailable('Haptics')) {
    try {
      if (type === 'light') {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (type === 'medium') {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (type === 'heavy') {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (type === 'selection') {
        await Haptics.selectionChanged();
      } else if (type === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (type === 'warning') {
        await Haptics.notification({ type: NotificationType.Warning });
      } else if (type === 'error') {
        await Haptics.notification({ type: NotificationType.Error });
      }
      return;
    } catch {
      // ignore
    }
  }

  // Web fallback
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'light' || type === 'selection') {
        navigator.vibrate(10);
      } else if (type === 'medium') {
        navigator.vibrate(20);
      } else if (type === 'success') {
        navigator.vibrate([15, 40, 15]);
      }
    } catch {
      // ignore
    }
  }
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

