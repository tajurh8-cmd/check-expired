UPDATE V2

1. Lupa password
- User memasukkan NIK dan kode toko.
- Password otomatis menjadi 6 digit terakhir NIK.
- Field mustChangePassword menjadi true.
- Setelah login, user wajib membuat password baru.

2. Produk tidak ditemukan
- Setelah scan barcode yang tidak ada di datasumber, form Tambah Produk Baru muncul.
- Isi nama produk dan RH.
- Produk disimpan ke koleksi datasumber lalu langsung dipakai untuk input expired.

PERHATIAN FIRESTORE RULES
Aplikasi client-side ini membutuhkan izin update users untuk reset password dan create datasumber. Untuk keamanan produksi, reset password sebaiknya dipindahkan ke Firebase Authentication/Cloud Functions karena aturan client-side tidak dapat memverifikasi NIK dan kode toko secara rahasia.
