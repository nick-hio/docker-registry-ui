import { useEffect, useState } from 'react';
import type { Settings } from './config';
const colorMap: Record<string, string[]> = {
  PRIMARY_TEXT: ['foreground', 'card-foreground', 'popover-foreground'],
  NEUTRAL_TEXT: ['muted-foreground'],
  BACKGROUND: ['background', 'card', 'popover'],
  HOVER_BACKGROUND: ['muted', 'accent', 'sidebar-accent'],
  ACCENT_TEXT: ['primary', 'ring'],
  HEADER_TEXT: ['sidebar-foreground'],
  HEADER_ACCENT_TEXT: ['sidebar-accent-foreground', 'sidebar-primary'],
  HEADER_BACKGROUND: ['sidebar'],
  FOOTER_TEXT: ['footer-text'],
  FOOTER_NEUTRAL_TEXT: ['footer-muted'],
  FOOTER_BACKGROUND: ['footer-background'],
};
function storedTheme() {
  try {
    return localStorage.getItem('registryUiTheme');
  } catch {
    return null;
  }
}
export function useRegistryTheme(settings: Settings) {
  const [manual, setManual] = useState(storedTheme);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const dark = settings.theme === 'dark' || (settings.theme !== 'light' && (manual ? manual === 'dark' : systemDark));
  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    Object.entries(settings.themeColors).forEach(([key, value]) =>
      colorMap[key]?.forEach((variable) => document.documentElement.style.setProperty(`--${variable}`, value)),
    );
  }, [dark, settings]);
  return {
    dark,
    toggle: () => {
      const value = dark ? 'light' : 'dark';
      setManual(value);
      try {
        localStorage.setItem('registryUiTheme', value);
      } catch {
        /* Optional persistence. */
      }
    },
  };
}
