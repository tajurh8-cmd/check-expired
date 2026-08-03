PENGATURAN WHATSAPP OTOMATIS H-7

ALUR
- GitHub Actions berjalan setiap hari pukul 08.00 WIB.
- Sistem mencari edItems yang tanggal expired-nya tepat 7 hari lagi.
- Data dikelompokkan berdasarkan storeid + user/NIK penginput.
- Satu user mendapat satu pesan ringkasan untuk item miliknya di toko tersebut.
- Setelah berhasil dikirim, item diberi waH7Date agar tidak terkirim dua kali pada hari yang sama.

PERUBAHAN DATA
1. Register sekarang wajib memasukkan nomor WhatsApp.
2. Field users:
   phone: "628xxxxxxxxxx"
3. Field edItems baru:
   inputByNik
   inputByName
   inputByPhone
4. ID edItems baru menyertakan NIK agar item user berbeda tidak tergabung:
   storeid_userid_barcode_tanggalExpired

PENGATURAN GITHUB SECRETS
Repository > Settings > Secrets and variables > Actions > New repository secret

1. FONNTE_TOKEN
   Isi token perangkat Fonnte.

2. FIREBASE_SERVICE_ACCOUNT
   Firebase Console > Project settings > Service accounts > Generate new private key.
   Buka file JSON hasil unduhan, salin seluruh isinya sebagai value secret.
   Jangan upload file service account ke repository.

MENGETES
- GitHub > Actions > WhatsApp H-7 Expired > Run workflow.
- Pastikan item uji mempunyai expiredDate tepat 7 hari dari tanggal hari ini.
- Pastikan nomor WA user aktif dan formatnya benar.

CATATAN DATA LAMA
- User lama perlu ditambahkan field phone secara manual di koleksi users.
- Item lama tanpa inputByPhone tetap dapat dikirim jika userid/inputByNik cocok dengan dokumen users yang memiliki phone.
