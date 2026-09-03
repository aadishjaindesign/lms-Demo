import { test, expect } from '@playwright/test';

test.describe('Student Authentication & Logout', () => {
  test('should login and navigate to dashboard', async ({ page }) => {
    // We expect the backend and frontend to be running.
    // The webServer in Playwright config only runs the frontend (npm run dev for NextJS).
    // The backend should also be mocked or running on port 5000.
    
    // For now, since it's an integration test, we can mock the API route for login if the real backend is not started by Playwright.
    await page.route('**/api/auth/student-login', async route => {
      const json = { success: true, message: 'Login successful' };
      await route.fulfill({ json, headers: { 'Set-Cookie': 'student_token=mock_token; Path=/; HttpOnly' } });
    });

    await page.route('**/api/student/dashboard', async route => {
      const json = { activeCoursesCount: 1, totalWatchTime: 120 };
      await route.fulfill({ json });
    });
    
    await page.route('**/api/auth/verify', async route => {
      const json = { isAuthenticated: true, user: { role: 'student', name: 'Mock Student' } };
      await route.fulfill({ json });
    });

    await page.goto('/login');
    
    // Check elements
    await expect(page.getByPlaceholder(/Student ID/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Password/i)).toBeVisible();
    
    // Fill login form
    await page.getByPlaceholder(/Student ID/i).fill('STU-100');
    await page.getByPlaceholder(/Password/i).fill('password123');
    await page.getByRole('button', { name: /Login/i }).click();
    
    // Expect redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Mock Student')).toBeVisible();
  });
});
