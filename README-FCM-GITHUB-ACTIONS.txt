EXPICHECK — PUSH NOTIFICATION SAAT PWA TERTUTUP
GitHub Actions + Firebase Cloud Messaging (FCM)

FITUR
- Notifikasi tetap dapat masuk saat PWA sedang tidak dibuka.
- Jadwal rak hari ini dikirim per user + toko.
- Masa tarik dikirim pada H-7, H-3, H-1, dan H-0.
- Jadwal dan item digabung menjadi 1 notifikasi per user agar tidak spam.
- GitHub Actions berjalan otomatis pukul 08:00 WIB.
- Data edItems yang dibaca hanya rentang 7 hari ke depan, bukan seluruh koleksi.

A. BUAT VAPID KEY
1. Firebase Console > Project Settings > Cloud Messaging.
2. Cari Web Push certificates.
3. Klik Generate key pair.
4. Copy PUBLIC key.
5. Buka file push-config.js.
6. Ganti:
   PASTE_VAPID_PUBLIC_KEY_HERE
   dengan public VAPID key tersebut.
7. Public VAPID key aman berada di repository. Jangan taruh private key di frontend.

B. BUAT FIREBASE SERVICE ACCOUNT SECRET
1. Firebase Console > Project Settings > Service accounts.
2. Klik Generate new private key.
3. File JSON akan terdownload.
4. GitHub repository > Settings > Secrets and variables > Actions.
5. New repository secret.
6. Name: FIREBASE_SERVICE_ACCOUNT
7. Value: paste SELURUH isi JSON service account (mulai { sampai }).
8. Simpan.

PENTING:
- Jangan upload file JSON service account ke GitHub.
- Jangan memasukkan private_key ke HTML/JS frontend.

C. UPLOAD PROJECT
Upload seluruh isi folder ini ke repository, termasuk:
- push-notifications.js
- push-config.js
- service-worker.js
- scripts/push-reminder.js
- .github/workflows/push-notification.yml

D. AKTIFKAN NOTIFIKASI DI HP USER
1. Buka/install PWA ExpiCheck.
2. Login.
3. Tekan ikon lonceng di Dashboard.
4. Pilih Izinkan.
5. Aplikasi membuat FCM token dan menyimpannya ke users/{NIK}:
   fcmToken
   fcmTokens[]
   fcmUpdatedAt
6. Cukup dilakukan satu kali per perangkat/browser.

E. TEST LANGSUNG
1. GitHub > Actions.
2. Pilih “ExpiCheck Push Notification”.
3. Run workflow.
4. Pastikan user memiliki jadwal hari ini atau item H-7/H-3/H-1/H-0.
5. Lihat log Actions bila notifikasi tidak masuk.

ATURAN DATA
- Jadwal: koleksi JadwalRakUser, field month, userid, storeid, days[tanggal].
- Item: koleksi edItems.
- Penanggung jawab item: inputByNik/userid + storeid.
- tanggalTarik digunakan sebagai patokan RH.
- User harus active=true dan memiliki fcmToken/fcmTokens.

IOS / IPHONE
- PWA harus ditambahkan ke Home Screen terlebih dahulu.
- Buka PWA dari icon Home Screen, login, lalu izinkan notifikasi.
- Jangan hanya membuka website dari tab Safari biasa untuk proses izin push PWA.

JIKA FIRESTORE MINTA INDEX
Workflow hanya memakai query sederhana:
- users: active == true
- JadwalRakUser: month == YYYY-MM
- edItems: tanggalTarik range 7 hari
Normalnya tidak membutuhkan composite index.
