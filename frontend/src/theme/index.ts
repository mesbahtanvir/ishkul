/**
 * Theme Export
 * Centralized theme system
 */

export { Colors } from './colors';
export { Typography } from './typography';
export { Spacing } from './spacing';

import Colors from './colors';
import Typography from './typography';
import Spacing from './spacing';

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
};

export default Theme;
