// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_I1HSrulXlPCj9_U_FhSfsYQhz-DxbMk",
  authDomain: "dbplu-62d92.firebaseapp.com",
  projectId: "dbplu-62d92",
  storageBucket: "dbplu-62d92.firebasestorage.app",
  messagingSenderId: "623211397382",
  appId: "1:623211397382:web:db9a7bd4abcc7f44261e87"
};

initializeApp(firebaseConfig);
const db = getFirestore();

// ================= ELEMENT =================
const nikEl  = document.getElementById("nik");
const namaEl = document.getElementById("nama"); // readonly + tabindex -1
const passEl = document.getElementById("password");
const msgEl  = document.getElementById("msg");

// ================= AUTO FOCUS AWAL =================
nikEl.focus();

// ================= AMBIL USER (TANPA PINDAH FOKUS) =================
nikEl.addEventListener("change", async () => {
  msgEl.textContent = "";
  namaEl.value = "";

  const nik = nikEl.value.trim();
  if (!nik) return;

  try {
    const snap = await getDoc(doc(db, "users", nik));
    if (!snap.exists()) {
      msgEl.textContent = "NIK tidak terdaftar";
      return;
    }

    const data = snap.data();
    if (data.active !== true) {
      msgEl.textContent = "User tidak aktif";
      return;
    }

    // isi nama TANPA fokus
    namaEl.value = data.username;

    // 🔥 LANGSUNG FOKUS KE PASSWORD
    passEl.focus();

  } catch (err) {
    console.error(err);
    msgEl.textContent = "Gagal membaca user";
  }
});

// ================= LOGIN =================
window.login = async function () {
  msgEl.textContent = "";

  const nik = nikEl.value.trim();
  const password = passEl.value;

  if (!nik || !password) {
    msgEl.textContent = "NIK dan password wajib diisi";
    return;
  }

  try {
    const snap = await getDoc(doc(db, "users", nik));
    if (!snap.exists()) {
      msgEl.textContent = "User tidak ditemukan";
      return;
    }

    const data = snap.data();
    if (data.active !== true) {
      msgEl.textContent = "User tidak aktif";
      return;
    }

    if (data.password !== password) {
      msgEl.textContent = "Password salah";
      return;
    }

    localStorage.setItem("user", JSON.stringify({
      userid: data.userid,
      username: data.username,
      role: data.role
    }));

    window.location.href = "index.html";

  } catch (err) {
    console.error(err);
    msgEl.textContent = "Login gagal";
  }
};

// ================= ENTER LANGSUNG LOGIN =================
passEl.addEventListener("keydown", e => {
  if (e.key === "Enter") login();
});
