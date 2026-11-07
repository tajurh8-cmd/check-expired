EXPI CHECK - PATCH PENGINGAT EXPIRED DAN HIDE JADWAL RETUR

File yang diganti:
- app.js: konfirmasi tanggal expired sebelum data disimpan.
- dashboard.js: dashboard tanpa baris Jadwal Retur.
- input.html: URL versi app.js diperbarui.
- index.html: URL versi dashboard.js diperbarui.
- service-worker.js: versi cache dinaikkan agar file lama di HP dibuang.

CARA PASANG:
1. Salin/ganti kelima file ke folder root aplikasi (folder yang sama dengan index.html).
2. Deploy/publish ulang perubahan ke hosting.
3. Tutup aplikasi/PWA sepenuhnya, lalu buka kembali.
4. Jika masih lama, buka situs lewat Chrome dan muat ulang, lalu buka kembali PWA.

Dashboard tetap menampilkan Expired, Tanggal Tarik, RH, dan Sisa hari.
Baris Jadwal Retur dihilangkan.
Struktur database Firestore tidak diubah.
