const mongoose = require('mongoose');
const { appConfig } = require('./config');
const ExtractionLog = require('./models/ExtractionLog');

mongoose.connect(appConfig.mongoUri)
  .then(async () => {
    const logs = await ExtractionLog.find().sort({ createdAt: -1 }).limit(1);
    if (logs.length > 0) {
      console.log(logs[0].extractedText);
    } else {
      console.log("No logs found");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
