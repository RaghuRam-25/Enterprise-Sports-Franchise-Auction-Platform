/**
 * ThemeGenerator Service
 * Orchestrates Color, Icon, and Logo generators into a unified theme object.
 */
import { generateUniqueColorPalette } from './ColorGenerator.js';
import { getUniqueIcon } from './IconGenerator.js';
import { generateUniqueLogo } from './LogoGenerator.js';

export function buildCompleteTeamTheme(teamName, existingTeams = []) {
  const existingColors = existingTeams.map(t => t.primaryColor).filter(Boolean);
  const existingIcons = existingTeams.map(t => t.icon).filter(Boolean);
  const existingLogos = existingTeams.map(t => t.logoSvg || t.logoKey).filter(Boolean);

  const palette = generateUniqueColorPalette(existingColors);
  const icon = getUniqueIcon(existingIcons);
  const logoObj = generateUniqueLogo(teamName, palette.primaryColor, palette.secondaryColor, existingLogos);

  return {
    icon,
    primaryColor: palette.primaryColor,
    secondaryColor: palette.secondaryColor,
    accentColor: palette.accentColor,
    gradient: palette.gradient,
    textColor: '#ffffff',
    borderColor: palette.borderColor,
    glowColor: palette.glowColor,
    logoSvg: logoObj.svgString,
    logoKey: logoObj.comboKey
  };
}

export function buildCategoryTheme(categoryName, existingCategories = []) {
  const existingColors = existingCategories.map(c => c.color || c.primaryColor).filter(Boolean);
  const palette = generateUniqueColorPalette(existingColors);

  return {
    color: palette.primaryColor,
    gradient: palette.gradient,
    borderColor: palette.borderColor,
    glowColor: palette.glowColor,
    badgeColor: `bg-[${palette.primaryColor}]/15 text-slate-100 border-[${palette.primaryColor}]/40`
  };
}
