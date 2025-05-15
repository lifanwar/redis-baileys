let { isBroadcasting } = require('./isBroadcsating');
const { loadCheckpoint, loadFailedAttempts, saveCheckpoint, saveBroadcastStatus, saveFailedAttempts, sendMessageWithTimeout } = require('./handling-file');
const groupsData = require("../../groups.json");

// Fungsi utama untuk mengirim pesan ke grup dengan checkpoint
async function sendBC(sender, sock) {
    if (isBroadcasting) {
        console.log("Proses broadcast sedang berjalan, menunggu sampai selesai...");
        await sock.sendMessage(sender, {
            text: "Proses broadcast sedang berjalan, menunggu sampai selesai...",
        });
        return;  // Jika broadcast sedang berjalan, jangan mulai yang baru
    }

    isBroadcasting = true;  // Tandai bahwa broadcast sedang berjalan
    const checkpointData = loadCheckpoint();
    const failedAttempts = loadFailedAttempts(); // Load data percobaan gagal
    const totalGroups = groupsData.length;
    let successCount = 0;
    let failureCount = 0;

    const MAX_ATTEMPTS = 2;
    

    // Jika timestart tidak ada, set waktu mulai
    if (!checkpointData.timestart) {
        checkpointData.timestart = Date.now();
        saveCheckpoint(checkpointData);  // Simpan timestart ke checkpoint
    }

    const startTime = checkpointData.timestart; // Gunakan timestart dari checkpoint

    // Template pesan yang akan dikirimkan
    const messageTemplate = `Bagasi Imtihan
 *🧳HAIIBAGGAGE🛄*
      Bismillah 
Di atas set kilo bayar sesuai timbangan 🔥🔥 
 ✈️| *KAIRO - JAKARTA *
📆 | *22 Mei 2025 (80 Kg)*
📆 | *29 Mei 2025 (80 Kg)*
📆 | *4 Juni 2025 (80 Kg)*
💸 Japri Murah Amanah

✈️ | *JAKARTA - KAIRO*
📆 | *8 Juni 2025 (80kg)*
📆 | *18 Juni 2025 (80kg)*
💸 Japri Murah Amanah

WA Admin
wa.me/201508467340

SnK Seperti Biasa Di Katalog, 
Exc Cukai Jika Ada, Cancel H-3/Lupa Kirim Bayar Full. 

Member Group Harga Khusus.
Group Update Haii Baggage Dan PROMO MENARIK Lainnya❗️
https://chat.whatsapp.com/Kju13xGIIOR21li68tTV2C

Jastip, shopee ahlan gas
Jastip Cairo Ahlan`;

    for (let i = checkpointData.checkpoint; i < totalGroups; i++) {
        const group = groupsData[i];
        const groupId = group.id;
        const groupName = group.subject;

        // Cek apakah grup ini sudah gagal terlalu banyak kali
        if (failedAttempts[groupId] && failedAttempts[groupId] >= MAX_ATTEMPTS) {
            console.log(`Melewatkan grup ${groupName} karena sudah gagal ${failedAttempts[groupId]} kali`);
            // Update checkpoint untuk melewati grup ini
            saveCheckpoint({ 
                checkpoint: i + 1, 
                gagalkirim: checkpointData.gagalkirim, 
                timestart: checkpointData.timestart 
            });
            continue; // Lanjut ke grup berikutnya
        }

        const delay = getRandomDelay();
        await sleep(delay);

        let attempts = 0;
        let success = false;

        while (attempts < 1 && !success) {  // Hanya satu percobaan
            try {
                // Mengirimkan template pesan ke setiap grup
                // await sock.sendMessage(groupId, {
                //     text: messageTemplate,
                // });
                const delay = getRandomDelay();
                await sleep(delay);
                
                await sendMessageWithTimeout(groupId, messageTemplate, sock);
    
                console.log(`Berhasil mengirim ke ${groupName} dengan delay ${delay}`);

                // Reset percobaan gagal untuk grup ini jika berhasil
                if (failedAttempts[groupId]) {
                    delete failedAttempts[groupId];
                saveFailedAttempts(failedAttempts);
                }

                // Update checkpoint setelah berhasil mengirim
                saveCheckpoint({ checkpoint: i + 1, gagalkirim: checkpointData.gagalkirim, timestart: checkpointData.timestart  });
                success = true;
                successCount++;

            } catch (error) {
                console.error(`Gagal mengirim ke ${groupName} (Percobaan pertama gagal): ${error.message}`);
                failureCount++;  // Menambahkan ke count gagal kirim

                // Tambah hitungan percobaan gagal untuk grup ini
                failedAttempts[groupId] = (failedAttempts[groupId] || 0) + 1;
                saveFailedAttempts(failedAttempts);
        
                // Perbarui nilai gagalkirim sebelum menyimpan
                checkpointData.gagalkirim += 1;  // Update gagalkirim sebelum menyimpan
                console.log(`Gagal, gagalkirim bertambah menjadi ${checkpointData.gagalkirim}`);
        
                // Update checkpoint setelah gagal mengirim
                saveCheckpoint({ checkpoint: i + 1, gagalkirim: checkpointData.gagalkirim, timestart: checkpointData.timestart  });
        
                // Update checkpoint agar melanjutkan ke grup berikutnya
                console.log(`Gagal, melanjutkan ke grup berikutnya.`);
                saveCheckpoint({ checkpoint: i + 1, gagalkirim: checkpointData.gagalkirim, timestart: checkpointData.timestart  });
        
                break;  // Keluar dari loop dan lanjutkan ke grup berikutnya
            }
        }
        
 
    }

    // Membaca gagalkirim dari file untuk laporan
    const finalCheckpointData = loadCheckpoint();
    gagalkirim = finalCheckpointData.gagalkirim; 
    berhasilkirim = totalGroups - gagalkirim;

    let endTime = Date.now();
    let duration = ((endTime - startTime) / 60000).toFixed(2);
    let summaryMessage = `*Ringkasan Pengiriman Grup*\n\n +
      📋 *Total Grup yang Dikirim:* ${totalGroups}
      ✅ *Berhasil Dikirim:* ${berhasilkirim}
      ❌ *Gagal Dikirim:* ${gagalkirim}
      ⏰ *Durasi Pengiriman:* ${duration} menit`;

    console.log(summaryMessage);
    await sock.sendMessage(sender, {
        text: summaryMessage,
    });

    saveFailedAttempts({});

    // Reset checkpoint dan gagal kirim setelah selesai
    saveCheckpoint({ checkpoint: 0, gagalkirim: 0, timestart: null });  // Reset checkpoint gagalkirim dan timestart
    saveBroadcastStatus(false); // Ubah status broadcast menjadi false
    isBroadcasting = false; 
    
    // Menunggu 30 detik sebelum melanjutkan
    console.log("Menunggu 30 detik sebelum melanjutkan broadcast");
    // await sleep(900000); // tunggu 15 menit
    await sleep(1800000);  // 30 menit dalam milidetik


    // Melanjutkan pengiriman otomatis
    console.log("Melanjutkan broadcast setelah 30 menit");
    await sock.sendMessage(
        sender,
        {
          text: "melanjutkan broadcast setelah 30 menit",
        },
      );
    saveBroadcastStatus(true);
    await sendBC(sender); // Lanjutkan pengiriman
}

// Fungsi untuk mendapatkan delay acak antara 1000 ms hingga 3000 ms
function getRandomDelay() {
    return Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
}

// Fungsi untuk menunggu
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    sendBC,
};