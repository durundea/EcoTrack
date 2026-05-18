import { test, expect } from '@playwright/test';

test('collector cannot access inventory page', async ({ page }) => {
  // Log in as collector
  await page.goto('/login');
  await page.getByLabel('Email').fill('collector@ecotrack.local');
  await page.getByLabel('Password').fill('collector123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Should be on collection (allowed route for collector)
  await expect(page).toHaveURL(/collection/);

  // Try to navigate to inventory
  await page.goto('/inventory');
  await expect(page.getByText('Access denied')).toBeVisible();
});

test('admin can access inventory page', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@ecotrack.local');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.goto('/inventory');
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
});
