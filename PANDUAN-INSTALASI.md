# Panduan Instalasi — Aplikasi Surat Terpusat YASMA PB. Soedirman v2.0

**Arsitektur baru:** frontend di **GitHub Pages**, backend **Google Apps Script sebagai REST API (JSON)**.

```
┌──────────────────────────────────────────┐        fetch() JSON         ┌──────────────────────────────────────┐
│ FRONTEND — GitHub Pages (folder frontend)│  ───────────────────────▶   │ BACKEND — Google Apps Script          │
│ index.html, verifikasi.html, css/, js/   │  POST {action, args}        │ (berkas backend: Kode.gs,              │
│ https://USERNAME.github.io/NAMA-REPO/    │  GET  ?action=boot|verifikasi│  appsscript.json)                     │
└──────────────────────────────────────────┘  ◀───────────────────────   │ Google Sheets + Drive (data lama tetap)│
                                                                         └──────────────────────────────────────┘
```

Yang **tidak berubah**: database Google Sheets, lampiran di Drive, akun & password, tanda tangan & PIN, logo sekolah, semua fitur v1.3 (disposisi, ekspor Excel, 10 data per halaman, dll.).

Yang **berubah**:

| Sebelumnya (v1.3) | Sekarang (v2.0) |
|---|---|
| Aplikasi dibuka dari URL `script.google.com/.../exec` | Aplikasi dibuka dari `https://USERNAME.github.io/NAMA-REPO/` |
| `Index`, `Stylesheet`, `JavaScript` (HTML) ada di proyek Apps Script | Pindah ke folder **frontend** (`index.html`, `css/`, `js/`) di GitHub |
| Browser memanggil server lewat `google.script.run` | Browser memanggil server lewat `fetch()` ke URL `/exec` |
| URL `/exec` menampilkan aplikasi | URL `/exec` hanya **API** (membalas data JSON) |
| QR disposisi menuju `/exec?v=KODE` | QR baru menuju `verifikasi.html?v=KODE` di GitHub Pages. **QR lama tetap berlaku.** |

---

## 0. Isi paket

```
frontend/                  ← ZIP ini. Folder inilah yang nanti di-"git init" dan di-push ke GitHub
├── index.html             ← halaman aplikasi (wajib ada di paling atas folder)
├── verifikasi.html        ← halaman publik pemeriksa QR tanda tangan disposisi
├── .nojekyll              ← berkas kosong (supaya GitHub Pages menyajikan berkas apa adanya)
├── README.md
├── PANDUAN-INSTALASI.md   ← berkas ini
├── css/
│   └── style.css
└── js/
    ├── config.js          ← WAJIB DIISI: GAS_URL (URL /exec dari Apps Script)
    ├── api.js             ← komunikasi ke backend (fetch, text/plain)
    ├── app.js             ← logika aplikasi
    └── verifikasi.js

backend/                   ← TIDAK ikut ke GitHub. Disalin-tempel ke editor Apps Script
├── Kode.gs
└── appsscript.json
```

> ⚠️ **Jangan** memasukkan `Kode.gs` / `appsscript.json` ke folder frontend atau ke GitHub. Backend hanya hidup di Apps Script.

Urutan kerja: **Tahap 1 (backend) → Tahap 2 (isi config.js) → Tahap 3 (GitHub Pages) → Tahap 4 (uji)**.
Backend dikerjakan lebih dulu karena frontend membutuhkan URL `/exec`.

---

## Tahap 1 — Backend: Google Apps Script

### 1A. Memperbarui proyek yang sudah ada (dari v1.3) — *disarankan*

Pakai proyek Apps Script yang **sama** supaya database, lampiran, akun, dan URL `/exec` tetap sama.

1. Buka proyek Apps Script aplikasi surat.
2. Klik berkas **Kode.gs** → **Ctrl+A** → **Delete** → tempel seluruh isi `backend/Kode.gs` yang baru → **Ctrl+S**.
3. `appsscript.json` isinya sama dengan sebelumnya; tidak perlu diubah. (Bila ingin memeriksa: ⚙️ **Project Settings** → centang *Show "appsscript.json" manifest file in editor*.)
4. **Hapus** berkas HTML lama `Index`, `Stylesheet`, `JavaScript` (klik ⋮ di samping nama berkas → *Delete*). Berkas itu sudah pindah ke GitHub dan tidak dipakai lagi.
5. Pilih fungsi **`setupAppEnvironment`** → ▶ **Run**. Fungsi ini aman diulang: tidak mengubah akun, password, atau data.
6. Pilih fungsi **`diagnosaAplikasi`** → ▶ **Run** → buka **Execution log**. Semua butir harus ✅, termasuk:
   - `API boot (GET ?action=boot)`
   - `Rute API (POST) — … fungsi editor tertutup untuk publik`
   - `Berkas HTML lama — tidak ada`
7. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.**
   Jangan membuat *New deployment*. Dengan *Edit → New version*, **URL `/exec` tetap sama** sehingga QR lama tetap sah.
8. Salin **Web app URL** (berakhiran `/exec`).

### 1B. Instalasi baru (belum pernah memasang aplikasi ini)

1. Buka <https://script.google.com> → **New project** → beri nama, mis. *Surat Terpusat YASMA*.
2. Ganti isi `Code.gs` dengan isi `backend/Kode.gs` (boleh ganti nama berkas menjadi `Kode`).
3. ⚙️ **Project Settings** → centang *Show "appsscript.json"* → buka `appsscript.json` → ganti isinya dengan `backend/appsscript.json`.
4. Jalankan **`setupAppEnvironment`** sekali → izinkan akses (Review permissions → pilih akun → *Advanced* → *Go to … (unsafe)* → *Allow*).
   **Catat password awal** semua akun yang tampil di Execution log — hanya tampil sekali.
5. Jalankan **`diagnosaAplikasi`** → semua ✅.
6. **Deploy → New deployment** → ⚙️ *Select type* → **Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
   - **Deploy** → salin **Web app URL** (berakhiran `/exec`).

### 1C. Cek API dari browser

Buka di tab baru: `URL_EXEC_ANDA?action=ping`

Harus tampil teks JSON seperti:
`{"success":true,"data":{"app":"Aplikasi Surat Terpusat","versi":"2.0.0","siap":true,...}`

Bila yang muncul halaman login Google atau halaman error → akses deployment belum **Anyone**, atau URL bukan `/exec`.

---

## Tahap 2 — Isi `js/config.js`

1. Ekstrak ZIP frontend. Hasilnya folder **`frontend`** (di dalamnya langsung ada `index.html`).
2. Buka `frontend/js/config.js` dengan editor teks (Linux: **Kate**/**KWrite**; Windows: **Notepad**).
3. Ganti baris:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT/exec',
   ```
   dengan URL `/exec` Anda (tetap di dalam tanda kutip, akhiri dengan koma):
   ```js
   GAS_URL: 'https://script.google.com/macros/s/AKfycbx...ID-ANDA.../exec',
   ```
4. Simpan.

> Berkas ini aman dipublikasikan: URL `/exec` memang alamat publik API. Password, token rahasia, dan ID spreadsheet tetap tersimpan di Script Properties Apps Script, bukan di frontend.

---

## Tahap 3 — Frontend: GitHub Pages (lewat terminal)

> Selalu lewat terminal (`git push`). **Jangan** memakai tombol *Upload files* di web GitHub — tombol itu meratakan folder `css/` dan `js/` sehingga tampilan rusak (CSS/JS 404).

### 3.1 Pastikan Git terpasang

**Linux (Bazzite / Fedora, terminal Konsole):**
```bash
git --version
```
Normalnya muncul `git version 2.x.x` (di Bazzite/Fedora Atomic biasanya sudah terpasang). Bila muncul `command not found`: jalankan `rpm-ostree install git`, restart komputer, lalu cek lagi.

**Windows:** unduh dari <https://git-scm.com/download/win>, pasang dengan pilihan bawaan, lalu buka **Git Bash** atau **PowerShell**.

### 3.2 Akun GitHub

Daftar di <https://github.com> bila belum punya. **Username** akan menjadi bagian alamat situs: `https://USERNAME.github.io/...`.

### 3.3 Identitas Git (sekali saja per komputer)

```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```
`user.name` hanya label riwayat (bukan username GitHub). Email sebaiknya sama dengan email akun GitHub.

### 3.4 Buat repository baru

Di github.com: tombol **+** → **New repository**:
- *Repository name*: mis. `surat-yasma`
- **Public** (wajib untuk GitHub Pages gratis — aman, frontend tidak memuat rahasia)
- **JANGAN** centang *Add a README*, *.gitignore*, atau *license*
- **Create repository** → biarkan halamannya terbuka (nanti salin URL `https://github.com/USERNAME/surat-yasma.git`).

### 3.5 Masuk ke folder yang BENAR — folder `frontend`

Folder kerja Git adalah **folder `frontend` hasil ekstrak ZIP** — folder yang di dalamnya langsung ada `index.html`. Bukan folder di atasnya, bukan folder `css/` atau `js/`.

**Linux (Konsole):**
```bash
cd ~/Unduhan/frontend
ls -la
```
(sesuaikan jalurnya, mis. `~/Downloads/frontend`. Cara cepat: buka folder `frontend` di Dolphin lalu tekan **Shift+F4** — terminal terbuka langsung di folder itu.)

**Windows (PowerShell):**
```powershell
cd "C:\Users\NAMA\Downloads\frontend"
dir
```

✅ Yang **harus** terlihat: `index.html`, `verifikasi.html`, folder `css`, folder `js`, `README.md`, `PANDUAN-INSTALASI.md`, `.nojekyll`.

❌ Bila yang terlihat justru folder `frontend` (atau `backend`): Anda satu tingkat terlalu tinggi → `cd frontend`, lalu `ls -la` lagi. **Jangan lanjut sebelum `index.html` terlihat.**

❌ Bila ada `Kode.gs`: pindahkan keluar dari folder ini dulu.

Pastikan juga `js/config.js` sudah diisi (Tahap 2).

### 3.6 Push pertama (jalankan satu per satu)

```bash
git init
```
→ `Initialized empty Git repository in …/frontend/.git/`

```bash
git add .
```
(ada **titik** di akhir). Tidak ada keluaran = berhasil.

```bash
git commit -m "Upload pertama"
```
→ muncul daftar berkas, mis. `create mode 100644 index.html`, `create mode 100644 js/app.js`.

```bash
git branch -M main
git remote add origin https://github.com/USERNAME/surat-yasma.git
```
(ganti USERNAME dan nama repo).

```bash
git push -u origin main
```
- *Username*: username GitHub
- *Password*: **Personal Access Token** (bukan password akun GitHub — lihat 3.7)
- Saat menempel token, layar **tetap kosong** — itu normal. Tempel (Konsole: **Ctrl+Shift+V**; PowerShell: klik kanan) lalu **Enter**.

Berhasil bila muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### 3.7 Personal Access Token (bila diminta / muncul "Password authentication is not supported")

1. Buka <https://github.com/settings/tokens> → **Generate new token** → **Generate new token (classic)**
2. *Note*: `git-push`; *Expiration*: 90 days (atau *No expiration*); centang **repo**
3. **Generate token** → salin token `ghp_…` (hanya tampil sekali, simpan dulu)
4. Ulangi `git push -u origin main`, tempel token sebagai password.

Alternatif tanpa token manual: **GitHub Desktop** (Windows/Mac) → *Add Local Repository* → pilih folder `frontend` → *Publish repository*.

### 3.8 Periksa repository & aktifkan Pages

1. Buka `https://github.com/USERNAME/surat-yasma`. Di halaman utama repo harus terlihat **index.html**, folder **css**, folder **js** — dan **tidak ada** `Kode.gs`.
2. **Settings** → **Pages** (menu kiri):
   - *Source*: **Deploy from a branch**
   - *Branch*: **main** / **(root)** → **Save**
   - centang **Enforce HTTPS**
3. Tunggu 1–2 menit, muat ulang halaman Settings → muncul *Your site is live at* **https://USERNAME.github.io/surat-yasma/**

---

## Tahap 4 — Uji

1. Buka `https://USERNAME.github.io/surat-yasma/`. Kotak *Menghubungkan ke server* muncul sebentar, lalu daftar akun terisi.
2. Login sebagai **Admin Surat** → Dashboard tampil.
3. Login sebagai akun unit → buka Surat Masuk, Ekspor Excel, cetak.
4. Cetak lembar disposisi → pindai QR dengan HP → terbuka `…/verifikasi.html?v=…` → **TANDA TANGAN SAH**.
5. Bagikan alamat GitHub Pages ke semua unit. Alamat `/exec` lama kini hanya API (membalas JSON), bukan halaman aplikasi.

---

## Memperbarui di kemudian hari

**Frontend** (setelah mengubah berkas di folder `frontend`), dari dalam folder `frontend`:
```bash
git add .
git commit -m "Keterangan perubahan"
git push
```
Tunggu 1–2 menit; bila masih tampil versi lama tekan **Ctrl+Shift+R**.

**Backend**: tempel `Kode.gs` baru → **Deploy → Manage deployments → Edit → New version → Deploy**. URL `/exec` tetap; `config.js` tidak perlu diubah.

---

## Pemecahan masalah

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| Login: **KONFIGURASI BELUM LENGKAP** | `GAS_URL` di `js/config.js` belum diisi / salah | Isi URL `/exec` (Tahap 2), lalu `git add .` → `git commit -m "isi GAS_URL"` → `git push` |
| Login: **GAGAL TERHUBUNG KE SERVER** | Internet putus, URL salah, atau deployment bukan *Anyone* | Cek 1C (`?action=ping`). Perbaiki deployment / URL, klik **Coba lagi** |
| Pesan "membalas halaman HTML, bukan data JSON" | Kode.gs belum versi REST, atau deployment belum *New version* | Ulangi Tahap 1A langkah 2 & 7 |
| GitHub Pages **404 File not found** | `index.html` tidak di root repo (git init di folder yang salah) atau Pages belum aktif | Lihat repo di browser. Bila terlihat folder `frontend/` di root: masuk ke folder `frontend`, `git init`, `git add .`, `git commit -m "fix"`, `git branch -M main`, `git remote add origin …`, `git push -u origin main --force` (`--force` menimpa isi repo yang salah) |
| Halaman polos tanpa warna / layar "Aplikasi gagal dimuat — berkas css/style.css, js/app.js tidak termuat" | Struktur folder rusak (berkas rata di root) | Pastikan `css/style.css` dan `js/*.js` di dalam foldernya, lalu push ulang |
| `remote origin already exists` | `git remote add` sudah pernah dijalankan | Lewati; bila URL salah: `git remote set-url origin https://github.com/USERNAME/REPO.git` |
| `Password authentication is not supported` / `Invalid username or token` | Butuh / salah Personal Access Token | Tahap 3.7 |
| `src refspec main does not match any` | Belum ada commit | `git add .` lalu `git commit -m "Upload pertama"` |
| `Updates were rejected because the remote contains work` | Repo dibuat dengan README | `git pull --rebase origin main` lalu `git push` |
| Setelah push masih tampil versi lama | Cache browser | **Ctrl+Shift+R** atau jendela Incognito |
| QR lama (dicetak sebelum migrasi) | Menuju `/exec?v=KODE` | Tetap berfungsi, selama deployment diperbarui dengan *Edit → New version* (URL tidak berubah) |
| Sesi berakhir saat tab ditutup | Token disimpan per tab (sessionStorage) demi keamanan perangkat bersama | Normal — login ulang |

Bila masih bermasalah: buka situs → **F12** → tab **Console** → kirim tangkapan layar pesan merahnya, beserta Execution log `diagnosaAplikasi`.

---

## Catatan keamanan

- Hanya aksi yang terdaftar di `ruteApi_()` yang dapat dipanggil dari luar. Fungsi editor (`setupAppEnvironment`, `diagnosaAplikasi`, `backupDatabase`, `resetSandiAdmin`, `isiDataContoh`, …) **tidak** dapat dipanggil lewat internet.
- Setiap aksi tetap memeriksa token sesi + peran (Admin / Pimpinan / Operator) di server seperti v1.3.
- Frontend tidak menyimpan rahasia. Token sesi disimpan di *sessionStorage* tab browser dan hilang saat tab ditutup.
- Semua situs GitHub Pages milik akun yang sama berbagi asal `https://USERNAME.github.io`. Sebaiknya tidak menaruh halaman pihak lain/tidak tepercaya di akun GitHub yang sama (atau pakai akun/organisasi GitHub khusus yayasan).
- `<meta name="robots" content="noindex">` dipasang agar halaman login tidak diindeks mesin pencari.

### Opsi `URL_VERIFIKASI` (js/config.js)
Kosong (bawaan) → QR baru menuju `verifikasi.html` di situs GitHub Pages.
Bila alamat GitHub Pages mungkin berubah (ganti nama repo/akun), isi `URL_VERIFIKASI` dengan URL `/exec` agar QR menuju halaman verifikasi di server Apps Script, yang tidak bergantung pada alamat GitHub Pages.

---

## Glosarium singkat

- **Repository (repo)** — folder proyek di GitHub.
- **Commit** — menyimpan perubahan beserta catatannya.
- **Push** — mengirim commit dari komputer ke GitHub.
- **Branch `main`** — cabang utama yang ditayangkan GitHub Pages.
- **Personal Access Token** — "password khusus" GitHub untuk `git push` dari terminal.
- **URL /exec** — alamat Web App Apps Script yang kini menjadi alamat API.
