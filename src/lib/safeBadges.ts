import {
  Shield,
  KeyRound,
  FileText,
  Image as ImageIcon,
  Mic,
  Tv,
  Share2,
  Terminal,
  Server,
  CreditCard,
  Lock,
  Mail,
} from 'lucide-react';
import { NoteItem } from '../types';

export const DEFAULT_PERSONAL_INFO_ID = 'safe-default-personal-info';

export function isPersonalInfoNote(note?: NoteItem | null): boolean {
  if (!note) return false;
  return Boolean(
    note.id === DEFAULT_PERSONAL_INFO_ID ||
    note.isPersonalInfo ||
    (note.title && note.title.trim().toLowerCase() === 'personal info') ||
    (note.title && note.title.trim().toLowerCase() === 'personal information') ||
    (note.title && note.title.trim().toLowerCase() === 'personal identity & documents')
  );
}

export interface SafeBadge {
  name: string;
  tag: string;
  icon: typeof Shield;
  darkPill: string;
  lightPill: string;
  darkIcon: string;
  lightIcon: string;
}

export const SAFE_BADGE_DEFINITIONS: Record<string, Omit<SafeBadge, 'tag'>> = {
  ott: {
    name: 'OTT',
    icon: Tv,
    darkPill: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
    lightPill: 'bg-rose-50 text-rose-600 border-rose-200',
    darkIcon: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    lightIcon: 'bg-rose-50 text-rose-600 border-rose-200',
  },
  social: {
    name: 'Social',
    icon: Share2,
    darkPill: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
    lightPill: 'bg-sky-50 text-sky-600 border-sky-200',
    darkIcon: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    lightIcon: 'bg-sky-50 text-sky-600 border-sky-200',
  },
  api: {
    name: 'API',
    icon: Terminal,
    darkPill: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    lightPill: 'bg-amber-50 text-amber-600 border-amber-200',
    darkIcon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    lightIcon: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  email: {
    name: 'Email',
    icon: Mail,
    darkPill: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
    lightPill: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    darkIcon: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    lightIcon: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  },
  passkey: {
    name: 'Auth',
    icon: Shield,
    darkPill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    lightPill: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    darkIcon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    lightIcon: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  finance: {
    name: 'Finance',
    icon: CreditCard,
    darkPill: 'bg-teal-500/15 text-teal-400 border-teal-500/25',
    lightPill: 'bg-teal-50 text-teal-600 border-teal-200',
    darkIcon: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    lightIcon: 'bg-teal-50 text-teal-600 border-teal-200',
  },
  crypto: {
    name: 'Crypto',
    icon: Lock,
    darkPill: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    lightPill: 'bg-amber-50 text-amber-600 border-amber-200',
    darkIcon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    lightIcon: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  server: {
    name: 'Infra',
    icon: Server,
    darkPill: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    lightPill: 'bg-purple-50 text-purple-600 border-purple-200',
    darkIcon: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    lightIcon: 'bg-purple-50 text-purple-600 border-purple-200',
  },
  work: {
    name: 'Work',
    icon: KeyRound,
    darkPill: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    lightPill: 'bg-blue-50 text-blue-600 border-blue-200',
    darkIcon: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    lightIcon: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  personal: {
    name: 'Personal',
    icon: Shield,
    darkPill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    lightPill: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    darkIcon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    lightIcon: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
};

export const SAFE_TYPE_KEYWORDS: { tag: string; keywords: string[] }[] = [
  {
    tag: 'ott',
    keywords: [
      'netflix', 'prime', 'amazon prime', 'hulu', 'disney', 'disney+', 'hbo', 'max',
      'spotify', 'youtube', 'yt', 'apple tv', 'peacock', 'paramount', 'paramount+',
      'crunchyroll', 'twitch', 'hotstar', 'jio', 'sonyliv', 'zee5', 'tidal', 'deezer',
      'audible', 'streaming', 'stream', 'movie', 'cinema', 'ott', 'showtime', 'mubi',
      'viki', 'discovery', 'roku',
    ],
  },
  {
    tag: 'social',
    keywords: [
      'twitter', 'x.com', 'instagram', 'insta', 'ig', 'facebook', 'fb', 'linkedin',
      'reddit', 'tiktok', 'snapchat', 'snap', 'discord', 'pinterest', 'threads',
      'tumblr', 'mastodon', 'bluesky', 'telegram', 'whatsapp', 'wechat', 'signal',
      'social', 'messenger', 'quora', 'medium',
    ],
  },
  {
    tag: 'api',
    keywords: [
      'api', 'token', 'openai', 'chatgpt', 'gpt', 'anthropic', 'claude', 'stripe',
      'github pat', 'gitlab', 'huggingface', 'replicate', 'cohere', 'perplexity',
      'deepseek', 'gemini', 'groq', 'aws', 'amazon web', 'azure', 'gcp', 'google cloud',
      'sendgrid', 'twilio', 'resend', 'supabase', 'postman', 'rapidapi', 'firebase',
      'vercel', 'cloudflare', 'secret', 'bearer', 'webhook', 'elevenlabs', 'midjourney',
    ],
  },
  {
    tag: 'email',
    keywords: [
      'email', 'mail', 'gmail', 'google', 'yahoo', 'outlook', 'hotmail', 'proton',
      'protonmail', 'icloud', 'zoho', 'fastmail', 'aol', 'yandex', 'tutanota',
      'inbox', 'mailbox', 'exchange',
    ],
  },
  {
    tag: 'passkey',
    keywords: [
      'passkey', 'webauthn', 'yubikey', 'fido', 'fido2', 'security key', 'hardware key',
      'auth key', 'biometric',
    ],
  },
  {
    tag: 'server',
    keywords: [
      'server', 'ssh', 'vps', 'ec2', 'droplet', 'linode', 'digitalocean', 'hetzner',
      'root', 'host', 'ip', 'bastion', 'vpn', 'vnc', 'rdp', 'ftp', 'sftp',
    ],
  },
  {
    tag: 'finance',
    keywords: [
      'bank', 'chase', 'hdfc', 'sbi', 'icici', 'axis', 'citi', 'wells fargo',
      'boa', 'bank of america', 'paypal', 'revolut', 'wise', 'credit card', 'debit card',
      'cvv', 'pin', 'netbanking', 'iban', 'routing', 'swift', 'atm',
    ],
  },
  {
    tag: 'crypto',
    keywords: [
      'crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'metamask',
      'phantom', 'ledger', 'trezor', 'wallet', 'seed phrase', 'recovery phrase',
      'binance', 'coinbase', 'kraken', 'defi', 'web3',
    ],
  },
  {
    tag: 'work',
    keywords: ['work', 'slack', 'jira', 'confluence', 'notion', 'zoom', 'teams', 'workplace', 'company', 'corp', 'office'],
  },
  {
    tag: 'personal',
    keywords: ['personal', 'id', 'identity', 'passport', 'aadhaar', 'pan', 'license', 'licence', 'ssn', 'voter'],
  },
];

export function getSafeNoteBadge(note?: NoteItem | null): SafeBadge {
  if (!note) {
    return {
      tag: 'safe',
      name: '',
      icon: KeyRound,
      darkPill: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
      lightPill: 'bg-amber-50 text-amber-600 border-amber-200',
      darkIcon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      lightIcon: 'bg-amber-50 text-amber-600 border-amber-200',
    };
  }

  // 1. Personal Info check
  if (isPersonalInfoNote(note) || (note.personalInfo && note.personalInfo.length > 0)) {
    return { tag: 'personal', ...SAFE_BADGE_DEFINITIONS.personal };
  }

  // 2. Check explicit tags
  if (note.tags && Array.isArray(note.tags)) {
    for (const rawTag of note.tags) {
      const clean = rawTag.toLowerCase().replace(/^#/, '').trim();
      if (SAFE_BADGE_DEFINITIONS[clean]) {
        return { tag: clean, ...SAFE_BADGE_DEFINITIONS[clean] };
      }
    }
  }

  // 3. Keyword matching from title or service
  const text = `${note.title || ''} ${note.service || ''}`.toLowerCase().trim();
  if (text) {
    for (const item of SAFE_TYPE_KEYWORDS) {
      if (item.keywords.some((kw) => text.includes(kw))) {
        if (SAFE_BADGE_DEFINITIONS[item.tag]) {
          return { tag: item.tag, ...SAFE_BADGE_DEFINITIONS[item.tag] };
        }
      }
    }
  }

  // 4. Content-based fallbacks (docs, photos, voice)
  if (note.documents && note.documents.length > 0) {
    return {
      tag: 'documents',
      name: 'Doc',
      icon: FileText,
      darkPill: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
      lightPill: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      darkIcon: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      lightIcon: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    };
  }

  if ((note.images && note.images.length > 0) || note.imageUrl) {
    return {
      tag: 'photos',
      name: 'Photo',
      icon: ImageIcon,
      darkPill: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
      lightPill: 'bg-sky-50 text-sky-600 border-sky-200',
      darkIcon: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      lightIcon: 'bg-sky-50 text-sky-600 border-sky-200',
    };
  }

  if ((note.voiceNotes && note.voiceNotes.length > 0) || note.hasVoiceNote) {
    return {
      tag: 'voice',
      name: 'Voice',
      icon: Mic,
      darkPill: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
      lightPill: 'bg-rose-50 text-rose-600 border-rose-200',
      darkIcon: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      lightIcon: 'bg-rose-50 text-rose-600 border-rose-200',
    };
  }

  // 5. Default fallback safe key
  return {
    tag: 'safe',
    name: '',
    icon: KeyRound,
    darkPill: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    lightPill: 'bg-amber-50 text-amber-600 border-amber-200',
    darkIcon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    lightIcon: 'bg-amber-50 text-amber-600 border-amber-200',
  };
}
