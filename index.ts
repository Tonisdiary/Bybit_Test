require('dotenv').config(); // Load environment variables from .env file

const axios = require('axios');
const WebSocket = require('ws');
const crypto = require('crypto');
const { LinearClient } = require('bybit-api');

// Check if environment variables are set
if (!process.env.API_KEY || !process.env.API_SECRET) {
    throw new Error('API Key & Secret are both required for private endpoints');
}

// Read environment variables
const api_key = process.env.API_KEY;
const api_secret = process.env.API_SECRET;
const UID = process.env.UID;
const testnet = process.env.TESTNET === 'true'; // Use true or false

// Base URL
const baseUrl = testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';

// WebSocket URL
const ws_url = testnet ? 'wss://stream-testnet.bybit.com/v5/private' : 'wss://stream.bybit.com/v5/private';

// Initialize WebSocket connection
const ws = new WebSocket(ws_url);

// Function to generate a signature
function generateSignature(api_secret, expires) {
    return crypto.createHmac('sha256', api_secret)
        .update(`GET/realtime${expires}`)
        .digest('hex');
}

// Authenticate WebSocket connection
function authenticateWebSocket() {
    const expires = Math.floor(Date.now() / 1000) + 60; // expires in 60 seconds
    const signature = generateSignature(api_secret, expires);
    const authMessage = JSON.stringify({
        op: 'auth',
        args: [api_key, expires, signature]
    });
    console.log('Sending auth message:', authMessage);
    ws.send(authMessage);
}

// Handle WebSocket messages
ws.on('message', function incoming(data) {
    const message = JSON.parse(data);
    console.log('Received message:', message);

    if (message.op === 'auth' && message.success) {
        console.log('Authenticated successfully');
        subscribeToTopics();
    } else if (message.op === 'pong') {
        console.log('Received pong');
    } else if (message.op === 'subscribe') {
        console.log('Subscription status:', message);
    }
});

// Handle WebSocket errors
ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
});

// Handle WebSocket close
ws.on('close', function close() {
    console.log('WebSocket disconnected');
});

// Handle WebSocket open
ws.on('open', function open() {
    console.log('WebSocket connected');
    authenticateWebSocket(); // Authenticate and subscribe
});

// Subscribe to topics
function subscribeToTopics() {
    const subscribeMessage = JSON.stringify({
        op: 'subscribe',
        args: [
            'orderbook.1.BTCUSDT', // Example topic
            'publicTrade.BTCUSDT'
        ]
    });
    console.log('Sending subscribe message:', subscribeMessage);
    ws.send(subscribeMessage);
}

// Initialize ByBit client
const client = new LinearClient({
    key: api_key,
    secret: api_secret,
    testnet: testnet, // Use testnet for testing purposes
});

// Fetch balance for a set of tokens
async function fetchBalance(uid) {
    console.log('Fetching balances for UID:', uid);
    try {
        const balances = await client.getWalletBalance();
        console.log('Balances:', balances.result);
        // Example of how to log specific token balances
        console.log(`ETH balance:`, balances.result['ETH']?.available_balance || 0);
        console.log(`USDT balance:`, balances.result['USDT']?.available_balance || 0);
    } catch (error) {
        console.error('Error fetching balances:', error);
    }
}

// Perform a market spot buy/sell
async function marketSpotOrder(uid, tokenIn, tokenOut, amountIn, side) {
    console.log(`Placing market ${side} order for ${amountIn} ${tokenIn} to ${tokenOut}`);
    try {
        const order = await client.placeActiveOrder({
            symbol: `${tokenIn}${tokenOut}`,
            side: side,
            order_type: 'Market',
            qty: amountIn,
            time_in_force: 'GoodTillCancel',
            reduce_only: false,
            close_on_trigger: false
        });
        console.log('Market Order Response:', order);
    } catch (error) {
        console.error(`Error placing market ${side} order:`, error);
    }
}

// Perform a limit spot buy/sell
async function limitSpotOrder(uid, tokenIn, tokenOut, amountIn, limitPrice, side) {
    console.log(`Placing limit ${side} order for ${amountIn} ${tokenIn} at ${limitPrice} ${tokenOut}`);
    try {
        const order = await client.placeActiveOrder({
            symbol: `${tokenIn}${tokenOut}`,
            side: side,
            order_type: 'Limit',
            qty: amountIn,
            price: limitPrice,
            time_in_force: 'GoodTillCancel',
            reduce_only: false,
            close_on_trigger: false
        });
        console.log('Limit Order Response:', order);
    } catch (error) {
        console.error(`Error placing limit ${side} order:`, error);
    }
}

// Dollar-Cost Averaging (DCA) function
async function dcaOrder(uid, tokenIn, tokenOut, amountIn, interval) {
    console.log(`Starting DCA orders for ${amountIn} ${tokenIn} every ${interval} seconds`);
    setInterval(async () => {
        await marketSpotOrder(uid, tokenIn, tokenOut, amountIn, 'Buy');
    }, interval * 1000);
}

// Example usage
(async function run() {
    await fetchBalance(UID); // Fetch initial balances
    await marketSpotOrder(UID, 'ETH', 'USDT', 0.1, 'Buy'); // Place a market buy order
    await limitSpotOrder(UID, 'ETH', 'USDT', 0.1, 2000, 'Sell'); // Place a limit sell order
    dcaOrder(UID, 'ETH', 'USDT', 0.1, 10); // Start DCA orders
})();
