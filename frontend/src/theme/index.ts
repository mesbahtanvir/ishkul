/**
 * Theme Export
 * Centralized theme system
 */

export { Colors, default as DefaultColors } from './colors';
export { Typography, default as DefaultTypography } from './typography';
export { Spacing, default as DefaultSpacing } from './spacing';

import Colors from './colors';
import Typography from './typography';
import Spacing from './spacing';

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
};

export default Theme;
