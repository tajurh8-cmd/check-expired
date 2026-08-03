import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, onSnapshot, doc, deleteDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

initializeApp({
  apiKey:"AIzaSyD_I1HSrulXlPCj9_U_FhSfsYQhz-DxbMk",
  authDomain:"dbplu-62d92.firebaseapp.com",
  projectId:"dbplu-62d92"
});
const db = getFirestore();

const currentUser = JSON.parse(localStorage.getItem("user") || "null");
if (!currentUser?.storeid) {
  localStorage.removeItem("user");
  location.href = "login.html";
  throw new Error("Sesi toko tidak valid");
}

const fmt = d => d.toLocaleDateString("id-ID", { day:"2-digit", month:"long", year:"numeric" });
const sisaHari = t => Math.ceil((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000);
const warna = s =>
  s < 0 ? ["b-abu", "LEWAT", "bg-secondary"] :
  s < 180 ? ["b-merah", "< 6 Bulan", "bg-danger"] :
  s < 365 ? ["b-kuning", "6–12 Bulan", "bg-warning"] :
  s < 730 ? ["b-hijau", "1–2 Tahun", "bg-success"] :
  ["b-biru", "> 2 Tahun", "bg-primary"];

const listEl = document.getElementById("list");
const totalQtyEl = document.getElementById("totalQty");
const totalItemEl = document.getElementById("totalItem");
const bawah6El = document.getElementById("bawah6");
const bulan6_12El = document.getElementById("bulan6_12");
const tahun1_2El = document.getElementById("tahun1_2");
const atas2El = document.getElementById("atas2");

const qItems = query(collection(db, "edItems"), where("storeid", "==", currentUser.storeid));

onSnapshot(qItems, snap => {
  const items = [];
  let totalQty = 0, b6 = 0, b612 = 0, t12 = 0, a2 = 0;

  snap.forEach(d => {
    const x = d.data();
    if (!x.expiredDate || !x.tanggalTarik) return;

    const exp = x.expiredDate.toDate();
    const tarik = x.tanggalTarik.toDate();
    const s = sisaHari(tarik);
    const qty = Number(x.qty) || 0;

    totalQty += qty;
    if (s < 180) b6 += qty;
    else if (s < 365) b612 += qty;
    else if (s < 730) t12 += qty;
    else a2 += qty;

    items.push({ id:d.id, ...x, exp, tarik, s });
  });

  totalQtyEl.innerText = totalQty;
  totalItemEl.innerText = items.length;
  bawah6El.innerText = b6;
  bulan6_12El.innerText = b612;
  tahun1_2El.innerText = t12;
  atas2El.innerText = a2;

  items.sort((a, b) => a.s - b.s || String(a.deskripsi).localeCompare(String(b.deskripsi)));

  if (!items.length) {
    listEl.innerHTML = `<div class="alert alert-light text-center">Belum ada data untuk toko ${currentUser.storeid}.</div>`;
    return;
  }

  listEl.innerHTML = items.map(x => {
    const w = warna(x.s);
    return `
<div class="card item-card ${w[0]}">
  <div class="card-body">
    <div class="d-flex justify-content-between gap-2">
      <b>${escapeHtml(x.deskripsi || "-")}</b>
      <div class="label text-end">User: <b>${escapeHtml(x.user || "-")}</b></div>
    </div>
    <div style="font-size:18px;font-weight:700">Qty: ${Number(x.qty) || 0}</div>
    <div class="label mt-1">${escapeHtml(x.barcode || "-")} • Rak <b>${escapeHtml(x.rak || "-")}</b></div>
    <div class="label mt-1">Expired: ${fmt(x.exp)}</div>
    <div class="label">Tanggal Tarik: ${fmt(x.tarik)}</div>
    <div class="label">RH: <b>${Number(x.RH) || 30}</b> hari</div>
    <div class="d-flex justify-content-between mt-2">
      <div class="umur">${x.s < 0 ? "LEWAT " + Math.abs(x.s) + " hari" : "Sisa " + x.s + " hari"}</div>
      <div class="d-flex gap-2">
        <span class="pill ${w[2]}">${w[1]}</span>
        <button class="btn btn-sm btn-outline-danger" onclick="hapus('${x.id}')">🗑</button>
      </div>
    </div>
  </div>
</div>`;
  }).join("");
}, err => {
  console.error(err);
  listEl.innerHTML = `<div class="alert alert-danger">Gagal membaca data: ${escapeHtml(err.message)}</div>`;
});

window.hapus = async id => {
  if (confirm("Hapus item ini?")) await deleteDoc(doc(db, "edItems", id));
};

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[m]));
}
