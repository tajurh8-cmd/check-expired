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

document.getElementById("storeInfo").textContent = `${currentUser.storeid} - ${currentUser.storename}`;

const DAYS = [
  ["senin","Senin"],["selasa","Selasa"],["rabu","Rabu"],["kamis","Kamis"],
  ["jumat","Jumat"],["sabtu","Sabtu"],["minggu","Minggu"]
];
const rows = document.getElementById("scheduleRows");
const btnSave = document.getElementById("btnSaveSchedule");
let rakNames = [];

function optionHtml(selected="") {
  return `<option value="">Tidak dijadwalkan</option>` + rakNames.map(r => `<option value="${escapeHtml(r)}" ${r===selected?'selected':''}>${escapeHtml(r)}</option>`).join("");
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

async function init(){
  const rakSnap = await getDocs(query(collection(db,"Rak"), where("storeid","==",currentUser.storeid)));
  rakNames = [...new Set(rakSnap.docs.map(d=>String(d.data().name||"").trim().toUpperCase()).filter(Boolean))].sort();
  const scheduleSnap = await getDoc(doc(db,"JadwalRak",currentUser.storeid));
  const data = scheduleSnap.exists() ? scheduleSnap.data() : {};
  rows.innerHTML = DAYS.map(([key,label]) => `<div class="mb-3"><label class="form-label">${label}</label><select class="form-select schedule-select" data-day="${key}">${optionHtml(String(data[key]||"").toUpperCase())}</select></div>`).join("");
}

btnSave.addEventListener("click", async()=>{
  const payload = {storeid:currentUser.storeid, storename:currentUser.storename, updatedAt:new Date(), updatedBy:currentUser.userid};
  document.querySelectorAll(".schedule-select").forEach(el=>payload[el.dataset.day]=el.value);
  btnSave.disabled=true; btnSave.textContent="Menyimpan...";
  try{
    await setDoc(doc(db,"JadwalRak",currentUser.storeid),payload,{merge:true});
    window.ExpiUI?.toast?.("Jadwal cek rak berhasil disimpan","success");
    setTimeout(()=>location.href="input.html",700);
  }catch(err){
    window.ExpiUI?.toast?.(err.message||"Gagal menyimpan jadwal","error");
  }finally{btnSave.disabled=false;btnSave.innerHTML='<i class="bi bi-calendar-check me-2"></i>SIMPAN JADWAL';}
});

init().catch(err=>window.ExpiUI?.toast?.("Gagal memuat jadwal: "+err.message,"error"));
