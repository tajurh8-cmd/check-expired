PERBAIKAN WHATSAPP H-7 - 03 OKTOBER 2026

Perubahan utama:
1. Menambahkan wa-reminder.js untuk scheduler WhatsApp H-7.
2. Menambahkan npm script: notify -> node wa-reminder.js.
3. Memindahkan workflow WhatsApp ke .github/workflows/whatsapp-h7.yml.
4. Workflow tetap berjalan 01:00 UTC / 08:00 WIB dan dapat dijalankan manual.
5. Token Fonnte dibaca dari stores/{storeid}.fonnteToken.
6. Hanya toko dengan waActive=true yang dikirimi pesan.
7. User harus active=true dan memiliki nomor phone/whatsapp.
8. Item dikelompokkan per toko + user; satu user menerima satu ringkasan.
9. Setelah pengiriman Fonnte sukses, item diberi waH7Date dan waH7Status=sent.
10. Jika gagal, waH7Date tidak diisi dan error dicatat agar dapat dicoba kembali.
11. Tidak menggunakan token Fonnte di frontend.
12. FCM/push-reminder.js tidak diubah agar sistem notifikasi PWA tetap terpisah.
