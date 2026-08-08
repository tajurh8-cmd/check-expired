NOTIFIKASI EXPICHECK
- Klik ikon lonceng di Dashboard satu kali untuk memberi izin notifikasi.
- Jadwal hari ini dibaca dari JadwalRakUser per user dan ditampilkan di Dashboard.
- Item masa tarik memberi pengingat pada H-7, H-3, H-1 dan H-0.
- Notifikasi hanya dikirim sekali per hari per user/perangkat.
- Data item memakai hasil query Dashboard yang sama, sehingga tidak menambah query edItems.
- Jadwal hari ini dicache per hari agar tidak dibaca berulang.

CATATAN: Versi ini memberi notifikasi saat PWA dibuka/aktif. Push saat aplikasi benar-benar tertutup memerlukan FCM token + VAPID/backend sender dan belum diaktifkan karena key proyek tidak tersedia di source saat ini.
