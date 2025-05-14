# redis-baileys
Baileys for redis with docker compose and cloudflared for generate Qrcode

### Built With

This project utilizes the following major frameworks and libraries

* [![Docker Compose][DockerCompose]][DockerCompose-url]
* [![Whiskeysockets Baileys][WhiskeysocketsBaileys]][WhiskeysocketsBaileys-url]

### Installation

_Instalation using docker compose._

1. Clone the repo
   ```sh
   git clone https://github.com/lifanwar/redis-baileys.git
   ```
2. 
3. Setup your redis password `docker-compose.yml`
   ```sh
    environment:
      - REDIS_PASSWORD=your_redis_password # change your redis password
    command: ["redis-server", "--requirepass", "your_redis_password"] # change your redis password
   ```
4. Edit redis configuration and prefix in bot.js
   ```js
    const redisConfig = {
        password: 'your_redis_password',
        host: 'your_redis_host', 
        port: 6379,
    };
   ```
   _if inside docker compose use a services sample below is "redis" as host._

   ```js
   const { state, saveCreds } = await useRedisAuthState(redisConfig, 'your_session'); // change what you need
   ```

5. Install Depedency in Docker compose
   ```sh
   docker compose up
   ```
4. Change git remote url to avoid accidental pushes to base project
   ```sh
   git remote set-url origin github_username/repo_name
   git remote -v # confirm the changes
   ```

# Setting
1. Minimal instalation in bot.js
2. Delete redis KEYS
   ```sh
   redis-cli -a pwgua SCAN 0 MATCH "your_session:*" COUNT 1000
   ```
   _it is redis prefix in instalation number 2_

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
