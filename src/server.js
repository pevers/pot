const path = require('path');
const express = require('express');

exports.start = () => {
  const app = express();
  app.use('/stream', express.static(path.join(__dirname, '../stream')));
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Serving static files at ${port}`));
}
