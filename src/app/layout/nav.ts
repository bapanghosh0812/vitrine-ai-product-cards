import type { IconName } from '../shared/ui/icons';

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  shortcut?: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Studio', path: '/studio', icon: 'wand', shortcut: 'G S' },
  { label: 'Library', path: '/library', icon: 'library', shortcut: 'G L' },
  { label: 'Templates', path: '/templates', icon: 'template', shortcut: 'G T' },
  { label: 'Brand Kit', path: '/brand-kit', icon: 'palette', shortcut: 'G B' },
];

export const SECONDARY_NAV: NavItem[] = [
  { label: 'Help Center', path: '/help', icon: 'help' },
  { label: 'Settings', path: '/settings', icon: 'settings' },
];

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
}
