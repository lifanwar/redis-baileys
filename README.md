<a id="readme-top"></a>

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
2. Install Depedency
   ```sh
   npm install
   ```
3. Edit all redis configuration and baileys in `env`
   ```sh
   # Redis Setup
   REDIS_HOST=redis
   REDIS_PORT=6379
   REDIS_PREFIX=gurindamlian
   REDIS_PASSWORD=PwredisGue12
   
   # Baileys Setup
   BAILEYS_PORT=3099
   ```
4. Install Depedency in Docker compose
   ```sh
   docker compose up
   ```
5. Change git remote url to avoid accidental pushes to base project
   ```sh
   git remote set-url origin github_username/repo_name
   git remote -v # confirm the changes
   ```

# Setting
1. All of setup in file .env
2. get terminal redis
   ```sh
   docker compose exec redis sh -c "redis-cli -p \$REDIS_PORT -a \$REDIS_PASSWORD"
   ```
3. Delete redis KEYS
   ```sh
   SCAN 0 MATCH "your_prefix:*" COUNT 1000
   ```
   _it is redis prefix in file `.env`_

# Sample Doc of redis baileys
_For more examples, please refer to the [Documentation](https://www.npmjs.com/package/redis-baileys)_


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

<!-- ROADMAP -->
## Roadmap

- [x] Spilt Code can be readed
- [x] Add Broadcast Message
- [ ] Move broadcast storage to redis using ioredis:
    - [ ] Add prefix format env `REDIS_PREFIX:BROADCAST_CODE`
    - [ ] Add prefix format `BROADCAST_CODE`
- [ ] Add statistic report:
    - [ ] Add total succses 
    - [ ] Add total failure 
    - [ ] Add average succses 
    - [ ] Add average failure 
    - [ ] Add total succses day 
    - [ ] Add total failure day 
    - [ ] Add average succses day 
    - [ ] Add average failure day 




