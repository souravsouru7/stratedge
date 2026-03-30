const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
 cloud_name: process.env.CLOUD_NAME,
 api_key: process.env.CLOUD_API_KEY,
 api_secret: process.env.CLOUD_API_SECRET
});

function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

module.exports = cloudinary;
module.exports.uploadBufferToCloudinary = uploadBufferToCloudinary;
