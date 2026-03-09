/**
 * Generate a deterministic username from a pubkey or seed string
 */
export function genUserName(seed: string): string {
  const adjectives = [
    'Brave', 'Swift', 'Bold', 'Bright', 'Calm', 'Dark', 'Free', 'Keen', 'Pure', 'Wild',
    'Wise', 'Gentle', 'Sharp', 'Quiet', 'Fierce', 'Noble', 'Daring', 'Proud', 'Nimble', 'Valiant',
  ];
  const nouns = [
    'Hawk', 'Wolf', 'Fox', 'Bear', 'Lion', 'Lynx', 'Owl', 'Stag', 'Raven', 'Crow',
    'Whale', 'Eagle', 'Falcon', 'Tiger', 'Panther', 'Dragon', 'Phoenix', 'Cobra', 'Viper', 'Shark',
  ];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const absHash = Math.abs(hash);
  const adj = adjectives[absHash % adjectives.length];
  const noun = nouns[Math.floor(absHash / adjectives.length) % nouns.length];

  return `${adj} ${noun}`;
}
