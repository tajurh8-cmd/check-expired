import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, setDoc,
  updateDoc, getDocs, query, where, increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

initializeApp({
  apiKey:"AIzaSyD_I1HSrulXlPCj9_U_FhSfsYQhz-DxbMk",
  authDomain:"dbplu-62d92.firebaseapp.com",
  projectId:"dbplu-62d92"
});
const db = getFirestore();

const rakSelect = document.getElementById("rakSelect");
const rakInput = document.getElementById("rakInput");
const barcodeEl = document.getElementById("barcode");
const descEl = document.getElementById("deskripsi");
const expiredEl = document.getElementById("expired");
const qtyEl = document.getElementById("qty");
const btnSave = document.getElementById("btnSave");
const btnScan = document.getElementById("btnScan");
const scannerBox = document.getElementById("scannerBox");
const video = document.getElementById("video");
const btnCloseScan = document.getElementById("btnCloseScan");
const newProductBox = document.getElementById("newProductBox");
const newProductName = document.getElementById("newProductName");
const newProductRh = document.getElementById("newProductRh");
const newProductPlu = document.getElementById("newProductPlu");
const newProductBarcode = document.getElementById("newProductBarcode");
const btnCreateProduct = document.getElementById("btnCreateProduct");
const newProductMsg = document.getElementById("newProductMsg");

const currentUser = JSON.parse(localStorage.getItem("user") || "null");
if (!currentUser?.storeid) {
  localStorage.removeItem("user");
  location.href = "login.html";
  throw new Error("Sesi toko tidak valid");
}

document.getElementById("storeInfo").textContent = `${currentUser.storeid} - ${currentUser.storename}`;

function parseDate(v) {
  const n = String(v || "").replace(/\D/g, "");
  if (n.length !== 6 && n.length !== 8) return null;
  const d = n.slice(0, 2), m = n.slice(2, 4);
  const y = n.length === 6 ? "20" + n.slice(4) : n.slice(4);
  const x = new Date(Number(y), Number(m) - 1, Number(d));
  if (isNaN(x.getTime()) || x.getDate() !== Number(d) || x.getMonth() !== Number(m) - 1) return null;
  return x;
}

function tanggalTarik(exp, rh) {
  const x = new Date(exp);
  x.setDate(x.getDate() - Number(rh || 30));
  return x;
}

function normalizeCode(v) {
  return String(v || "").trim();
}

// datasumber memiliki dua key berbeda: BARCODE dan PLU.
// Input manual dicari ke field PLU, sedangkan hasil scanner dicari ke field BARCODE.
let selectedProduct = null;
let pendingLookup = { mode: "plu", barcode: "", plu: "" };

function showToast(message, type = "success") {
  let el = document.getElementById("appToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "appToast";
    el.style.cssText = "position:fixed;left:50%;bottom:92px;transform:translateX(-50%) translateY(20px);z-index:10000;max-width:calc(100vw - 32px);padding:12px 16px;border-radius:12px;color:#fff;font-weight:700;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,.22);opacity:0;transition:.2s;pointer-events:none;text-align:center";
    document.body.appendChild(el);
  }
  el.style.background = type === "error" ? "#dc2626" : type === "warning" ? "#d97706" : "#15803d";
  el.textContent = message;
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateX(-50%) translateY(0)";
  });
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(-50%) translateY(20px)";
  }, 2400);
}

function safeId(v) {
  return String(v).replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function loadRak() {
  rakSelect.innerHTML = "<option value=''>Pilih Rak</option>";
  const qRak = query(collection(db, "Rak"), where("storeid", "==", currentUser.storeid));
  const snap = await getDocs(qRak);
  const names = [];
  snap.forEach(d => {
    const name = String(d.data().name || "").trim();
    if (name) names.push(name);
  });
  names.sort().forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    rakSelect.appendChild(opt);
  });
}
loadRak().catch(err => showToast("Gagal memuat rak: " + err.message, "error"));

async function getRak() {
  const r = String(rakSelect.value || rakInput.value).trim().toUpperCase();
  if (!r) return "";

  if (![...rakSelect.options].some(o => o.value === r)) {
    const rakId = `${safeId(currentUser.storeid)}_${safeId(r)}`;
    await setDoc(doc(db, "Rak", rakId), {
      name: r,
      storeid: currentUser.storeid,
      storename: currentUser.storename,
      createdAt: new Date(),
      createdBy: currentUser.userid
    }, { merge: true });

    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    rakSelect.appendChild(opt);
  }
  rakSelect.value = r;
  rakInput.value = "";
  return r;
}

async function lookupByField(field, value, mode) {
  descEl.value = "Mencari...";
  selectedProduct = null;
  const qProduct = query(collection(db, "datasumber"), where(field, "==", value));
  const snap = await getDocs(qProduct);

  if (snap.empty) {
    descEl.value = "❌ Tidak ditemukan";
    descEl.dataset.rh = "";
    newProductBox.classList.remove("d-none");
    newProductName.value = "";
    newProductRh.value = "";
    if (mode === "scan") {
      pendingLookup = { mode: "scan", barcode: value, plu: "" };
      newProductMsg.textContent = "Barcode belum ada di master. Isi PLU produk lalu nama dan RH.";
      newProductPlu.value = "";
      newProductBarcode.value = value;
      newProductPlu.focus();
    } else {
      pendingLookup = { mode: "plu", barcode: "", plu: value };
      newProductMsg.textContent = "PLU belum ada di master. Isi barcode bila ada, lalu nama dan RH.";
      newProductPlu.value = value;
      newProductBarcode.value = "";
      newProductName.focus();
    }
    return false;
  }

  const data = snap.docs[0].data();
  selectedProduct = {
    BARCODE: String(data.BARCODE || "").trim(),
    PLU: String(data.PLU || "").trim(),
    DESKRIPSI: data.DESKRIPSI || "-",
    RH: data.RH ?? 30
  };
  // Apa pun sumber inputnya, textbox selalu menampilkan PLU setelah produk ditemukan.
  barcodeEl.value = selectedProduct.PLU || value;
  descEl.value = selectedProduct.DESKRIPSI;
  descEl.dataset.rh = selectedProduct.RH;
  newProductBox.classList.add("d-none");
  newProductMsg.textContent = "";
  return true;
}

barcodeEl.addEventListener("change", async () => {
  // Ketik manual = PLU, tidak ada pemotongan karakter.
  const plu = normalizeCode(barcodeEl.value);
  barcodeEl.value = plu;
  if (!plu) return;
  await lookupByField("PLU", plu, "plu");
  if (selectedProduct) expiredEl.focus();
});

btnCreateProduct.onclick = async () => {
  const plu = normalizeCode(newProductPlu.value);
  const sourceBarcode = normalizeCode(newProductBarcode.value);
  const name = newProductName.value.trim().toUpperCase();
  const rh = Number(newProductRh.value);
  if (!plu || !name || !Number.isFinite(rh) || rh < 0) {
    newProductMsg.textContent = "PLU, nama produk dan RH wajib diisi dengan benar.";
    newProductMsg.className = "small mt-2 text-danger";
    return;
  }
  btnCreateProduct.disabled = true;
  btnCreateProduct.textContent = "Menyimpan...";
  try {
    const pluSnap = await getDocs(query(collection(db, "datasumber"), where("PLU", "==", plu)));
    if (!pluSnap.empty) throw new Error("PLU sudah tersedia di master");
    if (sourceBarcode) {
      const barcodeSnap = await getDocs(query(collection(db, "datasumber"), where("BARCODE", "==", sourceBarcode)));
      if (!barcodeSnap.empty) throw new Error("Barcode sudah tersedia di master");
    }

    const productId = safeId(plu);
    const data = {
      PLU: plu,
      BARCODE: sourceBarcode,
      DESKRIPSI: name,
      RH: rh,
      active: true,
      createdAt: new Date(),
      createdBy: currentUser.userid,
      createdByStore: currentUser.storeid
    };
    await setDoc(doc(db, "datasumber", productId), data);
    selectedProduct = data;
    barcodeEl.value = plu;
    descEl.value = name;
    descEl.dataset.rh = rh;
    newProductBox.classList.add("d-none");
    newProductMsg.textContent = "";
    expiredEl.focus();
    showToast("Produk baru berhasil ditambahkan ke master");
  } catch (err) {
    newProductMsg.textContent = err.message || "Gagal menambah produk";
    newProductMsg.className = "small mt-2 text-danger";
  } finally {
    btnCreateProduct.disabled = false;
    btnCreateProduct.innerHTML = '<i class="bi bi-plus-circle me-2"></i>TAMBAH PRODUK BARU';
  }
};

let reader = null;
btnScan.onclick = async () => {
  scannerBox.classList.remove("d-none");
  if (!reader) reader = new ZXing.BrowserMultiFormatReader();

  try {
    await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, video, res => {
      if (!res) return;
      const rawBarcode = normalizeCode(res.text);
      barcodeEl.value = rawBarcode;
      lookupByField("BARCODE", rawBarcode, "scan");
      reader.reset();
      scannerBox.classList.add("d-none");
      expiredEl.focus();
    });
  } catch (e) {
    const dev = await reader.listVideoInputDevices();
    const cam = dev.find(d => d.label.toLowerCase().includes("back")) || dev[dev.length - 1];
    if (!cam) return showToast("Kamera tidak ditemukan", "error");
    reader.decodeFromVideoDevice(cam.deviceId, video, res => {
      if (!res) return;
      const rawBarcode = normalizeCode(res.text);
      barcodeEl.value = rawBarcode;
      lookupByField("BARCODE", rawBarcode, "scan");
      reader.reset();
      scannerBox.classList.add("d-none");
      expiredEl.focus();
    });
  }
};

btnCloseScan.onclick = () => {
  scannerBox.classList.add("d-none");
  if (reader) reader.reset();
};

btnSave.onclick = async () => {
  btnSave.disabled = true;
  try {
    const rak = await getRak();
    const exp = parseDate(expiredEl.value);
    const qty = Number(qtyEl.value);
    const rh = Number(descEl.dataset.rh) || 30;
    const barcode = barcodeEl.value.trim();

    if (!rak || !barcode || !exp || !Number.isFinite(qty) || qty <= 0) {
      throw new Error("Data belum lengkap atau tidak valid");
    }
    if (!descEl.value || descEl.value.includes("Tidak ditemukan") || descEl.value === "Mencari...") {
      throw new Error("Produk tidak ditemukan di master datasumber");
    }

    const tarik = tanggalTarik(exp, rh);
    const expKey = exp.toISOString().slice(0, 10).replace(/-/g, "");
    const id = `${safeId(currentUser.storeid)}_${safeId(currentUser.userid)}_${safeId(barcode)}_${expKey}`;
    const ref = doc(db, "edItems", id);
    const snap = await getDoc(ref);

    const identity = {
      storeid: currentUser.storeid,
      storename: currentUser.storename,
      userid: currentUser.userid,
      user: currentUser.username,
      inputByNik: currentUser.userid,
      inputByName: currentUser.username,
      inputByPhone: currentUser.phone || ""
    };

    if (snap.exists()) {
      await updateDoc(ref, {
        qty: increment(qty),
        rak,
        tanggalTarik: tarik,
        RH: rh,
        lastUpdate: new Date(),
        ...identity
      });
    } else {
      await setDoc(ref, {
        barcode, // kompatibilitas tampilan lama: tetap berisi PLU
        plu: barcode,
        sourceBarcode: selectedProduct?.BARCODE || "",
        deskripsi: descEl.value,
        rak,
        expiredDate: exp,
        tanggalTarik: tarik,
        RH: rh,
        qty,
        createdAt: new Date(),
        lastUpdate: new Date(),
        ...identity
      });
    }

    barcodeEl.value = "";
    descEl.value = "";
    descEl.dataset.rh = "";
    newProductBox.classList.add("d-none");
    expiredEl.value = "";
    qtyEl.value = "";
    barcodeEl.focus();
    showToast("Data berhasil disimpan");
  } catch (err) {
    console.error(err);
    showToast(err.message || "Gagal menyimpan data", "error");
  } finally {
    btnSave.disabled = false;
  }
};
