const { useRedisAuthState } = require('redis-baileys');
const {
    makeWASocket,
    DisconnectReason,
    Browsers,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

// inisiasi file .env
require('dotenv').config(); 

// file
const fs = require("fs");
const fsImage = require("fs/promises");
const express = require("express");
const path = require('path');

// logs
const pino = require('pino');
const logger = pino({ level: 'silent' });

// koneksi ke express
const app = express();
const PORT = process.env.BAILEYS_PORT;

const server = app.listen(PORT, () => {
    console.log(`server is running on http://localhost:${PORT}`);
});


async function connectToWhatsApp() {
    const redisConfig = {
        password: process.env.REDIS_PASSWORD,
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
    };

    const { state, saveCreds } = await useRedisAuthState(redisConfig, process.env.REDIS_PREFIX);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Menggunakan wa Web versi ${version.join(".")}, terbaru: ${isLatest}`);

    const sock = makeWASocket({
        logger: logger,
        auth: {
			creds: state.creds,
			/** caching makes the store faster to send/recv messages */
			keys: makeCacheableSignalKeyStore(state.keys, logger),
		},
        // auth: state,
        version,
        printQRInTerminal: false,
    });

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            let htmlTemplate = fs.readFileSync(path.join(__dirname, 'src', 'index.html'), 'utf8');
            htmlTemplate = htmlTemplate.replace('{{QR_CODE_PLACEHOLDER}}', 
                `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300`);
            htmlTemplate = htmlTemplate.replace('{{CURRENT_YEAR}}', new Date().getFullYear());

            app.get("/", (req, res) => {
                res.send(htmlTemplate);
            });
        }

        if (connection === "close") {
            server.close();
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("connection closed due to ", lastDisconnect.error, ", reconnecting ", shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();  // Reconnect jika koneksi tertutup
            }
        } else if (connection === "open") {
            console.log("opened connection");

            // Cek status broadcast dan lanjutkan jika perlu
            // checkAndContinueBroadcast();
        }
    });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on("messages.upsert", async (message) => {
        const msg = message.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const isPrivateMessage = msg.key.remoteJid.endsWith("@s.whatsapp.net");
        if (isPrivateMessage) {
            const sender = msg.key.remoteJid;
            const messageContent = msg.message.conversation || "";
            const bacapesan = msg.message.extendedTextMessage?.text || "";
            const BacaPesan = bacapesan || messageContent;

            console.log(`got message: ${BacaPesan} from ${sender}`);

            if (BacaPesan.toLowerCase() === "y") {
                await sock.sendMessage(
                    sender,
                    {
                        text: "pyo",
                    },
                    {
                        quoted: msg,
                    }
                );
            }
        }
    });

}

connectToWhatsApp();
