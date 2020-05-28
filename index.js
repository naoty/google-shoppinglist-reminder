const playwright = require("playwright");
const process = require("process");
const url = require("url");

(async () => {
  const browser = await playwright.firefox.launch({
    headless: false,
    slowMo: 10,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://shoppinglist.google.com");

  const url = new URL(page.url());

  // Sign in
  if (url.hostname === "accounts.google.com") {
    await page.type("input[type='email']", process.env.GOOGLE_ID);
    await page.click("#identifierNext");
    await page.waitForSelector("input[type='password']");
    await page.type("input[type='password']", process.env.GOOGLE_PASSWORD);
    await page.click("#passwordNext");
  }

  await page.waitForSelector("shopping-list");
  const shoppingListItems = await page.$$("shopping-list-item");
  const texts = await Promise.all(
    Array.from(shoppingListItems).map(element => element.innerText())
  );

  // TODO: send these texts to Slack
  console.log(texts);

  await browser.close();
})();
