const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:9002/auth-test');
  await page.waitForSelector('pre');
  const text = await page.$eval('pre', el => el.textContent);
  console.log('RESULT:', text);
  await browser.close();
})();
