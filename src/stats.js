class TextStats {

  constructor(data = [{
    author,
    text,
    date
  }]) {
    this.data = data;
  }

  getStats() {
    let groupedData = this.data.reduce((acc, message) => {
      acc[message.author] = acc[message.author] || [];
      acc[message.author].push(message.text);
      return acc;
    }, {});
    return this._analyze(groupedData);
  }

  _analyze(groupedData) {
    return Object.keys(groupedData).map(key => {
      const characterCount = groupedData[key].reduce((acc, message) => acc + message.length, 0);
      return {
        author: key,
        characterCount
      }
    })
  }
}

module.exports = TextStats;