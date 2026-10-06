PERBAIKAN EXPI CHECK - WHATSAPP + PENGINGAT PAGI

1. Penyebab utama WhatsApp tidak jalan:
   - File workflow sebelumnya berada di root repository, bukan .github/workflows/.
   - GitHub Actions hanya membaca workflow dari .github/workflows/.
   - Sekarang workflow WA berada di .github/workflows/whatsapp-h7.yml.

2. WhatsApp H-7:
   - Berjalan setiap hari 08:00 WIB.
   - Membaca FIREBASE_SERVICE_ACCOUNT dari GitHub Secrets.
   - Membaca token Fonnte per toko dari stores/{storeid}.fonnteToken.
   - Hanya toko waActive=true yang dikirimi.
   - User harus active=true dan memiliki nomor WhatsApp.
   - Jika Fonnte gagal, status error disimpan dan item tidak ditandai sent.

3. Pengingat pagi:
   - Push notification dikirim setiap hari 08:00 WIB.
   - Semua user aktif yang memiliki FCM token menerima:
     "Pengingat pagi: lakukan cek expired hari ini."
   - Jika ada jadwal rak atau item RH H0/H1/H3/H7, informasi tersebut ikut ditambahkan.
   - Workflow sekarang menjalankan `npm run push`, sesuai lokasi push-reminder.js.

4. GitHub Secret yang wajib:
   FIREBASE_SERVICE_ACCOUNT = seluruh JSON Firebase Service Account.

5. Yang perlu dicek di GitHub setelah upload:
   - Actions harus menampilkan:
     WhatsApp H-7 Expired
     ExpiCheck Push Notification
   - Jalankan masing-masing dengan Run workflow untuk pengujian awal.
