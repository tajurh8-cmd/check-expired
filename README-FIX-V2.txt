FIX V2 PILIH BARANG -> INPUT LABEL

Perbaikan utama:
- Saat barang diklik di List Barang Master, PLU, barcode, DESKRIPSI, dan RH dibawa langsung lewat URL parameter.
- Input Label membaca parameter tersebut dan langsung mengisi:
  PLU/Barcode = PLU barang
  Produk = DESKRIPSI
  RH disimpan ke selectedProduct untuk hasil label
- Tidak bergantung lagi pada sessionStorage/localStorage untuk perpindahan halaman.
- localStorage tetap hanya fallback untuk kompatibilitas versi sebelumnya.

Cukup replace:
1. label-data.html
2. label-input.html
