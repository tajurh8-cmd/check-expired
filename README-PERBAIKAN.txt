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
