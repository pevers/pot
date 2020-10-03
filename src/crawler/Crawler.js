const puppeteer = require('puppeteer');

let args = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-infobars',
  '--window-position=0,0',
  '--ignore-certifcate-errors',
  '--ignore-certifcate-errors-spki-list'
];

if (process.env.NODE_ENV === 'prod') {
  args = [...args, '--headless', '--disable-gpu'];
}

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36';
const RESPONSE_BUTTON = 'Beantwoorden'; // TODO: Make this generic somehow
const FRAME_UPPER_LIMIT = 30; // Record 30 s max frames

class Crawler {

  constructor({
    inviteLink = null,
    puppeteerOptions = {
      args,
      headless: process.env.NODE_ENV === 'prod',
      ignoreHTTPSErrors: true,
      userDataDir: './tmp',
      timeout: 180000
    }
  }) {
    this.puppeteerOptions = puppeteerOptions;
    this.inviteLink = inviteLink;
    this.frame = 0;

    if (this.inviteLink === null) {
      throw new Error('Not a valid invite link provided');
    }
  }

  /**
   * Try to enter the Whatsapp group. If we need to login we return a link to the QR code.
   */
  async login() {
    this.browser = await puppeteer.launch(this.puppeteerOptions);
    this.page = await this.browser.newPage();
    this.page.on('console', msg => console.log('Page log:', msg));
    this.page.on('pageerror', msg => console.log('Error:', msg));

    await this.page.setUserAgent(USER_AGENT);
    await this.page.setViewport({width: 800, height: 800, deviceScaleFactor: 2});

    console.log('Invite link', this.inviteLink);
    await this.page.goto(this.inviteLink, {
      waitUntil: 'networkidle0',
      timeout: 0
    });
    await this.page.waitForSelector('#pane-side, img[alt="Scan me!"]');

    // Check if we logged in or we got the QR code
    const qr = await this.page.evaluate(() => {
      const scanMe = document.querySelector('img[alt="Scan me!"]');
      return scanMe !== null ? scanMe.getAttribute('src') : null;
    });
    await this.page.evaluate(() => document.querySelector('#pane-side'));

    // Try to redirect again, it doesn't redirect if the user had to log-in
    await this.page.goto(this.inviteLink, {
      waitUntil: 'networkidle0',
      timeout: 0
    });
    await this.page.addScriptTag({ path: 'src/whatsapp/Parser.js' });
    await this.scrollToBottom();

    if (qr !== null) {
      return {
        success: false,
        qr
      }
    }

    return {
      success: true
    }
  }

  async readMessages(scrollToDate) {
    if (!this.browser || !this.page) {
      throw new Error('You are not logged in');
    }

    try {
      await this.page.waitForSelector('#pane-side');
    } catch(error) {
      throw new Error('You are probably not logged-in');
    }

    // Start reading till we reach the end or just the current page if no scrolldate
    return await this.page.evaluate((scrollToDate) => {
      return new Promise((resolve) => {
        const loader = window.setInterval(() => {
          const messages = Parser.parseMessages();
          if (scrollToDate === undefined) {
            clearInterval(loader);
            return resolve(messages);
          }

          const newMessages = messages.filter(message => new Date(message.date) > new Date(lastKnownDate));
          if (messages.length !== newMessages.length) {
            clearInterval(loader);
            return resolve(newMessages);
          }
          document.querySelector('div[tabindex="0"]').scrollTo(0,0);  // Scroll focus box
        }, 1500);
      });
    }, scrollToDate);
  }
  
  async scrollToBottom() {
    try {
      await this.page.click('._3KRbU');
    } catch(error) {
      console.log('Probably already at the end of the page, not scrolling');
    }
  }

  async respondTo(id, text) {
    await this.page.hover('div[id="' + id + '"] ._1zGQT');
    await this.page.click('span[data-icon="down-context"]');
    await this.page.click('div[title="' + RESPONSE_BUTTON + '"]');
    await this.page.keyboard.type(text + '\n', { delay: 100 });
  }

  async recordScreen() {
    if (!this.page) {
      return;
    }
    await this.page.screenshot({ path: `./stream/frame-${this.frame}.png` });
    await this.page.screenshot({ path: `./stream/out.png` });
    this.frame++;
    if (this.frame > FRAME_UPPER_LIMIT) {
      this.frame = 0;
    }
  }

  async recordError() {
    if (!this.page) {
      return;
    }
    await this.page.screenshot({ path: './tmp/error.png' });
  }
}

module.exports = Crawler;