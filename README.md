# Aplikasi Surat Terpusat — YASMA PB. Soedirman (frontend)

Frontend statis (HTML/CSS/JavaScript tanpa framework) untuk **Aplikasi Surat Terpusat** Yayasan Masjid Panglima Besar Soedirman, ditayangkan di **GitHub Pages**. Backend berupa **Google Apps Script REST API** (JSON) dengan Google Sheets sebagai database.

| Berkas | Fungsi |
|---|---|
| `index.html` | Aplikasi (login, beranda, surat masuk/keluar, disposisi, pengaturan, panel Admin) |
| `verifikasi.html` | Halaman publik pemeriksa QR tanda tangan disposisi |
| `css/style.css` | Tampilan |
| `js/config.js` | **Alamat backend (`GAS_URL`)** — wajib diisi URL `/exec` |
| `js/api.js` | Komunikasi `fetch()` ke Apps Script (`POST text/plain`, `GET ?action=`) |
| `js/app.js` | Logika aplikasi |
| `js/verifikasi.js` | Logika halaman verifikasi |

Versi: **2.0.0** (migrasi dari v1.3.0 berbasis HtmlService).

Langkah lengkap pemasangan backend dan GitHub Pages: lihat **[PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)**.

Memperbarui situs setelah mengubah berkas:

```bash
git add .
git commit -m "Keterangan perubahan"
git push
```
