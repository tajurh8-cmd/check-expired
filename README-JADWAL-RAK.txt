UPDATE JADWAL CEK RAK

1. Ditambahkan halaman jadwal.html.
2. Jadwal disimpan per toko dalam satu dokumen Firestore: JadwalRak/{storeid}.
3. Field: senin, selasa, rabu, kamis, jumat, sabtu, minggu.
4. Saat input.html dibuka, aplikasi membaca jadwal hari ini dan otomatis memilih rak tersebut.
5. Rak TIDAK dikunci. User tetap dapat mengganti dropdown rak kapan pun.
6. Hanya 1 read dokumen jadwal saat halaman Input dibuka, sehingga tetap hemat Firestore.
7. Jadwal dapat dibuka melalui link "Atur Jadwal" di sebelah field Rak.
