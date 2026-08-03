EXPLICHECK - TOKEN FONNTE PER TOKO

PERUBAHAN
1. Panel Admin > Kelola Toko sekarang memiliki:
   - Status notifikasi WhatsApp
   - Token Fonnte per toko
2. Scheduler membaca token dari dokumen stores/{storeid}.
3. GitHub Secret FONNTE_TOKEN tidak digunakan lagi.
4. GitHub Secret yang tetap wajib hanya FIREBASE_SERVICE_ACCOUNT.

CARA PAKAI
1. Upload seluruh file ke repository GitHub.
2. Login sebagai ADMIN/SUPERADMIN.
3. Buka Admin Panel > Kelola Toko.
4. Pilih toko atau daftarkan toko baru.
5. Isi Token Fonnte dan set Notifikasi WA = Aktif.
6. Simpan.
7. Jalankan GitHub Actions > WhatsApp H-7 Expired > Run workflow untuk tes scheduler.

STRUKTUR FIRESTORE stores/{storeid}
- storeid
- storename
- active
- waActive
- fonnteToken

KEAMANAN
Token tersimpan di Firestore. Pastikan Firestore Rules hanya mengizinkan ADMIN/SUPERADMIN membaca atau mengubah field toko. User biasa tidak boleh membaca koleksi stores secara bebas jika token disimpan di dokumen tersebut. Untuk keamanan lebih tinggi, token sebaiknya dipindahkan ke backend/Cloud Functions atau koleksi privat yang tidak dapat diakses client.
