import admin from "firebase-admin";

// ======================================================
// ExpiCheck - WhatsApp H-7 Reminder via Fonnte
// Scheduler: GitHub Actions, 01:00 UTC = 08:00 WIB
// ======================================================

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountRaw) {
  throw new Error("GitHub Secret FIREBASE_SERVICE_ACCOUNT belum dibuat.");
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountRaw);
} catch {
  throw new Error("FIREBASE_SERVICE_ACCOUNT bukan JSON service account yang valid.");
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TZ = "Asia/Jakarta";
const FONNTE_URL = "https://api.fonnte.com/send";

function jakartaDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now).reduce((out, part) => {
    out[part.type] = part.value;
    return out;
  }, {});

  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
  };
}

function dateKey({ y, m, d }) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function addDays(parts, days) {
  const date = new Date(Date.UTC(parts.y, parts.m - 1, parts.d + days));
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
  };
}

function jakartaMidnightUtc(parts) {
  // WIB = UTC+7
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d, -7, 0, 0, 0));
}

function normalizePhone(value) {
  let phone = String(value || "").replace(/\D/g, "");
  if (phone.startsWith("0")) phone = `62${phone.slice(1)}`;
  if (phone.startsWith("8")) phone = `62${phone}`;
  return phone;
}

function userId(doc) {
  const data = doc.data();
  return String(data.userid || data.nik || data.NIK || doc.id || "").trim();
}

function userName(data, uid) {
  return String(data.nama || data.name || data.username || uid).trim();
}

function storeIdFrom(data) {
  return String(data.storeid || data.storeId || "").trim();
}

function storeNameFrom(data, fallback) {
  return String(data.storename || data.storeName || fallback || "").trim();
}

function phoneFromUser(data) {
  return normalizePhone(data.phone || data.whatsapp || data.noWa || data.noWhatsapp || "");
}

function formatExpiredDate(timestamp) {
  if (!timestamp?.toDate) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(timestamp.toDate());
}

function fonnteSucceeded(payload) {
  // Fonnte returns status=true for a successful request. Keep the parser
  // tolerant because the API can also return string/number-like values.
  return payload?.status === true || payload?.status === "true" || payload?.status === 1;
}

async function sendFonnte(token, target, message) {
  const form = new URLSearchParams();
  form.set("target", target);
  form.set("message", message);
  form.set("countryCode", "62");

  const response = await fetch(FONNTE_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const raw = await response.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { raw };
  }

  if (!response.ok || !fonnteSucceeded(payload)) {
    const detail = payload?.reason || payload?.detail || payload?.message || payload?.raw || `HTTP ${response.status}`;
    throw new Error(`Fonnte gagal: ${detail}`);
  }

  return payload;
}

const today = jakartaDateParts();
const todayKey = dateKey(today);
const targetDate = addDays(today, 7);
const targetKey = dateKey(targetDate);

const startTimestamp = admin.firestore.Timestamp.fromDate(jakartaMidnightUtc(targetDate));
const endTimestamp = admin.firestore.Timestamp.fromDate(jakartaMidnightUtc(addDays(targetDate, 1)));

console.log("========================================");
console.log(`ExpiCheck WhatsApp H-7 | ${todayKey} WIB`);
console.log(`Target expired        | ${targetKey}`);
console.log("========================================");

// ------------------------------------------------------
// 1. BACA USER AKTIF
// ------------------------------------------------------
const userSnap = await db.collection("users").where("active", "==", true).get();
const users = new Map();

for (const doc of userSnap.docs) {
  const data = doc.data();
  const uid = userId(doc);
  const storeid = storeIdFrom(data);
  const phone = phoneFromUser(data);

  if (!uid || !storeid || !phone) continue;

  users.set(`${storeid}|${uid}`, {
    uid,
    storeid,
    nama: userName(data, uid),
    phone,
  });
}

console.log(`User aktif dengan WA valid: ${users.size}`);

// ------------------------------------------------------
// 2. BACA TOKO + TOKEN FONNTE PER TOKO
// ------------------------------------------------------
const storeSnap = await db.collection("stores").get();
const stores = new Map();

for (const doc of storeSnap.docs) {
  const data = doc.data();
  const storeid = String(data.storeid || doc.id || "").trim();
  const token = String(data.fonnteToken || "").trim();
  const waActive = data.waActive === true || data.waActive === "true";

  if (!storeid) continue;

  stores.set(storeid, {
    storeid,
    storename: storeNameFrom(data, storeid),
    token,
    waActive,
  });
}

console.log(`Toko ditemukan: ${stores.size}`);

// ------------------------------------------------------
// 3. BACA ITEM EXPIRED TEPAT H-7
// ------------------------------------------------------
const itemSnap = await db.collection("edItems")
  .where("tanggalTarik", ">=", startTimestamp)
  .where("tanggalTarik", "<", endTimestamp)
  .get();

console.log(`Item expired H-7 ditemukan: ${itemSnap.size}`);

const grouped = new Map();
let alreadySent = 0;
let skippedNoUser = 0;
let skippedNoStore = 0;

for (const doc of itemSnap.docs) {
  const item = doc.data();
  const storeid = String(item.storeid || "").trim();
  const uid = String(item.inputByNik || item.userid || "").trim();

  if (!storeid || !uid) {
    skippedNoUser++;
    continue;
  }

  if (String(item.waH7Date || "").trim() === todayKey) {
    alreadySent++;
    continue;
  }

  const key = `${storeid}|${uid}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push({ id: doc.id, ...item });
}

console.log(`Kelompok penerima: ${grouped.size}`);
console.log(`Sudah ditandai terkirim hari ini: ${alreadySent}`);

// ------------------------------------------------------
// 4. KIRIM 1 PESAN RINGKAS PER USER
// ------------------------------------------------------
let sentMessages = 0;
let sentItems = 0;
let failedMessages = 0;

for (const [key, items] of grouped.entries()) {
  const user = users.get(key);
  const storeid = key.split("|")[0];
  const store = stores.get(storeid);

  if (!user) {
    skippedNoUser++;
    console.warn(`SKIP ${key}: user aktif/nomor WA tidak ditemukan.`);
    continue;
  }

  if (!store) {
    skippedNoStore++;
    console.warn(`SKIP ${key}: toko ${storeid} tidak ditemukan.`);
    continue;
  }

  if (!store.waActive) {
    console.log(`SKIP ${key}: notifikasi WA toko nonaktif.`);
    continue;
  }

  if (!store.token) {
    console.warn(`SKIP ${key}: token Fonnte toko ${storeid} kosong.`);
    continue;
  }

  const lines = items.map((item, index) => {
    const plu = String(item.plu || item.barcode || item.kode || "-");
    const desc = String(item.deskripsi || item.descp || item.nama || item.name || item.productName || "Produk").trim();
    const qty = Number(item.qty) || 0;
    const rak = String(item.rak || item.rack || "-").trim();
    return `${index + 1}. ${plu} - ${desc}\n   QTY: ${qty} | Rak: ${rak} | Exp: ${formatExpiredDate(item.tanggalTarik)}`;
  });

  const message = [
    "*EXPI CHECK - REMINDER H-7*",
    "",
    `Halo ${user.nama},`,
    `Berikut barang yang akan masuk masa tarik 7 hari lagi di ${store.storename}:`,
    "",
    ...lines,
    "",
    `Total: ${items.length} item`,
    "",
    "Mohon dilakukan pengecekan sesuai prosedur toko.",
    "",
    "ExpiCheck",
  ].join("\n");

  console.log("----------------------------------------");
  console.log(`Kirim WA: ${user.nama} | ${user.phone} | ${storeid}`);
  console.log(`Item: ${items.length}`);

  try {
    const result = await sendFonnte(store.token, user.phone, message);
    console.log(`✓ WA berhasil: ${JSON.stringify(result)}`);

    // Tandai item hanya setelah API Fonnte menerima request berhasil.
    const batch = db.batch();
    for (const item of items) {
      batch.update(db.collection("edItems").doc(item.id), {
        waH7Date: todayKey,
        waH7SentAt: admin.firestore.FieldValue.serverTimestamp(),
        waH7Status: "sent",
      });
    }
    await batch.commit();

    sentMessages++;
    sentItems += items.length;
  } catch (error) {
    failedMessages++;
    console.error(`✗ WA gagal ${user.nama} (${user.phone}): ${error.message}`);

    // Simpan status error tanpa mengubah waH7Date, sehingga scheduler
    // berikutnya/manual run masih dapat mencoba lagi.
    try {
      const batch = db.batch();
      for (const item of items) {
        batch.update(db.collection("edItems").doc(item.id), {
          waH7LastError: String(error.message).slice(0, 500),
          waH7LastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
          waH7Status: "failed",
        });
      }
      await batch.commit();
    } catch (logError) {
      console.error(`Gagal menyimpan log error WA: ${logError.message}`);
    }
  }
}

console.log("");
console.log("========================================");
console.log("HASIL EXPI CHECK WHATSAPP");
console.log("========================================");
console.log(`Hari ini             : ${todayKey} WIB`);
console.log(`Target expired H-7   : ${targetKey}`);
console.log(`User aktif + WA      : ${users.size}`);
console.log(`Item H-7             : ${itemSnap.size}`);
console.log(`Pesan berhasil       : ${sentMessages}`);
console.log(`Item ditandai terkirim: ${sentItems}`);
console.log(`Pesan gagal          : ${failedMessages}`);
console.log(`Sudah terkirim       : ${alreadySent}`);
console.log(`Skip user            : ${skippedNoUser}`);
console.log(`Skip toko            : ${skippedNoStore}`);
console.log("========================================");

// Jangan membuat workflow terlihat sukses jika ada pengiriman yang gagal.
if (failedMessages > 0) process.exitCode = 1;
