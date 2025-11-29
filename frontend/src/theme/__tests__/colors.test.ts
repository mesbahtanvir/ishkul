import { Colors } from '../colors';

describe('Colors', () => {
  describe('primary colors', () => {
    it('should have primary color', () => {
      expect(Colors.primary).toBe('#0066FF');
    });

    it('should have primaryLight color', () => {
      expect(Colors.primaryLight).toBe('#E6F0FF');
    });

    it('should have primaryDark color', () => {
      expect(Colors.primaryDark).toBe('#0052CC');
    });
  });

  describe('secondary colors', () => {
    it('should have secondary color', () => {
      expect(Colors.secondary).toBe('#6B7280');
    });

    it('should have secondaryLight color', () => {
      expect(Colors.secondaryLight).toBe('#F3F4F6');
    });

    it('should have secondaryDark color', () => {
      expect(Colors.secondaryDark).toBe('#374151');
    });
  });

  describe('accent colors', () => {
    it('should have success color', () => {
      expect(Colors.success).toBe('#10B981');
    });

    it('should have warning color', () => {
      expect(Colors.warning).toBe('#F59E0B');
    });

    it('should have danger color', () => {
      expect(Colors.danger).toBe('#EF4444');
    });

    it('should have info color', () => {
      expect(Colors.info).toBe('#3B82F6');
    });
  });

  describe('neutral palette', () => {
    it('should have white and black', () => {
      expect(Colors.white).toBe('#FFFFFF');
      expect(Colors.black).toBe('#000000');
    });

    it('should have gray scale', () => {
      expect(Colors.gray50).toBe('#F9FAFB');
      expect(Colors.gray100).toBe('#F3F4F6');
      expect(Colors.gray200).toBe('#E5E7EB');
      expect(Colors.gray300).toBe('#D1D5DB');
      expect(Colors.gray400).toBe('#9CA3AF');
      expect(Colors.gray500).toBe('#6B7280');
      expect(Colors.gray600).toBe('#4B5563');
      expect(Colors.gray700).toBe('#374151');
      expect(Colors.gray800).toBe('#1F2937');
      expect(Colors.gray900).toBe('#111827');
    });
  });

  describe('semantic colors', () => {
    it('should have text colors', () => {
      expect(Colors.text.primary).toBe('#111827');
      expect(Colors.text.secondary).toBe('#6B7280');
      expect(Colors.text.tertiary).toBe('#9CA3AF');
      expect(Colors.text.inverse).toBe('#FFFFFF');
    });

    it('should have background colors', () => {
      expect(Colors.background.primary).toBe('#FFFFFF');
      expect(Colors.background.secondary).toBe('#F9FAFB');
      expect(Colors.background.tertiary).toBe('#F3F4F6');
      expect(Colors.background.overlay).toBe('rgba(0, 0, 0, 0.5)');
    });

    it('should have border and divider colors', () => {
      expect(Colors.border).toBe('#E5E7EB');
      expect(Colors.divider).toBe('#F3F4F6');
    });
  });

  describe('color format', () => {
    it('should have valid hex colors', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;

      expect(Colors.primary).toMatch(hexRegex);
      expect(Colors.white).toMatch(hexRegex);
      expect(Colors.gray500).toMatch(hexRegex);
    });

    it('should have valid rgba for overlay', () => {
      expect(Colors.background.overlay).toMatch(/^rgba\(/);
    });
  });
});
