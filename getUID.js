require('dotenv').config();
const { LinearClient } = require('bybit-api');

const api_key = process.env.API_KEY;
const api_secret = process.env.API_SECRET;
const testnet = process.env.TESTNET === 'true';

const client = new LinearClient({
    key: api_key,
    secret: api_secret,
    testnet: testnet,
});

async function getUID() {
    try {
        const response = await client.getApiKeyInfo();
        console.log('API Key Info:', response);
        const uid = response.result.uid;
        console.log('Your UID is:', uid);
    } catch (error) {
        console.error('Error fetching UID:', error);
    }
}

getUID();
