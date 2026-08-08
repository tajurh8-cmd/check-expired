import admin from "firebase-admin";

// ======================================================
// 1. FIREBASE ADMIN
// ======================================================

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountRaw) {
  throw new Error(
    "GitHub Secret FIREBASE_SERVICE_ACCOUNT belum dibuat."
  );
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(serviceAccountRaw);
} catch {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT bukan JSON service account yang valid."
  );
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const messaging = admin.messaging();


// ======================================================
// 2. CONFIG
// ======================================================

const TZ_OFFSET_HOURS = 7;

// Reminder RH:
// hari H, H-1, H-3, H-7
const TARGET_DAYS = new Set([0, 1, 3, 7]);


// ======================================================
// 3. DATE HELPER WIB
// ======================================================

function jakartaParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce((a, p) => {
      a[p.type] = p.value;
      return a;
    }, {});

  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
  };
}

function dateKey(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(
    2,
    "0"
  )}`;
}

function addLocalDays(base, days) {
  const dt = new Date(
    Date.UTC(base.y, base.m - 1, base.d + days)
  );

  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  };
}

function jakartaMidnightUtc(parts) {
  return new Date(
    Date.UTC(
      parts.y,
      parts.m - 1,
      parts.d,
      -TZ_OFFSET_HOURS,
      0,
      0,
      0
    )
  );
}

function diffJakartaDays(date) {
  const now = jakartaParts();

  const targetKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const [y, m, d] = targetKey.split("-").map(Number);

  const a = Date.UTC(now.y, now.m - 1, now.d);
  const b = Date.UTC(y, m - 1, d);

  return Math.round((b - a) / 86400000);
}


// ======================================================
// 4. USER HELPER
// ======================================================

function userIdFromDoc(docSnap) {
  const user = docSnap.data();

  return String(
    user.userid ||
      user.nik ||
      user.NIK ||
      docSnap.id ||
      ""
  ).trim();
}

function userName(user, uid) {
  return String(
    user.nama ||
      user.name ||
      user.username ||
      uid
  ).trim();
}

function tokensOf(user) {
  const tokenArray = Array.isArray(user.fcmTokens)
    ? user.fcmTokens
    : [];

  return [
    ...new Set(
      [user.fcmToken, ...tokenArray]
        .filter(Boolean)
        .map(String)
    ),
  ];
}


// ======================================================
// 5. TANGGAL SEKARANG
// ======================================================

const today = jakartaParts();

const todayKey = dateKey(
  today.y,
  today.m,
  today.d
);

const monthKey = todayKey.slice(0, 7);

const end = addLocalDays(today, 8);

const startTimestamp =
  admin.firestore.Timestamp.fromDate(
    jakartaMidnightUtc(today)
  );

const endTimestamp =
  admin.firestore.Timestamp.fromDate(
    jakartaMidnightUtc(end)
  );

console.log("========================================");
console.log(`ExpiCheck Push ${todayKey} WIB`);
console.log("========================================");


// ======================================================
// 6. BACA SEMUA USER AKTIF
// ======================================================

const userSnap = await db
  .collection("users")
  .where("active", "==", true)
  .get();

console.log(`User aktif ditemukan: ${userSnap.size}`);

const users = new Map();

let skipNoToken = 0;
let skipNoStore = 0;

for (const doc of userSnap.docs) {
  const user = doc.data();

  const uid = userIdFromDoc(doc);

  const nama = userName(user, uid);

  const storeid = String(
    user.storeid ||
      user.storeId ||
      ""
  ).trim();

  const tokens = tokensOf(user);

  console.log("----------------------------------------");
  console.log(`USER : ${nama}`);
  console.log(`NIK  : ${uid}`);
  console.log(`TOKO : ${storeid || "-"}`);
  console.log(`TOKEN: ${tokens.length}`);

  if (!storeid) {
    console.log(
      `SKIP ${nama}: storeid tidak ada`
    );

    skipNoStore++;
    continue;
  }

  if (!tokens.length) {
    console.log(
      `SKIP ${nama}: fcmToken belum ada`
    );

    skipNoToken++;
    continue;
  }

  users.set(uid, {
    ...user,
    uid,
    nama,
    storeid,
    docId: doc.id,
    tokens,
  });
}

console.log("----------------------------------------");
console.log(
  `User siap push: ${users.size}`
);


// ======================================================
// 7. BACA JADWAL BULAN BERJALAN
// ======================================================

const scheduleSnap = await db
  .collection("JadwalRakUser")
  .where("month", "==", monthKey)
  .get();

console.log(
  `Dokumen jadwal bulan ${monthKey}: ${scheduleSnap.size}`
);

const scheduleByUser = new Map();

for (const doc of scheduleSnap.docs) {
  const schedule = doc.data();

  const uid = String(
    schedule.userid || ""
  ).trim();

  const storeid = String(
    schedule.storeid || ""
  ).trim();

  if (!uid || !storeid) {
    continue;
  }

  const rack = String(
    (schedule.days || {})[todayKey] || ""
  ).trim();

  if (!rack) {
    continue;
  }

  const key = `${storeid}|${uid}`;

  scheduleByUser.set(
    key,
    rack
  );

  console.log(
    `JADWAL ${uid} (${storeid}) → ${rack}`
  );
}


// ======================================================
// 8. BACA ITEM RH H-0 SAMPAI H-7
// ======================================================

const itemSnap = await db
  .collection("edItems")
  .where(
    "tanggalTarik",
    ">=",
    startTimestamp
  )
  .where(
    "tanggalTarik",
    "<",
    endTimestamp
  )
  .get();

console.log(
  `Item rentang H0-H7 ditemukan: ${itemSnap.size}`
);

const alertsByUser = new Map();

for (const doc of itemSnap.docs) {
  const item = doc.data();

  if (!item.tanggalTarik?.toDate) {
    continue;
  }

  const h = diffJakartaDays(
    item.tanggalTarik.toDate()
  );

  if (!TARGET_DAYS.has(h)) {
    continue;
  }

  const uid = String(
    item.inputByNik ||
      item.userid ||
      ""
  ).trim();

  const storeid = String(
    item.storeid || ""
  ).trim();

  if (!uid || !storeid) {
    continue;
  }

  const key = `${storeid}|${uid}`;

  if (!alertsByUser.has(key)) {
    alertsByUser.set(key, {
      0: 0,
      1: 0,
      3: 0,
      7: 0,
      totalQty: 0,
    });
  }

  const alert =
    alertsByUser.get(key);

  alert[h] += 1;

  alert.totalQty +=
    Number(item.qty) || 0;
}


// ======================================================
// 9. KIRIM PUSH
// ======================================================

let sentUsers = 0;
let sentTokens = 0;
let failedTokens = 0;

let skipNoReminder = 0;

for (const user of users.values()) {
  const key =
    `${user.storeid}|${user.uid}`;

  const rack =
    scheduleByUser.get(key) || "";

  const alert =
    alertsByUser.get(key);

  console.log("----------------------------------------");
  console.log(
    `PROSES ${user.nama} (${user.uid})`
  );

  console.log(
    `Jadwal: ${rack || "tidak ada"}`
  );

  if (alert) {
    console.log(
      `RH: H0=${alert[0]}, H1=${alert[1]}, H3=${alert[3]}, H7=${alert[7]}`
    );
  } else {
    console.log(
      "RH: tidak ada"
    );
  }

  // Tidak ada apa pun untuk dikirim.
  if (!rack && !alert) {
    console.log(
      `SKIP ${user.nama}: tidak ada jadwal / RH hari ini`
    );

    skipNoReminder++;
    continue;
  }


  // ====================================================
  // SUSUN PESAN
  // ====================================================

  const bodyParts = [];

  if (rack) {
    bodyParts.push(
      `Jadwal hari ini: ${rack}`
    );
  }

  if (alert) {
    const alertParts = [];

    if (alert[0] > 0) {
      alertParts.push(
        `H0 ${alert[0]} item`
      );
    }

    if (alert[1] > 0) {
      alertParts.push(
        `H-1 ${alert[1]} item`
      );
    }

    if (alert[3] > 0) {
      alertParts.push(
        `H-3 ${alert[3]} item`
      );
    }

    if (alert[7] > 0) {
      alertParts.push(
        `H-7 ${alert[7]} item`
      );
    }

    if (alertParts.length) {
      bodyParts.push(
        `Masa tarik: ${alertParts.join(
          " • "
        )}`
      );
    }
  }

  const title =
    `ExpiCheck • ${user.storeid}`;

  const body =
    bodyParts.join(" | ");

  console.log(
    `Pesan: ${body}`
  );


  // ====================================================
  // MULTICAST FCM
  // ====================================================

  for (
    let i = 0;
    i < user.tokens.length;
    i += 500
  ) {
    const batch =
      user.tokens.slice(
        i,
        i + 500
      );

    try {
      const result =
        await messaging.sendEachForMulticast({
          tokens: batch,

          notification: {
            title,
            body,
          },

          data: {
            title,
            body,
            tag:
              `expicheck-${todayKey}-${user.uid}`,
            url:
              "https://tajurh8-cmd.github.io/check-expired/index.html",
          },

          webpush: {
            headers: {
              Urgency: "high",
            },

            notification: {
              icon:
                "https://tajurh8-cmd.github.io/check-expired/icon-192.png",

              badge:
                "https://tajurh8-cmd.github.io/check-expired/icon-192.png",

              requireInteraction: false,
            },

            fcmOptions: {
              link:
                "https://tajurh8-cmd.github.io/check-expired/index.html",
            },
          },
        });

      sentTokens +=
        result.successCount;

      failedTokens +=
        result.failureCount;

      console.log(
        `${user.nama}: sukses ${result.successCount}, gagal ${result.failureCount}`
      );

      result.responses.forEach(
        (response, index) => {
          if (!response.success) {
            console.warn(
              `TOKEN GAGAL ${user.nama} [${i + index}] →`,
              response.error?.code ||
                response.error?.message
            );
          }
        }
      );
    } catch (error) {
      failedTokens += batch.length;

      console.error(
        `FCM ERROR ${user.nama}:`,
        error.code ||
          error.message
      );
    }
  }

  sentUsers++;

  console.log(
    `✓ SELESAI ${user.nama}`
  );
}


// ======================================================
// 10. SUMMARY
// ======================================================

console.log("");
console.log("========================================");
console.log("HASIL EXPI CHECK PUSH");
console.log("========================================");

console.log(
  `User aktif       : ${userSnap.size}`
);

console.log(
  `User siap push   : ${users.size}`
);

console.log(
  `Tidak punya token: ${skipNoToken}`
);

console.log(
  `Tidak punya toko : ${skipNoStore}`
);

console.log(
  `Tidak ada reminder: ${skipNoReminder}`
);

console.log(
  `User dikirim     : ${sentUsers}`
);

console.log(
  `Token sukses     : ${sentTokens}`
);

console.log(
  `Token gagal      : ${failedTokens}`
);

console.log("========================================");
