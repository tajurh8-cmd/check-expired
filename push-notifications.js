import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getMessaging, getToken, isSupported } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { getFirestore, doc, setDoc, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { FCM_VAPID_PUBLIC_KEY } from "./push-config.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_I1HSrulXlPCj9_U_FhSfsYQhz-DxbMk",
  authDomain: "dbplu-62d92.firebaseapp.com",
  projectId: "dbplu-62d92",
  storageBucket: "dbplu-62d92.firebasestorage.app",
  messagingSenderId: "623211397382",
  appId: "1:623211397382:web:db9a7bd4abcc7f44261e87"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

function currentUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}

function validVapidKey() {
  return FCM_VAPID_PUBLIC_KEY && !FCM_VAPID_PUBLIC_KEY.includes("PASTE_") && FCM_VAPID_PUBLIC_KEY.length > 40;
}

async function saveToken(token) {
  const u = currentUser();
  const uid = String(u?.userid || u?.nik || u?.NIK || "").trim();
  if (!uid) throw new Error("NIK user tidak ditemukan pada sesi login");

  const cacheKey = `fcm_token_${uid}`;

  // Selalu sinkronkan token ke Firestore. Jangan skip hanya karena token
  // pernah tersimpan di localStorage; cache lokal bisa tetap ada walau
  // write Firestore sebelumnya gagal.
  await setDoc(doc(db, "users", uid), {
    fcmToken: token,
    fcmTokens: arrayUnion(token),
    fcmUpdatedAt: serverTimestamp()
  }, { merge: true });

  localStorage.setItem(cacheKey, token);
}

async function registerToken() {
  if (!(await isSupported())) throw new Error("Browser/perangkat ini belum mendukung Firebase Push");
  if (!validVapidKey()) throw new Error("FCM VAPID public key belum diisi di push-config.js");

  const registration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: FCM_VAPID_PUBLIC_KEY,
    serviceWorkerRegistration: registration
  });
  if (!token) throw new Error("FCM token tidak berhasil dibuat");
  await saveToken(token);
  return token;
}

export async function enablePushNotifications() {
  if (!("Notification" in window)) throw new Error("Perangkat/browser ini tidak mendukung notifikasi");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Izin notifikasi belum diberikan");
  await registerToken();
  return true;
}

export async function syncPushTokenIfAllowed() {
  try {
    if (Notification.permission !== "granted") return false;
    await registerToken();
    return true;
  } catch (err) {
    console.warn("FCM token belum tersinkron:", err);
    return false;
  }
}
