ExpiCheck FCM Bell Fix

Perbaikan:
1. Mencegah Firebase [DEFAULT] diinisialisasi dua kali dengan konfigurasi berbeda.
2. Tombol lonceng sekarang benar-benar memasang click handler.
3. Saat diklik tampil status "Mengaktifkan notifikasi...".
4. Token selalu disimpan ke users/{NIK} sebagai fcmToken + fcmTokens.
5. Cache Service Worker dinaikkan agar PWA mengambil kode baru.
6. index.html memakai cache-buster untuk dashboard.js.

SETELAH UPLOAD:
- Replace semua file ke GitHub.
- Tunggu GitHub Pages selesai deploy.
- Hapus PWA lama / clear site data sekali.
- Buka dari Safari/Chrome lalu install ulang bila perlu.
- Login.
- Klik lonceng.
- Izinkan notifikasi.
- Cek Firestore users/{NIK}: fcmToken harus muncul.
