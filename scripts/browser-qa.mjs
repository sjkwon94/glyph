import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const output = path.join(root, '.qa');
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ executablePath: edge, headless: true });
const consoleErrors = [];

try {
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  mobile.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await mobile.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });

  const mobileMetrics = await mobile.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.querySelector('.spotlight-copy h1')?.getBoundingClientRect().toJSON(),
    navVisible: getComputedStyle(document.querySelector('.bottom-nav')).display,
  }));
  await mobile.screenshot({ path: path.join(output, 'home-mobile-final.png'), fullPage: false });
  if (mobileMetrics.scrollWidth > mobileMetrics.innerWidth) throw new Error(`mobile horizontal overflow: ${mobileMetrics.scrollWidth}/${mobileMetrics.innerWidth}`);

  await mobile.goto('http://127.0.0.1:5173/#/discover', { waitUntil: 'networkidle' });
  await mobile.getByRole('button', { name: '수', exact: true }).click();
  await mobile.getByRole('button', { name: '무협', exact: true }).click();
  await mobile.waitForURL(/category=martial/);
  if (!mobile.url().includes('day=wed')) throw new Error('combined weekday and genre query was not preserved');
  const filteredTitles = await mobile.locator('.novel-card h3').allTextContents();
  if (filteredTitles.length !== 1 || filteredTitles[0] !== '재가 된 검') throw new Error(`combined filters failed: ${filteredTitles.join(', ')}`);

  await mobile.goto('http://127.0.0.1:5173/#/studio', { waitUntil: 'networkidle' });
  await mobile.getByRole('heading', { name: '승인된 작가만 연재할 수 있어요' }).waitFor();
  await mobile.screenshot({ path: path.join(output, 'studio-application-mobile.png'), fullPage: false });

  await mobile.goto('http://127.0.0.1:5173/#/wallet', { waitUntil: 'networkidle' });
  await mobile.getByText('쿠키 2배 이벤트', { exact: true }).waitFor();
  await mobile.screenshot({ path: path.join(output, 'wallet-event-mobile.png'), fullPage: false });

  await mobile.goto('http://127.0.0.1:5173/#/novel/ash-sword', { waitUntil: 'networkidle' });
  await mobile.waitForSelector('.novel-hero');
  await mobile.screenshot({ path: path.join(output, 'novel-mobile.png'), fullPage: false });
  await mobile.getByRole('link', { name: /첫 화 읽기/ }).click();
  await mobile.waitForSelector('.reader-content');
  await mobile.screenshot({ path: path.join(output, 'reader-mobile.png'), fullPage: false });
  for (let index = 0; index < 6 && !(await mobile.locator('.unlock-dialog').count()); index += 1) {
    await mobile.locator('.tap-right').click({ position: { x: 40, y: 300 } });
    await mobile.waitForTimeout(80);
  }
  if (!(await mobile.locator('.unlock-dialog').count())) throw new Error('next chapter unlock dialog did not open');
  await mobile.getByRole('button', { name: '30초 광고 보고 4 쿠키 받기', exact: true }).waitFor();

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await desktop.goto('http://127.0.0.1:5173/#/novel/ash-sword', { waitUntil: 'networkidle' });
  await desktop.waitForSelector('.novel-hero');
  await desktop.screenshot({ path: path.join(output, 'novel-desktop.png'), fullPage: false });
  await desktop.goto('http://127.0.0.1:5173/#/community/martial', { waitUntil: 'networkidle' });
  await desktop.waitForSelector('.community-feed');
  if (await desktop.getByRole('button', { name: /^전체/ }).count()) throw new Error('community still exposes an all-category button');
  const desktopMetrics = await desktop.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  await desktop.screenshot({ path: path.join(output, 'community-desktop.png'), fullPage: false });
  if (desktopMetrics.scrollWidth > desktopMetrics.innerWidth) throw new Error(`desktop horizontal overflow: ${desktopMetrics.scrollWidth}/${desktopMetrics.innerWidth}`);

  console.log(JSON.stringify({ mobile: mobileMetrics, desktop: desktopMetrics, consoleErrors }, null, 2));
  if (consoleErrors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
