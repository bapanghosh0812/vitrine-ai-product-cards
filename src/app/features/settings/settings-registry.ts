import type { IconName } from '../../shared/ui/icons';

export type SectionId =
  | 'account'
  | 'appearance'
  | 'brand-kit'
  | 'generation'
  | 'export'
  | 'privacy'
  | 'notifications'
  | 'accessibility'
  | 'help'
  | 'about';

export interface SettingsSection {
  id: SectionId;
  label: string;
  icon: IconName;
  blurb: string;
  /** Searchable items shown in results: label + keywords. */
  items: { label: string; keywords: string }[];
}

export const SECTIONS: SettingsSection[] = [
  {
    id: 'account',
    label: 'Account',
    icon: 'user',
    blurb: 'Name, email, password, sign out and account deletion.',
    items: [
      { label: 'Display name', keywords: 'name profile rename' },
      { label: 'Email address', keywords: 'email login' },
      { label: 'Change password', keywords: 'password security reset' },
      { label: 'Sign out', keywords: 'logout log out' },
      { label: 'Delete account', keywords: 'remove erase close account gdpr dpdp' },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: 'sun',
    blurb: 'Light, dark, OLED or follow your system.',
    items: [{ label: 'Theme', keywords: 'dark light oled black system mode colour color' }],
  },
  {
    id: 'brand-kit',
    label: 'Brand Kit',
    icon: 'palette',
    blurb: 'Use your brand voice and colours in generations.',
    items: [{ label: 'Use Brand Kit', keywords: 'brand voice colours colors avoid words' }],
  },
  {
    id: 'generation',
    label: 'Generation',
    icon: 'sparkles',
    blurb: 'Defaults for tone, language, variations, creativity and AI provider.',
    items: [
      { label: 'Default tone', keywords: 'tone voice style luxurious friendly playful' },
      { label: 'Default language', keywords: 'language hindi bengali english' },
      { label: 'Variations', keywords: 'variations three 3 options' },
      { label: 'Creativity', keywords: 'temperature creative precise balanced' },
      { label: 'AI provider', keywords: 'groq gemini model provider fallback' },
    ],
  },
  {
    id: 'export',
    label: 'Card & Export',
    icon: 'download',
    blurb: 'Default template, PNG scale and watermark.',
    items: [
      { label: 'Default template', keywords: 'template minimal luxe glass bold instagram marketplace' },
      { label: 'PNG export scale', keywords: 'png resolution scale retina' },
      { label: 'Watermark', keywords: 'watermark made with vitrine branding' },
    ],
  },
  {
    id: 'privacy',
    label: 'History & Privacy',
    icon: 'shield',
    blurb: 'Drafts, data export, local data and cookies.',
    items: [
      { label: 'Keep Studio draft', keywords: 'history draft autosave' },
      { label: 'Export my data', keywords: 'download data json portability gdpr' },
      { label: 'Clear local data', keywords: 'clear reset browser storage cache' },
      { label: 'Cookie settings', keywords: 'cookies consent storage preferences' },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications & Sound',
    icon: 'bell',
    blurb: 'Toasts, interface sounds and haptics.',
    items: [
      { label: 'Toast notifications', keywords: 'toast notification popup alert' },
      { label: 'Interface sounds', keywords: 'sound audio click' },
      { label: 'Haptics', keywords: 'vibration haptic phone' },
    ],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    icon: 'accessibility',
    blurb: 'Motion, text size, focus outlines and shortcuts.',
    items: [
      { label: 'Reduce motion', keywords: 'animation motion reduce' },
      { label: 'Larger text', keywords: 'font size text zoom' },
      { label: 'Strong focus outlines', keywords: 'focus keyboard outline' },
      { label: 'Keyboard shortcuts', keywords: 'shortcuts keyboard hotkeys' },
    ],
  },
  {
    id: 'help',
    label: 'Help',
    icon: 'help',
    blurb: 'Help Center, Ask Kabir and contacting a human.',
    items: [
      { label: 'Help Center', keywords: 'help docs guide faq' },
      { label: 'Ask Kabir', keywords: 'bot assistant chat support' },
      { label: 'Contact support', keywords: 'ticket human contact email' },
    ],
  },
  {
    id: 'about',
    label: 'About',
    icon: 'info',
    blurb: 'Version, credits, licences and policies.',
    items: [
      { label: 'Version', keywords: 'version build commit' },
      { label: 'Credits & licences', keywords: 'credits licence license fluent emoji fonts' },
      { label: 'Legal', keywords: 'terms privacy cookies ai disclaimer acceptable use' },
    ],
  },
];
