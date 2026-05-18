import { test, expect } from '@playwright/test';

test('admin full operational flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@ecotrack.local');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/dashboard/);

  // Visit collection schedule
  await page.getByRole('link', { name: 'Collection' }).click();
  await expect(page.getByRole('heading', { name: 'Pickup Schedule' })).toBeVisible();

  // Visit segregation
  await page.getByRole('link', { name: 'Segregation' }).click();
  await expect(page.getByRole('heading', { name: 'Waste Segregation' })).toBeVisible();

  // Visit recycling pipeline
  await page.getByRole('link', { name: 'Recycling' }).click();
  await expect(page.getByRole('heading', { name: 'Recycling Pipeline' })).toBeVisible();

  // Visit inventory
  await page.getByRole('link', { name: 'Inventory' }).click();
  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();

  // Visit dashboard
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible();
});
