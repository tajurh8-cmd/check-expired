EXPI CHECK - WHATSAPP OTOMATIS H-7

STATUS PERBAIKAN
- Workflow GitHub Actions sekarang berada di .github/workflows/whatsapp-h7.yml agar dikenali GitHub Actions.
- Script WA dipisahkan dari script FCM: wa-reminder.js.
- package.json memiliki script "notify": "node wa-reminder.js".
- Token Fonnte dibaca per toko dari stores/{storeid}.fonnteToken.
- Pengiriman dilakukan server-side dari GitHub Actions, bukan browser/PWA.

FUNGSI
- GitHub Actions berjalan setiap hari pukul 08.00 WIB (01:00 UTC).
- Sistem mencari edItems yang tanggalTarik-nya tepat 7 hari dari hari ini.
- Data dikelompokkan berdasarkan storeid + user/NIK penginput.
- Satu user mendapat satu pesan ringkasan untuk semua item H-7 miliknya.
- Pengiriman hanya dilakukan jika stores/{storeid}.waActive = true.
- Nomor WhatsApp dibaca dari users.phone (fallback: whatsapp/noWa/noWhatsapp).
- Nomor 08xxxxxxxxxx otomatis dinormalisasi menjadi 628xxxxxxxxxx.
- Setelah Fonnte menerima pengiriman dengan sukses, item diberi waH7Date agar tidak terkirim dua kali pada tanggal yang sama.
- Jika pengiriman gagal, waH7Date TIDAK diisi; error disimpan di waH7LastError dan waH7Status=failed sehingga dapat dicoba lagi.

GITHUB SECRET
Repository > Settings > Secrets and variables > Actions

Wajib:
1. FIREBASE_SERVICE_ACCOUNT
   Isi seluruh JSON Firebase Service Account.

Tidak digunakan lagi:
- FONNTE_TOKEN global.

PENGATURAN TOKO
Admin Panel > Kelola Toko:
- Status Notifikasi WhatsApp = Aktif
- Token Fonnte toko = token device Fonnte

Firestore:
stores/{storeid}
- storeid
- storename
- active
- waActive
- fonnteToken

USER
Firestore users/{userid} minimal:
- active: true
- storeid
- phone: nomor WhatsApp aktif

TEST MANUAL
1. Pastikan ada item edItems dengan tanggalTarik tepat 7 hari dari tanggal WIB saat workflow dijalankan.
2. Pastikan item memiliki storeid dan inputByNik/userid.
3. Pastikan user aktif dan memiliki phone.
4. Pastikan toko memiliki waActive=true dan fonnteToken.
5. Pastikan perangkat Fonnte sudah terhubung/aktif.
6. GitHub > Actions > WhatsApp H-7 Expired > Run workflow.
7. Buka log workflow dan cari "✓ WA berhasil" atau pesan error Fonnte.

CATATAN
API Fonnte menggunakan POST ke https://api.fonnte.com/send dengan Authorization token, target, dan message.
Token tidak pernah dimasukkan ke frontend/PWA.
