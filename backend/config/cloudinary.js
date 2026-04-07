const cloudinary = require("cloudinary").v2;
const { appConfig } = require("./index");

cloudinary.config({
 cloud_name: appConfig.cloudinary.cloudName,
 api_key: appConfig.cloudinary.apiKey,
 api_secret: appConfig.cloudinary.apiSecret
});

module.exports = cloudinary;
