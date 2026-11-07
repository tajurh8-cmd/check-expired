import { enablePushNotifications, syncPushTokenIfAllowed } from "./push-notifications.js";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, doc, deleteDoc, query, where, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const firebaseConfig={
  apiKey:"AIzaSyD_I1HSrulXlPCj9_U_FhSfsYQhz-DxbMk",
  authDomain:"dbplu-62d92.firebaseapp.com",
  projectId:"dbplu-62d92",
  storageBucket:"dbplu-62d92.firebasestorage.app",
  messagingSenderId:"623211397382",
  appId:"1:623211397382:web:db9a7bd4abcc7f44261e87"
};
const firebaseApp=getApps().length?getApp():initializeApp(firebaseConfig);
const db=getFirestore(firebaseApp);
const btnNotification=document.getElementById("btnNotification");
const todayNotice=document.getElementById("todayNotice");
const currentUser=JSON.parse(localStorage.getItem("user")||"null");
if(!currentUser?.storeid){localStorage.removeItem("user");location.href="login.html";throw new Error("Sesi toko tidak valid");}
const fmt=d=>d.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
const sisaHari=t=>Math.ceil((new Date(t.getFullYear(),t.getMonth(),t.getDate())-new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()))/86400000);
const warna=s=>s<0?["b-abu","LEWAT","bg-secondary"]:s<180?["b-merah","< 6 Bulan","bg-danger"]:s<365?["b-kuning","6–12 Bulan","bg-warning"]:s<730?["b-hijau","1–2 Tahun","bg-success"]:["b-biru","> 2 Tahun","bg-primary"];
const listEl=document.getElementById("list"),totalQtyEl=document.getElementById("totalQty"),totalItemEl=document.getElementById("totalItem"),bawah6El=document.getElementById("bawah6"),bulan6_12El=document.getElementById("bulan6_12"),tahun1_2El=document.getElementById("tahun1_2"),atas2El=document.getElementById("atas2");
let loading=false;
async function loadDashboard(force=false){
 if(loading)return;const cacheKey=`dashboard_${currentUser.storeid}`;const cached=sessionStorage.getItem(cacheKey);
 if(!force&&cached){try{const p=JSON.parse(cached);if(Date.now()-p.savedAt<60000){const cachedItems=p.items.map(x=>({...x,exp:new Date(x.exp),tarik:new Date(x.tarik)}));render(cachedItems);runDailyNotifications(cachedItems);return;}}catch(_){}}
 loading=true;listEl.innerHTML='<div class="alert alert-light text-center">Memuat data...</div>';
 try{const qItems=query(collection(db,"edItems"),where("storeid","==",currentUser.storeid),limit(500));const snap=await getDocs(qItems);const items=[];snap.forEach(d=>{const x=d.data();if(!x.expiredDate||!x.tanggalTarik)return;const exp=x.expiredDate.toDate(),tarik=x.tanggalTarik.toDate(); if (tarik.getTime() < new Date().setHours(0,0,0,0)) return; items.push({id:d.id,...x,exp,tarik,s:sisaHari(tarik)});});sessionStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),items:items.map(x=>({...x,exp:x.exp.toISOString(),tarik:x.tarik.toISOString()}))}));render(items); await runDailyNotifications(items);}catch(err){console.error(err);listEl.innerHTML=`<div class="alert alert-danger">Gagal membaca data: ${esc(err.message)}</div>`;}finally{loading=false;}
}
function render(items){let tq=0,b6=0,b612=0,t12=0,a2=0;items.forEach(x=>{const q=Number(x.qty)||0;tq+=q;if(x.s<180)b6+=q;else if(x.s<365)b612+=q;else if(x.s<730)t12+=q;else a2+=q;});totalQtyEl.innerText=tq;totalItemEl.innerText=items.length;bawah6El.innerText=b6;bulan6_12El.innerText=b612;tahun1_2El.innerText=t12;atas2El.innerText=a2;items.sort((a,b)=>a.s-b.s||String(a.deskripsi||"").localeCompare(String(b.deskripsi||"")));if(!items.length){listEl.innerHTML=`<div class="alert alert-light text-center">Belum ada data untuk toko ${esc(currentUser.storeid)}.</div>`;return;}listEl.innerHTML=items.map(x=>{const w=warna(x.s);return `<div class="card item-card ${w[0]}"><div class="card-body"><div class="d-flex justify-content-between gap-2"><b>${esc(x.deskripsi||"-")}</b><div class="label text-end">User: <b>${esc(x.user||"-")}</b></div></div><div style="font-size:18px;font-weight:700">Qty: ${Number(x.qty)||0}</div><div class="label mt-1">${esc(x.barcode||"-")} • Rak <b>${esc(x.rak||"-")}</b></div><div class="label mt-1">Expired: ${fmt(x.exp)}</div><div class="label">Tanggal Tarik: ${fmt(x.tarik)}</div><div class="label">RH: <b>${Number(x.RH)||30}</b> hari</div><div class="d-flex justify-content-between mt-2"><div class="umur">${x.s<0?"LEWAT "+Math.abs(x.s)+" hari":"Sisa "+x.s+" hari"}</div><div class="d-flex gap-2"><span class="pill ${w[2]}">${w[1]}</span><button class="btn btn-sm btn-outline-danger" onclick="hapus('${x.id}')">🗑</button></div></div></div></div>`;}).join("");}
window.refreshDashboard=()=>{sessionStorage.removeItem(`dashboard_${currentUser.storeid}`);loadDashboard(true);};
window.hapus=async id=>{
  const ok=await ExpiUI.confirm("Item yang sudah dihapus tidak dapat dikembalikan.",{title:"Hapus item?",okText:"Hapus",cancelText:"Batal",danger:true});
  if(!ok)return;
  try{
    await deleteDoc(doc(db,"edItems",id));
    ExpiUI.toast("Item berhasil dihapus","success");
    window.refreshDashboard();
  }catch(e){
    console.error(e);
    ExpiUI.toast("Gagal menghapus item: "+e.message,"error",3500);
  }
};
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
loadDashboard();


function notifUserId(){return String(currentUser.userid||currentUser.nik||currentUser.NIK||currentUser.username||"").trim();}
function safeId(v){return String(v).replace(/[^a-zA-Z0-9_-]/g,"_");}
function ym(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;}
function ymd(d=new Date()){return `${ym(d)}-${String(d.getDate()).padStart(2,"0")}`;}
async function showSystemNotification(title,body,tag){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  try{const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:"./icon-192.png",badge:"./icon-192.png",tag,renotify:false,data:{url:"./index.html"}});}catch(e){console.warn("Notifikasi gagal",e);}
}
async function getTodayRack(){
  const uid=notifUserId(); if(!uid)return "";
  const key=`schedule_today_${currentUser.storeid}_${uid}_${ymd()}`;
  const cached=localStorage.getItem(key); if(cached!==null)return cached;
  try{
    const id=`${safeId(currentUser.storeid)}_${safeId(uid)}_${ym()}`;
    const snap=await getDoc(doc(db,"JadwalRakUser",id));
    const rack=snap.exists()?String((snap.data().days||{})[ymd()]||""):"";
    // bersihkan cache jadwal lama user ini
    Object.keys(localStorage).filter(k=>k.startsWith(`schedule_today_${currentUser.storeid}_${uid}_`)&&k!==key).forEach(k=>localStorage.removeItem(k));
    localStorage.setItem(key,rack); return rack;
  }catch(e){console.warn("Gagal membaca jadwal hari ini",e);return "";}
}
async function runDailyNotifications(items){
  const rack=await getTodayRack();
  const alertItems=items.filter(x=>[7,3,1,0].includes(Number(x.s)));
  if(todayNotice){
    const parts=[];
    parts.push(rack?`<div><b>Jadwal hari ini:</b> ${esc(rack)}</div>`:`<div><b>Jadwal hari ini:</b> OFF / belum dijadwalkan</div>`);
    if(alertItems.length)parts.push(`<div class="mt-1 text-danger"><b>${alertItems.length} item</b> mendekati/masuk tanggal tarik.</div>`);
    todayNotice.innerHTML=parts.join(""); todayNotice.classList.remove("d-none");
  }
  if(Notification.permission!=="granted")return;
  const dailyKey=`notif_done_${currentUser.storeid}_${notifUserId()}_${ymd()}`;
  if(localStorage.getItem(dailyKey)==="1")return;
  if(rack)await showSystemNotification("Jadwal ExpiCheck hari ini",`Cek rak: ${rack}`,`schedule-${ymd()}`);
  if(alertItems.length){
    const h0=alertItems.filter(x=>x.s===0).length;
    const body=h0?`${h0} item masuk tanggal tarik hari ini. Total ${alertItems.length} item perlu perhatian.`:`${alertItems.length} item akan masuk tanggal tarik dalam H-7/H-3/H-1.`;
    await showSystemNotification("Pengingat masa tarik",body,`rh-${ymd()}`);
  }
  localStorage.setItem(dailyKey,"1");
}
async function enableNotifications(){
  if(!btnNotification)return;
  btnNotification.disabled=true;
  btnNotification.style.opacity=".55";
  try{
    ExpiUI.toast("Mengaktifkan notifikasi...","info",1800);
    const result=await enablePushNotifications();
    console.log("FCM aktif:", result);
    ExpiUI.toast("Notifikasi aktif dan token tersimpan","success",3000);
    sessionStorage.removeItem(`dashboard_${currentUser.storeid}`);
    loadDashboard(true);
  }catch(err){
    console.error("Aktivasi FCM gagal:",err);
    ExpiUI.toast(err?.message||"Gagal mengaktifkan notifikasi","warning",5000);
  }finally{
    btnNotification.disabled=false;
    btnNotification.style.opacity="";
  }
}
if(btnNotification){
  btnNotification.addEventListener("click",enableNotifications);
  console.log("Tombol notifikasi siap");
}else{
  console.error("btnNotification tidak ditemukan");
}
syncPushTokenIfAllowed().then(ok=>console.log("FCM auto-sync:",ok));
