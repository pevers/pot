/**
 * This file is injected into the browser.
 * Take into account the context, don't import Node modules!
 */

const HEADER = 'div[data-pre-plain-text]';
const CONTENT = '._12pGw';
const MESSAGE_IN = '.message-in:not([id])';
const MESSAGE_OUT = '.message-out:not([id])';

const Types = {
  '.Drque': (message) => ({
    type: 'TEXT_REFERENCE',
    reference: {
      author: message.querySelector('._2FaAB ._1uQFN').innerText,
      text: message.querySelector('._2HHbr span').innerText
    }
  }),
  '.NB3Gq': (message) => ({
    type: 'SHARE_REFERENCE',
    // TODO
  }),
  '._3mdDl': (message) => ({
    type: 'IMAGE',
    image: message.querySelector('._3mdDl img').getAttribute('src')
  }),
  '._3Z-uK': (message) => ({
    type: 'VIDEO'
    // TODO: VIDEO
  }),
  '._1zGQT': (message) => ({
    type: 'PLAIN_TEXT'
  }),
}

// TODO: Create a class out of this instead of this Object
const Parser = {
  messageId: -1, // Unique identifier that is added for every message parsed

  parseMessages: () => {
    
    const messagesIn = document.querySelectorAll(MESSAGE_IN) || [];
    const messagesOut = document.querySelectorAll(MESSAGE_OUT) || [];

    // Tie them together
    const messages = [...messagesIn, ...messagesOut];
    if (!messages || messages.length === 0) {
      return [];
    }

    // Parse header, parse whatever the user did and return it.
    return messages.map(message => {
      try {
        const id = Parser.addUniqueId(message);
        const date = Parser.parseDate(message);
        const author = Parser.parseAuthor(message);
        const text = Parser.parseText(message);
        const content = Parser.parseContent(message);  
        return {
          id,
          date,
          author,
          text,
          ...content,
        };
      } catch(error) {
        console.warn(`Could not parse ${JSON.stringify(message)}`, error);
      }
    }).filter(message => message !== undefined);
  },

  addUniqueId: (message) => {
    message.setAttribute('id', ++Parser.messageId);
    return Parser.messageId;
  },

  parseDate: (message) => {
    const header = message.querySelector(HEADER);
    if (header === null) {
      // No header, just return the time and fix the date afterwards
      const time = message.querySelector('._3fnHB').innerText;
      if (time == null) {
        throw new Error(`Could not find time in ${JSON.stringify(message)}`);
      }
      const date = new Date();
      const timeParts = time.split(':');
      date.setHours(parseInt(timeParts[0]));
      date.setMinutes(parseInt(timeParts[1]));
      return date.toString();
    }

    const text = header.getAttribute('data-pre-plain-text');
    const dateTime = text.substring(1, text.lastIndexOf(']')).trim();
    const time = dateTime.split(',')[0];
    const date = dateTime.split(',')[1];
  
    // My Whatsapp is European formatted
    // TODO: Detect type of date
    const timeParts = time.split(':');
    const dateParts = date.split('/');
    const hours = timeParts[0];
    const minutes = timeParts[1];
    const day = dateParts[0];
    const month = dateParts[1];
    const year = dateParts[2];
    return new Date(`${month}/${day}/${year} ${hours}:${minutes}`).toString(); // toString because we pass it back to the parent context
  },

  parseAuthor: (message) => {
    const header = message.querySelector(HEADER);
    if (header === null) {
      // No header, it is a posted image for example
      return message.querySelector('._1uQFN').innerText;
    }
    const trimmed = header.getAttribute('data-pre-plain-text').trim();
    return trimmed.substring(trimmed.indexOf(']')+1, trimmed.lastIndexOf(':')).trim();
  },

  parseText: (message) => {
    return message.querySelector(CONTENT) !== null ? message.querySelector(CONTENT).querySelector('span span').innerText : undefined
  },

  parseContent: (message) => {
    const type = Object.keys(Types).find(type => message.querySelector(type) !== null);
    if (type === undefined) {
      throw new Error(`Could not find a valid message type`);
    }
    return Types[type](message);
  }
}