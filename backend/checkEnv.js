const { appConfig, getMaskedConfigSnapshot } = require("./config");

console.log("Loaded secure config:", getMaskedConfigSnapshot());

if (appConfig.mongoUri.startsWith("mongodb+srv")) {
    console.error('ERROR: Still using SRV string!');
} else {
    console.log('Using standard string correctly.');
}
