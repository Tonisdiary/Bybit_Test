const crypto = require('crypto');

// Replace these with your actual values
const api_key = 'sEKChC9S1WQIuB3pfV';
const api_secret = 'kSLbycNk2AfJ8nb8jdoVPzEAuuQ7EhrouTYq';
const timestamp = Date.now();

// Create the signature
const sign = (params, secret) => {
  return crypto.createHmac('sha256', secret)
    .update(params)
    .digest('hex');
};

// Generate the signature for the wallet balance endpoint
const query_string = `api_key=${api_key}&timestamp=${timestamp}`;
const signature = sign(query_string, api_secret);

console.log(`API Key: ${api_key}`);
console.log(`Timestamp: ${timestamp}`);
console.log(`Signature: ${signature}`);
