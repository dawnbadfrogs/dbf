export const SOLANA_WALLET_LIST = [
  'detected_solana_wallets',
  'phantom',
  'solflare',
  'backpack',
  'wallet_connect_qr_solana',
];

export function getWalletAddress(user) {
  if (!user) return null;

  const isSolana = (account) =>
    account?.chainType === 'solana' ||
    (account?.type === 'wallet' && account.address && !String(account.address).startsWith('0x'));

  if (isSolana(user.wallet)) return user.wallet.address;

  const linked = user.linkedAccounts?.find(isSolana);
  if (linked?.address) return linked.address;

  if (user.wallet?.address && !String(user.wallet.address).startsWith('0x')) {
    return user.wallet.address;
  }
  return null;
}

export function bytesToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}
