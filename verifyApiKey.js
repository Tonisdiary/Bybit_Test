require('dotenv').config();
const { LinearClient } = require('bybit-api');

// Log environment variables
console.log('API Key:', process.env.API_KEY);
console.log('API Secret:', process.env.API_SECRET);

// Read environment variables
const api_key = process.env.API_KEY;
const api_secret = process.env.API_SECRET;
const testnet = process.env.TESTNET === 'true';

const client = new LinearClient({
    key: api_key,
    secret: api_secret,
    testnet: testnet,
});

async function getApiKeyInfo() {
    try {
        const response = await client.getApiKeyInfo();
        console.log('API Key Info:', response);
        if (response.result) {
            const uid = response.result.uid;
            console.log('Your UID is:', uid);
        } else {
            console.log('Failed to retrieve UID. Response:', response);
        }
    } catch (error) {
        console.error('Error fetching API key info:', error);
    }
}

getApiKeyInfo();
