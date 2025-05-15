const { useRedisAuthState } = require('redis-baileys');
const {
    makeWASocket,
    DisconnectReason,
    Browsers,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

// import utilitas broadcast
const {
    loadCheckpoint,
    saveCheckpoint,
    loadBroadcastStatus,
    saveBroadcastStatus,
    saveSender,
    loadSender,
    TIMEOUT,
    sendMessageWithTimeout,
    loadFailedAttempts,
    saveFailedAttempts,
} = require('./Broadcast/Utils/handling-file.js');
const { checkAndContinueBroadcast } = require('./Broadcast/Utils/handling-continue.js');
const { sendBC } = require('./Broadcast/Utils/sendBC.js');

// inisiasi file .env
require('dotenv').config(); 

// file
const fs = require("fs");
const fsImage = require("fs/promises");
const groupsData = require("./groups.json");

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


let sock;

async function connectToWhatsApp() {
    const redisConfig = {
        password: process.env.REDIS_PASSWORD,
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
    };

    const { state, saveCreds } = await useRedisAuthState(redisConfig, process.env.REDIS_PREFIX);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Menggunakan wa Web versi ${version.join(".")}, terbaru: ${isLatest}`);

    sock = makeWASocket({
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
            checkAndContinueBroadcast(sock);
        }
    });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on("messages.upsert", async (message) => {
        const msg = message.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const isPrivateMessage = msg.key.remoteJid.endsWith("@s.whatsapp.net");
        if (isPrivateMessage) {
            const sender = msg.key.remoteJid;
            const BacaPesan = msg.message.extendedTextMessage?.text || msg.message.conversation || "";

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

            if (BacaPesan.toLowerCase() === "start") {
                saveSender(sender); // Simpan pengirim perintah start
                saveBroadcastStatus(true); // Tandai bahwa broadcast sedang berlangsung
                console.log("Memulai mengirim otomatis setiap 30 menit");
                await sock.sendMessage(
                    sender,
                    {
                        text: "Memulai mengirim otomatis",
                    },
                );
                await sendBC(sender, sock);
            }

            // membuat data id group
      if (BacaPesan.toLowerCase() === "ambilgc") {
        // Ambil semua grup yang terhubung dengan akun bot ini
        const groupMetadata = await sock.groupFetchAllParticipating();
        const groups = Object.values(groupMetadata).map((group) => ({
          id: group.id,
          subject: group.subject,
        }));

        const ProsesSaveData = await sock.sendMessage(
          sender,
          {
            text: "Proses save data",
          },
          {
            quoted: msg,
          }
        );

        // simpan data group ke dalam file
        fs.writeFileSync("./groups.json", JSON.stringify(groups, null, 2));
        let totalGroups = groupsData.length;

        await sock.sendMessage(sender, {
          text: `Sudah menyimpan data, sedang mengirim file...`,
          edit: ProsesSaveData.key,
        });

  

        // Kirim file groups.json ke pengirim perintah
        await sock.sendMessage(sender, {
          document: { url: "./groups.json" },
          mimetype: "application/json",
          fileName: "groups.json",
        });
      }
        }
    });

}



connectToWhatsApp();
