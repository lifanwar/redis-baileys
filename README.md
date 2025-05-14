# redis-baileys
Baileys for redis with docker compose and cloudflared for generate Qrcode

# How to install using docker compose
docker compose up

# Setting
minimal instalation in bot.js

# Sample Doc of redis baileys

```js
const { useRedisAuthState } = require('redis-baileys');
const { Boom } = require('@hapi/boom');
const makeWASocket = require('@whiskeysockets/baileys').default;

async function connectToWhatsApp() {
    const redisConfig = {
        password: 'your_redis_password',
        host: 'your_redis_host',
        port: 6379,
    };

    const { state, saveCreds } = await useRedisAuthState(redisConfig, 'your_session_id');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom) && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('opened connection');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();
```