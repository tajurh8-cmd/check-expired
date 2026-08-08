import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

initializeApp({
  apiKey:"AIzaSyD_I1HSrulXlPCj9_U_FhSfsYQhz-DxbMk",
  authDomain:"dbplu-62d92.firebaseapp.com",
  projectId:"dbplu-62d92"
});
const db = getFirestore();
const currentUser = JSON.parse(localStorage.getItem("user") || "null");
if (!currentUser?.storeid) location.href = "login.html";

const userId = String(currentUser.userid || currentUser.nik || currentUser.NIK || currentUser.username || "").trim();
if (!userId) throw new Error("ID user tidak ditemukan pada sesi login");
const userName = currentUser.name || currentUser.nama || currentUser.username || userId;

const storeInfo = document.getElementById("storeInfo");
const userInfo = document.getElementById("userInfo");
const monthPicker = document.getElementById("monthPicker");
const rows = document.getElementById("scheduleRows");
const btnSave = document.getElementById("btnSaveSchedule");
const newRackName = document.getElementById("newRackName");
const btnAddRack = document.getElementById("btnAddRack");
storeInfo.textContent = `${currentUser.storeid} - ${currentUser.storename}`;
userInfo.textContent = `Jadwal: ${userName} (${userId})`;

let rakNames = [];
let currentSchedule = {};
const DAY_NAMES = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

function safeId(v){ return String(v).replace(/[^a-zA-Z0-9_-]/g,"_"); }
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function ymNow(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function scheduleDocId(ym){ return `${safeId(currentUser.storeid)}_${safeId(userId)}_${ym}`; }
function optionHtml(selected=""){
  return `<option value="">OFF / Tidak dijadwalkan</option>` + rakNames.map(r=>`<option value="${esc(r)}" ${r===selected?'selected':''}>${esc(r)}</option>`).join("");
}

async function loadRacks(){
  const snap=await getDocs(query(collection(db,"Rak"),where("storeid","==",currentUser.storeid)));
  rakNames=[...new Set(snap.docs.map(d=>String(d.data().name||"").trim().toUpperCase()).filter(Boolean))].sort();
}

async function loadMonth(){
  const ym=monthPicker.value || ymNow();
  monthPicker.value=ym;
  rows.innerHTML='<div class="text-center text-secondary py-4">Memuat jadwal...</div>';
  const snap=await getDoc(doc(db,"JadwalRakUser",scheduleDocId(ym)));
  currentSchedule=snap.exists() ? (snap.data().days || {}) : {};
  renderMonth(ym);
}

function renderMonth(ym){
  const [year,month]=ym.split("-").map(Number);
  const totalDays=new Date(year,month,0).getDate();
  const today=new Date();
  const todayKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  let html="";
  for(let day=1;day<=totalDays;day++){
    const d=new Date(year,month-1,day);
    const key=`${ym}-${String(day).padStart(2,"0")}`;
    const isToday=key===todayKey;
    html += `<div class="mb-3 p-2 rounded-3 ${isToday?'border border-primary bg-primary-subtle':''}"><label class="form-label mb-1">${DAY_NAMES[d.getDay()]}, ${day} ${isToday?'<span class="badge text-bg-primary ms-1">Hari ini</span>':''}</label><select class="form-select schedule-select" data-date="${key}">${optionHtml(String(currentSchedule[key]||"").toUpperCase())}</select></div>`;
  }
  rows.innerHTML=html;
}

btnAddRack.addEventListener("click", async()=>{
  const name=String(newRackName.value||"").trim().toUpperCase();
  if(!name) return window.ExpiUI?.toast?.("Nama rak wajib diisi","warning");
  btnAddRack.disabled=true;
  try{
    const rakId=`${safeId(currentUser.storeid)}_${safeId(name)}`;
    await setDoc(doc(db,"Rak",rakId),{name,storeid:currentUser.storeid,storename:currentUser.storename,createdAt:new Date(),createdBy:userId},{merge:true});
    if(!rakNames.includes(name)) rakNames.push(name);
    rakNames.sort();
    newRackName.value="";
    // Render ulang tanpa menghilangkan pilihan yang sedang diedit.
    document.querySelectorAll(".schedule-select").forEach(el=>currentSchedule[el.dataset.date]=el.value);
    renderMonth(monthPicker.value);
    window.ExpiUI?.toast?.(`Rak ${name} ditambahkan`,"success");
  }catch(err){ window.ExpiUI?.toast?.(err.message||"Gagal menambah rak","error"); }
  finally{btnAddRack.disabled=false;}
});

monthPicker.addEventListener("change",()=>loadMonth().catch(err=>window.ExpiUI?.toast?.("Gagal memuat jadwal: "+err.message,"error")));

btnSave.addEventListener("click",async()=>{
  const ym=monthPicker.value;
  if(!ym) return window.ExpiUI?.toast?.("Pilih bulan jadwal","warning");
  const days={};
  document.querySelectorAll(".schedule-select").forEach(el=>{ if(el.value) days[el.dataset.date]=el.value; });
  btnSave.disabled=true; btnSave.textContent="Menyimpan...";
  try{
    await setDoc(doc(db,"JadwalRakUser",scheduleDocId(ym)),{
      storeid:currentUser.storeid, storename:currentUser.storename,
      userid:userId, username:userName, month:ym, days,
      updatedAt:new Date(), updatedBy:userId
    });
    window.ExpiUI?.toast?.("Jadwal bulanan berhasil disimpan","success");
    setTimeout(()=>location.href="input.html",700);
  }catch(err){ window.ExpiUI?.toast?.(err.message||"Gagal menyimpan jadwal","error"); }
  finally{btnSave.disabled=false;btnSave.innerHTML='<i class="bi bi-calendar-check me-2"></i>SIMPAN JADWAL BULANAN';}
});

(async()=>{
  monthPicker.value=ymNow();
  await loadRacks();
  await loadMonth();
})().catch(err=>window.ExpiUI?.toast?.("Gagal membuka jadwal: "+err.message,"error"));
