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
  GAS_URL: 'https://script.google.com/macros/s/AKfycbw6FJwTbwGr4b1N8Yw1pwGsEfSypPlek1vpQyy0NwIVN1dXExxX4DFIoe_7-lwDGeMf4A/exec',

  /*
   * Opsional. Alamat halaman verifikasi QR tanda tangan disposisi.
   * Kosongkan ('') = otomatis memakai verifikasi.html di situs ini
   * (mis. https://username.github.io/surat-yasma/verifikasi.html).
   * Isi dengan URL /exec yang sama dengan GAS_URL bila ingin QR tetap menuju halaman
   * verifikasi di server Apps Script (tidak bergantung pada alamat GitHub Pages).
   */
  URL_VERIFIKASI: ''
};
