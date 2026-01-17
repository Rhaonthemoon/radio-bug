// config/backblaze.js
const AWS = require('aws-sdk');

const b2 = new AWS.S3({
    endpoint: 'https://s3.eu-central-003.backblazeb2.com',
    accessKeyId: '00339ddb6803e510000000001',
    secretAccessKey: 'K003rY8GcTpJg01m47p28RSHPnIO/D4',
    region: 'eu-central-003',
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

const B2_BUCKET = 'BUGRadio';
const B2_BASE_URL = 'https://BUGRadio.s3.eu-central-003.backblazeb2.com';

module.exports = { b2, B2_BUCKET, B2_BASE_URL };