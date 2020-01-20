const express = require('express');

const DIR = 'public';
const PORT = process.env.PORT || 8080;

const app = express();
app.use(express.static(DIR));

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});