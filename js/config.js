/*
 * ============================================================================
 * KONFIGURASI FRONTEND - Aplikasi Surat Terpusat YASMA PB. Soedirman
 * ----------------------------------------------------------------------------
 * WAJIB DIISI sebelum push ke GitHub:
 *   GAS_URL = URL Web App Apps Script yang berakhiran /exec
 *             (Apps Script -> Deploy -> Manage deployments -> salin "Web app URL")
 *
 * Contoh:
 *   GAS_URL: 'https://script.google.com/macros/s/AKfycbx...panjang.../exec',
 *
 * Berkas ini TIDAK memuat rahasia apa pun: URL /exec memang alamat publik API.
 * ============================================================================
 */
window.YASMA_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzmg9gMJSdmMMG1M5kSKo-gNofVANh6dxywZb4Sw82mvrcS0iTaS4S1feK6xahf4KyGbg/exec',

  /*
   * Opsional. Alamat halaman verifikasi QR tanda tangan disposisi.
   * Kosongkan ('') = otomatis memakai verifikasi.html di situs ini
   * (mis. https://username.github.io/surat-yasma/verifikasi.html).
   * Isi dengan URL /exec yang sama dengan GAS_URL bila ingin QR tetap menuju halaman
   * verifikasi di server Apps Script (tidak bergantung pada alamat GitHub Pages).
   */
  URL_VERIFIKASI: ''
};
