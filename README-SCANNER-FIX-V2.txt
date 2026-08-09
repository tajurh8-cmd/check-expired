SCANNER FIX V2
- Hanya scanner yang diubah; FCM/notifikasi tidak disentuh.
- Android Chrome memakai BarcodeDetector native bila tersedia.
- Fallback otomatis ke ZXing bila BarcodeDetector tidak tersedia.
- Kamera belakang diprioritaskan.
- Stream kamera ditutup bersih saat scanner ditutup.
- Barcode hasil scan tetap masuk ke logika lama: >6 karakter dianggap barcode, dipotong 1 karakter sebelum query, textbox akhir tetap PLU.
