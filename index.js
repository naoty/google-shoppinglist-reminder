const { WebClient } = require("@slack/web-api");
const playwright = require("playwright");
const process = require("process");
const url = require("url");

const slack = new WebClient(process.env.SLACK_TOKEN);
const conversation = process.env.SLACK_CONVERSATION_ID;
const listPrefix = "• ";

(async () => {
  let config = {};
  if (process.env.hasOwnProperty("DEBUG")) {
    config.headless = true;
    config.slowMo = 10;
  }
  // For Heroku to launch browser
  if (process.env.hasOwnProperty("DYNO")) {
    config.args = ["--no-sandbox", "--disable-setuid-sandbox"];
  }
  const browser = await playwright.firefox.launch(config);
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

  await browser.close();

  // Format items
  texts = texts.map(text => {
    let sections = text.split("\n");

    // Remove strange words
    sections = sections.filter(section => section !== "local_mall");

    if (sections.length == 0) {
      return null;
    }

    if (sections.length == 1) {
      return `${listPrefix}${sections[0]}`;
    }

    return `${listPrefix}${sections[0]}（${sections.slice(1).join(" ")}）`;
  });

  texts = texts.filter(text => text !== null);

  if (process.env.hasOwnProperty("DEBUG")) {
    console.log(texts);
    return;
  }

  await slack.chat.postMessage({
    channel: conversation,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: texts.join("\n") },
      },
    ],
  });
})();
