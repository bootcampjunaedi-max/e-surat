/*
 * ============================================================================
 * LAPISAN API - komunikasi frontend (GitHub Pages) <-> backend Google Apps Script
 * ----------------------------------------------------------------------------
 *  - POST {action, args} dengan Content-Type text/plain;charset=utf-8
 *    (bukan application/json, supaya browser tidak mengirim preflight CORS yang
 *    tidak didukung Apps Script).
 *  - GET ?action=... untuk data publik (daftar akun login, verifikasi QR).
 *  - Tidak memakai google.script.run, iframe, atau cookie. Token sesi dikirim
 *    sebagai argumen pertama setiap aksi (disimpan di sessionStorage per tab).
 * ============================================================================
 */
(function () {
  'use strict';

  var C = window.YASMA_CONFIG || {};
  var URL_API = String(C.GAS_URL || '').trim();
  var BATAS_MS = 330000;   // Apps Script berhenti paling lama 6 menit; jangan menunggu tanpa batas
  var POLA_URL = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^\/]+|macros)\/s\/[A-Za-z0-9_-]{20,}\/exec$/;

  function siap() { return POLA_URL.test(URL_API) && !/GANTI_DENGAN_ID_DEPLOYMENT/.test(URL_API); }

  function galatKonfigurasi() {
    if (!URL_API || /GANTI_DENGAN_ID_DEPLOYMENT/.test(URL_API)) {
      return 'Alamat backend belum diatur. Isi GAS_URL di berkas js/config.js dengan URL Web App Apps Script (berakhiran /exec), lalu push ulang ke GitHub.';
    }
    if (/\/dev$/.test(URL_API)) return 'GAS_URL di js/config.js memakai URL /dev (hanya untuk pengujian pemilik). Ganti dengan URL /exec dari Deploy -> Manage deployments.';
    return 'GAS_URL di js/config.js tidak valid. Harus berbentuk https://script.google.com/macros/s/.../exec';
  }

  function galatJaringan() {
    return new Error('Tidak dapat menghubungi server Apps Script. Periksa koneksi internet. Bila koneksi baik, pastikan GAS_URL di js/config.js benar dan Web App di-deploy dengan akses "Anyone" (Siapa saja).');
  }

  function bacaJson(res) {
    return res.text().then(function (teks) {
      try { return JSON.parse(teks); }
      catch (e) {
        if (/<html|<!doctype/i.test(teks)) {
          throw new Error('Server Apps Script membalas halaman HTML, bukan data JSON. Penyebab umum: akses deployment belum "Anyone", URL bukan /exec, atau Kode.gs di Apps Script belum diganti dengan versi REST API (lalu deploy Versi baru).');
        }
        throw new Error('Respons server tidak dapat dibaca.');
      }
    });
  }

  function kirim(url, opsi) {
    if (!siap()) return Promise.reject(Object.assign(new Error(galatKonfigurasi()), { konfigurasi: true }));
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, BATAS_MS) : null;
    if (ctrl) opsi.signal = ctrl.signal;
    opsi.redirect = 'follow';
    opsi.cache = 'no-store';
    return fetch(url, opsi)
      .then(function (res) {
        if (!res.ok) throw new Error('Server Apps Script membalas HTTP ' + res.status + '. Coba lagi beberapa saat.');
        return bacaJson(res);
      })
      .catch(function (e) {
        if (e && e.name === 'AbortError') throw new Error('Server tidak menjawab dalam batas waktu. Coba lagi.');
        if (e instanceof TypeError) throw Object.assign(galatJaringan(), { jaringan: true });
        throw e;
      })
      .finally(function () { if (t) clearTimeout(t); });
  }

  /** Aksi bertoken (dan login): POST {action, args}. */
  function panggil(action, args) {
    return kirim(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, args: args || [] })
    });
  }

  /** Data publik: GET ?action=...&param=... */
  function ambil(action, params) {
    var q = ['action=' + encodeURIComponent(action)];
    Object.keys(params || {}).forEach(function (k) { q.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k])); });
    return kirim(URL_API + '?' + q.join('&'), { method: 'GET' });
  }

  /** Alamat halaman verifikasi QR (lihat URL_VERIFIKASI di js/config.js). */
  function urlVerifikasi() {
    var u = String(C.URL_VERIFIKASI || '').trim();
    if (u) return u;
    try { return new URL('verifikasi.html', location.href).href.split('#')[0].split('?')[0]; }
    catch (e) { return ''; }
  }

  window.YasmaApi = { siap: siap, galatKonfigurasi: galatKonfigurasi, panggil: panggil, ambil: ambil, urlVerifikasi: urlVerifikasi, url: URL_API };
})();
