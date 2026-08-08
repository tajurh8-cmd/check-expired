import admin from "firebase-admin";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) throw new Error("GitHub Secret FIREBASE_SERVICE_ACCOUNT belum tersedia.");

let serviceAccount;
try { serviceAccount = JSON.parse(raw); }
catch { throw new Error("FIREBASE_SERVICE_ACCOUNT bukan JSON valid."); }

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const messaging = admin.messaging();

const APP_URL = "https://tajurh8-cmd.github.io/check-expired/index.html";
const pad = n => String(n).padStart(2, "0");
function partsWIB(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);
  const o = Object.fromEntries(p.map(x => [x.type,x.value]));
  return {y:+o.year,m:+o.month,d:+o.day};
}
function ymdWIB(d = new Date()) { const x=partsWIB(d); return `${x.y}-${pad(x.m)}-${pad(x.d)}`; }
function ymWIB(d = new Date()) { return ymdWIB(d).slice(0,7); }
function addDaysYmd(baseYmd, days) {
  const [y,m,d]=baseYmd.split("-").map(Number);
  const dt=new Date(Date.UTC(y,m-1,d+days,12));
  return ymdWIB(dt);
}
function safeId(v){ return String(v).replace(/[^a-zA-Z0-9_-]/g,"_"); }
function dayRangeWIB(ymd) {
  const start = new Date(`${ymd}T00:00:00+07:00`);
  const end = new Date(`${addDaysYmd(ymd,1)}T00:00:00+07:00`);
  return [admin.firestore.Timestamp.fromDate(start), admin.firestore.Timestamp.fromDate(end)];
}
function ownerId(item){ return String(item.userid || item.inputByNik || item.nik || item.userNik || item.createdBy || "").trim(); }
function userId(doc){ const u=doc.data(); return String(u.userid || u.nik || doc.id).trim(); }
function tokensOf(u){ return [...new Set([u.fcmToken, ...(Array.isArray(u.fcmTokens)?u.fcmTokens:[])].filter(Boolean))]; }

async function main(){
  const today=ymdWIB();
  console.log(`ExpiCheck push ${today} WIB`);

  // Schema aplikasi: users memakai active:true, bukan status:"AKTIF".
  const usersSnap=await db.collection("users").where("active","==",true).get();
  console.log(`User aktif: ${usersSnap.size}`);

  // Hanya 4 query tanggal per run; filter toko/user dilakukan di memory.
  const labels = [[0,"H-0"],[1,"H-1"],[3,"H-3"],[7,"H-7"]];
  const dueByKey = new Map();
  for (const [days,label] of labels){
    const date=addDaysYmd(today,days);
    const [start,end]=dayRangeWIB(date);
    const snap=await db.collection("edItems").where("tanggalTarik",">=",start).where("tanggalTarik","<",end).get();
    for (const doc of snap.docs){
      const x=doc.data();
      const key=`${String(x.storeid||"").toUpperCase()}|${ownerId(x)}`;
      if(!dueByKey.has(key)) dueByKey.set(key,[]);
      dueByKey.get(key).push({label, plu:x.plu||x.barcode||"-", rak:x.rak||"-", name:x.deskripsi||"Produk"});
    }
  }

  let sent=0, skipped=0, failed=0;
  for (const udoc of usersSnap.docs){
    const u=udoc.data();
    const uid=userId(udoc);
    const store=String(u.storeid||"").toUpperCase();
    const tokens=tokensOf(u);
    if(!uid || !store || !tokens.length){ skipped++; continue; }

    const scheduleId=`${safeId(store)}_${safeId(uid)}_${ymWIB()}`;
    const scheduleSnap=await db.collection("JadwalRakUser").doc(scheduleId).get();
    const rack=scheduleSnap.exists ? String(scheduleSnap.data()?.days?.[today]||"").trim() : "";

    // Data baru selalu punya userid/inputByNik. Fallback store-only sengaja tidak dipakai agar notifikasi tidak silang user.
    const due=dueByKey.get(`${store}|${uid}`) || [];
    if(!rack && !due.length){ skipped++; continue; }

    const body=[];
    if(rack) body.push(`Jadwal hari ini: cek rak ${rack}`);
    if(due.length){
      const counts={}; for(const x of due) counts[x.label]=(counts[x.label]||0)+1;
      body.push(`Masa tarik: ${Object.entries(counts).map(([k,v])=>`${k} ${v} item`).join(", ")}`);
    }

    const message={
      tokens,
      data:{title:"ExpiCheck",body:body.join(" • "),url:APP_URL,tag:`expicheck-${today}-${uid}`},
      webpush:{fcmOptions:{link:APP_URL}}
    };
    try{
      const r=await messaging.sendEachForMulticast(message);
      sent += r.successCount; failed += r.failureCount;
      console.log(`User ${uid} (${store}): ${r.successCount} terkirim, ${r.failureCount} gagal`);
    }catch(e){ failed += tokens.length; console.error(`User ${uid} gagal:`,e.code||e.message); }
  }
  console.log(`SELESAI: terkirim=${sent}, gagal=${failed}, dilewati=${skipped}`);
}

main().catch(e=>{ console.error("FATAL:",e); process.exit(1); });
