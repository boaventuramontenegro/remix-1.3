import { afterEach, describe, expect, it } from 'vitest';
import { applyLockBars, restoreAppBars, lockThemeColorInitScript, pinThemes, BRAND_BAR_COLOR, setLockGlobals } from '@/lib/pinThemes';
afterEach(() => { restoreAppBars(); localStorage.clear(); });
describe('Lock document colors, not physical Android bars', () => {
  it.each(pinThemes)('sets and restores $nome without changing the app theme', theme => {
    document.documentElement.classList.add('dark');
    applyLockBars(theme.id);
    expect(document.documentElement.dataset['lockBars']).toBe(theme.id);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(theme.statusBarColor);
    expect(document.documentElement.style.getPropertyValue('--system-lock-background')).not.toBe('');
    restoreAppBars();expect(document.documentElement.dataset['lockBars']).toBeUndefined();
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(BRAND_BAR_COLOR);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
  it('applies the saved galaxy color in the pre-React initialization script', () => {
    setLockGlobals(true,'galaxia');new Function(lockThemeColorInitScript)();
    expect(document.documentElement.dataset['lockBars']).toBe('galaxia');
    expect(document.documentElement.style.getPropertyValue('--system-lock-background')).toContain('/pin/galaxia.webp');
  });
});