"use strict"

const Crawler = require('./crawler/Crawler');
const server = require('./server');

(async () => {
  server.start();
  await startResponder();
})();

async function startResponder() {
  const crawler = new Crawler({inviteLink: process.env.TARGET_GROUP});
  try {
    const login = await crawler.login();
    console.log('login', login);
  } catch(error) {
    console.error('Got an error', error);
    await crawler.recordError();
  }

  // Strategy: token is refreshed constantly. We need to refresh it as well on every page refresh
  // if not logged in
  // await crawler.waitAndUpdateToken();

  // Array with all the messages I replied to!
  const repliedTo = [];

  setInterval(async () => {
    await crawler.recordScreen();
  }, 5000);

  // Clear the queue, otherwise bot is spammy
  // setTimeout(async () => {
  //   try {
  //     await crawler.readMessages();
  //   } catch(error) {
  //     console.warn('Failed to pre-emptively read messages', error);
  //     await crawler.recordError();
  //   }
  // }, 1500);

  setInterval(async () => {
    try {
        const messages = await crawler.readMessages();
        console.log('Parsed messages', messages);
        const replies = messages.filter(message => {
          // No text
          if (message.text === undefined) {
            return;
          }

          // Already respond to
          if (repliedTo.includes(message.id)) {
            return;
          }

          // And contains neuken
          const words = message.text.split(/(\b[^\s]+\b)/g).map(w => w.toLowerCase());
          if (words.includes('neuk') || words.includes('geneukt') || words.includes('neuken') || words.includes('neukte') || words.includes('neukt')) {
            return message;
          }
        });

        console.log('Found', replies);
        if (replies.length === 0) {
          return;
        }

        const randomReplies = ['Mooi!', 'Lekker gewerkt!', 'Zeer tevreden', 'Sow, veel bloed?', 'Plopperdeplop', 'Rescept', 'Mega veel kudos voor jou', 'Mocht je willen', 'Met wat dan?'];
        const reply = replies[replies.length-1]; // Only respond to 1 message to not go crazy
        await crawler.respondTo(reply.id, randomReplies[Math.floor(Math.random() * randomReplies.length)]);
        repliedTo.push(...replies);
    } catch(error) {
      console.warn(error);
      await crawler.recordError();
    }
  }, 3000);
}