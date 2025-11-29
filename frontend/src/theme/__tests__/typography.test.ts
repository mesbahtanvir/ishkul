import { Typography } from '../typography';

describe('Typography', () => {
  describe('display sizes', () => {
    it('should have large display style', () => {
      expect(Typography.display.large.fontSize).toBe(32);
      expect(Typography.display.large.lineHeight).toBe(40);
      expect(Typography.display.large.fontWeight).toBe('700');
      expect(Typography.display.large.letterSpacing).toBe(-0.5);
    });

    it('should have medium display style', () => {
      expect(Typography.display.medium.fontSize).toBe(28);
      expect(Typography.display.medium.lineHeight).toBe(36);
      expect(Typography.display.medium.fontWeight).toBe('700');
      expect(Typography.display.medium.letterSpacing).toBe(-0.3);
    });

    it('should have small display style', () => {
      expect(Typography.display.small.fontSize).toBe(24);
      expect(Typography.display.small.lineHeight).toBe(32);
      expect(Typography.display.small.fontWeight).toBe('700');
      expect(Typography.display.small.letterSpacing).toBe(0);
    });
  });

  describe('heading sizes', () => {
    it('should have h1 style', () => {
      expect(Typography.heading.h1.fontSize).toBe(28);
      expect(Typography.heading.h1.lineHeight).toBe(36);
      expect(Typography.heading.h1.fontWeight).toBe('700');
    });

    it('should have h2 style', () => {
      expect(Typography.heading.h2.fontSize).toBe(24);
      expect(Typography.heading.h2.lineHeight).toBe(32);
      expect(Typography.heading.h2.fontWeight).toBe('700');
    });

    it('should have h3 style', () => {
      expect(Typography.heading.h3.fontSize).toBe(20);
      expect(Typography.heading.h3.lineHeight).toBe(28);
      expect(Typography.heading.h3.fontWeight).toBe('700');
    });

    it('should have h4 style', () => {
      expect(Typography.heading.h4.fontSize).toBe(18);
      expect(Typography.heading.h4.lineHeight).toBe(26);
      expect(Typography.heading.h4.fontWeight).toBe('600');
    });
  });

  describe('body sizes', () => {
    it('should have large body style', () => {
      expect(Typography.body.large.fontSize).toBe(18);
      expect(Typography.body.large.lineHeight).toBe(28);
      expect(Typography.body.large.fontWeight).toBe('400');
    });

    it('should have medium body style', () => {
      expect(Typography.body.medium.fontSize).toBe(16);
      expect(Typography.body.medium.lineHeight).toBe(24);
      expect(Typography.body.medium.fontWeight).toBe('400');
    });

    it('should have small body style', () => {
      expect(Typography.body.small.fontSize).toBe(14);
      expect(Typography.body.small.lineHeight).toBe(20);
      expect(Typography.body.small.fontWeight).toBe('400');
      expect(Typography.body.small.letterSpacing).toBe(0.3);
    });
  });

  describe('label sizes', () => {
    it('should have large label style', () => {
      expect(Typography.label.large.fontSize).toBe(14);
      expect(Typography.label.large.lineHeight).toBe(20);
      expect(Typography.label.large.fontWeight).toBe('600');
      expect(Typography.label.large.letterSpacing).toBe(0.3);
    });

    it('should have medium label style', () => {
      expect(Typography.label.medium.fontSize).toBe(12);
      expect(Typography.label.medium.lineHeight).toBe(18);
      expect(Typography.label.medium.fontWeight).toBe('600');
    });

    it('should have small label style', () => {
      expect(Typography.label.small.fontSize).toBe(11);
      expect(Typography.label.small.lineHeight).toBe(16);
      expect(Typography.label.small.fontWeight).toBe('600');
      expect(Typography.label.small.letterSpacing).toBe(0.4);
    });
  });

  describe('button sizes', () => {
    it('should have large button style', () => {
      expect(Typography.button.large.fontSize).toBe(18);
      expect(Typography.button.large.lineHeight).toBe(26);
      expect(Typography.button.large.fontWeight).toBe('600');
    });

    it('should have medium button style', () => {
      expect(Typography.button.medium.fontSize).toBe(16);
      expect(Typography.button.medium.lineHeight).toBe(24);
      expect(Typography.button.medium.fontWeight).toBe('600');
    });

    it('should have small button style', () => {
      expect(Typography.button.small.fontSize).toBe(14);
      expect(Typography.button.small.lineHeight).toBe(20);
      expect(Typography.button.small.fontWeight).toBe('600');
    });
  });

  describe('line height ratios', () => {
    it('should have consistent line height ratios for readability', () => {
      // Display text should have 1.25 ratio (40/32)
      expect(Typography.display.large.lineHeight / Typography.display.large.fontSize).toBeCloseTo(1.25, 1);

      // Body text should have 1.5 ratio (24/16)
      expect(Typography.body.medium.lineHeight / Typography.body.medium.fontSize).toBe(1.5);

      // Labels should have smaller line height ratio
      expect(Typography.label.medium.lineHeight / Typography.label.medium.fontSize).toBe(1.5);
    });
  });

  describe('size hierarchy', () => {
    it('should have decreasing font sizes in display', () => {
      expect(Typography.display.large.fontSize).toBeGreaterThan(Typography.display.medium.fontSize);
      expect(Typography.display.medium.fontSize).toBeGreaterThan(Typography.display.small.fontSize);
    });

    it('should have decreasing font sizes in heading', () => {
      expect(Typography.heading.h1.fontSize).toBeGreaterThan(Typography.heading.h2.fontSize);
      expect(Typography.heading.h2.fontSize).toBeGreaterThan(Typography.heading.h3.fontSize);
      expect(Typography.heading.h3.fontSize).toBeGreaterThan(Typography.heading.h4.fontSize);
    });

    it('should have decreasing font sizes in body', () => {
      expect(Typography.body.large.fontSize).toBeGreaterThan(Typography.body.medium.fontSize);
      expect(Typography.body.medium.fontSize).toBeGreaterThan(Typography.body.small.fontSize);
    });
  });
});
