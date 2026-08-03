// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const $ = id => document.getElementById(id);
const nikEl = $("nik");
const namaEl = $("nama");
const passEl = $("password");
const msgEl = $("msg");

nikEl.focus();

function setMessage(el, text, success = false) {
  el.textContent = text || "";
  el.classList.toggle("success", success);
}

async function getStore(storeid) {
  const id = String(storeid || "").trim().toUpperCase();
  if (!id) throw new Error("Kode toko wajib diisi");

  const storeSnap = await getDoc(doc(db, "stores", id));
  if (!storeSnap.exists()) throw new Error(`Kode toko ${id} tidak terdaftar`);

  if (storeSnap.data().active === false) throw new Error(`Toko ${id} sedang nonaktif`);

  const store = storeSnap.data();
  return {
    storeid: String(store.storeid || id).toUpperCase(),
    storename: store.storename || id
  };
}

async function readUser(nik) {
  const userSnap = await getDoc(doc(db, "users", nik));
  if (!userSnap.exists()) throw new Error("NIK tidak terdaftar");

  const user = userSnap.data();
  if (user.active !== true) throw new Error("Akun belum diaktifkan admin");
  if (!user.storeid) throw new Error("User belum memiliki storeid");

  const store = await getStore(user.storeid);
  return {
    userid: user.userid || nik,
    username: user.username || "-",
    role: String(user.role || "USER").toUpperCase(),
    storeid: store.storeid,
    storename: store.storename,
    password: user.password
  };
}

nikEl.addEventListener("change", async () => {
  setMessage(msgEl, "");
  namaEl.value = "";
  const nik = nikEl.value.trim();
  if (!nik) return;

  try {
    const user = await readUser(nik);
    namaEl.value = `${user.username} - ${user.storename}`;
    passEl.focus();
  } catch (err) {
    console.error(err);
    setMessage(msgEl, err.message || "Gagal membaca user");
  }
});

window.login = async function () {
  setMessage(msgEl, "");
  const nik = nikEl.value.trim();
  const password = passEl.value;

  if (!nik || !password) {
    setMessage(msgEl, "NIK dan password wajib diisi");
    return;
  }

  try {
    const user = await readUser(nik);
    if (user.password !== password) throw new Error("Password salah");

    delete user.password;
    localStorage.setItem("user", JSON.stringify(user));
    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
    setMessage(msgEl, err.message || "Login gagal");
  }
};

// ================= REGISTER =================
window.showRegister = function () {
  $("loginPanel").classList.add("d-none");
  $("registerPanel").classList.remove("d-none");
  setMessage($("regMsg"), "");
  $("regNik").focus();
};

window.showLogin = function () {
  $("registerPanel").classList.add("d-none");
  $("loginPanel").classList.remove("d-none");
  setMessage(msgEl, "");
  nikEl.focus();
};

$("regStoreid").addEventListener("input", e => {
  e.target.value = e.target.value.toUpperCase().replace(/\s+/g, "");
  $("regStorename").value = "";
});

$("regStoreid").addEventListener("change", async () => {
  setMessage($("regMsg"), "");
  $("regStorename").value = "";
  try {
    const store = await getStore($("regStoreid").value);
    $("regStoreid").value = store.storeid;
    $("regStorename").value = store.storename;
  } catch (err) {
    setMessage($("regMsg"), err.message || "Toko tidak ditemukan");
  }
});

window.registerUser = async function () {
  const regMsg = $("regMsg");
  const btn = $("registerBtn");
  setMessage(regMsg, "");

  const nik = $("regNik").value.trim();
  const username = $("regNama").value.trim().toUpperCase();
  const storeid = $("regStoreid").value.trim().toUpperCase();
  const password = $("regPassword").value;
  const confirmPassword = $("regConfirm").value;

  if (!nik || !username || !storeid || !password || !confirmPassword) {
    setMessage(regMsg, "Semua data wajib diisi");
    return;
  }
  if (!/^\d+$/.test(nik)) {
    setMessage(regMsg, "NIK hanya boleh berisi angka");
    return;
  }
  if (password.length < 6) {
    setMessage(regMsg, "Password minimal 6 karakter");
    return;
  }
  if (password !== confirmPassword) {
    setMessage(regMsg, "Konfirmasi password tidak sama");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Mendaftarkan...";

  try {
    const store = await getStore(storeid);
    const userRef = doc(db, "users", nik);
    const existing = await getDoc(userRef);
    if (existing.exists()) throw new Error("NIK sudah terdaftar");

    await setDoc(userRef, {
      active: false,
      userid: nik,
      username,
      password,
      role: "USER",
      storeid: store.storeid,
      storename: store.storename,
      createdAt: serverTimestamp()
    });

    setMessage(regMsg, "Registrasi berhasil. Tunggu admin mengaktifkan akun.", true);
    nikEl.value = nik;
    $("regPassword").value = "";
    $("regConfirm").value = "";

    setTimeout(() => window.showLogin(), 1800);
  } catch (err) {
    console.error(err);
    setMessage(regMsg, err.message || "Registrasi gagal");
  } finally {
    btn.disabled = false;
    btn.textContent = "Daftar";
  }
};

passEl.addEventListener("keydown", e => {
  if (e.key === "Enter") window.login();
});

$("regConfirm").addEventListener("keydown", e => {
  if (e.key === "Enter") window.registerUser();
});
