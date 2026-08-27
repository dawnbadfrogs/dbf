export const TOKEN_MINT = '4C9ycNvkDZMxvF6cWPa5qfMHMSbu8vB7nK6MVpKspump';
export const TOKEN_DECIMALS = 6;
export const TREASURY_WALLET = 'DBFnC5gJ7ZuuXafiwBLuZjMj9F2dbnBXJ1J44sA2hqwD';

export const SOCIAL = {
  x: 'https://x.com/DawnBadFrogs',
  pools: TOKEN_MINT ? `https://pump.fun/coin/${TOKEN_MINT}` : '',
};

export const APP_NAME = 'Dawn Bad Frogs';
export const APP_SHORT = 'DBF';
export const TOKEN_SYMBOL = '$DBF';
export const SOCIAL_HANDLE = '@DawnBadFrogs';

export const APP_TAGLINE = 'Rekt to Earn on Solana';

export const FOOTER_BLURB =
  'Dawn Bad Frogs is a Rekt to Earn platform on Solana. Rewards come from a central treasury based on verified trading losses.';

export const COPYRIGHT_LINE = '© 2026 Dawn Bad Frogs · Solana Rekt to Earn';

export const MODULE_IDS = ['leaderboard', 'portfolio', 'tracker', 'treasury', 'nft'];
export const INFO_IDS = ['about', 'faq', 'docs'];

/** Modules shown as coming soon in the pond hub and module pages */
export const SOON_MODULES = new Set();

export const NFT_PRICE_SOL = 0.01;
export const NFT_PRICE_LABEL = `${NFT_PRICE_SOL} SOL`;
export const NFT_SUPPLY = 1111;
export const NFT_MINT_URL = String(import.meta.env.VITE_LMNFT_URL || '').trim();

export const NFT_UPGRADES = [
  { level: 'L1', burn: '25,000', multiplier: '1.10×' },
  { level: 'L2', burn: '75,000', multiplier: '1.20×' },
  { level: 'L3', burn: '175,000', multiplier: '1.30×' },
  { level: 'L4', burn: '400,000', multiplier: '1.40×' },
];

export const NFT_UPGRADE_NOTE = `Burns are ${TOKEN_SYMBOL}, no extra supply. Cap 1.40×.`;

export const NFT_CATALOG = [
  {
    id: 'genesis',
    name: 'Bad Frog Genesis',
    supply: '1,111',
    status: 'Live',
    floor: NFT_PRICE_LABEL,
    accent: '#FE77BC',
  },
];

export const NFT_LOOKS = [
  { id: 'norm', name: 'Normal', src: '/DBF_NORM.PNG', accent: '#70C431' },
  { id: 'silver', name: 'Silver', src: '/DBF_SILVER.PNG', accent: '#C5D0DC' },
  { id: 'gold', name: 'Gold', src: '/DBF_GOLD.PNG', accent: '#E8C547' },
];

export function applyDocumentBranding() {
  if (typeof document === 'undefined') return;

  document.title = 'Dawn Bad Frogs';

  const description =
    'Dawn Bad Frogs — Rekt to Earn on Solana. Swim the pond, climb the weekly loss leaderboard, and earn $DBF from the treasury.';

  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', 'Dawn Bad Frogs');
  document.querySelector('meta[property="og:description"]')?.setAttribute(
    'content',
    'Rekt to Earn on Solana. Cartoon pond hub, weekly epochs, treasury-funded $DBF.'
  );
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', 'Dawn Bad Frogs');
  document.querySelector('meta[name="twitter:description"]')?.setAttribute(
    'content',
    'Rekt to Earn on Solana.'
  );

  let twitterSite = document.querySelector('meta[name="twitter:site"]');
  if (!twitterSite) {
    twitterSite = document.createElement('meta');
    twitterSite.setAttribute('name', 'twitter:site');
    document.head.appendChild(twitterSite);
  }
  twitterSite.setAttribute('content', '@DawnBadFrogs');
}
