// Load environment variables from .env file
require('dotenv').config();

// Import required modules
const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');
const { RestClientV5 } = require('bybit-api');

// Read environment variables
const api_key = process.env.API_KEY;
const api_secret = process.env.API_SECRET;
const UID = process.env.UID;
const testnet = process.env.TESTNET === 'true'; // Use true or false based on the TESTNET environment variable

// Base URL for API
const baseUrl = testnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';

// WebSocket URLs
const ws_url = {
    public: testnet ? 'wss://stream-testnet.bybit.com/v5/public/spot' : 'wss://stream.bybit.com/v5/public/spot',
    private: testnet ? 'wss://stream-testnet.bybit.com/v5/private' : 'wss://stream.bybit.com/v5/private',
    trade: testnet ? 'wss://stream-testnet.bybit.com/v5/trade' : 'wss://stream.bybit.com/v5/trade'
};

// Initialize ByBit client
const client = new RestClientV5({
    testnet: testnet,
    key: api_key,
    secret: api_secret,
});

// Initialize WebSocket connections
const wsPrivate = new WebSocket(ws_url.private);
const wsTrade = new WebSocket(ws_url.trade);

// Function to generate a signature for API authentication
function generateSignature(secret, params) {
    const query = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    return crypto.createHmac('sha256', secret)
        .update(query)
        .digest('hex');
}

// Function to authenticate WebSocket connection
function authenticateWebSocket() {
    const expires = Math.floor(Date.now() / 1000) + 600; // expires in 10 minutes
    const signature = generateSignature(api_secret, { api_key, expires });
    const authMessage = JSON.stringify({
        op: 'auth',
        args: [api_key, expires, signature]
    });
    console.log('Sending auth message:', authMessage);
    wsPrivate.send(authMessage); // Send authentication message
}

// WebSocket event handler for private connection
wsPrivate.on('message', function incoming(data) {
    const message = JSON.parse(data);
    console.log('Received message from private WebSocket:', message);

    if (message.op === 'auth' && message.success) {
        console.log('Authenticated successfully on private WebSocket');
        subscribeToTopics(); // Subscribe to topics after successful authentication
    } else if (message.op === 'pong') {
        console.log('Received pong');
    } else if (message.op === 'subscribe') {
        console.log('Subscription status:', message);
    } else if (message.success === false) {
        console.log('Authentication failed on private WebSocket:', message);
    }
});

// WebSocket event handler for trade connection
wsTrade.on('message', function incoming(data) {
    const message = JSON.parse(data);
    console.log('Received message from trade WebSocket:', message);
});

// WebSocket event handler for errors
wsPrivate.on('error', function error(err) {
    console.error('WebSocket error:', err);
});
wsTrade.on('error', function error(err) {
    console.error('WebSocket error:', err);
});

// WebSocket event handler for connection close
wsPrivate.on('close', function close() {
    console.log('WebSocket disconnected');
});
wsTrade.on('close', function close() {
    console.log('WebSocket disconnected');
});

// WebSocket event handler for connection open
wsPrivate.on('open', function open() {
    console.log('WebSocket connected');
    authenticateWebSocket(); // Authenticate and subscribe to topics
});
wsTrade.on('open', function open() {
    console.log('Trade WebSocket connected');
});

// Function to subscribe to topics
function subscribeToTopics() {
    const subscribeMessage = JSON.stringify({
        op: 'subscribe',
        args: [
            'orderbook.1.BTCUSDT', // Example topic for orderbook
            'publicTrade.BTCUSDT' // Example topic for public trades
        ]
    });
    console.log('Sending subscribe message:', subscribeMessage);
    wsPrivate.send(subscribeMessage); // Send subscription message
}

// Function to fetch balance for a set of tokens
async function fetchBalance() {
    const timestamp = Math.floor(Date.now() / 1000); // Current Unix timestamp
    const params = {
        api_key: api_key,
        timestamp: timestamp
    };

    const signature = generateSignature(api_secret, params);

    try {
        const response = await axios.get(`${baseUrl}/v2/private/wallet/balance`, {
            params: {
                ...params,
                sign: signature
            },
            headers: {
                'X-BAPI-API-KEY': api_key,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-SIGN': signature,
                'X-BAPI-RECV-WINDOW': 5000
            }
        });
        console.log('API Response:', response.data);
        const balances = response.data.result;
        console.log('Balances:', balances);
        console.log(`ETH balance:`, balances['ETH']?.available_balance || 0);
        console.log(`USDT balance:`, balances['USDT']?.available_balance || 0);
    } catch (error) {
        console.error('Error fetching balances:', {
            message: error.message,
            response: error.response ? error.response.data : 'No response data',
            request: error.request ? error.request.data : 'No request data'
        });
    }
}

// Function to get active orders
async function getActiveOrders() {
    try {
        const response = await client.getActiveOrders({
            category: 'linear',
            symbol: 'ETHUSDT',
            openOnly: 0,
            limit: 1,
        });
        console.log('Active Orders:', response);
    } catch (error) {
        console.error('Error fetching active orders:', error);
    }
}

// Function to get order history
async function getOrderHistory() {
    try {
        const response = await client.getHistoricOrders({
            category: 'linear',
            limit: 1,
        });
        console.log('Order History:', response);
    } catch (error) {
        console.error('Error fetching order history:', error);
    }
}

// Function to get position info
async function getPositionInfo() {
    try {
        const response = await client.getPositionInfo({
            category: 'inverse',
            symbol: 'BTCUSD',
        });
        console.log('Position Info:', response);
    } catch (error) {
        console.error('Error fetching position info:', error);
    }
}

// Function to get trade history
async function getTradeHistory() {
    try {
        const response = await client.getTradeHistory({
            category: 'linear',
            symbol: 'BTCUSDT',
            execType: 'Trade',
            limit: 100,
        });
        console.log('Trade History:', response);
    } catch (error) {
        console.error('Error fetching trade history:', error);
    }
}

// Function to get execution list
async function getExecutionList() {
    try {
        const response = await client.getExecutionList({
            category: 'linear',
            symbol: 'BTCUSDT',
            margin: '10',
        });
        console.log('Execution List:', response);
    } catch (error) {
        console.error('Error fetching execution list:', error);
    }
}

// Function to perform a market spot buy/sell order
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

// Function to perform a limit spot buy/sell order
async function limitSpotOrder(uid, tokenIn, tokenOut, amountIn, limitPrice, side) {
    const symbol = `${tokenIn}${tokenOut}`;
    console.log(`Placing limit ${side} order for ${amountIn} ${tokenIn} at ${limitPrice} ${tokenOut}`);
    console.log(`Symbol: ${symbol}`);
    
    try {
        const order = await client.placeActiveOrder({
            symbol: symbol,
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

// Function to perform Dollar-Cost Averaging (DCA) orders
async function dcaOrder(uid, tokenIn, tokenOut, amountIn, interval) {
    console.log(`Starting DCA orders for ${amountIn} ${tokenIn} every ${interval} seconds`);
    setInterval(async () => {
        await marketSpotOrder(uid, tokenIn, tokenOut, amountIn, 'Buy'); // Place a market
