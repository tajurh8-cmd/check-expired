UPDATE:
1. Lupa password: user mengirim permintaan berdasarkan NIK + kode toko. Admin memproses dan membuat password sementara.
2. Admin > Edit RH Produk: mengubah field RH pada koleksi datasumber.
3. Koleksi baru: passwordResetRequests.
CATATAN KEAMANAN: sistem lama masih menyimpan password biasa di Firestore. Untuk produksi sebaiknya migrasi ke Firebase Authentication.
