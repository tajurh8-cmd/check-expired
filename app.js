import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, setDoc,
  updateDoc, getDocs, query, where, increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= FIREBASE ================= */
initializeApp({
  apiKey:"AIzaSyD_I1HSrulXlPCj9_U_FhSfsYQhz-DxbMk",
  authDomain:"dbplu-62d92.firebaseapp.com",
  projectId:"dbplu-62d92"
});
const db = getFirestore();

/* ================= ELEMENT ================= */
const rakSelect=document.getElementById("rakSelect");
const rakInput=document.getElementById("rakInput");
const barcodeEl=document.getElementById("barcode");
const descEl=document.getElementById("deskripsi");
const expiredEl=document.getElementById("expired");
const qtyEl=document.getElementById("qty");
const btnSave=document.getElementById("btnSave");

const btnScan=document.getElementById("btnScan");
const scannerBox=document.getElementById("scannerBox");
const video=document.getElementById("video");
const btnCloseScan=document.getElementById("btnCloseScan");

const currentUser = JSON.parse(localStorage.getItem("user"));

/* ================= UTIL ================= */
function parseDate(v){
  const n=v.replace(/\D/g,"");
  if(n.length!==6 && n.length!==8) return null;
  const d=n.slice(0,2), m=n.slice(2,4);
  const y=n.length===6 ? "20"+n.slice(4) : n.slice(4);
  const x=new Date(y,m-1,d);
  return isNaN(x)?null:x;
}

function tanggalTarik(exp,rh){
  const x=new Date(exp);
  x.setDate(x.getDate()-Number(rh||30));
  return x;
}

function normalizeBarcode(v){
  v=v.trim();
  return v.length>1 ? v.slice(0,-1) : v;
}

/* ================= RAK ================= */
async function loadRak(){
  rakSelect.innerHTML="<option value=''>Pilih Rak</option>";
  const s=await getDocs(collection(db,"Rak"));
  s.forEach(d=>rakSelect.innerHTML+=`<option>${d.data().name}</option>`);
}
loadRak();

async function getRak(){
  let r=rakSelect.value||rakInput.value.trim().toUpperCase();
  if(!r) return "";
  if(![...rakSelect.options].some(o=>o.value===r)){
    await setDoc(doc(collection(db,"Rak")),{name:r});
    rakSelect.innerHTML+=`<option>${r}</option>`;
  }
  rakSelect.value=r; rakInput.value="";
  return r;
}

/* ================= LOOKUP BARCODE ================= */
async function lookup(b){
  descEl.value="Mencari...";
  const q=query(collection(db,"datasumber"),where("BARCODE","==",b));
  const s=await getDocs(q);
  if(s.empty){
    descEl.value="❌ Tidak ditemukan";
    descEl.dataset.rh=30;
    return;
  }
  const d=s.docs[0].data();
  descEl.value=d.DESKRIPSI;
  descEl.dataset.rh=d.RH||30;
}

/* ================= MANUAL INPUT ================= */
barcodeEl.addEventListener("change",()=>{
  const b=normalizeBarcode(barcodeEl.value);
  barcodeEl.value=b;
  lookup(b);
  expiredEl.focus();
});

/* ================= SCANNER ================= */
let reader=null;

btnScan.onclick = async () => {
  scannerBox.classList.remove("d-none");

  if (!reader) reader = new ZXing.BrowserMultiFormatReader();

  // 🔥 PAKSA PRIORITAS KAMERA BELAKANG
  const constraints = {
    video: {
      facingMode: { exact: "environment" }
    }
  };

  try {
    await reader.decodeFromConstraints(
      constraints,
      video,
      (res) => {
        if (res) {
          const code = normalizeBarcode(res.text);
          barcodeEl.value = code;
          lookup(code);
          reader.reset();
          scannerBox.classList.add("d-none");
          expiredEl.focus();
        }
      }
    );
  } catch (e) {
    // ⚠️ FALLBACK JIKA BROWSER TIDAK DUKUNG facingMode
    const dev = await reader.listVideoInputDevices();
    const cam =
      dev.find(d => d.label.toLowerCase().includes("back")) ||
      dev[dev.length - 1];

    reader.decodeFromVideoDevice(
      cam.deviceId,
      video,
      (res) => {
        if (res) {
          const code = normalizeBarcode(res.text);
          barcodeEl.value = code;
          lookup(code);
          reader.reset();
          scannerBox.classList.add("d-none");
          expiredEl.focus();
        }
      }
    );
  }
};

btnCloseScan.onclick=()=>{
  scannerBox.classList.add("d-none");
  if(reader) reader.reset();
};

/* ================= SIMPAN ================= */
btnSave.onclick=async()=>{
  const rak=await getRak();
  const exp=parseDate(expiredEl.value);
  const qty=Number(qtyEl.value);
  const rh=Number(descEl.dataset.rh)||30;

  if(!rak||!barcodeEl.value||!exp||!qty){
    alert("Data belum lengkap");return;
  }

  const tarik=tanggalTarik(exp,rh);
  const id=`${barcodeEl.value}_${exp.toISOString().slice(0,10).replace(/-/g,"")}`;
  const ref=doc(db,"edItems",id);
  const snap=await getDoc(ref);

  if(snap.exists()){
    await updateDoc(ref,{
      qty:increment(qty),
      tanggalTarik:tarik,
      RH:rh,
      lastUpdate:new Date(),
      user:currentUser.username
    });
  }else{
    await setDoc(ref,{
      barcode:barcodeEl.value,
      deskripsi:descEl.value,
      rak,
      expiredDate:exp,
      tanggalTarik:tarik,
      RH:rh,
      qty,
      lastUpdate:new Date(),
      user:currentUser.username
    });
  }

  barcodeEl.value="";
  descEl.value="";
  expiredEl.value="";
  qtyEl.value="";
  barcodeEl.focus();
};
