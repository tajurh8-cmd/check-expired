import admin from "firebase-admin";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!raw) {
  console.error("FIREBASE_SERVICE_ACCOUNT belum dibuat di GitHub Secrets.");
  process.exit(1);
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(raw);
} catch (err) {
  console.error("FIREBASE_SERVICE_ACCOUNT bukan JSON yang valid.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const messaging = admin.messaging();

function dateWIB(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00+07:00`);
  date.setDate(date.getDate() + days);
  return dateWIB(date);
}

async function main() {
  const today = dateWIB();

  console.log(`ExpiCheck reminder: ${today}`);

  const usersSnap = await db
    .collection("users")
    .where("status", "==", "AKTIF")
    .get();

  console.log(`User aktif: ${usersSnap.size}`);

  let sent = 0;

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();

    const token =
      user.fcmToken ||
      user.fcm_token ||
      null;

    if (!token) continue;

    const storeId =
      user.storeid ||
      user.storeId ||
      "";

    if (!storeId) continue;

    const reminders = [];

    // =========================
    // JADWAL HARI INI
    // =========================

    const day = String(
      new Date(`${today}T00:00:00+07:00`).getDate()
    );

    const scheduleCandidates = [
      `schedules/${userDoc.id}_${today}`,
      `jadwal/${userDoc.id}_${today}`,
      `jadwal/${userDoc.id}`,
    ];

    for (const path of scheduleCandidates) {
      try {
        const ref = db.doc(path);
        const snap = await ref.get();

        if (!snap.exists) continue;

        const data = snap.data();

        const rak =
          data.rak ||
          data[day] ||
          data.days?.[day];

        if (rak) {
          const list = Array.isArray(rak)
            ? rak.join(", ")
            : String(rak);

          reminders.push(`Jadwal hari ini: ${list}`);
          break;
        }
      } catch (_) {}
    }

    // =========================
    // ITEM MENDEKATI TANGGAL TARIK
    // =========================

    const targetDates = {
      [addDays(today, 7)]: "H-7",
      [addDays(today, 3)]: "H-3",
      [addDays(today, 1)]: "H-1",
      [today]: "H-0",
    };

    let totalRH = 0;
    const rhInfo = [];

    for (const [tanggal, label] of Object.entries(targetDates)) {
      try {
        const snap = await db
          .collection("edItems")
          .where("storeid", "==", storeId)
          .where("tanggalTarik", "==", tanggal)
          .get();

        let count = 0;

        snap.forEach((doc) => {
          const item = doc.data();

          const owner =
            item.nik ||
            item.userNik ||
            item.createdBy ||
            "";

          // Kalau item punya pemilik, kirim hanya ke user tersebut.
          if (owner && String(owner) !== String(userDoc.id)) return;

          count++;
        });

        if (count > 0) {
          totalRH += count;
          rhInfo.push(`${label}: ${count} item`);
        }
      } catch (err) {
        console.warn(
          `Query RH gagal ${storeId} ${tanggal}:`,
          err.message
        );
      }
    }

    if (totalRH > 0) {
      reminders.push(`Masa tarik ${rhInfo.join(" • ")}`);
    }

    if (!reminders.length) continue;

    // =========================
    // KIRIM FCM
    // =========================

    try {
      await messaging.send({
        token,

        notification: {
          title: "ExpiCheck",
          body: reminders.join("\n"),
        },

        data: {
          url: "./index.html",
          date: today,
        },

        webpush: {
          fcmOptions: {
            link: "./index.html",
          },
        },
      });

      sent++;

      console.log(
        `✓ Push: ${user.name || user.nama || userDoc.id}`
      );
    } catch (err) {
      console.error(
        `✗ Gagal push ${userDoc.id}:`,
        err.code || err.message
      );
    }
  }

  console.log(`Selesai. Push terkirim: ${sent}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });
