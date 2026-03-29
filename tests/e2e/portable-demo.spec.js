const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

test('portable demo opens from a standalone file and seeds showcase instances', async ({ page }) => {
    const demoPath = path.resolve(__dirname, '..', '..', 'mazerunner-demo.html');
    const demoUrl = pathToFileURL(demoPath).href;

    await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
        const bodyText = (document.body ? document.body.innerText : '').toLowerCase();
        return bodyText.includes('ai maze runner') && bodyText.includes('portable demo');
    });

    await expect(page).toHaveTitle(/AI Maze Runner Demo/i);
    await expect(page.locator('body')).toContainText(/Portable demo/i);
    await expect(page.locator('body')).toContainText(/session-only memory/i);
    await expect(page.locator('body')).toContainText('Instance');
});

test('portable demo can open a seeded instance from a direct file launch', async ({ page }) => {
    const demoPath = path.resolve(__dirname, '..', '..', 'mazerunner-demo.html');
    const demoUrl = pathToFileURL(demoPath).href;

    await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.instance-card')).toHaveCount(3);
    const values = await page.locator('.instance-card .instance-credentials strong').first().locator('xpath=ancestor::div[contains(@class,"instance-credentials")]//strong').allTextContents();
    const username = values[0];
    const password = values[1];

    const popupPromise = page.waitForEvent('popup');
    await page.locator('.instance-card .btn-enter').first().click();
    const appPage = await popupPromise;

    await expect(appPage.locator('.instance-login-page')).toBeVisible();
    await expect(appPage.locator('#loginAppName')).not.toHaveText('Application');
    await appPage.locator('#loginUsername').fill(username);
    await appPage.locator('#loginPassword').fill(password);
    await appPage.getByRole('button', { name: 'Sign In' }).click();
    await expect(appPage.locator('.app-container')).toBeVisible();
});
