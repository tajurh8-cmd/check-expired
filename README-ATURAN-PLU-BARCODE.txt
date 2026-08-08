ATURAN FINAL PLU / BARCODE

PENCARIAN:
- Input <= 6 karakter: dianggap PLU, 1 query ke field PLU.
- Input > 6 karakter: dianggap barcode fisik, aplikasi membuang 1 karakter terakhir lalu 1 query ke field BARCODE.
- Setelah barcode ditemukan, textbox utama menampilkan PLU.

TAMBAH PRODUK BARU:
- PLU wajib, maksimal 6 karakter.
- Barcode fisik lengkap wajib.
- Nama produk wajib.
- RH wajib.
- Sebelum masuk datasumber, barcode fisik otomatis dibuang 1 karakter terakhir dan hasilnya disimpan ke field BARCODE.
- Field PLU disimpan apa adanya.
