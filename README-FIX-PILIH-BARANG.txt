FIX PILIH BARANG -> INPUT LABEL

Masalah:
Data pilihan sebelumnya memakai sessionStorage dan navigasi normal, sehingga pada PWA/cache tertentu halaman Input Label dapat terbuka dari cache lama dan data tidak terisi.

Perbaikan:
- Pilihan barang disimpan sementara di localStorage.
- Klik list memakai event delegation.
- Navigasi kembali memakai cache-buster ?from=master&t=...
- Input Label mengambil pilihan, mengisi PLU + Produk, lalu menghapus data sementara.
- Hanya 2 HTML yang perlu ditimpa: label-data.html dan label-input.html.
