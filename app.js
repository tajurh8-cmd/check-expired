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
const btnTorch = document.getElementById("btnTorch");
const newProductBox = document.getElementById("newProductBox");
const newProductName = document.getElementById("newProductName");
const newProductRh = document.getElementById("newProductRh");
const newProductPlu = document.getElementById("newProductPlu");
const newProductBarcode = document.getElementById("newProductBarcode");
const btnCreateProduct = document.getElementById("btnCreateProduct");
const newProductMsg = document.getElementById("newProductMsg");
const scheduleInfo = document.getElementById("scheduleInfo");

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
// Aturan identifikasi berdasarkan panjang kode: <= 6 karakter = PLU, > 6 karakter = BARCODE.
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
function scheduleUserId() {
  return String(currentUser.userid || currentUser.nik || currentUser.NIK || currentUser.username || "").trim();
}
function scheduleSafeId(v) { return String(v).replace(/[^a-zA-Z0-9_-]/g, "_"); }
function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

async function applyTodaySchedule() {
  try {
    const uid = scheduleUserId();
    if (!uid) return;
    const today = todayYMD();
    const ym = today.slice(0,7);
    const id = `${scheduleSafeId(currentUser.storeid)}_${scheduleSafeId(uid)}_${ym}`;
    const snap = await getDoc(doc(db, "JadwalRakUser", id));
    if (!snap.exists()) return;
    const scheduledRak = String(snap.data()?.days?.[today] || "").trim().toUpperCase();
    if (!scheduledRak) {
      if (scheduleInfo) {
        scheduleInfo.textContent = `Hari ini tidak ada rak terjadwal / OFF • rak tetap bisa dipilih manual`;
        scheduleInfo.classList.remove("d-none");
      }
      return;
    }
    if (![...rakSelect.options].some(o => o.value === scheduledRak)) {
      const opt = document.createElement("option");
      opt.value = scheduledRak; opt.textContent = scheduledRak; rakSelect.appendChild(opt);
    }
    rakSelect.value = scheduledRak;
    if (scheduleInfo) {
      scheduleInfo.textContent = `Jadwal hari ini: ${scheduledRak} • tetap bisa diubah`;
      scheduleInfo.classList.remove("d-none");
    }
  } catch (err) { console.warn("Jadwal rak user tidak dapat dimuat", err); }
}

loadRak()
  .then(applyTodaySchedule)
  .catch(err => showToast("Gagal memuat rak: " + err.message, "error"));

// Saat halaman Input dibuka, kursor langsung siap di field PLU/Barcode.
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    barcodeEl.focus({ preventScroll: true });
    barcodeEl.select?.();
  }, 250);
});

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

async function lookupByCode(rawValue) {
  const code = normalizeCode(rawValue);
  barcodeEl.value = code;
  if (!code) return false;

  // ATURAN FINAL:
  // <= 6 karakter = PLU, dicari apa adanya.
  // > 6 karakter = barcode fisik, buang 1 karakter terakhir SEBELUM query.
  // Dengan demikian hanya ada 1 query Firestore per pencarian.
  if (code.length <= 6) {
    return await lookupByField("PLU", code, "plu");
  }

  const barcodeMaster = code.slice(0, -1);
  descEl.value = "Mencari...";
  selectedProduct = null;

  const snap = await getDocs(query(collection(db, "datasumber"), where("BARCODE", "==", barcodeMaster)));
  if (!snap.empty) {
    const data = snap.docs[0].data();
    selectedProduct = {
      BARCODE: String(data.BARCODE || "").trim(),
      PLU: String(data.PLU || "").trim(),
      DESKRIPSI: data.DESKRIPSI || "-",
      RH: data.RH ?? 30
    };
    // Setelah ditemukan, textbox utama selalu menampilkan PLU.
    barcodeEl.value = selectedProduct.PLU || code;
    descEl.value = selectedProduct.DESKRIPSI;
    descEl.dataset.rh = selectedProduct.RH;
    newProductBox.classList.add("d-none");
    newProductMsg.textContent = "";
    return true;
  }

  descEl.value = "❌ Tidak ditemukan";
  descEl.dataset.rh = "";
  newProductBox.classList.remove("d-none");
  newProductName.value = "";
  newProductRh.value = "";
  pendingLookup = { mode: "barcode", barcode: barcodeMaster, plu: "" };
  newProductMsg.textContent = "Produk belum ada. PLU dan barcode fisik wajib diisi.";
  newProductPlu.value = "";
  // Form menampilkan barcode FISIK lengkap. Normalisasi dilakukan saat simpan.
  newProductBarcode.value = code;
  newProductPlu.focus();
  return false;
}

barcodeEl.addEventListener("change", async () => {
  await lookupByCode(barcodeEl.value);
  if (selectedProduct) expiredEl.focus();
});

btnCreateProduct.onclick = async () => {
  const plu = normalizeCode(newProductPlu.value);
  const physicalBarcode = normalizeCode(newProductBarcode.value);
  const name = newProductName.value.trim().toUpperCase();
  const rh = Number(newProductRh.value);
  if (!plu || plu.length > 6 || !physicalBarcode || physicalBarcode.length <= 6 || !name || !Number.isFinite(rh) || rh < 0) {
    newProductMsg.textContent = "PLU (maks. 6 karakter), barcode fisik, nama produk dan RH wajib diisi.";
    newProductMsg.className = "small mt-2 text-danger";
    return;
  }
  btnCreateProduct.disabled = true;
  btnCreateProduct.textContent = "Menyimpan...";
  try {
    const pluSnap = await getDocs(query(collection(db, "datasumber"), where("PLU", "==", plu)));
    if (!pluSnap.empty) throw new Error("PLU sudah tersedia di master");
    // Barcode yang disimpan ke master selalu versi normal: barcode fisik - 1 karakter terakhir.
    const sourceBarcode = physicalBarcode.slice(0, -1);
    const barcodeSnap = await getDocs(query(collection(db, "datasumber"), where("BARCODE", "==", sourceBarcode)));
    if (!barcodeSnap.empty) throw new Error("Barcode sudah tersedia di master");

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
let scanLocked = false;
let torchOn = false;
let nativeScanTimer = null;
let activeStream = null;

function createReader() {
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.CODE_128,
    ZXing.BarcodeFormat.CODE_39
  ]);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  return new ZXing.BrowserMultiFormatReader(hints, 80);
}

function stopScanner() {
  scannerBox.classList.add("d-none");
  scanLocked = false;
  torchOn = false;
  if (nativeScanTimer) {
    cancelAnimationFrame(nativeScanTimer);
    nativeScanTimer = null;
  }
  if (reader) {
    try { reader.reset(); } catch {}
  }
  if (activeStream) {
    activeStream.getTracks().forEach(t => t.stop());
    activeStream = null;
  }
  if (video.srcObject) {
    try { video.srcObject.getTracks().forEach(t => t.stop()); } catch {}
    video.srcObject = null;
  }
  btnTorch?.classList.add("d-none");
  btnTorch?.classList.remove("btn-warning");
  btnTorch?.classList.add("btn-light");
}

async function setupTorchButton() {
  await new Promise(r => setTimeout(r, 250));
  const track = video.srcObject?.getVideoTracks?.()[0];
  if (!track) return;
  const caps = track.getCapabilities?.() || {};
  if (caps.torch) btnTorch?.classList.remove("d-none");
}

async function handleScanCode(code) {
  if (scanLocked) return;
  const rawCode = normalizeCode(code);
  if (!rawCode) return;

  scanLocked = true;
  barcodeEl.value = rawCode;
  if (navigator.vibrate) navigator.vibrate(80);

  try {
    const found = await lookupByCode(rawCode);
    stopScanner();
    showToast("Barcode terbaca", "success");
    if (found) expiredEl.focus();
  } catch (err) {
    scanLocked = false;
    showToast("Barcode terbaca, pencarian gagal: " + (err.message || err), "error");
  }
}

async function startNativeScanner() {
  if (!("BarcodeDetector" in window)) return false;

  const formats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"];
  let detector;
  try {
    detector = new BarcodeDetector({ formats });
  } catch {
    detector = new BarcodeDetector();
  }

  activeStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  });

  video.srcObject = activeStream;
  await video.play();
  await setupTorchButton();

  const detectLoop = async () => {
    if (!video.srcObject || scannerBox.classList.contains("d-none")) return;
    if (!scanLocked && video.readyState >= 2) {
      try {
        const codes = await detector.detect(video);
        if (codes?.length) {
          await handleScanCode(codes[0].rawValue);
          return;
        }
      } catch {}
    }
    nativeScanTimer = requestAnimationFrame(detectLoop);
  };

  detectLoop();
  return true;
}

async function startZXingScanner() {
  reader = createReader();

  const devices = await reader.listVideoInputDevices();
  if (!devices.length) throw new Error("Kamera tidak ditemukan");

  const rear =
    devices.find(d => /back|rear|environment|belakang/i.test(d.label)) ||
    devices[devices.length - 1];

  await reader.decodeFromVideoDevice(rear.deviceId, video, (result, err) => {
    if (result) handleScanCode(result.getText ? result.getText() : result.text);
  });

  await setupTorchButton();
}

btnScan.onclick = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("Browser tidak mendukung akses kamera", "error");
    return;
  }

  scannerBox.classList.remove("d-none");
  scanLocked = false;

  try {
    const nativeStarted = await startNativeScanner();
    if (!nativeStarted) await startZXingScanner();
  } catch (err) {
    stopScanner();
    showToast("Scanner kamera gagal: " + (err.message || err), "error");
  }
};

btnTorch?.addEventListener("click", async () => {
  const track = video.srcObject?.getVideoTracks?.()[0];
  if (!track) return;
  try {
    torchOn = !torchOn;
    await track.applyConstraints({ advanced: [{ torch: torchOn }] });
    btnTorch.classList.toggle("btn-warning", torchOn);
    btnTorch.classList.toggle("btn-light", !torchOn);
  } catch {
    torchOn = false;
    showToast("Flash tidak didukung perangkat ini", "warning");
  }
});

btnCloseScan.onclick = stopScanner;

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
    const plu = String(selectedProduct?.PLU || barcode).trim();
    const sourceBarcode = String(selectedProduct?.BARCODE || "").trim();

    // Cek duplikasi berdasarkan: toko + rak + PLU + BARCODE + tanggal expired.
    // Query dibatasi ke storeid + PLU agar reads tetap kecil, lalu field lain dicocokkan di client.
    const dupQ = query(
      collection(db, "edItems"),
      where("storeid", "==", currentUser.storeid),
      where("plu", "==", plu)
    );
    const dupSnap = await getDocs(dupQ);
    let duplicate = null;
    dupSnap.forEach(d => {
      if (duplicate) return;
      const x = d.data();
      const expDate = x.expiredDate?.toDate ? x.expiredDate.toDate() : new Date(x.expiredDate);
      const sameExp = !isNaN(expDate) && expDate.toISOString().slice(0, 10).replace(/-/g, "") === expKey;
      const sameRak = String(x.rak || "").trim().toUpperCase() === String(rak).trim().toUpperCase();
      const sameBarcode = String(x.sourceBarcode || "").trim() === sourceBarcode;
      const samePlu = String(x.plu || x.barcode || "").trim() === plu;
      if (sameRak && samePlu && sameBarcode && sameExp) duplicate = { ref: d.ref, data: x };
    });

    if (duplicate) {
      const edit = await ExpiUI.confirm(
        `Item sudah ada di rak ${rak} dengan expired yang sama. Edit QTY?`,
        { title: "Item Sudah Ada", okText: "Edit QTY", cancelText: "Batal" }
      );
      if (!edit) return;

      const newQtyRaw = await ExpiUI.prompt("Masukkan QTY baru", {
        title: "Edit QTY",
        okText: "Simpan",
        value: String(duplicate.data.qty ?? qty),
        type: "number"
      });
      if (newQtyRaw === null) return;
      const newQty = Number(newQtyRaw);
      if (!Number.isFinite(newQty) || newQty <= 0) throw new Error("QTY harus lebih dari 0");

      await updateDoc(duplicate.ref, {
        qty: newQty,
        lastUpdate: new Date(),
        lastEditedByNik: currentUser.userid,
        lastEditedByName: currentUser.username
      });
      showToast("QTY berhasil diperbarui");
    } else {
      const identity = {
        storeid: currentUser.storeid,
        storename: currentUser.storename,
        userid: currentUser.userid,
        user: currentUser.username,
        inputByNik: currentUser.userid,
        inputByName: currentUser.username,
        inputByPhone: currentUser.phone || ""
      };
      const id = `${safeId(currentUser.storeid)}_${safeId(currentUser.userid)}_${safeId(rak)}_${safeId(plu)}_${safeId(sourceBarcode)}_${expKey}`;
      const ref = doc(db, "edItems", id);
      await setDoc(ref, {
        barcode: plu, // kompatibilitas tampilan lama: field barcode tetap berisi PLU
        plu,
        sourceBarcode,
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
      showToast("Data berhasil disimpan");
    }

    barcodeEl.value = "";
    descEl.value = "";
    descEl.dataset.rh = "";
    newProductBox.classList.add("d-none");
    expiredEl.value = "";
    qtyEl.value = "";
    barcodeEl.focus();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Gagal menyimpan data", "error");
  } finally {
    btnSave.disabled = false;
  }
};
