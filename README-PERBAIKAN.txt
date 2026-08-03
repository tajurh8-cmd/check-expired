PERBAIKAN MULTI TOKO

1. Setiap dokumen users/{NIK} wajib memiliki field:
   active   : true
   userid   : "NIK"
   username : "NAMA USER"
   password : "PASSWORD"
   role     : "USER"
   storeid  : "BI33"

2. Koleksi stores wajib memiliki dokumen dengan ID sama seperti storeid user.
   Contoh dokumen stores/BI33:
   storeid   : "BI33"
   storename : "TAJURHALANG"

3. Setelah login, aplikasi membaca users/{NIK}, kemudian stores/{storeid}.

4. Data baru di edItems otomatis memiliki:
   storeid, storename, userid, user.
   Dashboard hanya menampilkan edItems milik storeid user login.

5. Rak baru otomatis memiliki storeid. Daftar rak hanya tampil untuk toko user.

6. DATA LAMA
   Data edItems lama yang belum memiliki field storeid tidak akan tampil.
   Tambahkan field storeid = "BI33" dan storename = "TAJURHALANG" pada data lama.

   Data Rak lama yang belum memiliki field storeid juga tidak akan tampil.
   Tambahkan field storeid = "BI33" dan storename = "TAJURHALANG".

7. Upload seluruh isi folder ini ke root repository GitHub check-expired, lalu Commit changes.

8. MENU REGISTER
   Halaman login sekarang memiliki tombol Register.
   User mengisi NIK, nama, kode toko, dan password.
   Sistem memastikan kode toko tersedia pada koleksi stores.

   Akun baru dibuat pada users/{NIK} dengan active = false.
   Admin harus membuka Firestore > users > NIK user, lalu mengubah:
   active: false menjadi active: true

9. FIRESTORE RULES
   Pastikan Firestore Rules mengizinkan pembuatan dokumen user baru dari halaman register.
   Jangan izinkan user mengubah active atau role miliknya sendiri pada sistem produksi.

=== ADMIN PANEL ===
File baru: admin.html dan admin.js

Fitur:
- Menambah dan mengedit toko pada koleksi stores.
- Mengaktifkan/nonaktifkan toko.
- Melihat akun yang menunggu persetujuan.
- Mengaktifkan/nonaktifkan user.
- Mengubah role USER/ADMIN.
- Memindahkan user ke toko lain.
- Reset password sementara.

MEMBUAT ADMIN PERTAMA (SATU KALI DI FIREBASE)
1. Buka Firestore > users.
2. Pilih dokumen NIK milik admin.
3. Ubah field:
   active = true (Boolean)
   role = ADMIN (String)
   storeid = BI33 (atau kode toko admin)
4. Logout lalu login kembali.
5. Tombol Admin akan muncul di dashboard.

CATATAN KEAMANAN
Aplikasi lama masih menyimpan password sebagai teks di Firestore. Untuk penggunaan serius, sebaiknya migrasikan login ke Firebase Authentication dan gunakan Firestore Security Rules. Pembatasan halaman admin di JavaScript saja bukan pengamanan database yang cukup.


=== BOOTSTRAP + PWA ===
- Antarmuka menggunakan Bootstrap 5.3.2.
- PWA aktif pada login, dashboard, input, dan admin.
- Bisa dipasang dari menu browser: Tambahkan ke layar utama / Install app.
- manifest memakai path relatif sehingga cocok untuk GitHub Pages subfolder /check-expired/.
- Service worker menyimpan app shell dan aset yang pernah dibuka.
- Data Firebase tetap membutuhkan internet agar realtime.
- Setelah upload versi baru, lakukan hard refresh atau hapus cache situs bila tampilan lama masih muncul.
