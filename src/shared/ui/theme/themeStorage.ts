export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ecotrack_theme_preference';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getStoredThemePreference(): ThemePreference {
  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (isThemePreference(rawValue)) {
    return rawValue;
  }

  window.localStorage.setItem(STORAGE_KEY, 'system');
  return 'system';
}

export function setStoredThemePreference(value: ThemePreference): void {
  window.localStorage.setItem(STORAGE_KEY, value);
}
