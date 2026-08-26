export function buildClaimMessage(wallet, weekIndex = 'all') {
  const w = String(wallet || '').trim();
  return `DBF claim\nwallet:${w}\nweek:${weekIndex}\n`;
}
