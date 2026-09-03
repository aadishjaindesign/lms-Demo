import { test, expect } from '@playwright/test';

test.describe('Student Portal Responsive UI', () => {
  // Array of viewports to test
  const viewports = [
    { width: 260, height: 600, name: '260px' },
    { width: 320, height: 640, name: '320px' },
    { width: 375, height: 667, name: '375px' },
    { width: 480, height: 800, name: '480px' },
    { width: 768, height: 1024, name: '768px' },
    { width: 1024, height: 768, name: '1024px' },
    { width: 1440, height: 900, name: '1440px' }
  ];

  for (const vp of viewports) {
    test(`Login page should not have horizontal overflow on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      
      // Wait for network idle or main content to render
      await page.waitForLoadState('networkidle');

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(overflow, `Horizontal overflow detected on ${vp.name} viewport`).toBe(false);
    });
  }
});
