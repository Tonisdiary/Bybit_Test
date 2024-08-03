const crypto = require('crypto');
const WebSocket = require('ws');

// Replace with your actual API key and secret
const api_key = 'your-api-key';
const api_secret = 'your-api-secret';

// Generate expires
const expires = Math.floor(Date.now() + 1000);

// Generate signature
const signature = crypto.createHmac('sha256', api_secret)
    .update(`GET/realtime${expires}`)
    .digest('hex');

// WebSocket URL
const url = 'wss://stream.bybit.com/realtime'; // Replace with the correct WebSocket URL

// WebSocket URL
const ws_url = 'wss://stream-testnet.bybit.com/v5/private' //: 'wss://stream.bybit.com/v5/private';

// Create a WebSocket connection
const ws = new WebSocket(ws_url);

// Authenticate with API once WebSocket is opened
ws.on('open', function open() {
    const authMessage = {
        op: 'auth',
        args: [api_key, expires, signature]
    };
    ws.send(JSON.stringify(authMessage));
});

// Handle incoming messages
ws.on('message', function incoming(data) {
    console.log('Received message:', data);
});

// Handle WebSocket errors
ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
});

// Handle WebSocket close
ws.on('close', function close() {
    console.log('WebSocket connection closed');
});
