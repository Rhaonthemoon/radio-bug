// config/cloudinary.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dkma7x0wg',
    api_key: process.env.CLOUDINARY_API_KEY || '752119443158746',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'v6qjoS7oeUAX3032Dp2bwu50YY8'
});

module.exports = cloudinary;
