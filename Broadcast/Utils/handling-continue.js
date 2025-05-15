const { isBroadcasting } = require('./isBroadcsating.js')
const { loadBroadcastStatus, loadCheckpoint, loadSender } = require('./handling-file.js')
const {sendBC} = require('./sendBC.js');


async function checkAndContinueBroadcast(sock) {
    if (isBroadcasting) {
        console.log("Proses broadcast sedang berjalan, menunggu sampai selesai...");
        return;  // Jika broadcast sedang berjalan, tidak mulai lagi
    }

    const broadcastStatus = loadBroadcastStatus();
    const checkpointData = loadCheckpoint();
    const senderNumber = loadSender();

    if (broadcastStatus) {
        console.log("Melanjutkan broadcast dari checkpoint", checkpointData.checkpoint);
        await sock.sendMessage(senderNumber, {
            text: `Sedang melanjutkan broadcast ke grup, checkpoint terakhir di grup ke-${checkpointData.checkpoint + 1}`,
        });

        // Lanjutkan pengiriman pesan
        await sendBC(senderNumber, sock);  
    }
}

module.exports = {
    checkAndContinueBroadcast,
};