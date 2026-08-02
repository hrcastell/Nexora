import type { Component } from 'vue';
import * as LucideIcons from 'lucide-vue-next';
import { Settings } from 'lucide-vue-next';

const icons = LucideIcons as unknown as Record<string, Component>;

function kebabToPascal(code: string): string {
  return code
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Resolves an icon code coming from the backend (module_catalog.icon,
 * module_transactions.icon) to a Lucide component. Accepts both the
 * standard lucide kebab-case name (e.g. 'clipboard-list', how every icon
 * seeded after the initial rollout is stored) and legacy PascalCase codes
 * (e.g. 'LayoutDashboard', how the earliest `configuration` module rows
 * were seeded) — looks up directly against lucide-vue-next's full export
 * set instead of a hand-maintained whitelist, so any valid icon name works
 * without ever needing a frontend change again. Falls back to Settings.
 */
export function resolveMenuIcon(code?: string | null): Component {
  if (!code) return Settings;
  const pascal = /^[A-Z]/.test(code) ? code : kebabToPascal(code);
  return icons[pascal] ?? Settings;
}
