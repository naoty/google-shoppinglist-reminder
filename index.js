const { WebClient } = require("@slack/web-api");
const playwright = require("playwright");
const process = require("process");
const url = require("url");

const slack = new WebClient(process.env.SLACK_TOKEN);
const conversation = process.env.SLACK_CONVERSATION_ID;
const listPrefix = "• ";

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
  const items = await page.$$("shopping-list-item");

  let texts = Array.from(items).map(element => element.innerText());
  texts = await Promise.all(texts);

  // Remove strange words rarely included
  texts = texts.filter(text => text != "local_mall");

  // Format items
  texts = texts.map(text => {
    const sections = text.split("\n");
    if (sections.length < 2) {
      return `${listPrefix}${text}`;
    }

    return `${listPrefix}${sections[0]}（${sections.slice(1).join(" ")}）`;
  });

  await slack.chat.postMessage({
    channel: conversation,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: texts.join("\n") },
      },
    ],
  });

  await browser.close();
})();
