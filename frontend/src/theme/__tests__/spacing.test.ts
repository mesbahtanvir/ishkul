import { Spacing } from '../spacing';

describe('Spacing', () => {
  describe('base units', () => {
    it('should have xs spacing', () => {
      expect(Spacing.xs).toBe(4);
    });

    it('should have sm spacing', () => {
      expect(Spacing.sm).toBe(8);
    });

    it('should have md spacing', () => {
      expect(Spacing.md).toBe(16);
    });

    it('should have lg spacing', () => {
      expect(Spacing.lg).toBe(24);
    });

    it('should have xl spacing', () => {
      expect(Spacing.xl).toBe(32);
    });

    it('should have xxl spacing', () => {
      expect(Spacing.xxl).toBe(48);
    });

    it('should have xxxl spacing', () => {
      expect(Spacing.xxxl).toBe(64);
    });
  });

  describe('padding values', () => {
    it('should have all padding sizes', () => {
      expect(Spacing.padding.xs).toBe(4);
      expect(Spacing.padding.sm).toBe(8);
      expect(Spacing.padding.md).toBe(16);
      expect(Spacing.padding.lg).toBe(24);
      expect(Spacing.padding.xl).toBe(32);
    });
  });

  describe('margin values', () => {
    it('should have all margin sizes', () => {
      expect(Spacing.margin.xs).toBe(4);
      expect(Spacing.margin.sm).toBe(8);
      expect(Spacing.margin.md).toBe(16);
      expect(Spacing.margin.lg).toBe(24);
      expect(Spacing.margin.xl).toBe(32);
    });
  });

  describe('gap values', () => {
    it('should have all gap sizes', () => {
      expect(Spacing.gap.xs).toBe(4);
      expect(Spacing.gap.sm).toBe(8);
      expect(Spacing.gap.md).toBe(16);
      expect(Spacing.gap.lg).toBe(24);
      expect(Spacing.gap.xl).toBe(32);
    });
  });

  describe('screen padding', () => {
    it('should have screen padding', () => {
      expect(Spacing.screen).toBe(16);
    });

    it('should have large screen padding', () => {
      expect(Spacing.screenLarge).toBe(24);
    });
  });

  describe('button heights', () => {
    it('should have small button height', () => {
      expect(Spacing.buttonHeight.small).toBe(40);
    });

    it('should have medium button height', () => {
      expect(Spacing.buttonHeight.medium).toBe(48);
    });

    it('should have large button height', () => {
      expect(Spacing.buttonHeight.large).toBe(56);
    });
  });

  describe('4px base unit', () => {
    it('should follow 4px base unit pattern', () => {
      expect(Spacing.xs % 4).toBe(0);
      expect(Spacing.sm % 4).toBe(0);
      expect(Spacing.md % 4).toBe(0);
      expect(Spacing.lg % 4).toBe(0);
      expect(Spacing.xl % 4).toBe(0);
      expect(Spacing.xxl % 4).toBe(0);
      expect(Spacing.xxxl % 4).toBe(0);
    });

    it('should have button heights as multiples of 8', () => {
      expect(Spacing.buttonHeight.small % 8).toBe(0);
      expect(Spacing.buttonHeight.medium % 8).toBe(0);
      expect(Spacing.buttonHeight.large % 8).toBe(0);
    });
  });

  describe('consistency', () => {
    it('should have matching padding, margin, and gap values', () => {
      expect(Spacing.padding.xs).toBe(Spacing.margin.xs);
      expect(Spacing.padding.sm).toBe(Spacing.margin.sm);
      expect(Spacing.padding.md).toBe(Spacing.margin.md);
      expect(Spacing.padding.lg).toBe(Spacing.margin.lg);
      expect(Spacing.padding.xl).toBe(Spacing.margin.xl);

      expect(Spacing.padding.xs).toBe(Spacing.gap.xs);
      expect(Spacing.padding.sm).toBe(Spacing.gap.sm);
      expect(Spacing.padding.md).toBe(Spacing.gap.md);
      expect(Spacing.padding.lg).toBe(Spacing.gap.lg);
      expect(Spacing.padding.xl).toBe(Spacing.gap.xl);
    });
  });
});
