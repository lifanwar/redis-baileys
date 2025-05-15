const fs = require('fs');
const path = require('path');

// Menggunakan path.resolve untuk mendapatkan path absolut
const dataBaseDir = path.resolve(__dirname, '../Data');

// Default folder path, can be configured
let autoBcFolder = path.resolve(dataBaseDir, 'Bc1');


// Memastikan folder 'auto-bc' ada
if (!fs.existsSync(autoBcFolder)) {
    fs.mkdirSync(autoBcFolder); // Membuat folder jika belum ada
}

// Membaca checkpoint terakhir dan gagal kirim
function loadCheckpoint() {
    const checkpointFile = `${autoBcFolder}/checkpoint.json`;
    if (fs.existsSync(checkpointFile)) {
        const checkpointData = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
        return checkpointData || { checkpoint: 0, gagalkirim: 0, timestart: null }; // Default ke 0 jika tidak ada data
    }
    return { checkpoint: 0, gagalkirim: 0, timestart: null }; // Jika file tidak ada, mulai dari 0
}

// Menyimpan checkpoint dan gagal kirim ke dalam file
function saveCheckpoint(data) {
    console.log("Saving checkpoint data:", data);  // Debug log
    const checkpointFile = `${autoBcFolder}/checkpoint.json`;
    fs.writeFileSync(checkpointFile, JSON.stringify(data, null, 2));
}

// Membaca status broadcast
function loadBroadcastStatus() {
    const broadcastFile = `${autoBcFolder}/checkbc.json`;
    if (fs.existsSync(broadcastFile)) {
        const statusData = JSON.parse(fs.readFileSync(broadcastFile, 'utf8'));
        return statusData.broadcastStatus || false;
    }
    return false; // Jika file tidak ada, broadcast tidak berjalan
}

// Menyimpan status broadcast
function saveBroadcastStatus(status) {
    const broadcastFile = `${autoBcFolder}/checkbc.json`;
    fs.writeFileSync(broadcastFile, JSON.stringify({ broadcastStatus: status }, null, 2));
}

// Menyimpan nomor pengirim perintah start
function saveSender(sender) {
    const senderFile = `${autoBcFolder}/perintah-otomatis-dari.json`;
    fs.writeFileSync(senderFile, JSON.stringify({ sender }, null, 2));
}

// Membaca nomor pengirim perintah start
function loadSender() {
    const senderFile = `${autoBcFolder}/perintah-otomatis-dari.json`;
    if (fs.existsSync(senderFile)) {
        const senderData = JSON.parse(fs.readFileSync(senderFile, 'utf8'));
        return senderData.sender || '';
    }
    return ''; // Jika file tidak ada, artinya belum ada pengirim perintah start
}

const TIMEOUT = 6000; // Batas waktu timeout dalam milidetik (misalnya 6 detik)
async function sendMessageWithTimeout(groupId, messageTemplate, sock) {
    // Membuat promise pengiriman pesan
    const sendMessagePromise = sock.sendMessage(groupId, { text: messageTemplate });

    // Membuat promise timeout
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: Pesan gagal dikirim dalam batas waktu')), TIMEOUT)
    );

    // Menjalankan kedua promise dan menggunakan race untuk melihat mana yang selesai terlebih dahulu
    return await Promise.race([sendMessagePromise, timeoutPromise]);
}

// Fungsi untuk memuat data percobaan gagal
function loadFailedAttempts() {
    const failedAttemptsFile = `${autoBcFolder}/failed_attempts.json`;
    if (fs.existsSync(failedAttemptsFile)) {
        return JSON.parse(fs.readFileSync(failedAttemptsFile, 'utf8')) || {};
    }
    return {}; // Objek kosong jika file belum ada
}

// Fungsi untuk menyimpan data percobaan gagal
function saveFailedAttempts(data) {
    const failedAttemptsFile = `${autoBcFolder}/failed_attempts.json`;
    fs.writeFileSync(failedAttemptsFile, JSON.stringify(data, null, 2));
}

module.exports = {
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
};