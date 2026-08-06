/**
 * IconGenerator Service
 * Guarantees zero duplicate icon assignments among Teams.
 */

export const PREDEFINED_ICONS = [
  'Shield', 'Trophy', 'Zap', 'Crown', 'Flame', 
  'Star', 'Falcon', 'Target', 'Sparkles', 'Award', 
  'Sword', 'Crest', 'Diamond', 'Hexagon', 'Eagle', 
  'Panther', 'Knight', 'Trident', 'Lightning', 'Skull'
];

/**
 * Returns a unique icon name from the available sports vector icons
 */
export function getUniqueIcon(usedIcons = []) {
  const normalizedUsed = usedIcons.map(i => (i || '').trim());

  // 1. Find first unused icon from predefined list
  for (const icon of PREDEFINED_ICONS) {
    if (!normalizedUsed.includes(icon)) {
      return icon;
    }
  }

  // 2. Fallback for 20+ teams: indexed dynamic preset
  let counter = 1;
  while (true) {
    const dynamicName = `CustomIcon_${counter}`;
    if (!normalizedUsed.includes(dynamicName)) {
      return dynamicName;
    }
    counter++;
  }
}
