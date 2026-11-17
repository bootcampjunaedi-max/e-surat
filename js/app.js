/* Aplikasi Surat Terpusat YASMA PB. Soedirman - logika aplikasi (frontend GitHub Pages, v2.0.0).
   Komunikasi ke backend Apps Script lewat window.YasmaApi (js/api.js). */
(function () {
'use strict';


const VERSI_APP = '2.0.0';
let BOOT = { siap: false, memuat: true, pesan: '' };
const CDN = {
  chart: ['https:\/\/cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.js', 'https:\/\/unpkg.com/chart.js@4.4.4/dist/chart.umd.js'],
  pdf: ['https:\/\/cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', 'https:\/\/unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'],
  pdfWorker: ['https:\/\/cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js', 'https:\/\/unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'],
  qr: ['https:\/\/cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js', 'https:\/\/unpkg.com/qrcode-generator@1.4.4/qrcode.js']
};
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const S = {
  token: null, profil: null, peran: null, unit: null,
  konfig: Object.assign({ sesi_idle_menit: 30, polling_detik: 30, maks_mb: 10, maks_lampiran: 5, ekstensi: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'], potongan_byte: 2097152 }, BOOT.konfig || {}),
  identitas: {}, unitList: [], unitMap: {},
  surat: new Map(), notif: [], log: [], sesi: [], adaLagi: false,
  disposisi: [], ttd: null, urlApp: '', dispCid: null,
  identUnit: null, logoYys: '', singkatYys: 'YASMA PB. Soedirman',
  serverTs: 0, lastActivity: Date.now(), lastApi: 0, lastSync: 0,
  view: null, params: {}, history: [],
  pollTimer: null, idleTimer: null, polling: false, idleWarned: false,
  kunciLokal: {},
  notifLokal: new Set(),
  blob: new Map(),
  adm: null,
  f: {}
};

const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const byId = id => document.getElementById(id);
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function attr(v) { return esc(v); }
function debounce(fn, ms) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; }
function uid(p) { const a = new Uint8Array(10); (window.crypto || window.msCrypto).getRandomValues(a); return (p || '') + Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); }
function pad(n, l) { return String(n).padStart(l || 2, '0'); }
function isoHari(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function tglKeMs(s, akhir) { if (!s) return 0; const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], akhir ? 23 : 0, akhir ? 59 : 0, akhir ? 59 : 0, akhir ? 999 : 0).getTime(); }
function fmtTgl(s) { if (!s) return '\u2014'; const p = String(s).split('-'); if (p.length !== 3) return esc(s); return +p[2] + ' ' + BULAN[+p[1] - 1] + ' ' + p[0]; }
function fmtTglPanjang(s) { if (!s) return '\u2014'; const p = String(s).split('-'); return +p[2] + ' ' + BULAN_PANJANG[+p[1] - 1] + ' ' + p[0]; }
function fmtWaktu(ms, tanpaTahun) { if (!ms) return '\u2014'; const d = new Date(+ms); return d.getDate() + ' ' + BULAN[d.getMonth()] + (tanpaTahun ? '' : ' ' + d.getFullYear()) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' WIB'; }
function fmtJam(ms) { if (!ms) return '\u2014'; const d = new Date(+ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function fmtTglMs(ms) { if (!ms) return '\u2014'; const d = new Date(+ms); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
function lalu(ms) {
  if (!ms) return '';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
  if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
  if (s < 172800) return 'kemarin, ' + fmtJam(ms);
  if (s < 604800) return Math.floor(s / 86400) + ' hari lalu';
  return fmtWaktu(ms, true);
}
function fmtKb(kb) { kb = +kb || 0; return kb >= 1024 ? (kb / 1024).toFixed(kb >= 10240 ? 0 : 1).replace('.', ',') + ' MB' : kb + ' KB'; }
function fmtByte(b) { return fmtKb(Math.max(1, Math.round(b / 1024))); }
function fmtAngka(n) { return (+n || 0).toLocaleString('id-ID'); }
function fmtPersen(a, b, d) { if (!b) return '0%'; return (a / b * 100).toFixed(d == null ? 1 : d).replace('.', ',') + '%'; }
function fmtJamDurasi(h) { if (h == null || isNaN(h)) return '\u2014'; if (h < 1) return Math.max(1, Math.round(h * 60)) + ' mnt'; return h.toFixed(1).replace('.', ',') + ' jam'; }
function inisial(n) { const w = String(n || '').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); return ((w[0] || '?')[0] + (w[1] ? w[1][0] : (w[0] || '')[1] || '')).toUpperCase(); }
function tahunAjaran() { const d = new Date(), y = d.getFullYear(); return d.getMonth() >= 6 ? y + '/' + (y + 1) : (y - 1) + '/' + y; }
function ext(n) { const m = String(n || '').toLowerCase().match(/\.([a-z0-9]+)$/); return m ? m[1] : ''; }
function sorot(teks, q) { const t = esc(teks); if (!q) return t; const i = t.toLowerCase().indexOf(esc(q).toLowerCase()); return i < 0 ? t : t.slice(0, i) + '<mark>' + t.slice(i, i + esc(q).length) + '</mark>' + t.slice(i + esc(q).length); }
function cocok(q, ...vals) { if (!q) return true; q = q.toLowerCase(); return vals.some(v => String(v || '').toLowerCase().indexOf(q) !== -1); }

const store = {
  get(k, sesi) { try { return (sesi ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
  set(k, v, sesi) { try { (sesi ? sessionStorage : localStorage).setItem(k, v); return true; } catch (e) { return false; } },
  del(k, sesi) { try { (sesi ? sessionStorage : localStorage).removeItem(k); } catch (e) {   } },
  json(k, sesi) { try { return JSON.parse(this.get(k, sesi) || 'null'); } catch (e) { return null; } }
};
function prefKey(k) { return 'yasma_' + k + '_' + (S.profil ? S.profil.id : 'x'); }
function pref(k, def) { const v = store.get(prefKey(k)); return v == null ? def : v === '1'; }
function setPref(k, v) { store.set(prefKey(k), v ? '1' : '0'); }

function loadScript(src) {
  const daftar = Array.isArray(src) ? src : [src];
  const satu = url => new Promise((ok, no) => {
    if ($$('script').some(s => s.src === url && s.dataset.loaded)) return ok();
    const s = document.createElement('script'); s.src = url; s.async = true;
    s.onload = () => { s.dataset.loaded = '1'; ok(); }; s.onerror = () => { s.remove(); no(new Error('Gagal memuat pustaka ' + url)); };
    document.head.appendChild(s);
  });
  return daftar.reduce((p, url) => p.catch(() => satu(url)), Promise.reject(new Error('mulai')));
}


function api(fn, ...args) {
  S.lastApi = Date.now();
  if (!window.YasmaApi) return Promise.reject(new Error('Berkas js/api.js tidak termuat. Pastikan folder js/ lengkap di repository.'));
  return window.YasmaApi.panggil(fn, args).then(res => {
    if (!res) throw new Error('Respons server kosong.');
    if (res.code === 'SESI_HABIS') { sesiHabis(res.message); throw Object.assign(new Error(res.message), { ditangani: true }); }
    if (res.code === 'WAJIB_GANTI') { tampilWajibGanti(); throw Object.assign(new Error(res.message), { ditangani: true }); }
    return res;
  });
}

async function muatBoot() {
  if (!window.YasmaApi || !window.YasmaApi.siap()) {
    BOOT = { siap: false, pesan: window.YasmaApi ? window.YasmaApi.galatKonfigurasi() : 'Berkas js/api.js tidak termuat.', judul: 'Konfigurasi belum lengkap', konfigurasi: true };
    return BOOT;
  }
  try {
    const b = await window.YasmaApi.ambil('boot');
    if (b && b.siap) {
      BOOT = b;
      store.set('yasma_boot_publik', JSON.stringify(b));
      Object.assign(S.konfig, b.konfig || {});
      if (!S.profil) terapkanIdentitas(Object.assign({}, b.konfig || {}));
    } else {
      BOOT = { siap: false, pesan: (b && (b.pesan || b.message)) || 'Server belum siap.', judul: 'Aplikasi belum siap' };
    }
  } catch (e) {
    if (BOOT.siap) BOOT.luring = true;
    else BOOT = { siap: false, pesan: pesanError(e), judul: 'Gagal terhubung ke server' };
  }
  return BOOT;
}
function pesanError(e) { return (e && e.message) || String(e || 'Terjadi kesalahan.'); }

function setSync(state) {
  const c = byId('syncChip'); if (!c) return;
  c.classList.toggle('sync', state === 'sync'); c.classList.toggle('off', state === 'off');
  c.querySelector('span').textContent = state === 'sync' ? 'Menyinkronkan\u2026' : state === 'off' ? 'Luring' : 'Tersinkron';
  if (state === 'ok') { S.lastSync = Date.now(); const m = byId('heroMeta'); if (m) m.textContent = 'Terakhir sinkron: ' + fmtJam(S.lastSync) + ' WIB'; }
  const dot = byId('sbDot'), on = byId('sbOnline');
  if (dot) dot.className = 'dot ' + (state === 'off' ? 'dot-danger' : 'dot-ok');
  if (on) { on.textContent = state === 'off' ? 'LURING' : 'ONLINE'; on.className = 'chip ' + (state === 'off' ? 'chip-danger' : 'chip-ok'); }
}


function toast(judul, pesan, tipe, opsi) {
  tipe = tipe || 'info'; opsi = opsi || {};
  const ic = { success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }[tipe];
  const el = document.createElement('div');
  el.className = 'tst ' + tipe; el.setAttribute('role', tipe === 'danger' ? 'alert' : 'status');
  el.innerHTML = `<i class="bi ${ic} tst-ic"></i><div class="tst-b"><div class="tst-t">${esc(judul)}</div>${pesan ? `<div class="tst-m">${esc(pesan)}</div>` : ''}${opsi.aksi ? `<div class="tst-a"><button type="button" class="btn btn-sm btn-outline">${esc(opsi.aksi)}</button></div>` : ''}</div><button type="button" class="tst-x" aria-label="Tutup"><i class="bi bi-x-lg"></i></button>`;
  const tutup = () => { el.classList.add('out'); setTimeout(() => el.remove(), 180); };
  el.querySelector('.tst-x').onclick = tutup;
  if (opsi.aksi) el.querySelector('.tst-a button').onclick = () => { tutup(); opsi.onAksi && opsi.onAksi(); };
  const stack = byId('toastStack'); stack.appendChild(el);
  while (stack.children.length > 4) stack.firstChild.remove();
  setTimeout(tutup, opsi.lama || (tipe === 'danger' ? 7000 : 4200));
}

const modal = id => bootstrap.Modal.getOrCreateInstance(byId(id));
function konfirmasi(judul, isiHtml, opsi) {
  opsi = opsi || {};
  return new Promise(ok => {
    byId('mKonfirmT').textContent = judul;
    byId('mKonfirmBody').innerHTML = isiHtml;
    const ya = byId('mKonfirmYa');
    ya.className = 'btn ' + (opsi.bahaya ? 'btn-danger' : 'btn-primary');
    ya.textContent = opsi.ya || 'Lanjutkan';
    let hasil = false;
    ya.onclick = () => { hasil = true; modal('mKonfirm').hide(); };
    byId('mKonfirm').addEventListener('hidden.bs.modal', () => ok(hasil), { once: true });
    modal('mKonfirm').show();
  });
}
function sibuk(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin"></span> ${esc(label || 'Memproses\u2026')}`; }
  else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
}

function unduhBlob(blob, nama) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nama; a.rel = 'noopener'; document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2000);
}
function unduhCsv(nama, rows) {
  const isi = rows.map(r => r.map(v => { v = v == null ? '' : String(v); return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n');
  unduhBlob(new Blob(['\ufeff' + isi], { type: 'text/csv;charset=utf-8' }), nama);
  toast('Berkas CSV dibuat', nama + ' (pemisah titik koma, siap dibuka di Excel/Sheets).', 'success');
}

const XLSX_NS = 'http:\/\/schemas.openxmlformats.org/';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XML_DEKL = '<' + '?xml version="1.0" encoding="UTF-8" standalone="yes"?' + '>';
function crc32(b) {
  let t = crc32.t;
  if (!t) { t = crc32.t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function zipSimpan(berkas, mime) {
  const enc = new TextEncoder(), d = new Date(), bagian = [], pusat = [];
  const jam = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const tgl = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  let off = 0;
  berkas.forEach(f => {
    const nama = enc.encode(f.nama), isi = enc.encode(f.isi), crc = crc32(isi);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, jam, true); h.setUint16(12, tgl, true); h.setUint32(14, crc, true);
    h.setUint32(18, isi.length, true); h.setUint32(22, isi.length, true); h.setUint16(26, nama.length, true); h.setUint16(28, 0, true);
    bagian.push(new Uint8Array(h.buffer), nama, isi);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, jam, true); c.setUint16(14, tgl, true); c.setUint32(16, crc, true); c.setUint32(20, isi.length, true); c.setUint32(24, isi.length, true);
    c.setUint16(28, nama.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true);
    c.setUint32(38, 0, true); c.setUint32(42, off, true);
    pusat.push(new Uint8Array(c.buffer), nama);
    off += 30 + nama.length + isi.length;
  });
  const ukPusat = pusat.reduce((a, x) => a + x.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(4, 0, true); e.setUint16(6, 0, true); e.setUint16(8, berkas.length, true); e.setUint16(10, berkas.length, true);
  e.setUint32(12, ukPusat, true); e.setUint32(16, off, true); e.setUint16(20, 0, true);
  return new Blob(bagian.concat(pusat, [new Uint8Array(e.buffer)]), { type: mime || 'application/zip' });
}
function xmlEsc(v) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function kolomXl(i) { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
function serialWaktuXl(ms) { if (!ms) return null; const d = new Date(+ms), lokal = Math.round((d.getTime() - d.getTimezoneOffset() * 60000) / 1000) * 1000; return lokal / 864e5 + 25569; }
function serialTglXl(iso) { const p = String(iso || '').split('-'); if (p.length !== 3) return null; const t = Date.UTC(+p[0], +p[1] - 1, +p[2]); return isNaN(t) ? null : t / 864e5 + 25569; }
const XL_GAYA = { judul: 1, sub: 2, kepala: 3, teks: 4, teksSatu: 5, angka: 6, tgl: 7, waktu: 8, merah: 9, oranye: 10, tengah: 11 };
const XL_STYLES = XML_DEKL
  + '<styleSheet xmlns="' + XLSX_NS + 'spreadsheetml/2006/main">'
  + '<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy hh:mm"/></numFmts>'
  + '<fonts count="6">'
  + '<font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>'
  + '<font><b/><sz val="14"/><color rgb="FF0F4C3A"/><name val="Calibri"/><family val="2"/></font>'
  + '<font><i/><sz val="10"/><color rgb="FF475569"/><name val="Calibri"/><family val="2"/></font>'
  + '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>'
  + '<font><b/><sz val="11"/><color rgb="FFB91C1C"/><name val="Calibri"/><family val="2"/></font>'
  + '<font><b/><sz val="11"/><color rgb="FFB45309"/><name val="Calibri"/><family val="2"/></font>'
  + '</fonts>'
  + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F4C3A"/><bgColor indexed="64"/></patternFill></fill></fills>'
  + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
  + '<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="12">'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  + '<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>'
  + '<xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>'
  + '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>'
  + '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>'
  + '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>'
  + '<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>'
  + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

function buatXlsx(o) {
  const G = XL_GAYA, nK = o.kolom.length, akhir = kolomXl(nK - 1), baris = [], gabung = [];
  const teks = (ref, v, st) => v === '' || v == null ? `<c r="${ref}" s="${st}"/>` : `<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
  const angka = (ref, v, st) => v === '' || v == null || isNaN(v) ? `<c r="${ref}" s="${st}"/>` : `<c r="${ref}" s="${st}"><v>${v}</v></c>`;
  const sel = (ref, v, k) => {
    if (k.t === 'n') return angka(ref, v, G.angka);
    if (k.t === 'd') { const n = serialTglXl(v); return n == null ? teks(ref, v, G.tengah) : angka(ref, n, G.tgl); }
    if (k.t === 'dt') return angka(ref, serialWaktuXl(v), G.waktu);
    if (k.t === 'sifat') return teks(ref, v, v === 'Rahasia' ? G.merah : v === 'Penting' ? G.oranye : G.tengah);
    if (k.t === 'c') return teks(ref, v, G.tengah);
    return teks(ref, v, k.satu ? G.teksSatu : G.teks);
  };
  let r = 1;
  baris.push(`<row r="1" ht="22" customHeight="1">${teks('A1', o.judul, G.judul)}</row>`); gabung.push('A1:' + akhir + '1');
  (o.sub || []).forEach(t => { r++; baris.push(`<row r="${r}">${teks('A' + r, t, G.sub)}</row>`); gabung.push('A' + r + ':' + akhir + r); });
  r += 2;
  const rKepala = r;
  baris.push(`<row r="${r}" ht="30" customHeight="1">${o.kolom.map((k, i) => teks(kolomXl(i) + r, k.h, G.kepala)).join('')}</row>`);
  o.baris.forEach(b => { r++; baris.push(`<row r="${r}">${o.kolom.map((k, i) => sel(kolomXl(i) + r, b[i], k)).join('')}</row>`); });
  const rAkhir = r, area = 'A' + rKepala + ':' + akhir + rAkhir, nama = String(o.namaSheet || 'Data').replace(/[\[\]:*?\\/]/g, ' ').slice(0, 31);
  const ref = "'" + nama.replace(/'/g, "''") + "'!";
  const kaki = String(o.judul).replace(/&/g, '&&');
  const sheet = XML_DEKL
    + `<worksheet xmlns="${XLSX_NS}spreadsheetml/2006/main" xmlns:r="${XLSX_NS}officeDocument/2006/relationships">`
    + '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
    + `<dimension ref="A1:${akhir}${rAkhir}"/>`
    + `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${rKepala}" topLeftCell="A${rKepala + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${rKepala + 1}" sqref="A${rKepala + 1}"/></sheetView></sheetViews>`
    + '<sheetFormatPr defaultRowHeight="15"/>'
    + `<cols>${o.kolom.map((k, i) => `<col min="${i + 1}" max="${i + 1}" width="${k.w || 14}" customWidth="1"/>`).join('')}</cols>`
    + `<sheetData>${baris.join('')}</sheetData>`
    + `<autoFilter ref="${area}"/>`
    + `<mergeCells count="${gabung.length}">${gabung.map(g => `<mergeCell ref="${g}"/>`).join('')}</mergeCells>`
    + '<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>'
    + '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>'
    + `<headerFooter><oddFooter>${xmlEsc('&L' + kaki + '&RHalaman &P dari &N')}</oddFooter></headerFooter>`
    + '</worksheet>';
  const buku = XML_DEKL
    + `<workbook xmlns="${XLSX_NS}spreadsheetml/2006/main" xmlns:r="${XLSX_NS}officeDocument/2006/relationships">`
    + '<workbookPr/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="15000"/></bookViews>'
    + `<sheets><sheet name="${xmlEsc(nama)}" sheetId="1" r:id="rId1"/></sheets>`
    + `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${xmlEsc(ref + '$A$' + rKepala + ':$' + akhir + '$' + rAkhir)}</definedName>`
    + `<definedName name="_xlnm.Print_Titles" localSheetId="0">${xmlEsc(ref + '$' + rKepala + ':$' + rKepala)}</definedName></definedNames>`
    + '</workbook>';
  const relPkg = XLSX_NS + 'package/2006/relationships', relDoc = XLSX_NS + 'officeDocument/2006/relationships/';
  return zipSimpan([
    { nama: '[Content_Types].xml', isi: XML_DEKL
      + `<Types xmlns="${XLSX_NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { nama: '_rels/.rels', isi: XML_DEKL
      + `<Relationships xmlns="${relPkg}"><Relationship Id="rId1" Type="${relDoc}officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nama: 'xl/workbook.xml', isi: buku },
    { nama: 'xl/_rels/workbook.xml.rels', isi: XML_DEKL
      + `<Relationships xmlns="${relPkg}"><Relationship Id="rId1" Type="${relDoc}worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${relDoc}styles" Target="styles.xml"/></Relationships>` },
    { nama: 'xl/worksheets/sheet1.xml', isi: sheet },
    { nama: 'xl/styles.xml', isi: XL_STYLES }
  ], XLSX_MIME);
}

function ringkasFilter(f) {
  const b = [], st = { belum: 'belum dibaca', nodisp: 'belum didisposisi', Terkirim: 'terkirim (belum diakses)', Dibaca: 'dibaca', Dibalas: 'dibalas' };
  if (f.dari || f.sampai) b.push('periode ' + (f.dari ? fmtTglPanjang(f.dari) : 'awal') + ' s/d ' + (f.sampai ? fmtTglPanjang(f.sampai) : 'sekarang'));
  if (f.q) b.push('kata kunci "' + f.q + '"');
  if (f.sifat) b.push('sifat ' + f.sifat);
  if (f.status) b.push('status ' + (st[f.status] || f.status));
  if (f.jenis) b.push('jenis ' + f.jenis);
  if (f.unit) b.push('tujuan ' + f.unit);
  return b.length ? 'Filter: ' + b.join('; ') : 'Tanpa filter (seluruh surat yang termuat)';
}
function dataEksporMasuk(list) {
  const kolom = [
    { h: 'No', w: 6, t: 'n' }, { h: 'Nomor Surat', w: 28 }, { h: 'Tanggal Surat', w: 13, t: 'd' }, { h: 'Diterima', w: 17, t: 'dt' },
    { h: 'Pengirim', w: 26 }, { h: 'Perihal', w: 48 }, { h: 'Sifat', w: 10, t: 'sifat' }, { h: 'Jenis', w: 12, t: 'c' },
    { h: 'Status', w: 14, t: 'c' }, { h: 'Waktu Dibaca', w: 17, t: 'dt' }, { h: 'Disposisi Internal', w: 30 }, { h: 'Lampiran', w: 10, t: 'n' }, { h: 'Telah Diubah', w: 12, t: 'c' }
  ];
  const baris = list.map((s, i) => {
    const m = milikSaya(s), disp = (S.disposisi || []).filter(d => d.surat === s.id && d.st !== 'Dibatalkan');
    const kepada = Array.from(new Set([].concat.apply([], disp.map(d => d.kepada || []))));
    return [i + 1, s.no, s.tgl, s.at, s.dari, s.hal, s.sifat, s.jenis, m ? (m.st === 'Terkirim' ? 'Belum dibaca' : m.st) : '-', m && m.rd ? m.rd : '',
      disp.length ? 'Sudah: ' + kepada.join(', ') : s.jenis === 'Disposisi' ? '-' : 'Belum', (s.lamp || []).length, s.ubah ? 'Ya' : 'Tidak'];
  });
  return { kolom, baris };
}
function dataEksporKeluar(list) {
  const kolom = [
    { h: 'No', w: 6, t: 'n' }, { h: 'Nomor Surat', w: 28 }, { h: 'Tanggal Surat', w: 13, t: 'd' }, { h: 'Dicatat', w: 17, t: 'dt' },
    { h: 'Tujuan', w: 34 }, { h: 'Perihal', w: 48 }, { h: 'Sifat', w: 10, t: 'sifat' }, { h: 'Jenis', w: 12, t: 'c' },
    { h: 'Status', w: 12, t: 'c' }, { h: 'Dibaca', w: 14, t: 'c' }, { h: 'Lampiran', w: 10, t: 'n' }, { h: 'Telah Diubah', w: 12, t: 'c' }
  ];
  const baris = list.map((s, i) => [i + 1, s.no, s.tgl, s.at, s.ke.map(k => k.u).join(', '), s.hal, s.sifat, s.jenis, s.st,
    s.ke.filter(k => k.st !== 'Terkirim').length + ' dari ' + s.ke.length + ' unit', (s.lamp || []).length, s.ubah ? 'Ya' : 'Tidak']);
  return { kolom, baris };
}
function eksporXlsx(kotak) {
  const masuk = kotak === 'masuk', f = S.f[kotak] || filterDefault();
  const list = (S.f[kotak + 'Hasil'] || (masuk ? kotakMasuk() : kotakKeluar())).filter(s => !s._pending);
  if (!list.length) { toast('Tidak ada data', 'Tidak ada surat yang cocok dengan filter untuk diekspor.', 'warning'); return; }
  const btn = byId(masuk ? 'btnMasukXlsx' : 'btnKeluarXlsx');
  sibuk(btn, true, 'Menyiapkan\u2026');
  setTimeout(() => {
    try {
      const data = masuk ? dataEksporMasuk(list) : dataEksporKeluar(list), nm = namaTampil(S.unit), k = S.identitas;
      const blob = buatXlsx({
        namaSheet: masuk ? 'Surat Masuk' : 'Surat Keluar',
        judul: masuk ? 'REGISTER SURAT MASUK' : 'REGISTER SURAT KELUAR',
        sub: [nm + (nm !== S.unit ? ' (' + S.unit + ')' : '') + ' \u00B7 ' + (k.nama_yayasan || 'Yayasan Masjid Panglima Besar Soedirman'),
          ringkasFilter(f) + ' \u00B7 ' + fmtAngka(list.length) + ' surat \u00B7 urutan terbaru di atas',
          'Diekspor ' + fmtWaktu(Date.now()) + ' oleh ' + labelSaya() + ' dari ' + (k.nama_aplikasi || 'Aplikasi Surat Terpusat') + (S.adaLagi ? ' \u00B7 surat lebih lama yang belum dimuat tidak ikut' : '')],
        kolom: data.kolom, baris: data.baris
      });
      const nama = 'surat-' + kotak + '-' + String(S.profil.kode || 'unit').replace(/[^A-Za-z0-9-]/g, '') + '-' + isoHari() + '.xlsx';
      unduhBlob(blob, nama);
      toast('Berkas Excel dibuat', nama + ' \u00B7 ' + fmtAngka(list.length) + ' surat' + (S.adaLagi ? '. Surat lama yang belum dimuat tidak ikut; klik "Muat surat lebih lama" bila perlu.' : '.'), 'success');
      api('catatCetak', S.token, { ekspor: true, target: 'Ekspor Excel surat ' + kotak, ket: list.length + ' surat; ' + ringkasFilter(f) }).catch(() => {});
    } catch (e) { console.error(e); toast('Gagal membuat berkas Excel', pesanError(e), 'danger'); }
    finally { sibuk(btn, false); }
  }, 30);
}

function bunyi() {
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = bunyi.ctx || (bunyi.ctx = new C());
    [0, .16].forEach((t, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = i ? 1046 : 784; o.type = 'sine';
      g.gain.setValueAtTime(.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(.18, ctx.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + t + .22);
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .25);
    });
  } catch (e) {   }
}

function pasangKekuatan(input, wadah) {
  const render = () => {
    const v = input.value, aturan = [v.length >= 8, /[A-Z]/.test(v) && /[a-z]/.test(v), /\d/.test(v), /[^A-Za-z0-9]/.test(v)];
    const skor = aturan.filter(Boolean).length, kelas = skor <= 1 ? 'lemah' : skor <= 2 ? 'sedang' : 'kuat';
    const label = !v ? '\u2014' : ['SANGAT LEMAH', 'LEMAH', 'SEDANG', 'KUAT', 'SANGAT KUAT'][skor];
    wadah.innerHTML = `<div class="strength-bars ${kelas}">${[0, 1, 2, 3].map(i => `<span class="${i < skor ? 'on' : ''}"></span>`).join('')}</div>
      <div class="strength-meta"><span>Indikator kekuatan</span><span>${label} (${skor}/4)</span></div>
      <div class="strength-rules">${['Min 8 karakter', 'Besar & kecil', 'Angka (0-9)', 'Karakter khusus'].map((t, i) => `<span class="${aturan[i] ? 'on' : ''}"><i class="bi ${aturan[i] ? 'bi-check-lg' : 'bi-dot'}"></i>${t}</span>`).join('')}</div>`;
  };
  input.addEventListener('input', render); render();
}
function cekSandi(v) {
  if (v.length < 8) return 'Password minimal 8 karakter.';
  if (!/[A-Z]/.test(v) || !/[a-z]/.test(v) || !/\d/.test(v)) return 'Password wajib kombinasi huruf besar, huruf kecil, dan angka.';
  return '';
}
function sandiAcak(n) {
  const h = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', a = new Uint8Array(n || 10);
  crypto.getRandomValues(a); const s = Array.from(a, b => h[b % h.length]).join('');
  return cekSandi(s) ? sandiAcak(n) : s;
}
function salin(teks) {
  const ok = () => toast('Disalin', 'Teks disalin ke papan klip.', 'success');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(ok, () => salinLama(teks, ok));
  else salinLama(teks, ok);
}
function salinLama(teks, ok) { const t = document.createElement('textarea'); t.value = teks; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('Gagal menyalin', 'Salin manual teks tersebut.', 'warning'); } t.remove(); }



let sudahInit = false;
function init() {
  if (sudahInit) return;
  sudahInit = true;
  const langkah = (nama, fn) => { try { fn(); } catch (e) { console.error('[init] ' + nama, e); laporGalat(nama + ': ' + pesanError(e)); } };
  try {
    langkah('bootCache', () => { const c = store.json('yasma_boot_publik'); if (c && c.siap) { BOOT = c; Object.assign(S.konfig, c.konfig || {}); } });
    langkah('identitas', () => terapkanIdentitas(Object.assign({}, BOOT.konfig || {})));
    langkah('event', pasangEventGlobal);
    let token = null;
    langkah('sesi', () => { token = store.get('yasma_token', true); });
    if (token && window.YasmaApi && window.YasmaApi.siap()) {
      S.token = token;
      langkah('pulihkan', () => {
        const cache = store.json('yasma_boot', true);
        if (cache && cache.profil) { hidrasi(cache, true); masukAplikasi(true); }
        else tampilShellKerangka(store.get('yasma_peran', true) || 'Unit');
      });
      muatBootstrap(true);
      muatBoot();
    } else {
      langkah('login', () => tampilLogin());
      muatBoot().then(() => { if (!S.profil && !byId('loginView').hidden) isiDaftarAkun(); });
    }
  } finally {
    window.__YASMA_SIAP__ = true;
    setTimeout(() => { const sp = byId('splash'); if (!sp) return; sp.classList.add('out'); setTimeout(() => sp.remove(), 320); }, 60);
  }
}
function laporGalat(m) { try { toast('Sebagian fitur gagal dimuat', m, 'danger', { lama: 12000 }); } catch (e) {   } }

function terapkanIdentitas(k) {
  const app = k.nama_aplikasi || 'Aplikasi Surat Terpusat', singkat = k.singkatan || 'YASMA PB. Soedirman', penuh = k.nama_yayasan || 'Yayasan Masjid Panglima Besar Soedirman';
  $$('.js-app-name').forEach(e => e.textContent = app);
  $$('.js-org-short').forEach(e => e.textContent = singkat);
  $$('.js-org-full').forEach(e => e.textContent = penuh);
  $$('.js-year').forEach(e => e.textContent = new Date().getFullYear());
  $$('.js-ver').forEach(e => e.textContent = 'v' + (k.versi || S.konfig.versi || '1.0'));
  $$('.js-maxmb').forEach(e => e.textContent = S.konfig.maks_mb);
  $$('.js-maxfile').forEach(e => e.textContent = S.konfig.maks_lampiran);
  $$('.js-poll').forEach(e => e.textContent = S.konfig.polling_detik);
  S.logoYys = k.logo_url && /^https:[/][/]/.test(k.logo_url) ? k.logo_url : '';
  S.singkatYys = singkat;
  $$('.js-emblem').forEach(e => isiEmblemYayasan(e));
  document.title = app + ' \u2014 ' + singkat;
  const note = byId('lgSesiNote');
  if (note) note.textContent = 'Sesi otomatis berakhir setelah ' + (S.konfig.sesi_idle_menit || 30) + ' menit tidak aktif. Token tidak disimpan permanen di perangkat bersama.';
  terapkanIdentUnit();
}

const EMBLEM_AWAL = new Map();
const SVG_LAMBANG = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="13" y="13" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="13" y="13" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" transform="rotate(45 24 24)"/><circle cx="24" cy="24" r="4.2" fill="currentColor"/></svg>';
function htmlEmblemYayasan(alt) { return S.logoYys ? `<img src="${attr(S.logoYys)}" alt="${attr(alt || 'Logo ' + S.singkatYys)}">` : SVG_LAMBANG; }
function isiEmblemYayasan(e) {
  if (!EMBLEM_AWAL.has(e)) EMBLEM_AWAL.set(e, e.innerHTML);
  e.classList.remove('emblem-unit');
  e.innerHTML = S.logoYys ? htmlEmblemYayasan() : EMBLEM_AWAL.get(e);
}

const LOGO = { img: new Map(), muat: new Map() };
function unitSaya(unit) { return S.peran === 'Unit' && !!S.profil && unit === S.unit; }
function namaTampil(unit) {
  if (!unit) return '';
  if (unitSaya(unit)) return (S.identUnit && S.identUnit.nama) || unit;
  return (S.unitMap[unit] && S.unitMap[unit].t) || unit;
}
function logoUnitFile(unit) {
  if (!unit) return '';
  if (unitSaya(unit)) return (S.identUnit && S.identUnit.logo) || '';
  return (S.unitMap[unit] && S.unitMap[unit].lg) || '';
}
function simpanLogoLokal(file, data) {
  try { Object.keys(localStorage).filter(k => k.indexOf('yasma_logo_') === 0 && k !== 'yasma_logo_' + file).forEach(k => localStorage.removeItem(k)); } catch (e) {   }
  store.set('yasma_logo_' + file, data);
}
function muatLogo(unit) {
  const file = logoUnitFile(unit);
  if (!file) return Promise.resolve('');
  if (LOGO.img.has(file)) return Promise.resolve(LOGO.img.get(file));
  const lokal = store.get('yasma_logo_' + file);
  if (lokal) { LOGO.img.set(file, lokal); return Promise.resolve(lokal); }
  if (!S.token) return Promise.resolve('');
  if (LOGO.muat.has(file)) return LOGO.muat.get(file);
  const p = api('ambilLogoUnit', S.token, unit)
    .then(res => {
      LOGO.muat.delete(file);
      const d = res.success && res.data ? res.data.data : '';
      if (!d) return '';
      LOGO.img.set(res.data.file, d);
      if (unitSaya(unit)) simpanLogoLokal(res.data.file, d);
      return d;
    })
    .catch(() => { LOGO.muat.delete(file); return ''; });
  LOGO.muat.set(file, p);
  return p;
}
function isiLogo(root) {
  return Promise.all($$('img[data-logo-unit]', root).map(img => {
    if (img.classList.contains('siap')) return Promise.resolve();
    return muatLogo(img.dataset.logoUnit).then(d => {
      if (d) { img.src = d; img.classList.add('siap'); return; }
      const em = img.closest('.emblem');
      if (em) { em.classList.remove('emblem-unit'); em.innerHTML = htmlEmblemYayasan(); }
    });
  }));
}
function imgLogoUnit(unit, alt) {
  const d = LOGO.img.get(logoUnitFile(unit));
  return `<img data-logo-unit="${attr(unit)}" alt="${attr(alt || 'Logo ' + namaTampil(unit))}"${d ? ` src="${attr(d)}" class="siap"` : ''}>`;
}
function terapkanIdentUnit() {
  const unit = S.peran === 'Unit' && S.profil ? S.unit : '';
  const id = unit ? S.identUnit : null, kustom = !!(id && id.nama);
  $$('.js-unit-nama').forEach(e => { e.textContent = unit ? namaTampil(unit) : (S.unit || '\u2014'); });
  const org = byId('sbOrg'), sub = byId('sbSub'), em = byId('sbEmblem');
  if (org) { org.textContent = kustom ? id.nama : S.singkatYys; org.title = kustom ? id.nama : ''; org.classList.toggle('panjang', kustom && id.nama.length > 24); }
  if (sub) sub.textContent = S.peran === 'Admin' && S.profil ? 'Panel Administrator' : kustom ? S.singkatYys : 'Persuratan Terpusat';
  if (!em) return;
  const f = unit ? logoUnitFile(unit) : '';
  if (!f) { if (em.classList.contains('emblem-unit') || !EMBLEM_AWAL.has(em)) isiEmblemYayasan(em); return; }
  if (em.dataset.logo === f && em.querySelector('img.siap')) return;
  em.dataset.logo = f;
  if (LOGO.img.has(f)) { em.classList.add('emblem-unit'); em.innerHTML = imgLogoUnit(unit); return; }
  muatLogo(unit).then(d => {
    if (!d || em.dataset.logo !== f || logoUnitFile(S.unit) !== f) return;
    em.classList.add('emblem-unit'); em.innerHTML = imgLogoUnit(unit);
  });
}

function tampilLogin(pesan) {
  byId('appShell').hidden = true;
  byId('loginView').hidden = false;
  document.body.className = '';
  isiDaftarAkun();
  const al = byId('lgAlert');
  if (pesan) { al.hidden = false; al.innerHTML = `<i class="bi bi-exclamation-triangle"></i><div><span class="ai-h">Sesi berakhir</span>${esc(pesan)}</div>`; }
  else al.hidden = true;
  setTimeout(() => { const sel = byId('lgAkun'); if (!sel.disabled) (sel.value ? byId('lgPass') : sel).focus(); }, 50);
}
function isiDaftarAkun() {
  const sel = byId('lgAkun'), nr = byId('loginNotReady'), form = byId('loginForm'), btn = byId('lgBtn');
  if (!BOOT.siap) {
    nr.hidden = false;
    if (BOOT.memuat) {
      nr.className = 'alert-inline alert-info-soft';
      nr.innerHTML = '<span class="spinner-border spinner-border-sm mt-1" aria-hidden="true"></span><div><span class="ai-h">Menghubungkan ke server</span>Memuat daftar akun dari Apps Script\u2026</div>';
      form.hidden = false; sel.disabled = true; btn.disabled = true;
      sel.innerHTML = '<option value="" selected>Memuat daftar akun\u2026</option>';
      return;
    }
    nr.className = 'alert-inline alert-warn';
    nr.innerHTML = `<i class="bi bi-tools"></i><div><span class="ai-h">${esc(BOOT.judul || 'Aplikasi belum siap')}</span>${esc(BOOT.pesan || '')}${BOOT.konfigurasi ? '' : '<div class="mt-2"><button type="button" class="btn btn-outline btn-sm" id="lgCobaLagi"><i class="bi bi-arrow-clockwise"></i> Coba lagi</button></div>'}</div>`;
    form.hidden = true;
    if (BOOT.konfigurasi) return;
    byId('lgCobaLagi').onclick = () => { BOOT = { siap: false, memuat: true }; isiDaftarAkun(); muatBoot().then(() => { if (!S.profil) isiDaftarAkun(); }); };
    return;
  }
  nr.hidden = true; form.hidden = false; sel.disabled = false; btn.disabled = false;
  const dipilih = sel.value;
  const akun = BOOT.akun || [];
  const admin = akun.filter(a => a.p === 'Admin'), unit = akun.filter(a => a.p !== 'Admin');
  const posisi = {}, rank = { Pimpinan: 0, Operator: 1 };
  unit.forEach((a, i) => { const u = a.u || a.n; if (!(u in posisi)) posisi[u] = i; });
  unit.sort((x, y) => (posisi[x.u || x.n] - posisi[y.u || y.n]) || ((x.l in rank ? rank[x.l] : 2) - (y.l in rank ? rank[y.l] : 2)));
  const grup = { Sekolah: [], Majelis: [], Yayasan: [], Lainnya: [] };
  unit.forEach(u => (grup[u.g] || grup.Lainnya).push(u));
  sel.innerHTML = '<option value="" disabled selected>Pilih akun unit (Pimpinan / Operator) atau Admin Surat\u2026</option>' +
    (admin.length ? `<optgroup label="Administrasi">${admin.map(a => `<option>${esc(a.n)}</option>`).join('')}</optgroup>` : '') +
    Object.keys(grup).filter(g => grup[g].length).map(g => `<optgroup label="Unit ${g}">${grup[g].map(a => `<option>${esc(a.n)}</option>`).join('')}</optgroup>`).join('');
  const terakhir = dipilih || store.get('yasma_akun_terakhir');
  if (terakhir && akun.some(a => a.n === terakhir)) sel.value = terakhir;
}

async function prosesLogin(ev) {
  ev.preventDefault();
  const akun = byId('lgAkun').value, pass = byId('lgPass').value, al = byId('lgAlert'), btn = byId('lgBtn');
  const tampilGalat = (judul, m) => { al.hidden = false; al.innerHTML = `<i class="bi bi-exclamation-triangle"></i><div><span class="ai-h">${esc(judul)}</span>${esc(m)}</div>`; };
  byId('lgAkun').classList.toggle('is-invalid', !akun); byId('lgPass').classList.toggle('is-invalid', !pass);
  if (!akun || !pass) { tampilGalat('Data belum lengkap', 'Pilih akun dan isi password.'); return; }
  sibuk(btn, true, 'Memverifikasi\u2026');
  try {
    const res = await api('login', akun, pass, { ua: infoPerangkat(), platform: navigator.platform || '' });
    if (!res.success) { tampilGalat(res.code === 'TERKUNCI' ? 'Akun terkunci sementara' : 'Peringatan kredensial', res.message); byId('lgPass').select(); return; }
    store.set('yasma_akun_terakhir', akun);
    S.token = res.data.token; store.set('yasma_token', S.token, true);
    S.peran = res.data.peran; S.unit = res.data.unit; store.set('yasma_peran', S.peran, true);
    byId('lgPass').value = ''; al.hidden = true;
    if (res.data.wajibGanti) { byId('wLama').value = pass; tampilWajibGanti(); return; }
    tampilShellKerangka(res.data.peran, res.data.unit);
    await muatBootstrap(false);
  } catch (e) { if (!e.ditangani) tampilGalat('Gagal terhubung', pesanError(e)); }
  finally { sibuk(btn, false); }
}

function infoPerangkat() {
  const ua = navigator.userAgent;
  const b = /Edg[/]/.test(ua) ? 'Edge' : /Chrome[/]/.test(ua) ? 'Chrome' : /Firefox[/]/.test(ua) ? 'Firefox' : /Safari[/]/.test(ua) ? 'Safari' : 'Peramban';
  const o = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Perangkat';
  return b + ' \u00B7 ' + o + (/Mobi/.test(ua) ? ' (HP)' : '');
}

function tampilShellKerangka(peran, unit) {
  byId('loginView').hidden = true;
  byId('appShell').hidden = false;
  peran = peran || (S.profil && S.profil.peran) || S.peran || 'Unit';
  document.body.className = 'peran-' + peran;
  S.peran = peran; S.unit = unit || S.unit;
  renderNav();
  $$('.js-unit').forEach(e => e.textContent = S.unit || '\u2026');
  $$('.js-unit-nama').forEach(e => e.textContent = S.unit || '\u2026');
  const sk = '<div class="card"><span class="sk" style="height:18px;width:40%"></span><span class="sk mt-3" style="height:12px;width:90%"></span><span class="sk mt-2" style="height:12px;width:75%"></span><span class="sk mt-2" style="height:12px;width:82%"></span></div>';
  if (peran === 'Admin') { byId('dashKpi').innerHTML = sk; tampilkanView('dashboard'); }
  else { byId('berandaKpi').innerHTML = sk; byId('berandaMasuk').innerHTML = sk; tampilkanView('beranda'); }
}

async function muatBootstrap(diam) {
  if (!diam) setSync('sync');
  try {
    const res = await api('getBootstrap', S.token);
    if (!res.success) { toast('Gagal memuat data', res.message, 'danger'); setSync('off'); return; }
    if (res.data.terbatas) { S.profil = res.data.profil; tampilWajibGanti(); return; }
    const pertama = !S.profil;
    hidrasi(res.data, false);
    if (pertama || !S.view) masukAplikasi(false); else { siapkanShell(); renderUlang(); }
    setSync('ok');
  } catch (e) {
    if (e.ditangani) return;
    setSync('off');
    if (!S.profil) { store.del('yasma_token', true); tampilLogin(pesanError(e)); }
    else toast('Mode luring', 'Data terakhir ditampilkan. ' + pesanError(e), 'warning');
  }
}

function hidrasi(d, dariCache) {
  S.profil = d.profil; S.peran = d.profil.peran; S.unit = d.profil.unit;
  S.konfig = Object.assign(S.konfig, d.konfig || {});
  S.identitas = d.identitas || {};
  S.unitList = d.unitList || [];
  S.unitMap = {}; S.unitList.forEach(u => S.unitMap[u.n] = u);
  if (!dariCache) S.serverTs = d.serverTs || 0; else S.serverTs = d.serverTs || 0;
  if (S.peran === 'Admin') {
    S.adm = { tahun: d.tahun, tahunList: d.tahunList || [d.tahun], rekap: d.rekap || [], akun: d.akun || [], logAdmin: d.logAdmin || [], penyimpanan: d.penyimpanan, samar: d.samarRahasia };
  } else {
    const lama = S.surat;
    S.surat = new Map();
    (d.surat || []).forEach(s => S.surat.set(s.id, s));
    lama.forEach((s, id) => { if (s._pending && !S.surat.has(id)) S.surat.set(id, s); });
    S.notif = (d.notif || []).map(n => S.notifLokal.has(n.id) ? Object.assign(n, { r: true }) : n);
    S.log = d.log || []; S.sesi = d.sesi || []; S.adaLagi = !!d.adaLagi;
    S.disposisi = d.disposisi || []; S.ttd = d.ttd || null; S.urlApp = d.urlApp || '';
    S.identUnit = d.identUnit || null;
  }
  terapkanIdentitas(Object.assign({}, S.identitas, { versi: S.konfig.versi }));
  if (!dariCache) simpanCache();
}
const simpanCache = debounce(() => {
  if (!S.profil) return;
  const d = { profil: S.profil, konfig: S.konfig, identitas: S.identitas, unitList: S.unitList, serverTs: S.serverTs };
  if (S.peran === 'Admin') Object.assign(d, { tahun: S.adm.tahun, tahunList: S.adm.tahunList, rekap: S.adm.rekap, akun: S.adm.akun, logAdmin: S.adm.logAdmin, penyimpanan: S.adm.penyimpanan, samarRahasia: S.adm.samar });
  else Object.assign(d, { surat: Array.from(S.surat.values()).filter(s => !s._pending), notif: S.notif, log: S.log, sesi: S.sesi, adaLagi: S.adaLagi, disposisi: S.disposisi, ttd: S.ttd, urlApp: S.urlApp, identUnit: S.identUnit });
  if (!store.set('yasma_boot', JSON.stringify(d), true)) store.del('yasma_boot', true);
}, 600);

function masukAplikasi(dariCache) {
  byId('loginView').hidden = true;
  byId('appShell').hidden = false;
  siapkanShell();
  const awal = S.peran === 'Admin' ? 'dashboard' : 'beranda';
  go(S.view && byId('v-' + S.view) ? S.view : awal, S.params || {}, { tanpaRiwayat: true });
  mulaiPolling();
  mulaiIdle();
  if (!dariCache && S.peran === 'Unit') {
    const belum = hitungBelumDibaca();
    if (belum) toast('Selamat datang, ' + labelSaya(), 'Ada ' + belum + ' surat masuk belum dibaca.', 'info');
  }
}

function siapkanShell() {
  document.body.className = 'peran-' + S.peran + (S.view ? ' view-' + S.view : '');
  const lv = levelSaya();
  byId('sbRole').textContent = S.peran === 'Admin' ? 'PANEL PUSAT (ADMIN)' : lv ? 'PANEL ' + lv.toUpperCase() : 'PANEL UNIT';
  byId('sbSub').textContent = S.peran === 'Admin' ? 'Panel Administrator' : 'Persuratan Terpusat';
  byId('sbUnit').textContent = S.unit;
  byId('ucName').textContent = S.unit;
  byId('ucRole').textContent = S.peran === 'Admin' ? 'Admin Surat \u00B7 Panel Pusat' : lv ? (lv === 'Pimpinan' ? 'Pimpinan Unit' : 'Operator Tata Usaha') + (S.profil.pic ? ' \u00B7 ' + S.profil.pic : '') : (S.profil.pic ? S.profil.pic : 'Operator Tata Usaha');
  const hl = byId('heroLevel'); if (hl) { hl.hidden = !lv; hl.textContent = lv ? 'AKUN ' + lv.toUpperCase() : ''; }
  byId('ucAvatar').textContent = S.peran === 'Admin' ? 'AS' : inisial(S.profil.kode || S.unit);
  $$('.js-unit').forEach(e => e.textContent = S.unit);
  $$('.js-kode').forEach(e => e.textContent = S.profil.kode || '');
  byId('heroTa').textContent = 'T.A. ' + tahunAjaran();
  terapkanIdentUnit();
  renderNav();
  perbaruiLencana();
}

function sesiHabis(pesan) {
  if (!S.token && byId('appShell').hidden) return;
  bersihkanSesi();
  ['mWajib', 'mHapus', 'mDisposisi', 'mPreview', 'mAkun', 'mReset', 'mKonfirm', 'mTtd', 'mIdent'].forEach(id => { const m = bootstrap.Modal.getInstance(byId(id)); if (m) m.hide(); });
  tampilLogin(pesan || 'Sesi Anda telah berakhir. Silakan login kembali.');
}
function bersihkanSesi() {
  hentiPolling(); clearInterval(S.idleTimer);
  S.token = null; S.profil = null; S.view = null; S.params = {}; S.history = [];
  S.surat = new Map(); S.notif = []; S.adm = null; S.kunciLokal = {}; S.notifLokal = new Set();
  S.disposisi = []; S.ttd = null; TTD.img.clear(); TTD.muat.clear();
  S.identUnit = null; LOGO.muat.clear(); terapkanIdentUnit();
  S.blob.forEach(b => b.url && URL.revokeObjectURL(b.url)); S.blob.clear();
  store.del('yasma_token', true); store.del('yasma_boot', true); store.del('yasma_peran', true);
  Object.values(grafik).forEach(c => c && c.destroy && c.destroy()); for (const k in grafik) delete grafik[k];
}
async function keluar() {
  const t = S.token;
  if (t) api('logout', t).catch(() => {});
  bersihkanSesi();
  tampilLogin();
  toast('Anda telah keluar', 'Sampai jumpa. Sesi pada perangkat ini sudah ditutup.', 'success');
}

function tampilWajibGanti() {
  if (!S.token) return;
  const m = byId('mWajib');
  if (!m.dataset.siap) { pasangKekuatan(byId('wBaru'), byId('wStrength')); m.dataset.siap = '1'; }
  modal('mWajib').show();
  setTimeout(() => (byId('wLama').value ? byId('wBaru') : byId('wLama')).focus(), 300);
}
async function simpanWajibGanti(ev) {
  ev.preventDefault();
  const lama = byId('wLama').value, baru = byId('wBaru').value, ulang = byId('wUlang').value, err = byId('wErr');
  err.textContent = cekSandi(baru) || (baru !== ulang ? 'Konfirmasi password tidak sama.' : '') || (baru === lama ? 'Password baru harus berbeda dari password lama.' : '');
  if (err.textContent) return;
  const btn = byId('btnWajib'); sibuk(btn, true, 'Menyimpan\u2026');
  try {
    const res = await api('gantiPassword', S.token, lama, baru);
    if (!res.success) { err.textContent = res.message; return; }
    S.token = res.data.token; store.set('yasma_token', S.token, true);
    ['wLama', 'wBaru', 'wUlang'].forEach(id => byId(id).value = '');
    modal('mWajib').hide();
    toast('Password diperbarui', 'Selamat bekerja. Gunakan password baru pada login berikutnya.', 'success');
    tampilShellKerangka(S.profil ? S.profil.peran : S.peran, S.profil ? S.profil.unit : S.unit);
    S.profil = null;
    await muatBootstrap(false);
  } catch (e) { if (!e.ditangani) err.textContent = pesanError(e); }
  finally { sibuk(btn, false); }
}


const MENU = {
  Unit: [
    { v: 'beranda', i: 'bi-house-door', l: 'Beranda', s: 'Beranda' },
    { v: 'masuk', i: 'bi-inbox', l: 'Surat Masuk', s: 'Masuk', c: 'masuk' },
    { v: 'keluar', i: 'bi-send', l: 'Surat Keluar', s: 'Keluar', c: 'keluar' },
    { v: 'notif', i: 'bi-bell', l: 'Notifikasi', s: 'Notif', c: 'notif' },
    { v: 'pengaturan', i: 'bi-gear', l: 'Pengaturan', s: 'Setelan' }
  ],
  Admin: [
    { v: 'dashboard', i: 'bi-bar-chart-line', l: 'Dashboard Analitik', s: 'Dashboard' },
    { v: 'rekap', i: 'bi-table', l: 'Rekap Surat Global', s: 'Rekap', c: 'rekap' },
    { v: 'laporan', i: 'bi-printer', l: 'Laporan & Ekspor', s: 'Laporan' },
    { v: 'akun', i: 'bi-people', l: 'Kelola Akun Unit', s: 'Akun', c: 'akun' },
    { v: 'adminset', i: 'bi-shield-lock', l: 'Pengaturan Admin', s: 'Setelan' }
  ]
};

function renderNav() {
  const menu = MENU[S.peran] || MENU.Unit;
  byId('sbNav').innerHTML = `<div class="sb-sec">${S.peran === 'Admin' ? 'Analitik & Pengawasan' : 'Navigasi Utama'}</div>` +
    menu.map(m => `<button type="button" class="nav-item" data-go="${m.v}" data-nav="${m.v}"><i class="bi ${m.i}"></i><span>${m.l}</span>${m.c ? `<span class="nav-count" data-count="${m.c}" hidden>0</span>` : ''}</button>`).join('');
  byId('bottomNav').innerHTML = menu.map(m => `<button type="button" class="bn" data-go="${m.v}" data-nav="${m.v}" aria-label="${m.l}"><i class="bi ${m.i}"></i><span>${m.s}</span>${m.c === 'masuk' || m.c === 'notif' ? `<span class="count-badge" data-count-b="${m.c}" hidden>0</span>` : ''}</button>`).join('');
}

function tampilkanView(v) {
  $$('.view').forEach(s => s.classList.toggle('active', s.id === 'v-' + v));
  const sec = byId('v-' + v);
  if (sec) { byId('tbTitle').textContent = sec.dataset.title || ''; byId('tbCrumb').textContent = (S.peran === 'Admin' ? '' : (S.unit ? S.unit.toUpperCase() + ' / ' : '')) + (sec.dataset.crumb || ''); }
  document.body.className = document.body.className.replace(/\bview-\S+/g, '').trim() + ' view-' + v;
  const navAktif = ['detail', 'cetak'].includes(v) ? (S.params.dari || 'masuk') : v === 'tulis' ? (S.params.mode === 'balas' ? 'masuk' : 'keluar') : v;
  $$('[data-nav]').forEach(n => n.classList.toggle('active', n.dataset.nav === navAktif));
}

function go(v, p, o) {
  p = p || {}; o = o || {};
  if (!byId('v-' + v)) return;
  if (S.peran === 'Admin' && ['beranda', 'masuk', 'keluar', 'detail', 'tulis', 'notif', 'pengaturan', 'cetak'].includes(v)) v = 'dashboard';
  if (S.peran === 'Unit' && ['dashboard', 'rekap', 'laporan', 'akun', 'adminset'].includes(v)) v = 'beranda';
  if (S.view === 'tulis' && v !== 'tulis') tulisSimpanDrafDiam();
  if (S.view && !o.tanpaRiwayat && !(S.view === v && JSON.stringify(S.params) === JSON.stringify(p))) {
    S.history.push({ v: S.view, p: S.params });
    if (S.history.length > 30) S.history.shift();
  }
  S.view = v; S.params = p;
  tampilkanView(v);
  tutupSidebar();
  window.scrollTo(0, 0);
  renderView(v);
}
function kembali(cadangan) {
  const prev = S.history.pop();
  if (prev) go(prev.v, prev.p, { tanpaRiwayat: true });
  else go(cadangan || (S.peran === 'Admin' ? 'dashboard' : 'beranda'), {}, { tanpaRiwayat: true });
}
function renderView(v) {
  const r = {
    beranda: renderBeranda, masuk: renderMasuk, keluar: renderKeluar, detail: renderDetail, tulis: bukaTulis,
    notif: renderNotif, pengaturan: renderPengaturan, cetak: renderCetak,
    dashboard: renderDashboard, rekap: renderRekap, laporan: renderLaporan, akun: renderAkun, adminset: renderAdminSet
  }[v];
  try { r && r(S.params); } catch (e) { console.error(e); toast('Gagal menampilkan halaman', pesanError(e), 'danger'); }
}
function renderUlang() {
  perbaruiLencana();
  if (!S.view || S.view === 'tulis' || S.view === 'cetak' || S.view === 'adminset') return;
  if (S.view === 'pengaturan') { renderPengaturanDinamis(); return; }
  renderView(S.view);
}

function bukaSidebar() { byId('sidebar').classList.add('open'); byId('sbBackdrop').classList.add('show'); }
function tutupSidebar() { byId('sidebar').classList.remove('open'); byId('sbBackdrop').classList.remove('show'); }

function toggleTema() {
  const gelap = document.documentElement.getAttribute('data-theme') !== 'dark';
  document.body.classList.add('theme-anim');
  document.documentElement.setAttribute('data-theme', gelap ? 'dark' : 'light');
  store.set('yasma_tema', gelap ? 'dark' : 'light');
  byId('btnTheme').innerHTML = `<i class="bi ${gelap ? 'bi-sun' : 'bi-moon-stars'}"></i>`;
  const pg = byId('prefGelap'); if (pg) pg.checked = gelap;
  setTimeout(() => document.body.classList.remove('theme-anim'), 300);
  if (S.view === 'dashboard') renderGrafik();
}

function pasangEventGlobal() {
  document.addEventListener('click', ev => {
    const g = ev.target.closest('[data-go]');
    if (g) { ev.preventDefault(); const p = g.dataset.params ? JSON.parse(g.dataset.params) : {}; go(g.dataset.go, p); return; }
    const eye = ev.target.closest('[data-eye]');
    if (eye) { const inp = byId(eye.dataset.eye); const t = inp.type === 'password'; inp.type = t ? 'text' : 'password'; eye.innerHTML = `<i class="bi ${t ? 'bi-eye-slash' : 'bi-eye'}"></i>`; eye.setAttribute('aria-label', t ? 'Sembunyikan password' : 'Tampilkan password'); }
    if (!ev.target.closest('.tb-search')) byId('qsResults').hidden = true;
  });
  byId('loginForm').addEventListener('submit', prosesLogin);
  byId('formWajib').addEventListener('submit', simpanWajibGanti);
  byId('btnWajibKeluar').addEventListener('click', () => { modal('mWajib').hide(); keluar(); });
  byId('btnLogout').addEventListener('click', async () => { if (await konfirmasi('Keluar Sistem', '<p class="mb-0">Akhiri sesi di perangkat ini? Draf surat yang belum dikirim tetap tersimpan di perangkat.</p>', { ya: 'Keluar' })) keluar(); });
  byId('btnMenu').addEventListener('click', bukaSidebar);
  byId('btnSbClose').addEventListener('click', tutupSidebar);
  byId('sbBackdrop').addEventListener('click', tutupSidebar);
  byId('btnTheme').addEventListener('click', toggleTema);
  byId('btnTheme').innerHTML = `<i class="bi ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'bi-sun' : 'bi-moon-stars'}"></i>`;
  byId('btnSync').addEventListener('click', () => sinkronManual());
  byId('btnBell').addEventListener('show.bs.dropdown', renderBell);
  const qs = byId('qsInput');
  qs.addEventListener('input', debounce(() => cariCepat(qs.value), 90));
  qs.addEventListener('focus', () => qs.value && cariCepat(qs.value));
  qs.addEventListener('keydown', navCariCepat);
  document.addEventListener('keydown', ev => {
    if (ev.key === '/' && S.peran === 'Unit' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.querySelector('.modal.show')) { ev.preventDefault(); qs.focus(); }
    if (ev.key === 'Escape') { byId('qsResults').hidden = true; tutupSidebar(); }
  });
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(e => document.addEventListener(e, aktivitas, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.token) pollSekarang(true); });
  window.addEventListener('online', () => S.token && pollSekarang(true));
  window.addEventListener('offline', () => setSync('off'));
  pasangEventUnit();
  pasangEventAdmin();
}


function mulaiPolling() {
  hentiPolling();
  const dtk = Math.max(15, +S.konfig.polling_detik || 30) * (S.peran === 'Admin' ? 2 : 1);
  S.pollTimer = setInterval(() => pollSekarang(false), dtk * 1000);
}
function hentiPolling() { clearInterval(S.pollTimer); S.pollTimer = null; }

async function pollSekarang(paksa) {
  if (!S.token || !S.profil || S.polling) return;
  if (!paksa && (document.hidden || (S.peran === 'Unit' && !pref('poll', true)))) return;
  S.polling = true;
  const aktif = Date.now() - S.lastActivity < Math.max(60000, (+S.konfig.polling_detik || 30) * 1000 + 5000);
  try {
    const res = await api('poll', S.token, S.serverTs, aktif);
    if (!res.success) { setSync('off'); return; }
    const d = res.data;
    if (d.berubah) {
      if (S.peran === 'Admin') await muatAdmin(S.adm ? S.adm.tahun : null, true);
      else terapkanDelta(d);
    }
    S.serverTs = d.serverTs;
    setSync('ok');
  } catch (e) { if (!e.ditangani) setSync('off'); }
  finally { S.polling = false; }
}
async function sinkronManual() {
  const b = byId('btnSync'); sibuk(b, true, 'Sinkron\u2026');
  await pollSekarang(true);
  sibuk(b, false);
  toast('Data tersinkron', 'Kotak surat dan notifikasi sudah terbaru.', 'success');
}

function terapkanDelta(d) {
  const sebelum = new Set(kotakMasuk().filter(s => belumDibaca(s)).map(s => s.id));
  const now = Date.now();
  (d.surat || []).forEach(s => { if (!(S.kunciLokal[s.id] > now)) S.surat.set(s.id, s); });
  if (d.ids) {
    const ada = new Set(d.ids);
    Array.from(S.surat.keys()).forEach(id => { const s = S.surat.get(id); if (!ada.has(id) && !s._pending && !(S.kunciLokal[id] > now)) S.surat.delete(id); });
  }
  if (d.notif) S.notif = d.notif.map(n => S.notifLokal.has(n.id) ? Object.assign(n, { r: true }) : n);
  if (d.disposisi) S.disposisi = d.disposisi;
  if ('ttd' in d) S.ttd = d.ttd;
  if (d.unitList) { S.unitList = d.unitList; S.unitMap = {}; S.unitList.forEach(u => S.unitMap[u.n] = u); }
  if ('ident' in d) {
    const berubah = JSON.stringify(S.identUnit || null) !== JSON.stringify(d.ident || null);
    S.identUnit = d.ident || null;
    if (berubah) { terapkanIdentUnit(); if (S.view === 'pengaturan') renderIdentCard(); }
  }
  const baru = kotakMasuk().filter(s => belumDibaca(s) && !sebelum.has(s.id));
  if (baru.length) {
    const s = baru[0];
    toast(baru.length > 1 ? baru.length + ' surat masuk baru' : (s.jenis === 'Disposisi' ? 'Disposisi baru' : s.jenis === 'Balasan' ? 'Balasan diterima' : 'Surat masuk baru'),
      'Dari ' + s.dari + ': ' + (s.sifat === 'Rahasia' ? '[Rahasia] ' : '') + s.hal, s.sifat === 'Biasa' ? 'info' : 'warning',
      { aksi: 'Buka surat', onAksi: () => go('detail', { id: s.id, dari: 'masuk' }) });
    if (pref('bunyi', false)) bunyi();
  }
  simpanCache();
  renderUlang();
}

function aktivitas() {
  S.lastActivity = Date.now(); S.idleWarned = false;
  const idleMs = (+S.konfig.sesi_idle_menit || 30) * 60000;
  if (S.token && S.profil && Date.now() - S.lastApi > Math.min(idleMs / 3, 300000)) pollSekarang(true);
}
function mulaiIdle() {
  clearInterval(S.idleTimer);
  S.idleTimer = setInterval(() => {
    if (!S.token) return;
    const idleMs = (+S.konfig.sesi_idle_menit || 30) * 60000, diam = Date.now() - S.lastActivity;
    if (diam > idleMs) { api('logout', S.token).catch(() => {}); sesiHabis('Sesi berakhir otomatis setelah ' + S.konfig.sesi_idle_menit + ' menit tidak aktif.'); }
    else if (diam > idleMs - 60000 && !S.idleWarned) { S.idleWarned = true; toast('Sesi hampir berakhir', 'Tidak ada aktivitas. Sesi akan ditutup dalam 1 menit \u2014 klik di mana saja untuk melanjutkan.', 'warning', { lama: 15000 }); }
  }, 15000);
}


function perbaruiLencana() {
  const set = (k, n, warn) => {
    $$(`[data-count="${k}"]`).forEach(e => { e.hidden = !n; e.textContent = n > 99 ? '99+' : n; e.classList.toggle('warn', !!warn); });
    $$(`[data-count-b="${k}"]`).forEach(e => { e.hidden = !n; e.textContent = n > 99 ? '99+' : n; });
  };
  if (S.peran === 'Unit') {
    const nb = S.notif.filter(n => !n.r).length;
    set('masuk', hitungBelumDibaca(), true);
    set('keluar', 0);
    set('notif', nb, true);
    const bc = byId('bellCount'); bc.hidden = !nb; bc.textContent = nb > 99 ? '99+' : nb;
  } else if (S.adm) {
    set('rekap', S.adm.rekap.filter(r => !r.del).length);
    set('akun', S.adm.akun.length);
  }
}

function renderBell() {
  const list = S.notif.slice(0, 6), nb = S.notif.filter(n => !n.r).length;
  byId('bellMenu').innerHTML = `<div class="bell-head"><span>Notifikasi ${nb ? `<span class="chip chip-warn ms-1">${nb} baru</span>` : ''}</span>${nb ? '<button type="button" class="link-btn small" id="bellSemua">Tandai semua dibaca</button>' : ''}</div>
    <div class="bell-body">${list.length ? list.map(nfMini).join('') : '<div class="empty"><div class="empty-t">Belum ada notifikasi</div></div>'}</div>
    <button type="button" class="bell-foot" data-go="notif">Buka pusat notifikasi <i class="bi bi-arrow-right"></i></button>`;
  const b = byId('bellSemua'); if (b) b.onclick = () => { tandaiSemuaNotif(); renderBell(); };
  $$('#bellMenu [data-nf]').forEach(e => e.onclick = () => { bootstrap.Dropdown.getOrCreateInstance(byId('btnBell')).hide(); bukaNotif(e.dataset.nf); });
}

let qsHl = -1;
function cariCepat(q) {
  const box = byId('qsResults'); q = q.trim();
  if (!q || S.peran !== 'Unit') { box.hidden = true; return; }
  const hasil = Array.from(S.surat.values()).filter(s => !s._pending && cocok(q, s.no, s.hal, s.dari, s.ke.map(k => k.u).join(' ')))
    .sort((a, b) => b.at - a.at).slice(0, 8);
  qsHl = hasil.length ? 0 : -1;
  box.innerHTML = hasil.length ? hasil.map((s, i) => {
    const masuk = s.ke.some(k => k.u === S.unit);
    return `<button type="button" class="qs-item${i === 0 ? ' hl' : ''}" data-qs="${attr(s.id)}" data-asal="${masuk ? 'masuk' : 'keluar'}"><span class="qs-ic"><i class="bi ${masuk ? 'bi-inbox' : 'bi-send'}"></i></span><span class="min-w-0"><span class="qs-t d-block">${sorot(s.hal, q)}</span><span class="qs-s d-block">${sorot(s.no, q)} \u00B7 ${masuk ? 'dari ' + sorot(s.dari, q) : 'ke ' + esc(s.ke.length) + ' unit'} \u00B7 ${fmtTgl(s.tgl)}</span></span></button>`;
  }).join('') : `<div class="qs-empty">Tidak ada surat cocok untuk "<strong>${esc(q)}</strong>".</div>`;
  box.hidden = false;
  $$('[data-qs]', box).forEach(b => b.onclick = () => { box.hidden = true; byId('qsInput').value = ''; go('detail', { id: b.dataset.qs, dari: b.dataset.asal }); });
}
function navCariCepat(ev) {
  const items = $$('#qsResults [data-qs]');
  if (!items.length) return;
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); qsHl = (qsHl + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((e, i) => e.classList.toggle('hl', i === qsHl)); }
  if (ev.key === 'Enter' && qsHl >= 0) { ev.preventDefault(); items[qsHl].click(); }
}


const semuaSurat = () => Array.from(S.surat.values());
const kotakMasuk = () => semuaSurat().filter(s => s.ke.some(k => k.u === S.unit));
const kotakKeluar = () => semuaSurat().filter(s => s.dari === S.unit);
const milikSaya = s => s.ke.find(k => k.u === S.unit);
const belumDibaca = s => { const m = milikSaya(s); return !!m && m.st === 'Terkirim'; };
const hitungBelumDibaca = () => kotakMasuk().filter(belumDibaca).length;
function levelSaya() { return (S.profil && S.profil.level) || ''; }
function labelSaya() { return (S.profil && S.profil.label) || S.unit || ''; }
function bolehDisposisi() { return S.peran === 'Unit' && !!S.profil && S.profil.bolehDisp !== false && S.profil.level !== 'Operator'; }
function akunTtd() { return levelSaya() ? 'akun Pimpinan' : 'akun unit'; }
function statusGabungan(ke) { return ke.some(k => k.st === 'Dibalas') ? 'Dibalas' : ke.some(k => k.st === 'Dibaca') ? 'Dibaca' : 'Terkirim'; }
function kunciLokal(id, ms) { S.kunciLokal[id] = Date.now() + (ms || 8000); }

const badgeSifat = s => `<span class="sifat sifat-${esc(s)}">${esc(s)}</span>`;
function badgeStatus(st, label) { return `<span class="st st-${esc(st)}">${esc(label || st)}</span>`; }
function badgeJenis(j) { return j && j !== 'Surat baru' ? `<span class="jenis jenis-${esc(j)}">${j === 'Disposisi' ? '<i class="bi bi-signpost-split"></i>' : '<i class="bi bi-reply"></i>'}${esc(j)}</span>` : ''; }
function labelKe(s) { const n = s.ke.length; return n ? `<span class="unit-cell">${esc(s.ke[0].u)}</span>${n > 1 ? `<span class="unit-more">+${n - 1} unit</span>` : ''}` : '\u2014'; }
function ringkasBaca(s) { const n = s.ke.length, b = s.ke.filter(k => k.st !== 'Terkirim').length; return n > 1 ? `${b}/${n} dibaca` : (b ? 'Dibaca ' + fmtWaktu(s.ke[0].rd, true) : 'Belum diakses'); }
function statusKeluar(s) {
  if (s._gagal) return badgeStatus('Gagal', 'Gagal kirim');
  if (s._pending) return badgeStatus('Mengirim', 'Mengirim\u2026');
  return badgeStatus(s.st) + `<span class="st-sub">${esc(ringkasBaca(s))}</span>`;
}
function statusMasuk(s) {
  const m = milikSaya(s); if (!m) return '';
  if (m.st === 'Terkirim') return badgeStatus('Belum', 'Belum dibaca');
  return badgeStatus(m.st) + `<span class="st-sub">${m.st === 'Dibalas' ? 'Dibalas ' + fmtWaktu(m.rp, true) : 'Dibaca ' + fmtWaktu(m.rd, true)}</span>`;
}
function ikonLampiran(s) { return s.lamp && s.lamp.length ? `<span><i class="bi bi-paperclip"></i> ${s.lamp.length} berkas (${esc(Array.from(new Set(s.lamp.map(l => ext(l.n).toUpperCase()))).join(', '))})</span>` : ''; }
function kosong(judul, desk, ikon) { return `<div class="empty"><div class="empty-ic"><i class="bi ${ikon || 'bi-inbox'}"></i></div><div class="empty-t">${esc(judul)}</div>${desk ? `<div class="empty-d">${esc(desk)}</div>` : ''}</div>`; }


function renderBeranda() {
  const masuk = kotakMasuk(), keluar = kotakKeluar().filter(s => !s._pending);
  const belum = masuk.filter(belumDibaca), dibalas = masuk.filter(s => (milikSaya(s) || {}).st === 'Dibalas').length;
  const prioritas = belum.filter(s => s.sifat !== 'Biasa').length;
  const keluarDibaca = keluar.filter(s => s.st !== 'Terkirim').length;
  byId('berandaKpi').innerHTML = `
    <div class="kpi click" data-go="masuk"><div class="kpi-label">Surat Masuk <i class="bi bi-inbox"></i></div><div class="kpi-value">${fmtAngka(masuk.length)}</div><div class="kpi-foot"><span>Total diterima unit</span></div></div>
    <div class="kpi amber click" data-go="masuk" data-params='{"preset":"belum"}'><div class="kpi-label">Belum Dibaca <i class="bi bi-envelope-exclamation"></i></div><div class="kpi-value">${fmtAngka(belum.length)}</div><div class="kpi-foot"><span>Perlu segera ditinjau</span>${prioritas ? `<span class="chip chip-warn">${prioritas} prioritas</span>` : ''}</div></div>
    <div class="kpi blue click" data-go="keluar"><div class="kpi-label">Surat Keluar <i class="bi bi-send"></i></div><div class="kpi-value">${fmtAngka(keluar.length)}</div><div class="kpi-foot"><span>${fmtPersen(keluarDibaca, keluar.length, 0)} sudah diakses</span></div></div>
    <div class="kpi green"><div class="kpi-label">Sudah Dibalas <i class="bi bi-reply-all"></i></div><div class="kpi-value">${fmtAngka(dibalas)}</div><div class="kpi-foot"><span>Tingkat respons</span><span class="mono">${fmtPersen(dibalas, masuk.length, 0)}</span></div></div>`;

  const recentMasuk = masuk.sort((a, b) => (belumDibaca(b) - belumDibaca(a)) || b.at - a.at).slice(0, 5);
  byId('berandaMasuk').innerHTML = recentMasuk.length ? tabelSurat(recentMasuk, 'masuk', true) : kosong('Kotak masuk kosong', 'Surat yang ditujukan ke unit Anda akan tampil di sini.');
  const nf = S.notif.slice(0, 5);
  byId('berandaNotif').innerHTML = nf.length ? nf.map(nfMini).join('') : kosong('Belum ada notifikasi', 'Pemberitahuan surat masuk, balasan, dan disposisi tampil di sini.', 'bi-bell-slash');
  $$('#berandaNotif [data-nf]').forEach(e => e.onclick = () => bukaNotif(e.dataset.nf));
  const recentKeluar = kotakKeluar().sort((a, b) => b.at - a.at).slice(0, 5);
  byId('berandaKeluar').innerHTML = recentKeluar.length ? tabelSurat(recentKeluar, 'keluar', true) : kosong('Belum ada surat keluar', 'Mulai dengan tombol "Tulis Surat Baru".', 'bi-send');
  if (S.lastSync) byId('heroMeta').textContent = 'Terakhir sinkron: ' + fmtJam(S.lastSync) + ' WIB';
}


function filterDefault() { return { q: '', dari: '', sampai: '', sifat: '', status: '', jenis: '', unit: '', hal: 1 }; }

function bangunFilter(kotak) {
  const wadah = byId(kotak + 'Filter');
  if (wadah.dataset.siap) return;
  const f = S.f[kotak] = S.f[kotak] || filterDefault();
  const statusOpt = kotak === 'masuk'
    ? '<option value="">Semua status</option><option value="belum">Belum dibaca</option><option value="Dibaca">Dibaca</option><option value="Dibalas">Dibalas</option><option value="nodisp">Belum didisposisi</option>'
    : '<option value="">Semua status</option><option value="Terkirim">Terkirim (belum diakses)</option><option value="Dibaca">Dibaca</option><option value="Dibalas">Dibalas</option>';
  wadah.innerHTML = `
    <div class="filter-head"><div class="filter-title"><i class="bi bi-funnel"></i> Parameter Filter &amp; Pencarian</div><div class="filter-idx hide-sm">INDEX: NOMOR | ${kotak === 'masuk' ? 'PENGIRIM' : 'TUJUAN'} | PERIHAL</div></div>
    <div class="search-box"><i class="bi bi-search"></i><input type="search" class="input" data-f="q" placeholder="Cari nomor surat, perihal, atau ${kotak === 'masuk' ? 'pengirim' : 'unit tujuan'}\u2026" aria-label="Cari surat"></div>
    <div class="filter-grid">
      <div class="fbox"><label>Dari</label><input type="date" class="input" data-f="dari" aria-label="Dari tanggal"></div>
      <div class="fbox"><label>Sampai</label><input type="date" class="input" data-f="sampai" aria-label="Sampai tanggal"></div>
      <div class="fbox"><label>Sifat</label><select class="input" data-f="sifat" aria-label="Sifat"><option value="">Semua sifat</option><option>Biasa</option><option>Penting</option><option>Rahasia</option></select></div>
      <div class="fbox"><label>Status</label><select class="input" data-f="status" aria-label="Status">${statusOpt}</select></div>
      <div class="fbox">${kotak === 'masuk'
        ? '<label>Jenis</label><select class="input" data-f="jenis" aria-label="Jenis"><option value="">Semua jenis</option><option>Surat baru</option><option>Balasan</option><option>Disposisi</option></select>'
        : `<label>Tujuan</label><select class="input" data-f="unit" aria-label="Unit tujuan"><option value="">Semua unit</option>${S.unitList.filter(u => u.n !== S.unit).map(u => `<option>${esc(u.n)}</option>`).join('')}</select>`}</div>
    </div>
    <div class="filter-foot"><div class="filter-active"><i class="dot dot-warn"></i><span data-f-info>Filter aktif: 0 parameter</span></div><div class="d-flex gap-2"><button type="button" class="btn btn-outline btn-sm" data-f-reset>Reset</button></div></div>`;
  const terap = debounce(() => { f.hal = 1; (kotak === 'masuk' ? renderMasuk : renderKeluar)(); }, 110);
  $$('[data-f]', wadah).forEach(inp => {
    inp.value = f[inp.dataset.f] || '';
    inp.addEventListener(inp.tagName === 'SELECT' || inp.type === 'date' ? 'change' : 'input', () => { f[inp.dataset.f] = inp.value; terap(); });
  });
  $('[data-f-reset]', wadah).onclick = () => { Object.assign(f, filterDefault()); $$('[data-f]', wadah).forEach(i => i.value = ''); terap(); };
  wadah.dataset.siap = '1';
}
function sinkronFilterUI(kotak) { const w = byId(kotak + 'Filter'), f = S.f[kotak]; $$('[data-f]', w).forEach(i => i.value = f[i.dataset.f] || ''); }
function terapkanFilter(list, f, kotak) {
  const d0 = tglKeMs(f.dari), d1 = tglKeMs(f.sampai, true);
  return list.filter(s => {
    if (f.q && !cocok(f.q, s.no, s.hal, s.dari, s.ke.map(k => k.u).join(' '))) return false;
    const t = tglKeMs(s.tgl) || s.at;
    if (d0 && t < d0) return false;
    if (d1 && t > d1) return false;
    if (f.sifat && s.sifat !== f.sifat) return false;
    if (f.jenis && s.jenis !== f.jenis) return false;
    if (f.unit && !s.ke.some(k => k.u === f.unit)) return false;
    if (f.status) {
      if (kotak === 'masuk' && f.status === 'nodisp') { if (!milikSaya(s) || s.jenis === 'Disposisi' || adaDisposisiSah(s)) return false; }
      else if (kotak === 'masuk') { const m = milikSaya(s) || {}; if (f.status === 'belum' ? m.st !== 'Terkirim' : m.st !== f.status) return false; }
      else if (s.st !== f.status) return false;
    }
    return true;
  });
}
function jumlahFilter(f) { return ['q', 'dari', 'sampai', 'sifat', 'status', 'jenis', 'unit'].filter(k => f[k]).length; }

function tabelSurat(list, kotak, ringkas) {
  const baris = list.map(s => {
    const unread = kotak === 'masuk' && belumDibaca(s);
    const cls = ['row-link', unread ? 'unread' : '', s.sifat === 'Rahasia' ? 'rahasia' : '', s._pending ? 'pending' : '', s._gagal ? 'gagal' : ''].join(' ');
    const params = attr(JSON.stringify({ id: s.id, dari: kotak }));
    const dot = `<span class="udot udot-${esc(s.sifat)}${unread ? '' : ' read'}" title="${unread ? 'Belum dibaca' : 'Sudah dibaca'}"></span>`;
    const unitKol = kotak === 'masuk' ? `<span class="unit-cell">${esc(s.dari)}</span>` : labelKe(s);
    const halKol = `<span class="hal">${esc(s.hal)}</span><div class="meta">${badgeJenis(s.jenis)}${kotak === 'masuk' && adaDisposisiSah(s) ? '<span class="jenis jenis-ttd"><i class="bi bi-pen"></i> Didisposisi</span>' : ''}${s.ubah ? '<span class="edited">Telah diubah</span>' : ''}${ikonLampiran(s)}</div>`;
    if (ringkas) return `<tr class="${cls}" data-go="detail" data-params="${params}"><td class="c-dot">${dot}</td><td>${unitKol}<span class="sub">${esc(s.no)}</span></td><td>${halKol}</td><td class="hide-sm">${badgeSifat(s.sifat)}</td><td>${kotak === 'masuk' ? statusMasuk(s) : statusKeluar(s)}</td></tr>`;
    return `<tr class="${cls}" data-go="detail" data-params="${params}"><td class="c-dot">${dot}</td><td class="no-cell">${esc(s.no)}<span class="sub">${fmtWaktu(s.at, true)}</span></td><td class="mono small">${fmtTgl(s.tgl)}</td><td>${unitKol}</td><td>${halKol}</td><td>${badgeSifat(s.sifat)}</td><td>${kotak === 'masuk' ? statusMasuk(s) : statusKeluar(s)}</td></tr>`;
  }).join('');
  const kepala = ringkas
    ? `<tr><th class="c-dot"></th><th>${kotak === 'masuk' ? 'Pengirim' : 'Tujuan'}</th><th>Perihal</th><th class="hide-sm">Sifat</th><th>Status</th></tr>`
    : `<tr><th class="c-dot">\u25CF</th><th>Nomor Surat</th><th>Tanggal</th><th>${kotak === 'masuk' ? 'Pengirim' : 'Tujuan / Resipien'}</th><th>Perihal &amp; Lampiran</th><th>Sifat</th><th>Status</th></tr>`;
  const kartu = list.map(s => {
    const unread = kotak === 'masuk' && belumDibaca(s);
    return `<div class="lc${unread ? ' unread' : ''}${s.sifat === 'Rahasia' ? ' rahasia' : ''}" data-go="detail" data-params="${attr(JSON.stringify({ id: s.id, dari: kotak }))}" role="button" tabindex="0">
      <div class="lc-top"><span class="lc-no">${unread ? '<i class="dot dot-warn"></i>' : ''}${esc(s.no)}</span>${badgeSifat(s.sifat)}</div>
      <div class="lc-from">${kotak === 'masuk' ? esc(s.dari) : 'Ke: ' + esc(s.ke.map(k => k.u).slice(0, 2).join(', ')) + (s.ke.length > 2 ? ' +' + (s.ke.length - 2) : '')} ${badgeJenis(s.jenis)}</div>
      <div class="lc-hal">${esc(s.hal)}</div>
      <div class="lc-meta"><span>${fmtTgl(s.tgl)}${s.lamp && s.lamp.length ? ' \u00B7 ' + s.lamp.length + ' berkas' : ''}</span><span>${kotak === 'masuk' ? statusMasuk(s) : statusKeluar(s)}</span></div></div>`;
  }).join('');
  return `<div class="tbl-wrap tbl-desktop"><table class="tbl${ringkas ? ' tbl-compact' : ''}"><thead>${kepala}</thead><tbody>${baris}</tbody></table></div><div class="ledger">${kartu}</div>`;
}

const PER_HAL_SURAT = 10;
function pager(wadahId, total, hal, per, onHal, label) {
  const w = byId(wadahId), n = Math.max(1, Math.ceil(total / per));
  if (total <= per) { w.innerHTML = total ? `<span>Menampilkan ${total} ${label || 'data'}</span>` : ''; return; }
  const a = (hal - 1) * per + 1, b = Math.min(total, hal * per);
  const nomor = []; for (let i = 1; i <= n; i++) if (i === 1 || i === n || Math.abs(i - hal) <= 1) nomor.push(i); else if (nomor[nomor.length - 1] !== '\u2026') nomor.push('\u2026');
  w.innerHTML = `<span>Menampilkan <strong>${a}\u2013${b}</strong> dari ${fmtAngka(total)} ${label || 'data'} \u00B7 Halaman ${hal} dari ${n}</span><div class="pager-btns"><button type="button" class="pg" data-pg="${hal - 1}" ${hal <= 1 ? 'disabled' : ''} aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button>${nomor.map(i => i === '\u2026' ? '<span class="px-1">\u2026</span>' : `<button type="button" class="pg${i === hal ? ' active' : ''}" data-pg="${i}">${i}</button>`).join('')}<button type="button" class="pg" data-pg="${hal + 1}" ${hal >= n ? 'disabled' : ''} aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button></div>`;
  $$('[data-pg]', w).forEach(b => b.onclick = () => { onHal(+b.dataset.pg); });
}
function tombolMuatLama() {
  return S.adaLagi ? `<div class="p-3 text-center border-top"><button type="button" class="btn btn-outline btn-sm" id="btnMuatLama"><i class="bi bi-clock-history"></i> Muat surat lebih lama</button></div>` : '';
}
async function muatLama(btn) {
  const tertua = Math.min(...semuaSurat().filter(s => !s._pending).map(s => s.at));
  sibuk(btn, true, 'Memuat\u2026');
  try {
    const res = await api('getSuratLama', S.token, tertua);
    if (!res.success) { toast('Gagal memuat', res.message, 'danger'); return; }
    res.data.surat.forEach(s => S.surat.set(s.id, s)); S.adaLagi = res.data.adaLagi;
    toast('Arsip dimuat', res.data.surat.length + ' surat lama ditambahkan.', 'success');
    renderUlang();
  } catch (e) { if (!e.ditangani) toast('Gagal memuat', pesanError(e), 'danger'); }
  finally { sibuk(btn, false); }
}

function renderMasuk(p) {
  bangunFilter('masuk');
  const f = S.f.masuk;
  if (p && p.preset === 'belum') { Object.assign(f, filterDefault(), { status: 'belum' }); sinkronFilterUI('masuk'); delete p.preset; }
  const semua = kotakMasuk(), belum = semua.filter(belumDibaca).length, disp = semua.filter(s => s.jenis === 'Disposisi' && belumDibaca(s)).length;
  byId('masukStats').innerHTML = `<span class="stat-box">Total <b>${fmtAngka(semua.length)} surat</b></span><span class="stat-box warn"><i class="dot dot-warn"></i>Unread <b>${belum} belum dibaca</b></span><span class="stat-box info"><i class="bi bi-signpost-split"></i>Disposisi <b>${disp} baru</b></span>`;
  const list = terapkanFilter(semua, f, 'masuk').sort((a, b) => b.at - a.at);
  S.f.masukHasil = list;
  const per = PER_HAL_SURAT, hal = Math.min(f.hal, Math.max(1, Math.ceil(list.length / per)));
  byId('masukInfo').textContent = 'Urutan: terbaru di atas \u00B7 ' + list.length + ' surat \u00B7 ' + per + ' per halaman';
  $('[data-f-info]', byId('masukFilter')).innerHTML = `Filter aktif: <strong>${jumlahFilter(f)}</strong> parameter \u00B7 ${list.length} hasil`;
  byId('masukList').innerHTML = (list.length ? tabelSurat(list.slice((hal - 1) * per, hal * per), 'masuk') : kosong(semua.length ? 'Tidak ada surat yang cocok' : 'Kotak masuk kosong', semua.length ? 'Ubah kata kunci atau reset filter.' : 'Surat dari unit lain akan muncul di sini.', semua.length ? 'bi-search' : 'bi-inbox')) + tombolMuatLama();
  pager('masukPager', list.length, hal, per, h => { f.hal = h; renderMasuk(); window.scrollTo(0, 0); }, 'surat masuk');
  const b = byId('btnMuatLama'); if (b) b.onclick = () => muatLama(b);
}

function renderKeluar() {
  bangunFilter('keluar');
  const f = S.f.keluar, semua = kotakKeluar();
  const bulanIni = semua.filter(s => { const d = new Date(s.at), n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length;
  const st = k => semua.filter(s => !s._pending && s.st === k).length;
  byId('keluarKpi').innerHTML = `
    <div class="ks"><div class="ks-label"><span>Bulan berjalan (${BULAN[new Date().getMonth()]})</span><span>OUT</span></div><div class="ks-row"><span class="ks-val">${bulanIni}</span><span class="chip">${semua.length} total</span></div></div>
    <div class="ks"><div class="ks-label"><span>Status: Terkirim</span><i class="bi bi-send"></i></div><div class="ks-row"><span class="ks-val">${st('Terkirim')}</span><span class="chip chip-info">Menunggu baca</span></div></div>
    <div class="ks"><div class="ks-label"><span>Status: Dibaca</span><i class="bi bi-eye"></i></div><div class="ks-row"><span class="ks-val">${st('Dibaca')}</span><span class="chip chip-ok">Diproses</span></div></div>
    <div class="ks"><div class="ks-label"><span>Status: Dibalas</span><i class="bi bi-reply"></i></div><div class="ks-row"><span class="ks-val">${st('Dibalas')}</span><span class="chip chip-warn">Balasan</span></div></div>`;
  const list = terapkanFilter(semua, f, 'keluar').sort((a, b) => b.at - a.at);
  S.f.keluarHasil = list;
  const per = PER_HAL_SURAT, hal = Math.min(f.hal, Math.max(1, Math.ceil(list.length / per)));
  $('[data-f-info]', byId('keluarFilter')).innerHTML = `Filter aktif: <strong>${jumlahFilter(f)}</strong> parameter \u00B7 ${list.length} hasil`;
  byId('keluarInfo').textContent = 'Urutan: terbaru di atas \u00B7 ' + list.length + ' naskah \u00B7 ' + per + ' per halaman';
  byId('keluarList').innerHTML = (list.length ? tabelSurat(list.slice((hal - 1) * per, hal * per), 'keluar') : kosong(semua.length ? 'Tidak ada surat yang cocok' : 'Belum ada surat keluar', semua.length ? 'Ubah kata kunci atau reset filter.' : 'Klik "Tulis Surat Baru" untuk mengirim surat pertama.', 'bi-send')) + tombolMuatLama();
  pager('keluarPager', list.length, hal, per, h => { f.hal = h; renderKeluar(); window.scrollTo(0, 0); }, 'surat keluar');
  const b = byId('btnMuatLama'); if (b) b.onclick = () => muatLama(b);
}


function tandaiDibacaLokal(s) {
  const m = milikSaya(s);
  let ubah = false;
  if (m && m.st === 'Terkirim') { m.st = 'Dibaca'; m.rd = Date.now(); s.st = statusGabungan(s.ke); kunciLokal(s.id); ubah = true; }
  const nfIds = S.notif.filter(n => n.s === s.id && !n.r).map(n => { n.r = true; S.notifLokal.add(n.id); return n.id; });
  if (!ubah && !nfIds.length) return;
  perbaruiLencana(); simpanCache();
  api('tandaiDibaca', S.token, s.id).then(res => {
    if (res.success && res.data && res.data.rd && m) { m.rd = res.data.rd; }
    nfIds.forEach(id => S.notifLokal.delete(id));
  }).catch(() => {});
}

function suratDasar(s) { return s.jenis === 'Disposisi' && s.induk && S.surat.get(s.induk) ? S.surat.get(s.induk) : s; }

function rangkaian(s) {
  let akar = s, jaga = 0;
  while (akar.induk && S.surat.get(akar.induk) && jaga++ < 20) akar = S.surat.get(akar.induk);
  const semua = semuaSurat(), hasil = [akar], antri = [akar.id], lihat = new Set([akar.id]);
  while (antri.length) {
    const id = antri.shift();
    semua.forEach(x => { if (x.induk === id && !lihat.has(x.id)) { lihat.add(x.id); hasil.push(x); antri.push(x.id); } });
  }
  return { akar, list: hasil };
}

function renderDetail(p) {
  const s = S.surat.get(p.id), w = byId('detailBody');
  if (!s) { w.innerHTML = `<button type="button" class="back-link" id="detailBack"><i class="bi bi-arrow-left"></i> Kembali</button><div class="card">${kosong('Surat tidak ditemukan', 'Surat mungkin sudah dihapus pengirim atau belum dimuat. Coba sinkronkan.', 'bi-file-earmark-x')}</div>`; byId('detailBack').onclick = () => kembali('masuk'); return; }
  if (!s._pending) tandaiDibacaLokal(s);
  const dasar = suratDasar(s), saya = milikSaya(s), pengirim = s.dari === S.unit, disposisi = s.jenis === 'Disposisi';
  const sifatCls = dasar.sifat === 'Penting' ? 'penting' : dasar.sifat === 'Rahasia' ? 'rahasia' : '';
  const asal = p.dari || (pengirim ? 'keluar' : 'masuk');
  const { list: seri } = rangkaian(s);

  const statusBadge = saya ? badgeStatus(saya.st === 'Terkirim' ? 'Belum' : saya.st, saya.st === 'Terkirim' ? 'Belum dibaca' : saya.st) : (s._pending ? badgeStatus('Mengirim', 'Mengirim\u2026') : badgeStatus(s.st));
  const sumber = pengirim ? 'DOKUMEN RESMI KELUAR' : 'DOKUMEN RESMI MASUK';
  const banner = disposisi ? `<div class="disp-banner"><i class="bi bi-signpost-split fs-4" style="color:#7C3AED"></i><div class="min-w-0"><div class="db-h">${pengirim ? 'Disposisi Anda kepada ' + esc(s.ke.map(k => k.u).join(', ')) : 'Disposisi dari ' + esc(s.dari)} \u00B7 ${fmtWaktu(s.at)}</div><div class="db-d">${esc(s.isi)}</div>${dasar === s ? '<div class="small mt-2 t-danger">Surat asal tidak tersedia (mungkin sudah dihapus pengirim).</div>' : ''}</div></div>` : '';

  const tujuanTxt = dasar.ke.map(k => k.u);
  const lamp = dasar.lamp || [];
  const baca = dasar.ke.filter(k => k.st !== 'Terkirim').length;

  w.innerHTML = `
    <button type="button" class="back-link" id="detailBack"><i class="bi bi-arrow-left"></i> Kembali ke ${asal === 'keluar' ? 'surat keluar' : asal === 'notif' ? 'notifikasi' : asal === 'beranda' ? 'beranda' : 'surat masuk'}</button>
    ${banner}
    <div class="card det-head ${sifatCls}">
      <div class="det-badges"><div class="left">${dasar.sifat !== 'Biasa' ? badgeSifat(dasar.sifat) : ''}${statusBadge}${badgeJenis(s.jenis)}${dasar.ubah ? '<span class="edited">Telah diubah</span>' : ''}${s._gagal ? '<span class="chip chip-danger">Gagal terkirim</span>' : ''}</div>
        <span class="det-time"><i class="bi bi-clock"></i> ${saya && saya.rd ? 'Dibuka: ' + fmtWaktu(saya.rd) : 'Dibuat: ' + fmtWaktu(s.at)}</span></div>
      <h2 class="det-title">${esc(dasar.hal)}</h2>
      <div class="det-sub">SISTEM TATA NASKAH DIGITAL ${esc(S.identitas.singkatan || 'YASMA')} \/\/ ${sumber}</div>
    </div>
    <div class="det-grid">
      <div>
        <div class="card">
          <div class="card-head"><h3 class="card-title"><i class="bi bi-card-list"></i> Metadata Lembar Persuratan</h3><span class="chip mono">${esc(dasar.jenis === 'Balasan' ? 'BALASAN' : 'SURAT')} \u00B7 ${esc(dasar.id.slice(-8).toUpperCase())}</span></div>
          <div class="meta-grid">
            <div class="meta-box"><div class="ml">Pengirim resmi</div><div class="mv">${esc(dasar.dari)}</div><div class="ms">${esc((S.unitMap[dasar.dari] || {}).k || '')}${dasar.dari === S.unit ? ' \u00B7 unit Anda' : ''}</div></div>
            <div class="meta-box"><div class="ml">Nomor surat</div><div class="mv mono">${esc(dasar.no)}</div><div class="ms">Dicatat ${fmtWaktu(dasar.at)}</div></div>
            <div class="meta-box"><div class="ml">Tanggal surat</div><div class="mv">${fmtTglPanjang(dasar.tgl)}</div></div>
            <div class="meta-box"><div class="ml">Sifat &amp; tingkat urgensi</div><div class="mv">${badgeSifat(dasar.sifat)}</div><div class="ms">${dasar.sifat === 'Rahasia' ? 'Hanya pengirim & tujuan yang disebut' : dasar.sifat === 'Penting' ? 'Prioritas tindak lanjut' : 'Distribusi standar'}</div></div>
            <div class="meta-box full"><div class="ml">Distribusi tujuan utama</div><div class="mv">${esc(tujuanTxt.slice(0, 6).join(', '))}${tujuanTxt.length > 6 ? ` <span class="text-muted-2 small">(+${tujuanTxt.length - 6} unit lainnya)</span>` : ''}</div></div>
            ${dasar.induk && dasar.jenis === 'Balasan' && S.surat.get(dasar.induk) ? `<div class="meta-box full"><div class="ml">Membalas surat</div><div class="mv"><button type="button" class="link-btn" data-go="detail" data-params="${attr(JSON.stringify({ id: dasar.induk, dari: asal }))}"><i class="bi bi-link-45deg"></i> ${esc(S.surat.get(dasar.induk).no)} \u2014 ${esc(S.surat.get(dasar.induk).hal)}</button></div></div>` : ''}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3 class="card-title"><i class="bi bi-file-text"></i> Isi Ringkas / Keterangan Dinas</h3><span class="chip chip-ok">TEKS RESMI</span></div>
          ${dasar.isi ? `<div class="isi-box">${esc(dasar.isi)}</div>` : '<div class="text-muted-2 small">Tidak ada ringkasan isi. Lihat berkas lampiran.</div>'}
          <div class="isi-foot"><span><i class="bi bi-geo-alt"></i> ${fmtTglPanjang(dasar.tgl)}</span><span>${esc(dasar.dari)}</span></div>
        </div>
        <div class="card">
          <div class="card-head"><h3 class="card-title"><i class="bi bi-paperclip"></i> Lampiran Berkas (${lamp.length} item)</h3><span class="chip mono">TOTAL: ${fmtKb(lamp.reduce((a, l) => a + (+l.kb || 0), 0))}</span></div>
          ${lamp.length ? `<div class="att-grid">${lamp.map(kartuLampiran).join('')}</div>` : '<div class="text-muted-2 small">Surat ini tidak memiliki lampiran.</div>'}
        </div>
        <div class="card">
          <div class="card-head"><h3 class="card-title"><i class="bi bi-diagram-3"></i> Riwayat Percakapan &amp; Alur</h3><span class="chip chip-ok">${seri.length} naskah</span></div>
          <ol class="timeline">${garisWaktu(s, dasar, seri)}</ol>
        </div>
      </div>
      <aside>
        <div class="card">
          <div class="card-head"><h3 class="card-title"><i class="bi bi-lightning-charge"></i> Aksi Administratif</h3></div>
          <div class="act-list">${aksiDetail(s, dasar, saya, pengirim)}</div>
        </div>
        <div class="card" id="detDisp">${kartuDisposisi(dasar, s, saya)}</div>
        <div class="card">
          <div class="card-head"><h3 class="card-title"><i class="bi bi-broadcast"></i> Status Antar Unit</h3><span class="chip chip-ok mono">${baca}/${dasar.ke.length}</span></div>
          <div class="progress-thin mb-3"><span style="width:${dasar.ke.length ? baca / dasar.ke.length * 100 : 0}%"></span></div>
          ${dasar.ke.map(k => `<div class="track${k.u === S.unit ? ' me' : ''}"><div class="min-w-0"><div class="track-u text-truncate">${esc(k.u)}</div><div class="track-s">${k.u === S.unit ? 'Unit Anda' : 'Unit rekanan'}</div></div><span class="track-st ${esc(k.st)}">${k.st === 'Terkirim' ? 'BELUM DIBACA' : k.st.toUpperCase() + ' ' + fmtJam(k.st === 'Dibalas' ? k.rp : k.rd)}</span></div>`).join('')}
        </div>
      </aside>
    </div>`;
  byId('detailBack').onclick = () => kembali(asal);
  $$('[data-lamp]', w).forEach(b => b.onclick = () => bukaLampiran(b.dataset.lamp, b.dataset.aksi));
  const aksi = id => byId(id);
  if (aksi('aBalas')) aksi('aBalas').onclick = () => go('tulis', { mode: 'balas', induk: s.id });
  if (aksi('aDisp')) aksi('aDisp').onclick = () => bukaDisposisi(s.id);
  pasangKartuDisposisi(w, s.id);
  if (aksi('aUbah')) aksi('aUbah').onclick = () => go('tulis', { mode: 'ubah', id: s.id });
  if (aksi('aHapus')) aksi('aHapus').onclick = () => bukaHapus(s.id);
  if (aksi('aCetak')) aksi('aCetak').onclick = () => go('cetak', { id: s.id, dari: asal });
  if (aksi('aUlang')) aksi('aUlang').onclick = () => kirimUlang(s.id);
}

function aksiDetail(s, dasar, saya, pengirim) {
  if (s._pending) return `<div class="alert-inline alert-info-soft"><span class="spin"></span><div>Surat sedang dikirim ke server\u2026</div></div>`;
  if (s._gagal) return `<button type="button" class="btn btn-primary" id="aUlang"><i class="bi bi-arrow-repeat"></i> Kirim ulang</button><div class="act-note">${esc(s._gagal)}</div>`;
  const b = [];
  if (saya) {
    b.push(`<button type="button" class="btn btn-primary" id="aBalas"><i class="bi bi-reply"></i> Balas Surat Ini</button>`);
    if (bolehDisposisi()) b.push(`<button type="button" class="btn btn-outline" id="aDisp"><i class="bi bi-pen"></i> Disposisi Surat (bertanda tangan)</button>`);
  }
  if (pengirim && s.jenis !== 'Disposisi') {
    b.push(`<button type="button" class="btn btn-outline" id="aUbah"><i class="bi bi-pencil"></i> Ubah Surat Ini</button>`);
    b.push(`<button type="button" class="btn btn-ghost-danger" id="aHapus"><i class="bi bi-trash3"></i> Hapus Surat Ini</button>`);
  }
  b.push(`<button type="button" class="btn btn-outline" id="aCetak"><i class="bi bi-printer"></i> Cetak Surat / Lembar Disposisi</button>`);
  return b.join('') + `<div class="act-note">${pengirim ? 'Hanya unit pengirim yang dapat mengubah/menghapus.' : 'Tindakan tercatat atas nama ' + esc(labelSaya()) + '.'}${saya && !bolehDisposisi() ? ' Disposisi dibuat dan ditandatangani oleh akun Pimpinan; Anda dapat mencetak lembar disposisinya.' : ''}</div>`;
}

function garisWaktu(s, dasar, seri) {
  const ev = [];
  seri.forEach(x => {
    const dariSaya = x.dari === S.unit;
    const judul = x.jenis === 'Disposisi' ? 'Disposisi oleh ' + (dariSaya ? 'unit Anda' : x.dari) : x.jenis === 'Balasan' ? 'Balasan dari ' + (dariSaya ? 'unit Anda' : x.dari) : 'Surat diterbitkan oleh ' + (dariSaya ? 'unit Anda' : x.dari);
    ev.push({ t: x.at, cls: (x.id === s.id ? 'now ' : '') + (x.jenis === 'Disposisi' ? 'purple' : x.jenis === 'Balasan' ? 'amber' : ''), id: x.id !== s.id ? x.id : null,
      h: judul, d: (x.jenis === 'Disposisi' ? '\u201C' + x.isi.slice(0, 120) + (x.isi.length > 120 ? '\u2026' : '') + '\u201D \u2192 ' : x.no + ' \u2192 ') + x.ke.map(k => k.u).slice(0, 4).join(', ') + (x.ke.length > 4 ? ' +' + (x.ke.length - 4) : '') });
    x.ke.forEach(k => {
      if (!(k.rd && (dariSaya || k.u === S.unit))) return;
      ev.push({ t: k.rd, cls: k.u === S.unit ? 'now' : '', h: (k.u === S.unit ? 'Dibaca oleh unit Anda' : 'Dibaca oleh ' + k.u) + (x.id !== s.id ? ' (' + x.jenis.toLowerCase() + ')' : ''), d: 'Status transmisi bergeser menjadi "Dibaca".' });
    });
  });
  acaraDisposisi(dasar, s).forEach(e => ev.push(e));
  ev.sort((a, b) => a.t - b.t);
  const saya = milikSaya(s);
  if (saya && saya.st !== 'Dibalas' && !s._pending) ev.push({ t: 0, cls: 'pending', h: 'Menunggu tindak lanjut', d: bolehDisposisi() ? 'Balas surat atau buat disposisi internal bertanda tangan.' : 'Balas surat, atau teruskan ke Pimpinan untuk disposisi bertanda tangan.', tag: 'PENDING' });
  else if (s.dari === S.unit && s.ke.some(k => k.st === 'Terkirim') && !s._pending) ev.push({ t: 0, cls: 'pending', h: 'Menunggu konfirmasi baca', d: s.ke.filter(k => k.st === 'Terkirim').length + ' unit belum membuka surat ini.', tag: 'PENDING' });
  return ev.map(e => `<li class="tl ${e.cls}${e.id ? ' clickable' : ''}"><div class="tl-box"${e.id ? ` data-go="detail" data-params="${attr(JSON.stringify({ id: e.id, dari: S.params.dari || 'masuk' }))}"` : ''}><div class="tl-h"><span>${esc(e.h)}</span>${e.tag ? `<span class="chip chip-warn">${e.tag}</span>` : `<time>${fmtWaktu(e.t)}</time>`}</div><div class="tl-d">${esc(e.d)}</div></div></li>`).join('');
}

function kartuLampiran(l) {
  const e = ext(l.n), jenis = e === 'pdf' ? 'pdf' : /jpe?g|png/.test(e) ? 'img' : /docx?/.test(e) ? 'doc' : /xlsx?/.test(e) ? 'xls' : '';
  return `<div class="att"><div class="att-top"><div class="att-ic ${jenis}">${esc(e.toUpperCase() || 'FILE')}</div><div class="min-w-0"><div class="att-name" title="${attr(l.n)}">${esc(l.n)}</div><div class="att-meta">${fmtKb(l.kb)} \u00B7 ${esc(jenis === 'pdf' ? 'Dokumen PDF' : jenis === 'img' ? 'Gambar' : jenis === 'xls' ? 'Spreadsheet' : 'Dokumen')}</div></div></div>
    <div class="att-actions"><button type="button" class="btn btn-outline btn-sm" data-lamp="${attr(l.id)}" data-aksi="lihat"><i class="bi bi-eye"></i> Pratinjau</button><button type="button" class="btn btn-primary btn-sm" data-lamp="${attr(l.id)}" data-aksi="unduh"><i class="bi bi-download"></i> Unduh</button></div></div>`;
}
function cariLampiran(id) { for (const s of S.surat.values()) { const l = (s.lamp || []).find(x => x.id === id); if (l) return l; } return null; }

async function ambilBlob(id) {
  if (S.blob.has(id)) return S.blob.get(id);
  const res = await api('ambilLampiran', S.token, id);
  if (!res.success) throw new Error(res.message);
  const bin = atob(res.data.b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const blob = new Blob([u8], { type: res.data.mime || 'application/octet-stream' });
  const item = { blob, nama: res.data.nama, mime: res.data.mime, url: URL.createObjectURL(blob), u8 };
  S.blob.set(id, item);
  return item;
}

async function bukaLampiran(id, aksi) {
  const l = cariLampiran(id) || { n: 'Lampiran', kb: 0 };
  if (aksi === 'unduh') {
    toast('Menyiapkan unduhan', l.n, 'info', { lama: 2500 });
    try { const b = await ambilBlob(id); unduhBlob(b.blob, b.nama); }
    catch (e) { if (!e.ditangani) toast('Gagal mengunduh', pesanError(e), 'danger'); }
    return;
  }
  const body = byId('previewBody');
  byId('mPrevT').textContent = l.n; byId('previewInfo').textContent = fmtKb(l.kb) + ' \u00B7 berkas privat Google Drive';
  body.innerHTML = `<div class="text-center py-5"><span class="spin" style="width:28px;height:28px"></span><div class="mt-3 text-muted-2">Mengambil berkas dari Drive (akses diperiksa server)\u2026</div></div>`;
  byId('btnPreviewUnduh').onclick = () => bukaLampiran(id, 'unduh');
  modal('mPreview').show();
  try {
    const b = await ambilBlob(id), e = ext(b.nama);
    if (/^image[/]/.test(b.mime) || /jpe?g|png/.test(e)) body.innerHTML = `<img src="${b.url}" alt="${attr(b.nama)}">`;
    else if (b.mime === 'application/pdf' || e === 'pdf') await renderPdf(b, body);
    else body.innerHTML = `<div class="empty"><div class="empty-ic"><i class="bi bi-file-earmark-text"></i></div><div class="empty-t">Pratinjau tidak tersedia untuk .${esc(e.toUpperCase())}</div><div class="empty-d">Unduh berkas untuk membukanya di Word/Excel.</div></div>`;
  } catch (err) {
    if (!err.ditangani) body.innerHTML = `<div class="empty"><div class="empty-ic"><i class="bi bi-exclamation-triangle"></i></div><div class="empty-t">Gagal memuat lampiran</div><div class="empty-d">${esc(pesanError(err))}</div></div>`;
  }
}
async function renderPdf(b, body) {
  try {
    await loadScript(CDN.pdf);
    const lib = window.pdfjsLib;
    if (!lib.GlobalWorkerOptions.workerSrc) {
      let kode = '';
      for (const url of CDN.pdfWorker) { try { const r = await fetch(url); if (r.ok) { kode = await r.text(); break; } } catch (e) {   } }
      lib.GlobalWorkerOptions.workerSrc = kode ? URL.createObjectURL(new Blob([kode], { type: 'text/javascript' })) : CDN.pdfWorker[0];
    }
    const pdf = await lib.getDocument({ data: b.u8.slice() }).promise;
    body.innerHTML = '<div class="pdf-pages"></div>';
    const wadah = $('.pdf-pages', body), maks = Math.min(pdf.numPages, 40);
    for (let i = 1; i <= maks; i++) {
      const hal = await pdf.getPage(i), vp0 = hal.getViewport({ scale: 1 });
      const skala = Math.min(1.6, Math.max(.6, (body.clientWidth - 32) / vp0.width)) * (window.devicePixelRatio > 1 ? 1.5 : 1);
      const vp = hal.getViewport({ scale: skala }), c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height; c.style.width = (vp.width / (window.devicePixelRatio > 1 ? 1.5 : 1)) + 'px';
      wadah.appendChild(c);
      await hal.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    }
    if (pdf.numPages > maks) wadah.insertAdjacentHTML('beforeend', `<div class="small text-muted-2">Menampilkan ${maks} dari ${pdf.numPages} halaman. Unduh untuk melihat seluruhnya.</div>`);
  } catch (e) {
    body.innerHTML = `<iframe src="${b.url}" title="${attr(b.nama)}" style="width:100%;height:70vh;border:0;background:#fff"></iframe><div class="small text-muted-2 mt-2">Bila pratinjau kosong, gunakan tombol Unduh.</div>`;
  }
}

function bukaHapus(id) {
  const s = S.surat.get(id); if (!s) return;
  byId('hapusNomor').textContent = s.no; byId('hapusPerihal').textContent = s.hal;
  const cb = byId('hapusSetuju'), btn = byId('btnHapusYa');
  cb.checked = false; btn.disabled = true;
  cb.onchange = () => btn.disabled = !cb.checked;
  btn.onclick = () => { modal('mHapus').hide(); hapusOptimistik(id); };
  modal('mHapus').show();
}
function hapusOptimistik(id) {
  const s = S.surat.get(id); if (!s) return;
  S.surat.delete(id); kunciLokal(id, 15000);
  go('keluar', {}, { tanpaRiwayat: true });
  toast('Surat dihapus', s.no + ' dihapus dari daftar aktif (soft delete).', 'success');
  api('hapusSurat', S.token, id).then(res => {
    if (!res.success) { S.surat.set(id, s); toast('Gagal menghapus', res.message, 'danger'); renderUlang(); }
    else simpanCache();
  }).catch(e => { if (!e.ditangani) { S.surat.set(id, s); toast('Gagal menghapus', pesanError(e), 'danger'); renderUlang(); } });
}

function kirimKeServer(fn, payload, tmpId, saatGanda) {
  S.pendingKirim = S.pendingKirim || {};
  S.pendingKirim[tmpId] = { fn, payload };
  return api(fn, S.token, payload).then(res => {
    const tmp = S.surat.get(tmpId);
    if (res.success) {
      S.surat.delete(tmpId); S.surat.set(res.data.id, res.data); delete S.pendingKirim[tmpId];
      if (S.view === 'detail' && S.params.id === tmpId) S.params.id = res.data.id;
      simpanCache(); renderUlang();
      return res;
    }
    if (res.code === 'NOMOR_GANDA' && saatGanda) { S.surat.delete(tmpId); renderUlang(); saatGanda(res); return res; }
    if (tmp) { tmp._pending = false; tmp._gagal = res.message; }
    toast('Gagal mengirim', res.message, 'danger', { aksi: 'Coba lagi', onAksi: () => kirimUlang(tmpId), lama: 10000 });
    renderUlang();
    return res;
  }).catch(e => {
    if (e.ditangani) return;
    const tmp = S.surat.get(tmpId);
    if (tmp) { tmp._pending = false; tmp._gagal = 'Koneksi terputus: ' + pesanError(e); }
    toast('Gagal mengirim', 'Periksa koneksi internet lalu coba lagi.', 'danger', { aksi: 'Coba lagi', onAksi: () => kirimUlang(tmpId), lama: 10000 });
    renderUlang();
  });
}
function kirimUlang(tmpId) {
  const p = (S.pendingKirim || {})[tmpId], tmp = S.surat.get(tmpId);
  if (!p || !tmp) { toast('Tidak dapat mengulang', 'Data pengiriman tidak ditemukan. Tulis ulang surat.', 'warning'); return; }
  tmp._gagal = ''; tmp._pending = true; renderUlang();
  kirimKeServer(p.fn, p.payload, tmpId);
}


const IKON_NF = { 'Surat masuk': 'bi-envelope-paper', 'Balasan': 'bi-reply', 'Disposisi': 'bi-signpost-split' };
function judulNotif(n) { return (n.j === 'Disposisi' ? 'Disposisi Masuk: ' : n.j === 'Balasan' ? 'Tanggapan Balasan: ' : 'Surat Masuk Baru: ') + n.no + ' \u2014 ' + n.hal; }
function nfMini(n) {
  return `<div class="nf-mini${n.r ? '' : ' unread'}${n.sifat === 'Rahasia' ? ' rahasia' : ''}" data-nf="${attr(n.id)}" role="button" tabindex="0"><span class="nm-ic"><i class="bi ${IKON_NF[n.j] || 'bi-bell'}"></i></span><div class="min-w-0"><div class="nm-t">${esc(judulNotif(n))}</div><div class="nm-s">${esc(n.d)} \u00B7 ${lalu(n.at)}${n.sifat !== 'Biasa' ? ' \u00B7 <span class="' + (n.sifat === 'Rahasia' ? 't-danger' : 't-warn') + '">' + esc(n.sifat.toUpperCase()) + '</span>' : ''}</div></div></div>`;
}
function bukaNotif(id) {
  const n = S.notif.find(x => x.id === id); if (!n) return;
  tandaiNotifLokal([n]);
  go('detail', { id: n.s, dari: 'notif' });
}
function tandaiNotifLokal(list) {
  const ids = list.filter(n => !n.r).map(n => { n.r = true; S.notifLokal.add(n.id); return n.id; });
  if (!ids.length) return;
  perbaruiLencana(); simpanCache();
  api('tandaiNotif', S.token, ids).then(() => ids.forEach(i => S.notifLokal.delete(i))).catch(() => {});
}
function tandaiSemuaNotif() {
  const n = S.notif.filter(x => !x.r).length; if (!n) { toast('Semua sudah dibaca', '', 'info'); return; }
  S.notif.forEach(x => { if (!x.r) { x.r = true; S.notifLokal.add(x.id); } });
  perbaruiLencana(); simpanCache();
  if (S.view === 'notif') renderNotif(); if (S.view === 'beranda') renderBeranda();
  toast('Notifikasi dibaca', n + ' notifikasi ditandai sudah dibaca.', 'success');
  api('tandaiNotif', S.token, 'SEMUA').then(() => S.notifLokal.clear()).catch(() => {});
}

function renderNotif() {
  const f = S.f.notif = S.f.notif || { tab: '', q: '', sifat: '', status: '', hari: '30', hal: 1 };
  const all = S.notif, belum = all.filter(n => !n.r), prioritas = belum.filter(n => n.sifat !== 'Biasa');
  byId('notifKpi').innerHTML = `
    <div class="kpi"><div class="kpi-label">Total notifikasi <i class="bi bi-folder2-open"></i></div><div class="kpi-value">${all.length}<small>catatan</small></div><div class="kpi-foot"><span>90 hari terakhir</span></div></div>
    <div class="kpi slate"><div class="kpi-label">Belum dibaca <i class="bi bi-circle-fill" style="color:var(--ok-dot);font-size:10px"></i></div><div class="kpi-value">${belum.length}<small>naskah baru</small></div><div class="kpi-foot"><span>${belum.length ? 'Perhatian unit segera' : 'Semua tertangani'}</span></div></div>
    <div class="kpi amber"><div class="kpi-label">Penting / Rahasia <i class="bi bi-shield-exclamation"></i></div><div class="kpi-value">${prioritas.length}<small>belum dibaca</small></div><div class="kpi-foot"><span>Prioritas tindak lanjut</span></div></div>
    <div class="kpi"><div class="kpi-label">Interval pembaruan <i class="bi bi-clock"></i></div><div class="kpi-value">${S.konfig.polling_detik}<small>detik</small></div><div class="kpi-foot"><span>${pref('poll', true) ? 'Otomatis aktif' : 'Otomatis nonaktif'}</span><span class="chip ${pref('poll', true) ? 'chip-ok' : ''}">${fmtJam(S.lastSync || Date.now())}</span></div></div>`;
  const tabs = [['', 'Semua'], ['Surat masuk', 'Surat Masuk'], ['Balasan', 'Balasan'], ['Disposisi', 'Disposisi']];
  byId('notifTabs').innerHTML = tabs.map(([k, l]) => `<button type="button" class="tab${f.tab === k ? ' active' : ''}" data-tab="${k}" role="tab" aria-selected="${f.tab === k}">${l} <span class="tc">${k ? all.filter(n => n.j === k).length : all.length}</span></button>`).join('');
  $$('#notifTabs [data-tab]').forEach(b => b.onclick = () => { f.tab = b.dataset.tab; f.hal = 1; renderNotif(); });
  const batas = Date.now() - (+f.hari) * 864e5;
  const list = all.filter(n => (!f.tab || n.j === f.tab) && (!f.sifat || n.sifat === f.sifat) && (!f.status || (f.status === 'belum' ? !n.r : n.r)) && n.at >= batas && cocok(f.q, n.d, n.no, n.hal));
  const per = 10, hal = Math.min(f.hal, Math.max(1, Math.ceil(list.length / per)));
  byId('notifList').innerHTML = list.length ? list.slice((hal - 1) * per, hal * per).map(n => {
    const ikon = IKON_NF[n.j] || 'bi-bell';
    const quote = n.sifat === 'Rahasia' ? '<div class="nf-quote locked"><i class="bi bi-lock"></i> Isi bersifat rahasia \u2014 buka surat untuk melihat.</div>' : n.cuplik ? `<div class="nf-quote">\u201C${esc(n.cuplik)}\u201D</div>` : '';
    return `<article class="nf${n.r ? '' : ' unread'}${n.sifat === 'Rahasia' ? ' rahasia' : ''}"><div class="nf-ic"><i class="bi ${ikon}"></i></div><div class="nf-body">
      <div class="nf-top"><div class="nf-from">${n.r ? '' : '<i class="dot dot-ok"></i>'}${esc(n.d)} <span class="ago">\u00B7 ${lalu(n.at)} (${fmtJam(n.at)} WIB)</span></div><div class="nf-badges">${n.sifat !== 'Biasa' ? badgeSifat(n.sifat) : ''}<span class="chip ${n.r ? '' : 'chip-ok'}">${esc(n.j)}</span></div></div>
      <div class="nf-title">${sorot(judulNotif(n), f.q)}</div>${quote}
      <div class="nf-foot"><span class="nf-id">ID: ${esc(n.id.slice(-10).toUpperCase())} \u00B7 ${fmtWaktu(n.at)}</span><div class="nf-actions">${n.r ? '' : `<button type="button" class="btn btn-outline btn-sm" data-nfr="${attr(n.id)}">Tandai dibaca</button>`}<button type="button" class="btn btn-primary btn-sm" data-nfo="${attr(n.id)}">${n.j === 'Disposisi' ? 'Buka disposisi' : n.j === 'Balasan' ? 'Lihat balasan' : 'Buka surat'} <i class="bi bi-arrow-right"></i></button></div></div>
    </div></article>`;
  }).join('') : `<div class="empty empty-dashed"><div class="empty-ic"><i class="bi bi-bell-slash"></i></div><div class="empty-t">Belum ada notifikasi ${f.tab || f.q || f.sifat || f.status ? 'yang cocok' : 'baru'}</div><div class="empty-d">Semua naskah dinas dan disposisi telah Anda tinjau.</div></div>`;
  $$('[data-nfr]').forEach(b => b.onclick = () => { tandaiNotifLokal([S.notif.find(n => n.id === b.dataset.nfr)]); renderNotif(); });
  $$('[data-nfo]').forEach(b => b.onclick = () => bukaNotif(b.dataset.nfo));
  pager('notifPager', list.length, hal, per, h => { f.hal = h; renderNotif(); window.scrollTo(0, 0); }, 'notifikasi');
}


function renderPengaturan() {
  const p = S.profil, k = S.konfig;
  byId('setProfil').innerHTML = `<div class="card-head"><div><h3 class="card-title"><i class="bi bi-bank"></i> Profil Satuan Kerja Unit</h3><div class="card-sub">Data master terdaftar di pangkalan data ${esc(S.identitas.singkatan || 'YASMA')}.</div></div><span class="chip chip-ok">AKTIF TERVERIFIKASI</span></div>
    <div class="profile-grid">
      <div class="pf"><div class="ml">Satuan kerja / unit</div><div class="mv">${esc(p.unit)}</div><div class="ms">Kode entitas: <span class="mono">${esc(p.kode || '\u2014')}</span></div></div>
      <div class="pf"><div class="ml">Penanggung jawab (PIC)</div><div class="mv">${esc(p.pic || 'Belum diisi')}</div><div class="ms">Kelompok: ${esc(p.kelompok || '\u2014')}</div></div>
      <div class="pf"><div class="ml">Email unit</div><div class="mv">${esc(p.email || 'Belum diisi')}</div><div class="ms">Notifikasi email: tahap berikutnya</div></div>
      <div class="pf"><div class="ml">Login terakhir</div><div class="mv">${fmtWaktu(p.login)}</div><div class="ms">Peran: ${esc(p.peran)}${p.level ? ' \u00B7 ' + esc(p.level) : ''}</div></div>
    </div>
    ${p.level ? `<div class="alert-inline ${p.level === 'Operator' ? 'alert-warn' : 'alert-info-soft'}"><i class="bi ${p.level === 'Operator' ? 'bi-person-badge' : 'bi-person-check'}"></i><div><strong>Akun ${esc(p.level)} (${esc(p.label || p.unit)}).</strong> ${p.level === 'Operator' ? 'Dapat membaca, mengirim, membalas, mengubah, dan mencetak surat serta lembar disposisi. Pembuatan dan pembatalan disposisi hanya dari akun Pimpinan.' : 'Seluruh fitur unit, termasuk membuat, menandatangani, dan membatalkan disposisi serta mengatur tanda tangan & PIN.'}</div></div>` : ''}
    <div class="alert-inline alert-info-soft mb-0"><i class="bi bi-person-lock"></i><div><strong>Batasan otoritas (RBAC):</strong> nama unit, kode, PIC, dan jenis akun hanya dapat diubah oleh Admin Surat untuk menjaga integritas data lintas yayasan.</div></div>`;
  byId('setProtokol').innerHTML = `
    <li><div class="pt"><i class="bi bi-lock"></i> Lockout policy (${k.maks_percobaan_login}\u00D7 percobaan)</div><div class="pd">Akun dikunci otomatis ${k.kunci_menit} menit bila password salah ${k.maks_percobaan_login} kali berturut-turut.</div></li>
    <li><div class="pt"><i class="bi bi-stopwatch"></i> Idle session timeout (${k.sesi_idle_menit} menit)</div><div class="pd">Tanpa aktivitas selama ${k.sesi_idle_menit} menit, sesi ditutup dan wajib login ulang.</div></li>
    <li><div class="pt"><i class="bi bi-journal-check"></i> Audit trail permanen</div><div class="pd">Login, pengiriman, perubahan, penghapusan, dan pencetakan dicatat di Log_Aktivitas dan tidak dapat dihapus operator unit.</div></li>`;
  const ident = S.identitas;
  byId('setKontak').innerHTML = [['Admin Surat', 'Sekretariat Pengurus'], ident.telepon ? ['Telepon', ident.telepon] : null, ident.email ? ['Email', ident.email] : null].filter(Boolean).map(r => `<div><span class="text-muted-2">${esc(r[0])}</span><strong>${esc(r[1])}</strong></div>`).join('');
  byId('prefPoll').checked = pref('poll', true);
  byId('prefBunyi').checked = pref('bunyi', false);
  byId('prefGelap').checked = document.documentElement.getAttribute('data-theme') === 'dark';
  if (!byId('formPass').dataset.siap) { pasangKekuatan(byId('pBaru'), byId('pStrength')); byId('formPass').dataset.siap = '1'; }
  renderIdentCard();
  renderTtdCard();
  renderPengaturanDinamis();
}

function bolehIdentitas() { return S.peran === 'Unit' && !!S.profil && S.profil.bolehIdent !== false && S.profil.level !== 'Operator'; }
function renderIdentCard() {
  const w = byId('setIdent'); if (!w || !S.profil) return;
  const id = S.identUnit, boleh = bolehIdentitas(), f = logoUnitFile(S.unit), nama = namaTampil(S.unit);
  w.innerHTML = `<div class="card-head"><div><h3 class="card-title"><i class="bi bi-building"></i> Logo &amp; Nama Sekolah</h3><div class="card-sub">Tampil di sidebar, beranda, dan kop cetak unit ini. Logo halaman login diatur Admin Surat.</div></div>${f ? '<span class="chip chip-ok">LOGO SEKOLAH</span>' : '<span class="chip">LOGO YAYASAN</span>'}</div>
    <div class="ttd-card"><div class="emblem ident-prev${f ? ' emblem-unit' : ''}">${f ? imgLogoUnit(S.unit) : htmlEmblemYayasan()}</div>
      <div class="min-w-0"><div class="ml">Nama sekolah (tampilan)</div><div class="mv">${esc(nama)}</div>
        <div class="ms">Nama unit pada surat, login &amp; register: <strong>${esc(S.unit)}</strong> (tetap)</div>
        ${id && id.at ? `<div class="ms">Diperbarui ${fmtWaktu(id.at)}${id.oleh ? ' oleh ' + esc(id.oleh) : ''}</div>` : ''}</div></div>
    ${boleh ? `<div class="d-flex justify-content-end mt-2"><button type="button" class="btn ${id ? 'btn-outline' : 'btn-primary'}" id="btnIdentAtur"><i class="bi bi-pencil-square"></i> ${id ? 'Ubah logo &amp; nama' : 'Atur logo &amp; nama sekolah'}</button></div>`
      : `<div class="alert-inline alert-info-soft mb-0"><i class="bi bi-person-lock"></i><div><strong>Akun Operator.</strong> Logo dan nama sekolah hanya dapat diubah dari akun <strong>${esc(S.unit)} (Pimpinan)</strong>.</div></div>`}`;
  if (boleh) byId('btnIdentAtur').onclick = bukaIdent;
  isiLogo(w);
}

const IDN = { baru: '', hapus: false };
function bukaIdent() {
  if (!bolehIdentitas()) return;
  IDN.baru = ''; IDN.hapus = false;
  byId('idnNama').value = (S.identUnit && S.identUnit.nama) || '';
  byId('idnNamaHint').innerHTML = 'Kosongkan untuk memakai nama unit <strong>' + esc(S.unit) + '</strong>. Nama unit pada surat, login, dan register Admin tidak berubah.';
  byId('idnFile').value = ''; byId('idnErr').textContent = '';
  renderIdnPratinjau();
  modal('mIdent').show();
}
function renderIdnPratinjau() {
  const f = logoUnitFile(S.unit), lama = !IDN.baru && !IDN.hapus && !!f, kustom = !!IDN.baru || lama;
  const isi = IDN.baru ? `<img src="${attr(IDN.baru)}" alt="Logo baru" class="siap">` : lama ? imgLogoUnit(S.unit) : htmlEmblemYayasan();
  const el = byId('idnLogo');
  el.className = 'emblem idn-emblem' + (kustom ? ' emblem-unit' : '');
  el.innerHTML = isi;
  byId('idnHapus').disabled = !kustom;
  const k = S.identitas, nama = byId('idnNama').value.trim().replace(/\s+/g, ' ') || S.unit;
  byId('idnKop').innerHTML = `<div class="kop"><div class="emblem${kustom ? ' emblem-unit' : ''}">${isi}</div><div class="kop-text"><div class="kop-yys">${esc(k.nama_yayasan || 'Yayasan Masjid Panglima Besar Soedirman')}</div><div class="kop-unit">${esc(nama)}</div>${k.alamat ? `<div class="kop-addr">${esc(k.alamat)}</div>` : ''}</div></div>`;
  isiLogo(byId('mIdent'));
}
function olahLogo(file) {
  return new Promise((ok, no) => {
    if (!file) { no(new Error('Tidak ada berkas yang dipilih.')); return; }
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { no(new Error('Gunakan gambar PNG, JPG, atau WebP.')); return; }
    if (file.size > 5 * 1024 * 1024) { no(new Error('Gambar terlalu besar (maks 5 MB).')); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const W = img.naturalWidth, H = img.naturalHeight;
      if (W < 16 || H < 16) { no(new Error('Gambar terlalu kecil (minimal 16 piksel).')); return; }
      const k = Math.min(1, 256 / Math.max(W, H)), w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, w, h);
      let data = cv.toDataURL('image/png');
      if (data.length > 200000) {
        const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
        const x = c2.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(cv, 0, 0);
        data = c2.toDataURL('image/jpeg', 0.9);
      }
      ok(data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('Gambar tidak dapat dibaca.')); };
    img.src = url;
  });
}
async function simpanIdent(ev) {
  ev.preventDefault();
  const err = byId('idnErr'); err.textContent = '';
  const nama = byId('idnNama').value.trim().replace(/\s+/g, ' ');
  if (nama && nama.length < 3) { err.textContent = 'Nama sekolah minimal 3 karakter, atau kosongkan untuk memakai nama unit.'; byId('idnNama').focus(); return; }
  const btn = byId('btnIdnSimpan'); sibuk(btn, true, 'Menyimpan...');
  try {
    const res = await api('simpanIdentitasUnit', S.token, { nama, logo: IDN.baru || '', hapusLogo: !IDN.baru && IDN.hapus });
    if (!res.success) { err.textContent = res.message; return; }
    const d = res.data || null;
    if (IDN.baru && d && d.logo) { LOGO.img.set(d.logo, IDN.baru); simpanLogoLokal(d.logo, IDN.baru); }
    S.identUnit = d;
    const u = S.unitMap[S.unit];
    if (u) { if (d && d.nama) u.t = d.nama; else delete u.t; if (d && d.logo) u.lg = d.logo; else delete u.lg; }
    simpanCache();
    modal('mIdent').hide();
    terapkanIdentUnit(); renderIdentCard();
    toast(res.message === 'Tidak ada perubahan.' ? 'Tidak ada perubahan' : 'Identitas sekolah tersimpan', res.message === 'Tidak ada perubahan.' ? '' : 'Logo dan nama langsung dipakai di sidebar, beranda, dan kop cetak.', 'success');
  } catch (e) { if (!e.ditangani) err.textContent = pesanError(e); }
  finally { sibuk(btn, false); }
}
function pasangEventIdent() {
  const pilih = async file => {
    const err = byId('idnErr'); err.textContent = '';
    try { IDN.baru = await olahLogo(file); IDN.hapus = false; renderIdnPratinjau(); }
    catch (e) { err.textContent = pesanError(e); }
  };
  byId('idnFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) pilih(f); });
  byId('idnHapus').addEventListener('click', () => { IDN.baru = ''; IDN.hapus = true; renderIdnPratinjau(); });
  byId('idnNama').addEventListener('input', debounce(renderIdnPratinjau, 120));
  const dz = byId('idnDrop');
  ['dragenter', 'dragover'].forEach(n => dz.addEventListener(n, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(n => dz.addEventListener(n, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) pilih(f); });
  byId('formIdent').addEventListener('submit', simpanIdent);
}
function renderPengaturanDinamis() {
  byId('setSesi').innerHTML = (S.sesi.length ? S.sesi : [{ ini: true, i: Date.now(), ua: infoPerangkat(), akhir: Date.now() }]).map(x => `
    <div class="sess${x.ini ? ' ini' : ''}"><div class="sess-ic"><i class="bi ${/HP|Android|iOS/.test(x.ua) ? 'bi-phone' : 'bi-display'}"></i></div><div class="min-w-0 flex-grow-1"><div class="sess-t">${esc(x.ua || 'Perangkat')} ${x.ini ? '<span class="chip chip-ok">SESI SAAT INI</span>' : ''}</div><div class="sess-d">Masuk ${fmtWaktu(x.i)} \u00B7 aktif terakhir ${lalu(x.akhir)}</div></div>${x.ini ? '<i class="bi bi-patch-check-fill" style="color:var(--ok-ink)"></i>' : ''}</div>`).join('');
  byId('setLog').innerHTML = S.log.length ? S.log.map(l => `<div><span class="lw">[${fmtTglMs(l.w)} ${fmtJam(l.w)}]</span> <span class="la">${esc(l.a)}</span> ${esc(l.t || '')} ${l.k ? '\u2014 ' + esc(l.k) : ''}${l.p && /[(][^)]+[)]$/.test(l.p) ? ' <span class="text-muted-2">\u00B7 oleh ' + esc(l.p.replace(/^.*[(]([^)]+)[)]$/, '$1')) + '</span>' : ''}</div>`).join('') : '<div>Belum ada aktivitas tercatat.</div>';
}
async function simpanPassword(ev, ids, btn) {
  ev.preventDefault();
  const lama = byId(ids[0]).value, baru = byId(ids[1]).value, ulang = byId(ids[2]).value, err = byId(ids[3]);
  err.textContent = cekSandi(baru) || (baru !== ulang ? 'Konfirmasi password tidak sama.' : '') || (!lama ? 'Isi password saat ini.' : '');
  if (err.textContent) return;
  sibuk(btn, true, 'Menyimpan\u2026');
  try {
    const res = await api('gantiPassword', S.token, lama, baru);
    if (!res.success) { err.textContent = res.message; return; }
    S.token = res.data.token; store.set('yasma_token', S.token, true);
    ev.target.reset(); ev.target.querySelectorAll('.strength').forEach(x => x.innerHTML = '');
    toast('Password diperbarui', 'Sesi di perangkat lain telah diputus.', 'success');
    S.sesi = S.sesi.filter(x => x.ini);
    if (S.view === 'pengaturan') renderPengaturanDinamis();
  } catch (e) { if (!e.ditangani) err.textContent = pesanError(e); }
  finally { sibuk(btn, false); }
}

function pasangEventUnit() {
  byId('btnAgenda').addEventListener('click', () => go('cetak', { agenda: true, dari: 'keluar' }));
  byId('btnKeluarXlsx').addEventListener('click', () => eksporXlsx('keluar'));
  byId('btnMasukXlsx').addEventListener('click', () => eksporXlsx('masuk'));
  byId('btnNotifSemua').addEventListener('click', tandaiSemuaNotif);
  byId('btnNotifSegar').addEventListener('click', async () => { const b = byId('btnNotifSegar'); sibuk(b, true, 'Memeriksa\u2026'); await pollSekarang(true); sibuk(b, false); renderNotif(); });
  const nf = () => { const f = S.f.notif; f.q = byId('nfQ').value; f.sifat = byId('nfSifat').value; f.status = byId('nfStatus').value; f.hari = byId('nfHari').value; f.hal = 1; renderNotif(); };
  byId('nfQ').addEventListener('input', debounce(nf, 120));
  ['nfSifat', 'nfStatus', 'nfHari'].forEach(id => byId(id).addEventListener('change', nf));
  byId('formPass').addEventListener('submit', ev => simpanPassword(ev, ['pLama', 'pBaru', 'pUlang', 'pErr'], byId('btnPassSimpan')));
  byId('formPass').addEventListener('reset', () => { byId('pErr').textContent = ''; setTimeout(() => byId('pBaru').dispatchEvent(new Event('input')), 0); });
  byId('prefPoll').addEventListener('change', e => { setPref('poll', e.target.checked); toast(e.target.checked ? 'Pembaruan otomatis aktif' : 'Pembaruan otomatis dimatikan', e.target.checked ? '' : 'Gunakan tombol Sinkronkan untuk memeriksa surat baru.', 'info'); });
  byId('prefBunyi').addEventListener('change', e => { setPref('bunyi', e.target.checked); if (e.target.checked) bunyi(); });
  byId('prefGelap').addEventListener('change', e => { if (e.target.checked !== (document.documentElement.getAttribute('data-theme') === 'dark')) toggleTema(); });
  byId('btnPutusSesi').addEventListener('click', async () => {
    if (!await konfirmasi('Putuskan Sesi Lain', '<p class="mb-0">Semua perangkat lain yang masuk dengan akun <strong>' + esc(labelSaya()) + '</strong> akan dikeluarkan. Sesi di perangkat ini tetap aktif.</p>', { ya: 'Putuskan', bahaya: true })) return;
    try {
      const res = await api('putuskanSesiLain', S.token);
      if (!res.success) { toast('Gagal', res.message, 'danger'); return; }
      S.token = res.data.token; store.set('yasma_token', S.token, true);
      S.sesi = S.sesi.filter(x => x.ini); renderPengaturanDinamis();
      toast('Sesi lain diputuskan', res.message, 'success');
    } catch (e) { if (!e.ditangani) toast('Gagal', pesanError(e), 'danger'); }
  });
  byId('dispCatatan').addEventListener('input', e => byId('cDisp').textContent = e.target.value.length + ' / 2000');
  pasangEventTulis();
  pasangEventCetak();
  pasangEventDisposisi();
  pasangEventIdent();
}


class PemilihUnit {
  constructor(el, o) {
    this.el = el; this.o = o || {}; this.pilih = new Set(o.awal || []); this.hl = -1;
    this.daftar = S.unitList.filter(u => !(this.o.kecuali || []).includes(u.n));
    this.render();
  }
  nilai() { return Array.from(this.pilih); }
  set(arr) { this.pilih = new Set(arr); this.renderPilih(); }
  render() {
    const g = k => this.daftar.filter(u => u.g === k).length;
    this.el.innerHTML = `
      <div class="picker-quick"><span class="pq-l">Tombol cepat:</span>
        <button type="button" class="chip-btn" data-q="Sekolah">+ Semua Unit Sekolah (${g('Sekolah')})</button>
        <button type="button" class="chip-btn" data-q="Majelis">+ Seluruh Majelis (${g('Majelis')})</button>
        <button type="button" class="chip-btn" data-q="Yayasan">+ Lembaga Yayasan (${g('Yayasan')})</button>
        <button type="button" class="chip-btn" data-q="*">+ Semua (${this.daftar.length})</button>
        <button type="button" class="link-btn small ms-auto" data-q="-">Bersihkan</button></div>
      <div class="picker-search"><div class="search-box w-100"><i class="bi bi-search"></i><input type="search" class="input" placeholder="Ketik nama unit (misal: SMP Bekasi-2, Majelis MPDM, UKY)\u2026" aria-label="Cari unit tujuan" autocomplete="off"></div><div class="picker-drop" hidden></div></div>
      <div class="picker-sel-l"><span>Unit terpilih saat ini (<b data-n>0</b> destinasi)</span><span class="chip chip-ok">MULTI-PENERIMA</span></div>
      <div class="picker-sel" data-sel></div>`;
    const inp = $('input', this.el), drop = $('.picker-drop', this.el);
    $$('[data-q]', this.el).forEach(b => b.onclick = () => {
      const q = b.dataset.q;
      if (q === '-') this.pilih.clear();
      else this.daftar.filter(u => q === '*' || u.g === q).forEach(u => this.pilih.add(u.n));
      this.renderPilih(); this.ubah();
    });
    const tampil = () => {
      const q = inp.value.trim().toLowerCase();
      const hasil = this.daftar.filter(u => !q || u.n.toLowerCase().includes(q) || (u.k || '').toLowerCase().includes(q));
      this.hasil = hasil; this.hl = hasil.length ? 0 : -1;
      drop.innerHTML = hasil.length ? hasil.map((u, i) => `<button type="button" class="pd-item${this.pilih.has(u.n) ? ' on' : ''}${i === 0 ? ' hl' : ''}" data-u="${attr(u.n)}"><i class="bi ${this.pilih.has(u.n) ? 'bi-check-square-fill' : 'bi-square'}"></i>${esc(u.n)}<span class="pd-k">${esc(u.k || '')} \u00B7 ${esc(u.g || '')}${this.o.catatan && this.o.catatan(u.n) ? ' \u00B7 ' + esc(this.o.catatan(u.n)) : ''}</span></button>`).join('') : '<div class="qs-empty">Unit tidak ditemukan.</div>';
      drop.hidden = false;
      $$('[data-u]', drop).forEach(b => b.onmousedown = e => { e.preventDefault(); this.toggle(b.dataset.u); tampil(); });
    };
    inp.addEventListener('focus', tampil);
    inp.addEventListener('input', tampil);
    inp.addEventListener('blur', () => setTimeout(() => drop.hidden = true, 120));
    inp.addEventListener('keydown', e => {
      const items = $$('[data-u]', drop);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!items.length) return; this.hl = (this.hl + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((x, i) => x.classList.toggle('hl', i === this.hl)); items[this.hl].scrollIntoView({ block: 'nearest' }); }
      if (e.key === 'Enter') { e.preventDefault(); if (items[this.hl]) { this.toggle(items[this.hl].dataset.u); inp.value = ''; tampil(); } }
      if (e.key === 'Escape') drop.hidden = true;
    });
    this.renderPilih();
  }
  toggle(n) { if (this.pilih.has(n)) this.pilih.delete(n); else this.pilih.add(n); this.renderPilih(); this.ubah(); }
  ubah() { this.o.onUbah && this.o.onUbah(this.nilai()); }
  renderPilih() {
    const w = $('[data-sel]', this.el), arr = this.nilai();
    $('[data-n]', this.el).textContent = arr.length;
    w.classList.toggle('empty-sel', !arr.length);
    w.innerHTML = arr.length ? arr.map(n => `<span class="sel-chip"><i class="dot"></i>${esc(n)} <span class="sc-k">${esc((S.unitMap[n] || {}).k || '')}</span><button type="button" data-x="${attr(n)}" aria-label="Hapus ${attr(n)}"><i class="bi bi-x-lg"></i></button></span>`).join('') : 'Belum ada unit dipilih \u2014 gunakan tombol cepat atau ketik nama unit.';
    $$('[data-x]', w).forEach(b => b.onclick = () => this.toggle(b.dataset.x));
  }
}


const T = { mode: 'baru', induk: null, idUbah: null, picker: null, berkas: [], lampLama: [], hapusLama: new Set(), kotor: false, aktifUnggah: 0 };
const TEMPLATE_BALAS = {
  hadir: 'Menindaklanjuti surat tersebut, dengan ini kami sampaikan bahwa:\n1. Pimpinan unit beserta tim terkait SIAP HADIR sesuai jadwal yang ditentukan.\n2. Nama delegasi yang hadir: \u2026\n\nDemikian konfirmasi ini kami sampaikan. Atas perhatiannya kami ucapkan terima kasih.',
  jadwal: 'Menindaklanjuti surat tersebut, dengan hormat kami mengajukan permohonan penjadwalan ulang karena \u2026\n\nKami mengusulkan alternatif waktu pada: \u2026\n\nDemikian permohonan ini kami sampaikan. Atas perhatian dan kebijaksanaannya kami ucapkan terima kasih.',
  berkas: 'Menindaklanjuti surat tersebut, bersama ini kami sampaikan berkas yang diminta sebagaimana terlampir:\n1. \u2026\n2. \u2026\n\nDemikian kami sampaikan untuk dipergunakan sebagaimana mestinya.'
};
const kunciDraf = () => 'yasma_draf_' + (S.profil ? S.profil.id : 'x') + '_' + (T.mode === 'balas' ? T.induk : T.mode === 'ubah' ? 'ubah_' + T.idUbah : 'baru');

function bukaTulis(p) {
  T.mode = p.mode || 'baru'; T.induk = p.induk || null; T.idUbah = p.id || null;
  T.berkas = []; T.lampLama = []; T.hapusLama = new Set(); T.kotor = false;
  const induk = T.induk ? S.surat.get(T.induk) : null, edit = T.idUbah ? S.surat.get(T.idUbah) : null;
  if ((T.mode === 'balas' && !induk) || (T.mode === 'ubah' && !edit)) { toast('Surat tidak ditemukan', 'Kembali ke daftar surat.', 'warning'); kembali(); return; }
  byId('tulisJudul').textContent = T.mode === 'balas' ? 'Balas Surat Naskah Dinas Masuk' : T.mode === 'ubah' ? 'Ubah Surat Keluar' : 'Tulis & Kirim Surat Baru Antarunit';
  byId('tulisSub').textContent = T.mode === 'balas' ? 'FORMULIR BALASAN RESMI \/\/ TUJUAN DIKUNCI KE PENGIRIM ASAL' : T.mode === 'ubah' ? 'MODE PENYUNTINGAN \/\/ PERUBAHAN TERCATAT DI LOG AKTIVITAS' : 'SISTEM PENGIRIMAN NASKAH DINAS RESMI \/\/ UNIT PENGIRIM: ' + (S.profil.kode || '');
  byId('btnKirimLabel').textContent = T.mode === 'balas' ? 'Kirim Balasan' : T.mode === 'ubah' ? 'Simpan Perubahan' : 'Kirim Surat Sekarang';
  byId('templateBox').hidden = T.mode !== 'balas';
  byId('btnBuangDraf').hidden = T.mode === 'ubah';
  byId('btnSimpanDraf').hidden = T.mode === 'ubah';
  byId('draftChip').hidden = true;

  const ref = byId('tulisInduk');
  if (induk) {
    const d = suratDasar(induk);
    ref.hidden = false;
    ref.innerHTML = `<div class="d-flex justify-content-between flex-wrap gap-2"><span class="ref-tag">SURAT RUJUKAN INDUK (REFERENSI)</span><span class="mono small t-danger">ID: ${esc(induk.id.slice(-10).toUpperCase())}</span></div>
      <div class="ref-grid"><div><div class="ml">Nomor surat asal</div><div class="mv">${esc(d.no)}</div></div><div><div class="ml">Tanggal diterbitkan</div><div class="mv">${fmtTgl(d.tgl)}</div></div><div><div class="ml">Pengirim asal (tujuan balasan)</div><div class="mv">${esc(induk.dari)}</div></div><div><div class="ml">Sifat</div><div class="mv">${esc(d.sifat)}</div></div></div>
      <div class="ml mt-2" style="font-family:var(--f-head);font-size:10px;letter-spacing:.08em;color:var(--muted-2)">PERIHAL SURAT ASAL</div><div class="ref-title">"${esc(d.hal)}"</div>`;
  } else ref.hidden = true;

  const locked = byId('tujuanLocked');
  if (T.mode === 'balas' || (edit && edit.jenis === 'Balasan')) {
    const ke = T.mode === 'balas' ? induk.dari : edit.ke[0].u;
    locked.hidden = false; locked.innerHTML = `<i class="bi bi-lock-fill"></i> ${esc(ke)} <span class="chip chip-ok">TERKUNCI \u00B7 PENGIRIM ASAL</span>`;
    byId('tujuanPicker').hidden = true; T.picker = { nilai: () => [ke], set() {} };
  } else {
    locked.hidden = true; byId('tujuanPicker').hidden = false;
    const sudahBaca = edit ? new Set(edit.ke.filter(k => k.st !== 'Terkirim').map(k => k.u)) : new Set();
    T.picker = new PemilihUnit(byId('tujuanPicker'), { kecuali: [S.unit], awal: edit ? edit.ke.map(k => k.u) : [], onUbah: () => { T.kotor = true; ringkasTulis(); autoDraf(); }, catatan: u => sudahBaca.has(u) ? 'sudah membaca' : '' });
  }

  const isiForm = (o) => {
    byId('fTanggal').value = o.tgl || isoHari();
    byId('fNomor').value = o.no || '';
    byId('fPerihal').value = o.hal || '';
    byId('fIsi').value = o.isi || '';
    $$('input[name="sifat"]').forEach(r => r.checked = r.value === (o.sifat || 'Biasa'));
  };
  if (edit) {
    isiForm(edit); T.lampLama = (edit.lamp || []).slice();
  } else {
    const draf = store.json(kunciDraf());
    if (draf) {
      isiForm(draf); if (draf.tujuan && T.mode === 'baru') T.picker.set(draf.tujuan);
      T.berkas = (draf.berkas || []).map(b => Object.assign(b, { status: 'selesai' }));
      byId('draftChip').hidden = false; $('span:last-child', byId('draftChip')).textContent = 'Draf dipulihkan \u00B7 ' + fmtJam(draf.waktu);
    } else if (T.mode === 'balas') {
      const d = suratDasar(induk);
      isiForm({ hal: (/^tanggapan:/i.test(d.hal) ? '' : 'Tanggapan: ') + d.hal, sifat: d.sifat === 'Rahasia' ? 'Rahasia' : 'Biasa', isi: '' });
    } else isiForm({});
  }
  renderBerkas(); cekNomor(); hitungKarakter(); ringkasTulis();
  setTimeout(() => (T.mode === 'balas' ? byId('fNomor') : byId(edit ? 'fPerihal' : 'fNomor')).focus({ preventScroll: true }), 80);
}

function hitungKarakter() {
  byId('cPerihal').textContent = byId('fPerihal').value.length + ' / 250';
  byId('cIsi').textContent = byId('fIsi').value.length + ' / 5000';
}
function sifatTerpilih() { const r = $('input[name="sifat"]:checked'); return r ? r.value : 'Biasa'; }

function cekNomor() {
  const v = byId('fNomor').value.trim(), st = byId('nomorState'), info = byId('nomorInfo');
  if (!v) { st.innerHTML = ''; info.hidden = true; byId('fNomor').classList.remove('is-valid', 'is-invalid'); return true; }
  const norm = x => String(x).toUpperCase().replace(/\s+/g, '');
  const asli = T.idUbah && S.surat.get(T.idUbah);
  const ganda = asli && norm(asli.no) === norm(v) ? null : kotakKeluar().find(s => s.id !== T.idUbah && s.jenis !== 'Disposisi' && !s._gagal && norm(s.no) === norm(v));
  info.hidden = false;
  if (ganda) {
    st.className = 'input-state warn'; st.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i>';
    info.className = 'status-box warn'; info.innerHTML = `<i class="bi bi-exclamation-triangle"></i><div><div class="sb-h">Peringatan: nomor sudah dipakai</div>Nomor ini tercatat pada surat "${esc(ganda.hal)}" (${fmtTgl(ganda.tgl)}). Sistem tetap mengizinkan bila memang disengaja.</div>`;
    byId('fNomor').classList.remove('is-valid');
    return false;
  }
  st.className = 'input-state ok'; st.innerHTML = '<i class="bi bi-check-circle"></i>';
  info.className = 'status-box ok'; info.innerHTML = `<i class="bi bi-check2-circle"></i><div><div class="sb-h">Status register: valid &amp; tersedia</div>Nomor belum tercatat di buku agenda keluar unit Anda.</div>`;
  byId('fNomor').classList.add('is-valid'); byId('fNomor').classList.remove('is-invalid');
  return true;
}
function usulkanNomor() {
  const th = new Date().getFullYear();
  let maks = 0;
  kotakKeluar().forEach(s => { if (s.jenis === 'Disposisi' || new Date(s.at).getFullYear() !== th) return; const m = String(s.no).match(/^(\d{1,5})/); if (m) maks = Math.max(maks, +m[1]); });
  const tgl = byId('fTanggal').value ? new Date(tglKeMs(byId('fTanggal').value)) : new Date();
  byId('fNomor').value = pad(maks + 1, 3) + '/' + (S.profil.kode || 'UNIT') + '/' + ROMAWI[tgl.getMonth()] + '/' + tgl.getFullYear();
  cekNomor(); ringkasTulis(); autoDraf(); T.kotor = true;
}

function ringkasTulis() {
  const tujuan = T.picker ? T.picker.nilai() : [], sifat = sifatTerpilih();
  const berkas = T.lampLama.filter(l => !T.hapusLama.has(l.id)).map(l => ({ kb: l.kb })).concat(T.berkas.filter(b => b.status !== 'gagal').map(b => ({ kb: Math.round(b.ukuran / 1024) })));
  const totalKb = berkas.reduce((a, b) => a + (+b.kb || 0), 0);
  byId('tulisRingkas').innerHTML = `
    <dt>Status alur</dt><dd><span class="chip chip-info">${T.mode === 'ubah' ? 'SUNTING' : T.mode === 'balas' ? 'DRAF BALASAN' : 'DRAF KELUAR'}</span></dd>
    <dt>Sifat distribusi</dt><dd>${badgeSifat(sifat)}</dd>
    <dt>Total penerima</dt><dd>${tujuan.length} unit kerja</dd>
    <dt>Total lampiran</dt><dd>${berkas.length} berkas (${fmtKb(totalKb)})</dd>
    <dt>Unggahan</dt><dd>${T.aktifUnggah ? `<span class="t-warn">${T.aktifUnggah} berjalan\u2026</span>` : 'Siap'}</dd>`;
  const no = byId('fNomor').value.trim(), hal = byId('fPerihal').value.trim();
  byId('tulisPreview').innerHTML = `<p class="small text-muted-2 mb-2">Tampilan naskah saat masuk ke kotak penerima:</p><div class="preview-inbox"><div class="pi-top"><span class="pi-from">DARI: ${esc(S.profil.kode || S.unit)}</span><span class="pi-new">Baru saja</span></div><div class="pi-no">${esc(no || '\u2014/\u2014/\u2014')}</div><div class="pi-hal">${esc(hal || 'Perihal surat akan tampil di sini')}</div><div class="pi-foot"><i class="bi bi-paperclip"></i> ${berkas.length} lampiran \u00B7 ${badgeSifat(sifat)}</div></div>`;
  const kirim = byId('btnKirim');
  kirim.disabled = T.aktifUnggah > 0;
  byId('btnKirimLabel').textContent = T.aktifUnggah ? 'Menunggu unggahan\u2026' : (T.mode === 'balas' ? 'Kirim Balasan' : T.mode === 'ubah' ? 'Simpan Perubahan' : 'Kirim Surat Sekarang');
}

function dataDraf() {
  return { no: byId('fNomor').value, tgl: byId('fTanggal').value, hal: byId('fPerihal').value, isi: byId('fIsi').value, sifat: sifatTerpilih(), tujuan: T.mode === 'baru' && T.picker ? T.picker.nilai() : [], berkas: T.berkas.filter(b => b.status === 'selesai').map(b => ({ fileId: b.fileId, nama: b.nama, ukuran: b.ukuran, mime: b.mime })), waktu: Date.now() };
}
const autoDraf = debounce(() => { if (S.view === 'tulis' && T.mode !== 'ubah' && T.kotor) simpanDraf(true); }, 900);
function simpanDraf(diam) {
  if (T.mode === 'ubah') return;
  const d = dataDraf();
  if (!d.no && !d.hal && !d.isi && !d.tujuan.length && !d.berkas.length) return;
  store.set(kunciDraf(), JSON.stringify(d));
  const c = byId('draftChip'); c.hidden = false; $('span:last-child', c).textContent = 'Draf otomatis tersimpan \u00B7 ' + fmtJam(d.waktu);
  if (!diam) toast('Draf tersimpan', 'Draf tersimpan di perangkat ini dan akan dipulihkan saat formulir dibuka.', 'success');
}
function tulisSimpanDrafDiam() { if (T.kotor && T.mode !== 'ubah') simpanDraf(true); }
async function buangDraf() {
  if (!await konfirmasi('Buang Draf', '<p class="mb-0">Kosongkan formulir dan hapus draf tersimpan? Lampiran yang sudah diunggah akan dibatalkan.</p>', { ya: 'Buang draf', bahaya: true })) return;
  T.berkas.forEach(b => { if (b.fileId) api('batalUnggah', S.token, b.fileId).catch(() => {}); b.batal = true; });
  store.del(kunciDraf()); T.kotor = false;
  bukaTulis({ mode: T.mode, induk: T.induk });
  toast('Draf dibuang', '', 'info');
}

function renderBerkas() {
  const lama = T.lampLama.map(l => `<div class="fl${T.hapusLama.has(l.id) ? ' err' : ' done'}"><div class="att-ic ${ext(l.n) === 'pdf' ? 'pdf' : ''}" style="width:38px;height:38px">${esc(ext(l.n).toUpperCase())}</div><div class="fl-body"><div class="fl-name">${esc(l.n)}</div><div class="fl-meta">${fmtKb(l.kb)} \u00B7 ${T.hapusLama.has(l.id) ? '<span class="t-danger">AKAN DIHAPUS saat disimpan</span>' : 'TERSIMPAN DI DRIVE'}</div></div><button type="button" class="fl-x" data-lama="${attr(l.id)}" aria-label="${T.hapusLama.has(l.id) ? 'Batalkan hapus' : 'Hapus lampiran'}"><i class="bi ${T.hapusLama.has(l.id) ? 'bi-arrow-counterclockwise' : 'bi-x-lg'}"></i></button></div>`).join('');
  const baru = T.berkas.map(b => {
    const pct = Math.round((b.terkirim || 0) / b.ukuran * 100);
    const meta = b.status === 'selesai' ? '<span class="t-ok">TERUNGGAH KE DRIVE \u2713</span>' : b.status === 'gagal' ? `<span class="t-danger">${esc(b.galat || 'Gagal')}</span>` : `Mengunggah ke Drive\u2026 ${pct}% (${fmtByte(b.terkirim || 0)} / ${fmtByte(b.ukuran)})`;
    return `<div class="fl ${b.status === 'selesai' ? 'done' : b.status === 'gagal' ? 'err' : ''}"><div class="att-ic ${ext(b.nama) === 'pdf' ? 'pdf' : ''}" style="width:38px;height:38px">${esc(ext(b.nama).toUpperCase())}</div><div class="fl-body"><div class="fl-name">${esc(b.nama)}</div><div class="fl-meta">${fmtByte(b.ukuran)} \u00B7 ${meta}</div>${b.status === 'unggah' ? `<div class="progress-thin"><span style="width:${pct}%"></span></div>` : ''}</div>${b.status === 'gagal' ? `<button type="button" class="fl-x" data-ulang="${attr(b.lid)}" aria-label="Unggah ulang"><i class="bi bi-arrow-repeat"></i></button>` : ''}<button type="button" class="fl-x" data-x="${attr(b.lid)}" aria-label="Hapus berkas"><i class="bi bi-x-lg"></i></button></div>`;
  }).join('');
  const total = T.lampLama.filter(l => !T.hapusLama.has(l.id)).length + T.berkas.filter(b => b.status !== 'gagal').length;
  byId('fileList').innerHTML = (lama || baru) ? `<div class="d-flex justify-content-between small text-muted-2 mono"><span>BERKAS TERLAMPIR (${total} ITEM)</span><span>Maks ${S.konfig.maks_lampiran} berkas \u00B7 ${S.konfig.maks_mb} MB/berkas</span></div>` + lama + baru : '';
  $$('[data-x]', byId('fileList')).forEach(b => b.onclick = () => hapusBerkas(b.dataset.x));
  $$('[data-ulang]', byId('fileList')).forEach(b => b.onclick = () => { const f = T.berkas.find(x => x.lid === b.dataset.ulang); if (f && f.file) { f.status = 'unggah'; f.terkirim = 0; unggah(f); } else toast('Pilih ulang berkas', 'Berkas asli tidak tersedia lagi. Pilih berkas kembali.', 'warning'); });
  $$('[data-lama]', byId('fileList')).forEach(b => b.onclick = () => { const id = b.dataset.lama; if (T.hapusLama.has(id)) T.hapusLama.delete(id); else T.hapusLama.add(id); T.kotor = true; renderBerkas(); ringkasTulis(); });
}
function tambahBerkas(files) {
  const ekstensi = S.konfig.ekstensi || [], maksB = S.konfig.maks_mb * 1048576;
  Array.from(files).forEach(file => {
    const total = T.lampLama.filter(l => !T.hapusLama.has(l.id)).length + T.berkas.filter(b => b.status !== 'gagal').length;
    if (total >= S.konfig.maks_lampiran) { toast('Batas lampiran', 'Maksimal ' + S.konfig.maks_lampiran + ' berkas per surat.', 'warning'); return; }
    if (!ekstensi.includes(ext(file.name))) { toast('Format tidak didukung', file.name + ' \u2014 gunakan ' + ekstensi.join(', ').toUpperCase() + '.', 'warning'); return; }
    if (file.size > maksB) { toast('Berkas terlalu besar', file.name + ' (' + fmtByte(file.size) + ') melebihi ' + S.konfig.maks_mb + ' MB.', 'warning'); return; }
    if (!file.size) { toast('Berkas kosong', file.name, 'warning'); return; }
    const b = { lid: uid('f'), file, nama: file.name, ukuran: file.size, mime: file.type || 'application/octet-stream', status: 'unggah', terkirim: 0 };
    T.berkas.push(b); T.kotor = true;
    unggah(b);
  });
  renderBerkas(); ringkasTulis();
}
async function unggah(b) {
  T.aktifUnggah++; ringkasTulis();
  try {
    const mulai = await api('mulaiUnggah', S.token, { nama: b.nama, mime: b.mime, ukuran: b.ukuran });
    if (!mulai.success) throw new Error(mulai.message);
    const ukuranPotong = mulai.data.potongan || S.konfig.potongan_byte;
    for (let off = 0; off < b.ukuran; off += ukuranPotong) {
      if (b.batal) return;
      const buf = await b.file.slice(off, Math.min(b.ukuran, off + ukuranPotong)).arrayBuffer();
      const res = await api('unggahPotongan', S.token, mulai.data.idUnggah, keBase64(new Uint8Array(buf)), off);
      if (!res.success) throw new Error(res.message);
      b.terkirim = Math.min(b.ukuran, off + ukuranPotong);
      if (res.data.selesai) { b.fileId = res.data.fileId; b.status = 'selesai'; delete b.file; }
      if (S.view === 'tulis') renderBerkas();
    }
    if (b.batal && b.fileId) api('batalUnggah', S.token, b.fileId).catch(() => {});
    else if (b.status === 'selesai') autoDraf();
  } catch (e) {
    if (e.ditangani) return;
    b.status = 'gagal'; b.galat = pesanError(e);
    toast('Unggahan gagal', b.nama + ': ' + b.galat, 'danger');
  } finally {
    T.aktifUnggah = Math.max(0, T.aktifUnggah - 1);
    if (S.view === 'tulis') { renderBerkas(); ringkasTulis(); }
  }
}
function keBase64(u8) { let s = ''; const blok = 0x8000; for (let i = 0; i < u8.length; i += blok) s += String.fromCharCode.apply(null, u8.subarray(i, i + blok)); return btoa(s); }
function hapusBerkas(lid) {
  const i = T.berkas.findIndex(b => b.lid === lid); if (i < 0) return;
  const b = T.berkas[i]; b.batal = true;
  if (b.fileId) api('batalUnggah', S.token, b.fileId).catch(() => {});
  T.berkas.splice(i, 1); T.kotor = true;
  renderBerkas(); ringkasTulis(); autoDraf();
}

async function kirimTulis() {
  const no = byId('fNomor').value.trim(), tgl = byId('fTanggal').value, hal = byId('fPerihal').value.trim(), isi = byId('fIsi').value.trim(), sifat = sifatTerpilih();
  const tujuan = T.picker.nilai();
  const salah = [];
  byId('fNomor').classList.toggle('is-invalid', !no); if (!no) salah.push('nomor surat');
  byId('fTanggal').classList.toggle('is-invalid', !tgl); if (!tgl) salah.push('tanggal');
  byId('fPerihal').classList.toggle('is-invalid', !hal); if (!hal) salah.push('perihal');
  if (!tujuan.length) salah.push('unit tujuan');
  if (salah.length) { toast('Data belum lengkap', 'Lengkapi: ' + salah.join(', ') + '.', 'warning'); (byId(!no ? 'fNomor' : !tgl ? 'fTanggal' : !hal ? 'fPerihal' : 'fNomor')).focus(); return; }
  if (T.aktifUnggah) { toast('Unggahan belum selesai', 'Tunggu hingga semua lampiran terunggah.', 'warning'); return; }
  if (T.berkas.some(b => b.status === 'gagal')) { toast('Ada lampiran gagal', 'Unggah ulang atau hapus lampiran yang gagal.', 'warning'); return; }
  let konfirmasiGanda = false;
  if (!cekNomor()) {
    if (!await konfirmasi('Nomor Surat Sudah Dipakai', `<p>Nomor <strong class="mono">${esc(no)}</strong> sudah tercatat di buku agenda keluar unit Anda.</p><p class="mb-0">Tetap kirim dengan nomor yang sama?</p>`, { ya: 'Tetap kirim' })) { byId('fNomor').focus(); return; }
    konfirmasiGanda = true;
  }
  const fileIds = T.berkas.filter(b => b.status === 'selesai').map(b => b.fileId);
  const lampSementara = T.berkas.filter(b => b.status === 'selesai').map(b => ({ id: 'tmp-' + b.fileId, n: b.nama, kb: Math.max(1, Math.round(b.ukuran / 1024)), m: b.mime }));

  if (T.mode === 'ubah') { simpanUbah({ no, tgl, hal, isi, sifat, tujuan, fileIds, lampSementara, konfirmasiGanda }); return; }

  const cid = uid('c'), now = Date.now(), induk = T.induk ? S.surat.get(T.induk) : null;
  const tmp = { id: 'tmp-' + cid, no, tgl, dari: S.unit, ke: tujuan.map(u => ({ u, st: 'Terkirim', rd: 0, rp: 0 })), hal, isi, sifat, st: 'Terkirim', induk: T.induk || '', jenis: T.mode === 'balas' ? 'Balasan' : 'Surat baru', at: now, up: now, ubah: false, lamp: lampSementara, _pending: true };
  S.surat.set(tmp.id, tmp);
  if (induk) { const m = milikSaya(induk); if (m) { m.st = 'Dibalas'; m.rp = now; if (!m.rd) m.rd = now; induk.st = statusGabungan(induk.ke); kunciLokal(induk.id, 15000); } }
  const kunci = kunciDraf(), drafCadangan = dataDraf();
  store.del(kunci); T.kotor = false;
  const payload = { mode: T.mode, idInduk: T.induk, nomor: no, tanggal: tgl, tujuan, perihal: hal, isi, sifat, lampiran: fileIds, konfirmasiGanda, cid };
  toast(T.mode === 'balas' ? 'Balasan dikirim' : 'Surat dikirim', 'Ke ' + tujuan.length + ' unit \u00B7 ' + no, 'success');
  if (T.mode === 'balas') go('detail', { id: T.induk, dari: 'masuk' }, { tanpaRiwayat: true }); else go('keluar', {}, { tanpaRiwayat: true });
  kirimKeServer('kirimSurat', payload, tmp.id, res => {
    store.set(kunci, JSON.stringify(drafCadangan));
    konfirmasi('Nomor Surat Ganda', `<p>${esc(res.message)}</p><p class="mb-0">Draf dikembalikan. Kirim ulang dengan nomor yang sama?</p>`, { ya: 'Tetap kirim' }).then(ya => {
      if (ya) { payload.konfirmasiGanda = true; tmp._pending = true; S.surat.set(tmp.id, tmp); store.del(kunci); renderUlang(); kirimKeServer('kirimSurat', payload, tmp.id); }
      else go('tulis', { mode: T.mode === 'balas' ? 'balas' : 'baru', induk: payload.idInduk });
    });
  });
}

function simpanUbah(d) {
  const s = S.surat.get(T.idUbah); if (!s) return;
  const salinan = JSON.parse(JSON.stringify(s));
  const tetap = s.ke.filter(k => d.tujuan.includes(k.u));
  const terhapusSudahBaca = s.ke.filter(k => !d.tujuan.includes(k.u) && k.st !== 'Terkirim');
  if (terhapusSudahBaca.length) { toast('Tidak dapat menghapus tujuan', terhapusSudahBaca.map(k => k.u).join(', ') + ' sudah membaca surat ini.', 'warning'); return; }
  Object.assign(s, { no: d.no, tgl: d.tgl, hal: d.hal, isi: d.isi, sifat: d.sifat, up: Date.now(),
    ke: tetap.concat(d.tujuan.filter(u => !s.ke.some(k => k.u === u)).map(u => ({ u, st: 'Terkirim', rd: 0, rp: 0 }))),
    lamp: (s.lamp || []).filter(l => !T.hapusLama.has(l.id)).concat(d.lampSementara), ubah: s.ubah || s.ke.some(k => k.st !== 'Terkirim'), _pending: true });
  kunciLokal(s.id, 15000);
  const payload = { id: s.id, nomor: d.no, tanggal: d.tgl, tujuan: d.tujuan, perihal: d.hal, isi: d.isi, sifat: d.sifat, lampiranBaru: d.fileIds, lampiranHapus: Array.from(T.hapusLama), konfirmasiGanda: d.konfirmasiGanda };
  T.kotor = false;
  toast('Perubahan disimpan', s.no + ' sedang diperbarui di server\u2026', 'success');
  go('detail', { id: s.id, dari: 'keluar' }, { tanpaRiwayat: true });
  api('ubahSurat', S.token, payload).then(res => {
    if (res.success) { S.surat.set(res.data.id, res.data); simpanCache(); renderUlang(); toast('Tersimpan di server', res.message, 'success', { lama: 2500 }); }
    else { S.surat.set(salinan.id, salinan); renderUlang(); toast('Gagal menyimpan perubahan', res.message, 'danger', { lama: 9000 }); }
  }).catch(e => { if (!e.ditangani) { S.surat.set(salinan.id, salinan); renderUlang(); toast('Gagal menyimpan perubahan', pesanError(e), 'danger'); } });
}

function pasangEventTulis() {
  const tandai = () => { T.kotor = true; ringkasTulis(); autoDraf(); };
  byId('fNomor').addEventListener('input', () => { cekNomor(); tandai(); });
  byId('fTanggal').addEventListener('change', tandai);
  byId('fPerihal').addEventListener('input', () => { hitungKarakter(); byId('fPerihal').classList.remove('is-invalid'); tandai(); });
  byId('fIsi').addEventListener('input', () => { hitungKarakter(); tandai(); });
  $$('input[name="sifat"]').forEach(r => r.addEventListener('change', tandai));
  byId('btnGenNomor').addEventListener('click', usulkanNomor);
  byId('fFile').addEventListener('change', e => { tambahBerkas(e.target.files); e.target.value = ''; });
  const dz = byId('dropzone');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => tambahBerkas(e.dataTransfer.files));
  byId('btnKirim').addEventListener('click', kirimTulis);
  byId('btnSimpanDraf').addEventListener('click', () => simpanDraf(false));
  byId('btnBuangDraf').addEventListener('click', buangDraf);
  byId('tulisBack').addEventListener('click', () => kembali(T.mode === 'balas' ? 'masuk' : 'keluar'));
  $$('[data-tpl]').forEach(b => b.addEventListener('click', () => {
    const isi = byId('fIsi'), d = T.induk ? suratDasar(S.surat.get(T.induk)) : null;
    const awal = d ? 'Menindaklanjuti surat ' + d.dari + ' nomor ' + d.no + ' perihal ' + d.hal + ', ' : '';
    isi.value = (isi.value ? isi.value + '\n\n' : '') + awal + TEMPLATE_BALAS[b.dataset.tpl].replace(/^Menindaklanjuti surat tersebut, /, awal ? '' : 'Menindaklanjuti surat tersebut, ');
    hitungKarakter(); tandai(); isi.focus();
  }));
  byId('tulisForm').addEventListener('submit', e => { e.preventDefault(); kirimTulis(); });
}


const C = { mode: 'lengkap' };

function emblemKop(unit) {
  if (logoUnitFile(unit)) return `<div class="emblem emblem-unit">${imgLogoUnit(unit)}</div>`;
  return `<div class="emblem">${htmlEmblemYayasan('Logo')}</div>`;
}
function kopHtml(subjudul, unit) {
  const k = S.identitas, kontak = [k.alamat, k.telepon ? 'Telp: ' + k.telepon : '', k.email ? 'Email: ' + k.email : '', k.website ? k.website : ''].filter(Boolean).join(' \u00B7 ');
  return `<div class="kop">${emblemKop(unit)}<div class="kop-text"><div class="kop-yys">${esc(k.nama_yayasan || 'Yayasan Masjid Panglima Besar Soedirman')}</div>${subjudul ? `<div class="kop-unit">${esc(subjudul)}</div>` : ''}${kontak ? `<div class="kop-addr">${esc(kontak)}</div>` : ''}</div><div style="width:74px"></div></div>`;
}
function watermark(teks) { return teks ? `<div class="a4-wm"><span>${esc(teks)}</span></div>` : ''; }
function kakiCetak(kiri, kanan) { return `<div class="lt-foot"><span>${esc(kiri)}</span><span>${esc(kanan)}</span></div>`; }

function skalaA4(page) {
  const stage = page.parentElement; if (!stage) return;
  page.style.transform = ''; stage.style.height = '';
  const lebar = stage.clientWidth - 32, asli = page.offsetWidth;
  if (lebar > 0 && asli > lebar) {
    const k = lebar / asli;
    page.style.transformOrigin = 'top left'; page.style.transform = `scale(${k})`;
    page.style.marginLeft = '0';
    stage.style.height = (page.offsetHeight * k + 32) + 'px';
  } else page.style.marginLeft = '';
}

function cetakHalaman(htmlHalaman, lanskap, catatan) {
  const area = byId('printArea');
  area.innerHTML = htmlHalaman;
  $$('.a4', area).forEach(p => { p.style.transform = ''; p.style.marginLeft = ''; });
  let st = byId('gayaHalaman');
  if (!st) { st = document.createElement('style'); st.id = 'gayaHalaman'; document.head.appendChild(st); }
  st.textContent = '@page { size: A4 ' + (lanskap ? 'landscape' : 'portrait') + '; margin: 0; }';
  if (catatan && S.token) api('catatCetak', S.token, catatan).catch(() => {});
  setTimeout(() => {
    try { window.print(); } catch (e) { toast('Tidak dapat mencetak', 'Peramban memblokir dialog cetak. Gunakan Ctrl+P.', 'warning'); }
    setTimeout(() => { area.innerHTML = ''; }, 800);
  }, 60);
}

function renderCetak(p) {
  const page = byId('cetakPage');
  byId('cetakMode').hidden = !!p.agenda;
  $$('.print-opts .check').forEach(c => c.hidden = false);
  if (p.agenda) { byId('ckLamp').closest('.check').hidden = true; page.className = 'a4 landscape'; page.innerHTML = halamanAgenda(); isiLogo(page); requestAnimationFrame(() => skalaA4(page)); return; }
  if ((p.disp || p.hanyaDisp) && !p.modeAwal) { C.mode = 'disposisi'; p.modeAwal = 1; }
  const s = S.surat.get(p.id);
  if (!s) { page.className = 'a4'; page.innerHTML = kosong('Surat tidak ditemukan', ''); return; }
  page.className = 'a4';
  $$('#cetakMode .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === C.mode));
  const hal = [];
  if (C.mode !== 'disposisi') hal.push(halamanSurat(s));
  if (C.mode !== 'surat') halamanDisposisi(s, p.disp).forEach(h => hal.push(h));
  page.innerHTML = hal.join('<div class="page-break" style="height:24px;margin:0 -64px;background:var(--surface-2)"></div>');
  siapkanAsetDisposisi(page);
  requestAnimationFrame(() => skalaA4(page));
}
function opsiCetak() { return { kop: byId('ckKop').checked, meta: byId('ckMeta').checked, lamp: byId('ckLamp').checked, wm: byId('ckWm').checked }; }

function halamanSurat(s) {
  const o = opsiCetak(), d = suratDasar(s), kota = S.identitas.kota ? S.identitas.kota + ', ' : '';
  const kepada = d.ke.map(k => namaTampil(k.u));
  return `<div class="a4-inner">${watermark(o.wm ? (d.sifat === 'Rahasia' ? 'RAHASIA' : 'SALINAN') : '')}
    ${o.kop ? kopHtml(namaTampil(d.dari), d.dari) : ''}
    <div class="lt-meta">
      <div>
        <div class="lt-row"><span class="k">Nomor</span><span>:</span><span class="mono">${esc(d.no)}</span></div>
        <div class="lt-row"><span class="k">Sifat</span><span>:</span><span><strong>${esc(d.sifat)}</strong></span></div>
        <div class="lt-row"><span class="k">Lampiran</span><span>:</span><span>${(d.lamp || []).length ? (d.lamp.length + ' berkas') : '\u2014'}</span></div>
        <div class="lt-row"><span class="k">Perihal</span><span>:</span><span><strong>${esc(d.hal)}</strong></span></div>
      </div>
      <div class="lt-to"><div class="text-end mb-2">${esc(kota)}${fmtTglPanjang(d.tgl)}</div>Kepada Yth.<ol>${kepada.map(u => `<li>${esc(u)}</li>`).join('')}</ol>di Tempat</div>
    </div>
    <div>Dengan hormat,</div>
    <div class="lt-body">${esc(d.isi || '(Isi lengkap terdapat pada berkas lampiran.)')}</div>
    <div class="lt-sign"><div class="lt-sign-box">${esc(kota)}${fmtTglPanjang(d.tgl)}<br>Pimpinan / Tata Usaha<br><strong>${esc(namaTampil(d.dari))}</strong><div class="lt-sign-space"></div>( ...................................... )</div></div>
    ${o.lamp && (d.lamp || []).length ? `<div class="lt-sub">Daftar lampiran berkas</div><ol class="small">${d.lamp.map(l => `<li>${esc(l.n)} (${fmtKb(l.kb)})</li>`).join('')}</ol>` : ''}
    ${o.meta ? `<div class="lt-sub">Metadata registrasi sistem</div><table class="lt-tbl"><tr><td>ID surat</td><td class="mono">${esc(d.id)}</td><td>Dicatat</td><td>${fmtWaktu(d.at)}</td></tr><tr><td>Status distribusi</td><td>${esc(d.st)} (${d.ke.filter(k => k.st !== 'Terkirim').length}/${d.ke.length} dibaca)</td><td>Jenis</td><td>${esc(d.jenis)}${d.ubah ? ' \u00B7 telah diubah' : ''}</td></tr></table>` : ''}
    ${kakiCetak('Dicetak dari ' + (S.identitas.nama_aplikasi || 'Aplikasi Surat Terpusat') + ' oleh ' + labelSaya(), fmtWaktu(Date.now()))}</div>`;
}

function halamanDisposisi(s, idDisp) {
  const o = opsiCetak(), d = suratDasar(s), saya = milikSaya(d) || milikSaya(s);
  let list = idDisp ? (S.disposisi || []).filter(x => x.id === idDisp) : dispUntuk(d, s).filter(x => x.st !== 'Dibatalkan').reverse();
  const lama = semuaSurat().filter(x => x.jenis === 'Disposisi' && x.induk === d.id).sort((a, b) => a.at - b.at);
  if (!list.length) list = [null];
  return list.map((x, i) => `<div class="a4-inner">${watermark(o.wm ? (x && x.st === 'Dibatalkan' ? 'DIBATALKAN' : d.sifat === 'Rahasia' ? 'RAHASIA' : 'SALINAN') : '')}
    ${o.kop ? kopHtml(namaTampil(S.unit), S.unit) : ''}
    <div class="lt-title"><span class="tag">LEMBAR DISPOSISI</span>${list.length > 1 ? `<div class="per">LEMBAR ${i + 1} DARI ${list.length}</div>` : ''}</div>
    <table class="lt-tbl mt-3">
      <tr><td style="width:20%">Nomor surat</td><td class="mono" style="width:30%">${esc(d.no)}</td><td style="width:20%">Tanggal surat</td><td>${fmtTglPanjang(d.tgl)}</td></tr>
      <tr><td>Dari</td><td><strong>${esc(d.dari)}</strong></td><td>Sifat</td><td><strong>${esc(d.sifat)}</strong></td></tr>
      <tr><td>Perihal</td><td colspan="3"><strong>${esc(d.hal)}</strong></td></tr>
      <tr><td>Diterima unit</td><td>${esc(S.unit)}</td><td>Waktu dibaca</td><td>${saya && saya.rd ? fmtWaktu(saya.rd) : '&mdash;'}</td></tr>
    </table>
    ${x ? blokDisposisi(x) : blokDisposisiKosong()}
    ${i === 0 && lama.length && o.meta ? `<div class="lt-sub">Riwayat disposisi antarunit (versi lama)</div><table class="lt-tbl"><thead><tr><th style="width:18%">Tanggal / jam</th><th style="width:18%">Dari</th><th style="width:24%">Diteruskan kepada</th><th>Catatan</th></tr></thead><tbody>${lama.map(y => `<tr><td class="mono">${fmtTglMs(y.at)} ${fmtJam(y.at)}</td><td>${esc(y.dari)}</td><td>${esc(y.ke.map(k => k.u).join(', '))}</td><td>${esc(y.isi)}</td></tr>`).join('')}</tbody></table>` : ''}
    ${kakiCetak('Lembar disposisi \u00B7 ' + (S.identitas.nama_aplikasi || 'Aplikasi Surat Terpusat') + ' \u00B7 dicetak ' + labelSaya(), fmtWaktu(Date.now()))}</div>`);
}

function halamanAgenda() {
  const o = opsiCetak(), list = (S.f.keluarHasil || kotakKeluar()).filter(s => !s._pending).slice().sort((a, b) => a.at - b.at);
  const f = S.f.keluar || {};
  const periode = f.dari || f.sampai ? (f.dari ? fmtTglPanjang(f.dari) : 'awal') + ' s/d ' + (f.sampai ? fmtTglPanjang(f.sampai) : 'sekarang') : 'Seluruh arsip termuat';
  return `${watermark(o.wm ? 'SALINAN' : '')}${o.kop ? kopHtml(namaTampil(S.unit), S.unit) : ''}
    <div class="lt-title"><span class="tag">BUKU AGENDA SURAT KELUAR</span><h3>Register Surat Keluar ${esc(S.unit)}</h3><div class="per">PERIODE: ${esc(periode.toUpperCase())} \u00B7 ${list.length} NASKAH</div></div>
    <table class="lt-tbl mt-3"><thead><tr><th>No</th><th>Nomor surat</th><th>Tanggal</th><th>Tujuan</th><th>Perihal</th><th>Sifat</th><th>Status</th><th>Lamp.</th></tr></thead>
    <tbody>${list.map((s, i) => `<tr><td class="num">${i + 1}</td><td class="mono">${esc(s.no)}</td><td>${fmtTgl(s.tgl)}</td><td>${esc(s.ke.map(k => k.u).join(', '))}</td><td>${esc(s.hal)}${s.jenis !== 'Surat baru' ? ' <em>(' + esc(s.jenis) + ')</em>' : ''}</td><td>${esc(s.sifat)}</td><td>${esc(s.st)} (${s.ke.filter(k => k.st !== 'Terkirim').length}/${s.ke.length})</td><td class="num">${(s.lamp || []).length}</td></tr>`).join('') || '<tr><td colspan="8" class="text-center">Tidak ada data.</td></tr>'}</tbody></table>
    ${kakiCetak('Buku agenda keluar \u00B7 ' + S.unit, 'Dicetak ' + fmtWaktu(Date.now()))}`;
}

function pasangEventCetak() {
  $$('#cetakMode .seg-btn').forEach(b => b.addEventListener('click', () => { C.mode = b.dataset.mode; renderCetak(S.params); }));
  ['ckKop', 'ckMeta', 'ckLamp', 'ckWm'].forEach(id => byId(id).addEventListener('change', () => renderCetak(S.params)));
  byId('cetakBack').addEventListener('click', () => kembali(S.params.agenda ? 'keluar' : 'masuk'));
  byId('btnCetak').addEventListener('click', async () => {
    const p = S.params, s = p.id ? S.surat.get(p.id) : null;
    const page = byId('cetakPage');
    if ($$('[data-qr], img[data-ttd], img[data-logo-unit]', page).length) {
      const b = byId('btnCetak'); sibuk(b, true, 'Menyiapkan...');
      try { await tungguAsetDisposisi(page); } finally { sibuk(b, false); }
    }
    const html = p.agenda ? `<div class="a4 landscape">${halamanAgenda()}</div>`
      : Array.from(page.querySelectorAll('.a4-inner')).map(x => `<div class="a4">${x.innerHTML}</div>`).join('');
    cetakHalaman(html, !!p.agenda, p.agenda ? { target: 'Buku agenda keluar', ket: (S.f.keluarHasil || []).length + ' naskah' } : { target: s ? suratDasar(s).no : '-', ket: 'Mode: ' + C.mode });
  });
  window.addEventListener('resize', debounce(() => { if (S.view === 'cetak') skalaA4(byId('cetakPage')); if (S.view === 'laporan') skalaA4(byId('lapPage')); }, 150));
}


const grafik = {};
const WARNA_SIFAT = { Biasa: '#94A3B8', Penting: '#F97316', Rahasia: '#B91C1C' };

async function muatAdmin(tahun, diam) {
  if (!diam) setSync('sync');
  try {
    const res = await api('adminData', S.token, tahun || null);
    if (!res.success) { toast('Gagal memuat data admin', res.message, 'danger'); setSync('off'); return; }
    const d = res.data;
    S.adm = { tahun: d.tahun, tahunList: d.tahunList, rekap: d.rekap, akun: d.akun, logAdmin: d.logAdmin, penyimpanan: d.penyimpanan, samar: d.samarRahasia };
    S.identitas = d.identitas || S.identitas; S.unitList = d.unitList || S.unitList;
    S.unitMap = {}; S.unitList.forEach(u => S.unitMap[u.n] = u);
    S.serverTs = d.serverTs || S.serverTs;
    simpanCache(); setSync('ok');
    if (S.view === 'adminset') return;
    renderUlang();
  } catch (e) { if (!e.ditangani) { setSync('off'); toast('Gagal memuat data admin', pesanError(e), 'danger'); } }
}

function rentangPreset(k) {
  const n = new Date(), th = S.adm ? S.adm.tahun : n.getFullYear();
  let a, b = new Date(n);
  switch (k) {
    case 'hari': a = new Date(n.getFullYear(), n.getMonth(), n.getDate()); break;
    case '7': a = new Date(n.getTime() - 6 * 864e5); break;
    case 'bulan': a = new Date(n.getFullYear(), n.getMonth(), 1); break;
    case 'bulanlalu': a = new Date(n.getFullYear(), n.getMonth() - 1, 1); b = new Date(n.getFullYear(), n.getMonth(), 0); break;
    case 'kuartal': a = new Date(n.getFullYear(), Math.floor(n.getMonth() / 3) * 3, 1); break;
    case 'semester': a = new Date(n.getFullYear(), n.getMonth() < 6 ? 0 : 6, 1); break;
    default: a = new Date(th, 0, 1); b = new Date(th, 11, 31);
  }
  return [isoHari(a), isoHari(b)];
}
const LABEL_PRESET = { hari: 'Hari ini', '7': '7 hari terakhir', bulan: 'Bulan berjalan', bulanlalu: 'Bulan lalu', kuartal: 'Kuartal ini', semester: 'Semester ini', tahun: 'Setahun' };

function saringRekap(rows, f) {
  const d0 = tglKeMs(f.dari), d1 = tglKeMs(f.sampai, true), now = Date.now();
  return rows.filter(r => {
    if (f.hapus === 'saja' ? !r.del : (f.hapus !== 'semua' && r.del)) return false;
    if (d0 && r.at < d0) return false;
    if (d1 && r.at > d1) return false;
    if (f.unit && r.dari !== f.unit && !r.ke.some(k => k.u === f.unit)) return false;
    if (f.pengirim && r.dari !== f.pengirim) return false;
    if (f.penerima && !r.ke.some(k => k.u === f.penerima)) return false;
    if (f.sifat && r.sifat !== f.sifat) return false;
    if (f.sifatSet && !f.sifatSet.includes(r.sifat)) return false;
    if (f.jenis && r.jenis !== f.jenis) return false;
    if (f.jenisSet && !f.jenisSet.includes(r.jenis)) return false;
    if (f.status && r.st !== f.status) return false;
    if (f.prioritas && r.sifat === 'Biasa') return false;
    if (f.tertunda && !r.ke.some(k => k.st === 'Terkirim' && now - r.at > 864e5)) return false;
    if (f.q && !cocok(f.q, r.no, r.hal, r.dari, r.ke.map(k => k.u).join(' '))) return false;
    return true;
  });
}

function agregat(rows) {
  const now = Date.now(), per = {}, sifat = {}, st = { Terkirim: 0, Dibaca: 0, Dibalas: 0 };
  const baru = () => ({ masuk: 0, keluar: 0, tindak: 0, unread24: 0, resp: [] });
  S.unitList.forEach(u => per[u.n] = baru());
  ['Biasa', 'Penting', 'Rahasia'].forEach(k => sifat[k] = { n: 0, resp: [] });
  let lamp = 0, kb = 0, penting24 = 0, pentingTot = 0, tujuanTot = 0;
  rows.forEach(r => {
    (per[r.dari] = per[r.dari] || baru()).keluar++;
    (sifat[r.sifat] = sifat[r.sifat] || { n: 0, resp: [] }).n++;
    if (r.ln) { lamp++; kb += r.lkb; }
    r.ke.forEach(k => {
      const p = per[k.u] = per[k.u] || baru();
      p.masuk++; st[k.st] = (st[k.st] || 0) + 1; tujuanTot++;
      if (k.st !== 'Terkirim') p.tindak++; else if (now - r.at > 864e5) p.unread24++;
      if (k.rd) { const h = (k.rd - r.at) / 36e5; p.resp.push(h); sifat[r.sifat].resp.push(h); }
      if (r.sifat === 'Penting' && (k.rd || now - r.at > 864e5)) { pentingTot++; if (k.rd && k.rd - r.at <= 864e5) penting24++; }
    });
  });
  const rata = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  Object.values(per).forEach(p => p.rata = rata(p.resp));
  Object.values(sifat).forEach(s => s.rata = rata(s.resp));
  return { per, sifat, st, lamp, kb, penting24, pentingTot, tujuanTot, total: rows.length, unread24: Object.values(per).reduce((a, p) => a + p.unread24, 0), rata: rata([].concat(...Object.values(per).map(p => p.resp))) };
}
function warnaVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }


function bangunFilterDash() {
  const w = byId('dashFilter');
  const f = S.f.dash = S.f.dash || { preset: 'bulan', dari: rentangPreset('bulan')[0], sampai: rentangPreset('bulan')[1], unit: '', sifat: '' };
  w.innerHTML = `<div class="filter-head"><div class="filter-title"><i class="bi bi-sliders"></i> Parameter Agregasi &amp; Filter Global</div><div class="filter-idx"><i class="dot dot-ok"></i> Sinkronisasi: Google Sheets (${fmtJam(S.lastSync || Date.now())} WIB)</div></div>
    <div class="filter-grid">
      <div class="fbox"><label>Tahun data</label><select class="input" id="dfTahun">${S.adm.tahunList.map(t => `<option ${t === S.adm.tahun ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="fbox"><label>Dari</label><input type="date" class="input" id="dfDari" value="${f.dari}"></div>
      <div class="fbox"><label>Sampai</label><input type="date" class="input" id="dfSampai" value="${f.sampai}"></div>
      <div class="fbox"><label>Satuan kerja</label><select class="input" id="dfUnit"><option value="">Semua ${S.unitList.length} unit</option>${S.unitList.map(u => `<option ${f.unit === u.n ? 'selected' : ''}>${esc(u.n)}</option>`).join('')}</select></div>
      <div class="fbox"><label>Sifat dokumen</label><select class="input" id="dfSifat"><option value="">Semua sifat</option>${['Biasa', 'Penting', 'Rahasia'].map(x => `<option ${f.sifat === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    </div>
    <div class="presets"><span class="presets-l">Preset cepat:</span>${['hari', '7', 'bulan', 'kuartal', 'semester', 'tahun'].map(k => `<button type="button" class="preset${f.preset === k ? ' active' : ''}" data-preset="${k}">${LABEL_PRESET[k]}</button>`).join('')}</div>`;
  const ubah = () => { f.preset = ''; f.dari = byId('dfDari').value; f.sampai = byId('dfSampai').value; f.unit = byId('dfUnit').value; f.sifat = byId('dfSifat').value; renderDashboard(); };
  ['dfDari', 'dfSampai', 'dfUnit', 'dfSifat'].forEach(id => byId(id).addEventListener('change', ubah));
  byId('dfTahun').addEventListener('change', e => { f.preset = 'tahun'; const t = +e.target.value; f.dari = t + '-01-01'; f.sampai = t + '-12-31'; muatAdmin(t); });
  $$('[data-preset]', w).forEach(b => b.onclick = () => { f.preset = b.dataset.preset; [f.dari, f.sampai] = rentangPreset(f.preset); renderDashboard(); });
}

function renderDashboard() {
  if (!S.adm) return;
  bangunFilterDash();
  const f = S.f.dash, semua = S.adm.rekap.filter(r => !r.del);
  const rows = saringRekap(S.adm.rekap, { dari: f.dari, sampai: f.sampai, unit: f.unit, sifat: f.sifat });
  const a = agregat(rows), n = new Date();
  const bulanIni = semua.filter(r => { const d = new Date(r.at); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length;
  const hariKerja = Math.max(1, Math.min(n.getDate(), 22));
  const unreadTot = a.st.Terkirim, dibalas = rows.filter(r => r.st === 'Dibalas').length;
  const hariIni = semua.filter(r => r.at >= tglKeMs(isoHari())).length;
  byId('dashKpi').innerHTML = `
    <div class="kpi"><div class="kpi-label">Total surat ${S.adm.tahun} <i class="bi bi-archive"></i></div><div class="kpi-value">${fmtAngka(semua.length)}</div><div class="kpi-foot"><span><i class="dot dot-ok"></i> +${hariIni} naskah hari ini</span><span class="chip chip-ok">AKUMULATIF</span></div></div>
    <div class="kpi slate"><div class="kpi-label">Bulan berjalan (${BULAN_PANJANG[n.getMonth()]}) <i class="bi bi-calendar3"></i></div><div class="kpi-value">${fmtAngka(bulanIni)}</div><div class="kpi-foot"><span>Rata-rata ${(bulanIni / hariKerja).toFixed(1).replace('.', ',')} naskah/hari</span></div></div>
    <div class="kpi amber"><div class="kpi-label">Belum dibaca resipien <i class="bi bi-envelope-exclamation"></i></div><div class="kpi-value">${fmtAngka(unreadTot)}</div><div class="kpi-foot">${a.unread24 ? `<span class="chip chip-solid-amber">${a.unread24} &gt; 24 jam</span><span>Antrean</span>` : '<span>Tidak ada antrean &gt; 24 jam</span>'}</div></div>
    <div class="kpi green"><div class="kpi-label">Sudah dibalas (selesai) <i class="bi bi-check2-circle"></i></div><div class="kpi-value">${fmtAngka(dibalas)}</div><div class="kpi-foot"><span>${fmtPersen(dibalas, rows.length)} dari surat terfilter</span><span class="chip chip-ok">EFEKTIF</span></div></div>`;
  S.f.dashAgregat = { a, rows };
  renderGrafik();
  byId('sifatLegend').innerHTML = ['Biasa', 'Penting', 'Rahasia'].map(k => `<div class="lg-item ${k}"><span class="lg-sw" style="background:${WARNA_SIFAT[k]}"></span><div><div class="lg-t">${k}</div><div class="lg-s">Rata-rata baca: ${fmtJamDurasi(a.sifat[k].rata)}</div></div><div class="lg-v">${a.sifat[k].n} naskah<br><span class="lg-s">${fmtPersen(a.sifat[k].n, a.total)}</span></div></div>`).join('');
  const tot = a.tujuanTot || 1, pB = a.st.Dibalas / tot * 100, pR = a.st.Dibaca / tot * 100, pT = a.st.Terkirim / tot * 100;
  byId('statusBar').innerHTML = `<div class="sb-l"><span>Distribusi status per penerima</span><span>${fmtAngka(a.tujuanTot)} entri (100%)</span></div>
    <div class="stack-bar" role="img" aria-label="Dibalas ${pB.toFixed(0)}%, Dibaca ${pR.toFixed(0)}%, Belum dibaca ${pT.toFixed(0)}%"><div style="width:${pB}%;background:#042F24">${pB >= 12 ? Math.round(pB) + '% DIBALAS' : ''}</div><div style="width:${pR}%;background:#059669">${pR >= 12 ? Math.round(pR) + '% DIBACA' : ''}</div><div style="width:${pT}%;background:#EA580C">${pT >= 9 ? Math.round(pT) + '% BELUM' : ''}</div></div>`;
  byId('statusMini').innerHTML = `<div class="mini-kpi green"><div class="mk-l"><i class="bi bi-speedometer2"></i> Respons surat penting</div><div class="mk-v">${a.pentingTot ? fmtPersen(a.penting24, a.pentingTot) : '\u2014'}</div><div class="mk-d">Dibaca dalam batas &lt; 24 jam</div></div>
    <div class="mini-kpi"><div class="mk-l"><i class="bi bi-paperclip"></i> Rasio berlampiran</div><div class="mk-v">${fmtPersen(a.lamp, a.total)}</div><div class="mk-d">${a.lamp} naskah menyertakan berkas (${fmtKb(a.kb)})</div></div>`;
  const urut = S.unitList.map(u => ({ u, p: a.per[u.n] })).sort((x, y) => (y.p.masuk + y.p.keluar) - (x.p.masuk + x.p.keluar));
  const akunMap = {}; S.adm.akun.forEach(k => { const m = akunMap[k.nama] = akunMap[k.nama] || { aktif: false, terkunci: false }; if (k.aktif) m.aktif = true; if (k.terkunci) m.terkunci = true; });
  byId('perfTable').innerHTML = `<div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr><th>No</th><th>Satuan kerja</th><th class="num">Masuk</th><th class="num">Keluar</th><th>Ditindaklanjuti</th><th class="num">Unread &gt;24j</th><th class="num">Rata respon</th><th>Status akun</th></tr></thead><tbody>${urut.map((x, i) => {
    const ak = akunMap[x.u.n] || {};
    return `<tr><td class="mono">${pad(i + 1)}</td><td><strong>${esc(x.u.n)}</strong><span class="sub">${esc(x.u.k || '')} \u00B7 ${esc(x.u.g || '')}</span></td><td class="num">${x.p.masuk}</td><td class="num">${x.p.keluar}</td><td><span class="pct-bar"><span style="width:${x.p.masuk ? x.p.tindak / x.p.masuk * 100 : 0}%"></span></span><span class="mono small">${x.p.tindak} (${fmtPersen(x.p.tindak, x.p.masuk, 0)})</span></td><td class="num">${x.p.unread24 ? `<span class="chip ${x.p.unread24 > 2 ? 'chip-solid-amber' : 'chip-warn'}">${x.p.unread24}</span>` : '<span class="chip">0</span>'}</td><td class="num">${fmtJamDurasi(x.p.rata)}</td><td>${ak.terkunci ? '<span class="chip chip-danger">TERKUNCI</span>' : ak.aktif === false ? '<span class="chip">NONAKTIF</span>' : '<span class="chip chip-ok">AKTIF</span>'}</td></tr>`;
  }).join('')}</tbody></table></div><div class="pager"><span><i class="bi bi-info-circle"></i> Angka dihitung dari metadata register (zero-content). Periode: ${fmtTgl(f.dari)} \u2013 ${fmtTgl(f.sampai)}.</span></div>`;
  byId('insightList').innerHTML = wawasan(a, rows, semua).map(t => `<li><i class="bi bi-lightbulb"></i>${t}</li>`).join('');
  const pz = S.adm.penyimpanan;
  if (pz && pz.batas > 0) {
    const pct = pz.pakai / pz.batas * 100;
    byId('storageBox').innerHTML = `<div class="d-flex justify-content-between mono small"><span>${fmtByte(pz.pakai)} terpakai</span><span>dari ${fmtByte(pz.batas)}</span></div><div class="storage-bar"><span class="${pct > 90 ? 'danger' : pct > 75 ? 'warn' : ''}" style="width:${Math.min(100, pct)}%"></span></div><div class="small text-muted-2">${pct.toFixed(1).replace('.', ',')}% kuota akun pemilik aplikasi. ${pct > 75 ? '<strong class="t-warn">Rencanakan pengarsipan tahunan atau tambah kuota Workspace.</strong>' : 'Kapasitas masih aman.'}</div>`;
  } else byId('storageBox').innerHTML = '<div class="small text-muted-2">Informasi kuota tidak tersedia (akun dengan penyimpanan tak terbatas atau izin dibatasi).</div>';
}

function wawasan(a, rows, semua) {
  const out = [], urut = Object.entries(a.per).sort((x, y) => y[1].keluar - x[1].keluar);
  if (!rows.length) return ['Belum ada surat pada periode terfilter. Ubah rentang tanggal atau pilih preset "Setahun".'];
  if (urut[0] && urut[0][1].keluar) out.push(`<strong>${esc(urut[0][0])}</strong> adalah pengirim paling aktif dengan ${urut[0][1].keluar} naskah (${fmtPersen(urut[0][1].keluar, a.total, 0)} dari total periode ini).`);
  const masukTop = Object.entries(a.per).sort((x, y) => y[1].masuk - x[1].masuk)[0];
  if (masukTop && masukTop[1].masuk) out.push(`Penerima terbanyak: <strong>${esc(masukTop[0])}</strong> (${masukTop[1].masuk} entri surat masuk).`);
  const lambat = Object.entries(a.per).filter(x => x[1].unread24).sort((x, y) => y[1].unread24 - x[1].unread24);
  if (lambat.length) out.push(`<strong>${lambat.length} unit</strong> memiliki surat belum dibaca &gt; 24 jam; terbanyak di <strong>${esc(lambat[0][0])}</strong> (${lambat[0][1].unread24} naskah). Pertimbangkan pengingat langsung.`);
  else out.push('Tidak ada surat yang tertunda lebih dari 24 jam \u2014 seluruh unit responsif.');
  if (a.rata != null) out.push(`Rata-rata waktu baca seluruh unit: <strong>${fmtJamDurasi(a.rata)}</strong> sejak surat dikirim.`);
  const n = new Date(), ini = semua.filter(r => { const d = new Date(r.at); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length;
  const lalu = semua.filter(r => { const d = new Date(r.at), m = (n.getMonth() + 11) % 12; return d.getMonth() === m && d.getFullYear() === (n.getMonth() === 0 ? n.getFullYear() - 1 : n.getFullYear()); }).length;
  if (lalu) out.push(`Volume bulan ini ${ini >= lalu ? 'naik' : 'turun'} <strong>${fmtPersen(Math.abs(ini - lalu), lalu, 0)}</strong> dibanding bulan lalu (${ini} vs ${lalu} naskah${n.getDate() < 28 ? ', bulan berjalan belum selesai' : ''}).`);
  if (a.sifat.Rahasia.n) out.push(`${a.sifat.Rahasia.n} naskah bersifat Rahasia (${fmtPersen(a.sifat.Rahasia.n, a.total, 0)}). Perihalnya disamarkan di panel Admin sesuai kebijakan zero-content.`);
  return out.slice(0, 6);
}

async function renderGrafik() {
  if (!S.f.dashAgregat || S.view !== 'dashboard') return;
  try { if (!window.Chart) await loadScript(CDN.chart); } catch (e) { $$('#v-dashboard .chart-box').forEach(b => b.innerHTML = '<div class="empty-d p-4 text-center">Pustaka grafik gagal dimuat. Periksa koneksi.</div>'); return; }
  const { a, rows } = S.f.dashAgregat, ink = warnaVar('--muted'), grid = warnaVar('--line'), font = { family: 'JetBrains Mono, monospace', size: 10 };
  Chart.defaults.color = ink; Chart.defaults.font.family = 'Plus Jakarta Sans, sans-serif';
  const set = (key, cfg) => { if (grafik[key]) grafik[key].destroy(); const el = byId(key); if (el) grafik[key] = new Chart(el, cfg); };
  const units = S.unitList;
  set('chUnit', {
    type: 'bar',
    data: { labels: units.map(u => u.k || u.n), datasets: [
      { label: 'Naskah masuk', data: units.map(u => (a.per[u.n] || {}).masuk || 0), backgroundColor: '#0F4C3A', borderRadius: 2, maxBarThickness: 18 },
      { label: 'Naskah keluar', data: units.map(u => (a.per[u.n] || {}).keluar || 0), backgroundColor: '#D97706', borderRadius: 2, maxBarThickness: 18 }] },
    options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top', align: 'start', labels: { boxWidth: 12, font } }, tooltip: { callbacks: { title: it => units[it[0].dataIndex].n } } },
      scales: { x: { ticks: { font, maxRotation: 60, minRotation: 45, autoSkip: false }, grid: { display: false } }, y: { beginAtZero: true, ticks: { font, precision: 0 }, grid: { color: grid } } } }
  });
  const ini = new Date(), th = S.adm.tahun, akhir = th === ini.getFullYear() ? ini.getMonth() : 11;
  const thRows = saringRekap(S.adm.rekap, { unit: S.f.dash.unit, sifat: S.f.dash.sifat });
  const bulanan = BULAN.slice(0, akhir + 1).map((_, m) => thRows.filter(r => new Date(r.at).getMonth() === m).length);
  const ma = bulanan.map((_, i) => { const s = bulanan.slice(Math.max(0, i - 2), i + 1); return +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(1); });
  const puncak = Math.max(...bulanan, 0);
  set('chTren', {
    type: 'line',
    data: { labels: BULAN.slice(0, akhir + 1), datasets: [
      { label: 'Total persuratan', data: bulanan, borderColor: '#0F4C3A', backgroundColor: 'rgba(15,76,58,.12)', fill: true, tension: .25, pointRadius: 4, pointBackgroundColor: bulanan.map(v => v === puncak && v ? '#F97316' : '#0F4C3A') },
      { label: 'Rata-rata bergerak (3 bln)', data: ma, borderColor: '#D97706', borderDash: [6, 5], pointRadius: 0, fill: false, tension: .3 }] },
    options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'top', align: 'start', labels: { boxWidth: 12, font } } },
      scales: { x: { ticks: { font }, grid: { display: false } }, y: { beginAtZero: true, ticks: { font, precision: 0 }, grid: { color: grid } } } }
  });
  set('chSifat', {
    type: 'doughnut',
    data: { labels: ['Biasa', 'Penting', 'Rahasia'], datasets: [{ data: ['Biasa', 'Penting', 'Rahasia'].map(k => a.sifat[k].n), backgroundColor: ['Biasa', 'Penting', 'Rahasia'].map(k => WARNA_SIFAT[k]), borderWidth: 2, borderColor: warnaVar('--surface') }] },
    options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } },
    plugins: [{ id: 'tengah', afterDraw(c) { const { ctx, chartArea: ca } = c; if (!ca) return; ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = warnaVar('--ink'); ctx.font = '700 26px Space Grotesk, sans-serif'; ctx.fillText(a.total, (ca.left + ca.right) / 2, (ca.top + ca.bottom) / 2 + 6); ctx.font = '600 10px JetBrains Mono, monospace'; ctx.fillStyle = ink; ctx.fillText('SURAT', (ca.left + ca.right) / 2, (ca.top + ca.bottom) / 2 + 22); ctx.restore(); } }]
  });
  const topU = Object.entries(a.per).sort((x, y) => (y[1].masuk + y[1].keluar) - (x[1].masuk + x[1].keluar)).slice(0, 2).filter(x => x[1].masuk + x[1].keluar);
  byId('chUnitFoot').innerHTML = `<span>${topU.length ? 'Sentra pergerakan: ' + topU.map(x => esc(x[0]) + ' (' + (x[1].masuk + x[1].keluar) + ' tx)').join(' & ') : 'Belum ada pergerakan pada periode ini.'}</span><span>Total satker: ${units.length}</span>`;
  byId('chTrenFoot').innerHTML = `<span>Tahun ${th} \u00B7 total ${fmtAngka(thRows.length)} surat${puncak ? ' \u00B7 puncak ' + puncak + ' surat (' + BULAN[bulanan.indexOf(puncak)] + ')' : ''}</span><span>${rows.length} pada periode filter</span>`;
}

function eksporMetrik() {
  const { a } = S.f.dashAgregat || {}; if (!a) return;
  unduhCsv('metrik-persuratan-' + isoHari() + '.csv', [['Satuan Kerja', 'Kode', 'Kelompok', 'Surat Masuk', 'Surat Keluar', 'Ditindaklanjuti', 'Persen Tindak', 'Unread >24 jam', 'Rata Respon (jam)']]
    .concat(S.unitList.map(u => { const p = a.per[u.n] || {}; return [u.n, u.k, u.g, p.masuk || 0, p.keluar || 0, p.tindak || 0, fmtPersen(p.tindak || 0, p.masuk || 0), p.unread24 || 0, p.rata == null ? '' : p.rata.toFixed(2).replace('.', ',')]; })));
}


function bangunFilterRekap() {
  const w = byId('rekapFilter'); if (w.dataset.siap) return;
  const f = S.f.rekap = S.f.rekap || { q: '', dari: '', sampai: '', status: '', pengirim: '', penerima: '', sifat: '', jenis: '', preset: '', hal: 1, per: 25 };
  const unitOpt = S.unitList.map(u => `<option>${esc(u.n)}</option>`).join('');
  w.innerHTML = `<div class="filter-head"><div class="filter-title"><i class="bi bi-search"></i> Pencarian identifikator register</div><div class="filter-idx hide-sm">[ / ] FOKUS \u00B7 KUERI INSTAN</div></div>
    <div class="search-box"><i class="bi bi-search"></i><input type="search" class="input" data-r="q" placeholder="Cari nomor surat, perihal, atau nama unit\u2026" aria-label="Cari register"></div>
    <div class="filter-grid">
      <div class="fbox"><label>Dibuat dari</label><input type="date" class="input" data-r="dari"></div>
      <div class="fbox"><label>Sampai</label><input type="date" class="input" data-r="sampai"></div>
      <div class="fbox"><label>Status arus</label><select class="input" data-r="status"><option value="">Semua status</option><option>Terkirim</option><option>Dibaca</option><option>Dibalas</option></select></div>
      <div class="fbox"><label>Unit pengirim</label><select class="input" data-r="pengirim"><option value="">Semua satker</option>${unitOpt}</select></div>
      <div class="fbox"><label>Unit penerima</label><select class="input" data-r="penerima"><option value="">Semua tujuan</option>${unitOpt}</select></div>
      <div class="fbox"><label>Klasifikasi sifat</label><select class="input" data-r="sifat"><option value="">Semua sifat</option><option>Biasa</option><option>Penting</option><option>Rahasia</option></select></div>
      <div class="fbox"><label>Jenis</label><select class="input" data-r="jenis"><option value="">Semua jenis</option><option>Surat baru</option><option>Balasan</option><option>Disposisi</option></select></div>
    </div>
    <div class="presets"><span class="presets-l">Preset cepat:</span>
      <button type="button" class="preset" data-rp="bulan">Bulan berjalan</button><button type="button" class="preset" data-rp="7">7 hari terakhir</button>
      <button type="button" class="preset p-warn" data-rp="prioritas">Surat penting / rahasia</button><button type="button" class="preset p-danger" data-rp="tertunda">Belum dibaca &gt; 24 jam</button>
      <button type="button" class="preset" data-rp="hapus">Arsip soft-delete (audit)</button><button type="button" class="link-btn small ms-auto" data-rp="reset">Reset filter</button></div>`;
  const terap = debounce(() => { f.hal = 1; renderRekap(); }, 110);
  $$('[data-r]', w).forEach(i => i.addEventListener(i.tagName === 'SELECT' || i.type === 'date' ? 'change' : 'input', () => { f[i.dataset.r] = i.value; terap(); }));
  $$('[data-rp]', w).forEach(b => b.onclick = () => {
    const k = b.dataset.rp;
    if (k === 'reset') { Object.assign(f, { q: '', dari: '', sampai: '', status: '', pengirim: '', penerima: '', sifat: '', jenis: '', preset: '' }); $$('[data-r]', w).forEach(i => i.value = ''); }
    else if (k === 'bulan' || k === '7') { [f.dari, f.sampai] = rentangPreset(k); f.preset = f.preset === k ? '' : k; if (!f.preset) f.dari = f.sampai = ''; $('[data-r="dari"]', w).value = f.dari; $('[data-r="sampai"]', w).value = f.sampai; }
    else f.preset = f.preset === k ? '' : k;
    f.hal = 1; renderRekap();
  });
  w.dataset.siap = '1';
}

function renderRekap() {
  if (!S.adm) return;
  bangunFilterRekap();
  const f = S.f.rekap, aktif = S.adm.rekap.filter(r => !r.del);
  $$('[data-rp]', byId('rekapFilter')).forEach(b => b.classList.toggle('active', b.dataset.rp === f.preset));
  const rows = saringRekap(S.adm.rekap, Object.assign({}, f, { prioritas: f.preset === 'prioritas', tertunda: f.preset === 'tertunda', hapus: f.preset === 'hapus' ? 'saja' : '' })).sort((a, b) => b.at - a.at);
  const now = Date.now(), tunda = aktif.filter(r => r.ke.some(k => k.st === 'Terkirim' && now - r.at > 864e5)).length;
  byId('rekapKpi').innerHTML = `
    <div class="kpi"><div class="kpi-label">Total register (sheets) <i class="bi bi-list-ul"></i></div><div class="kpi-value">${fmtAngka(aktif.length)}<small>naskah</small></div><div class="kpi-foot"><span>Tahun ${S.adm.tahun} \u00B7 ${S.adm.rekap.length - aktif.length} soft-delete</span></div></div>
    <div class="kpi green"><div class="kpi-label">Hasil filter aktif <i class="bi bi-funnel"></i></div><div class="kpi-value">${fmtAngka(rows.length)}<small>terpilih</small></div><div class="kpi-foot"><span>${fmtPersen(rows.length, aktif.length, 2)} dari total</span></div></div>
    <div class="kpi amber"><div class="kpi-label">Sifat penting / rahasia <i class="bi bi-shield-exclamation"></i></div><div class="kpi-value">${rows.filter(r => r.sifat !== 'Biasa').length}<small>khusus</small></div><div class="kpi-foot"><span>${fmtPersen(rows.filter(r => r.sifat !== 'Biasa').length, rows.length)} dari hasil filter</span></div></div>
    <div class="kpi danger"><div class="kpi-label">Tertunda respons (&gt;24 jam) <i class="bi bi-hourglass-split"></i></div><div class="kpi-value">${tunda}<small>belum terbaca</small></div><div class="kpi-foot"><span>Perlu pengingat ke unit</span></div></div>`;
  byId('rekapSamarNote').textContent = S.adm.samar ? 'Perihal surat bersifat Rahasia juga disamarkan.' : '';
  S.f.rekapHasil = rows;
  const per = +f.per || 25, hal = Math.min(f.hal, Math.max(1, Math.ceil(rows.length / per)));
  byId('rekapInfo').textContent = 'Menampilkan register tahun ' + S.adm.tahun + ' \u00B7 urut terbaru';
  byId('rekapList').innerHTML = rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th><th>Nomor surat</th><th>Tanggal</th><th>Pengirim</th><th>Tujuan</th><th>Perihal (metadata)</th><th>Sifat</th><th>Status</th></tr></thead><tbody>${rows.slice((hal - 1) * per, hal * per).map((r, i) => `
    <tr class="row-link${r.del ? ' deleted' : ''}" data-rk="${attr(r.id)}" tabindex="0" aria-expanded="false"><td class="mono">${(hal - 1) * per + i + 1}</td><td class="no-cell">${sorot(r.no, f.q)}<span class="sub">${esc(r.jenis)}${r.ubah ? ' \u00B7 diubah' : ''}${r.del ? ' \u00B7 DIHAPUS' : ''}</span></td><td class="mono small">${fmtTgl(r.tgl)}<span class="sub">${fmtJam(r.at)} WIB</span></td><td><span class="unit-cell">${sorot(r.dari, f.q)}</span></td><td>${labelKe(r)}</td><td>${r.hal ? sorot(r.hal, f.q) : '<span class="t-danger small"><i class="bi bi-lock-fill"></i> Perihal disamarkan (Rahasia)</span>'}${r.ln ? `<span class="sub"><i class="bi bi-paperclip"></i> ${r.ln} lampiran (isi diblokir)</span>` : ''}</td><td>${badgeSifat(r.sifat)}</td><td>${badgeStatus(r.st)}<span class="st-sub">${r.ke.filter(k => k.st !== 'Terkirim').length}/${r.ke.length} dibaca</span></td></tr>
    <tr class="rk-detail" data-rkd="${attr(r.id)}" hidden><td></td><td colspan="7"><div class="d-flex flex-wrap gap-2">${r.ke.map(k => `<span class="track-st ${esc(k.st)}">${esc(k.u)} \u00B7 ${k.st === 'Terkirim' ? 'BELUM DIBACA' : esc(k.st.toUpperCase()) + ' ' + fmtWaktu(k.st === 'Dibalas' ? k.rp : k.rd, true)}</span>`).join('')}</div></td></tr>`).join('')}</tbody></table></div>`
    : kosong('Tidak ada register yang cocok', 'Ubah filter atau pilih tahun lain di Dashboard.', 'bi-search');
  $$('[data-rk]').forEach(tr => tr.onclick = () => { const d = $(`[data-rkd="${tr.dataset.rk}"]`); d.hidden = !d.hidden; tr.setAttribute('aria-expanded', !d.hidden); });
  pager('rekapPager', rows.length, hal, per, h => { f.hal = h; renderRekap(); window.scrollTo(0, 0); }, 'register');
}
function eksporRekap() {
  const rows = S.f.rekapHasil || [];
  unduhCsv('rekap-surat-' + S.adm.tahun + '-' + isoHari() + '.csv', [['Nomor Surat', 'Tanggal Surat', 'Dicatat', 'Pengirim', 'Tujuan', 'Perihal', 'Sifat', 'Jenis', 'Status', 'Dibaca', 'Lampiran', 'Dihapus']]
    .concat(rows.map(r => [r.no, r.tgl, fmtWaktu(r.at), r.dari, r.ke.map(k => k.u).join(', '), r.hal || '[Rahasia \u2014 disamarkan]', r.sifat, r.jenis, r.st, r.ke.filter(k => k.st !== 'Terkirim').length + '/' + r.ke.length, r.ln, r.del ? 'Ya' : 'Tidak'])));
  api('catatCetak', S.token, { target: 'Ekspor CSV rekap', ket: rows.length + ' baris' }).catch(() => {});
}


const TEMPLAT = {
  eksekutif: { t: 'Laporan Rekapitulasi Bulanan Eksekutif', d: 'Ringkasan pergerakan surat yayasan, KPI respons, dan rekap kuantitatif per satuan kerja.', chip: 'STANDAR PIMPINAN', lanskap: false },
  register: { t: 'Buku Register Agenda Master Persuratan', d: 'Log berurutan nomor surat, tanggal, satker pengirim/penerima, sifat, dan status (metadata).', lanskap: true },
  sla: { t: 'Laporan Kepatuhan & Surat Terbuka (>24 Jam)', d: 'Daftar penerima yang belum membaca surat melewati 24 jam \u2014 untuk pengawasan & pengingat.', chip: 'PENGAWASAN', chipC: 'chip-warn', lanskap: false },
  matriks: { t: 'Matriks Arus Distribusi Antar-Satuan Kerja', d: 'Tabel silang pengirim \u00D7 penerima untuk pemetaan beban koordinasi antarunit.', lanskap: true }
};

function bangunLaporan() {
  const L = S.f.lap = S.f.lap || { tpl: 'eksekutif', periode: 'bulan', dari: rentangPreset('bulan')[0], sampai: rentangPreset('bulan')[1], unit: '', sifat: ['Biasa', 'Penting', 'Rahasia'], jenis: ['Surat baru', 'Balasan', 'Disposisi'] };
  if (byId('lapTpl').dataset.siap) return;
  byId('lapTpl').innerHTML = Object.entries(TEMPLAT).map(([k, t]) => `<label class="tpl"><input type="radio" name="lapTpl" value="${k}" ${L.tpl === k ? 'checked' : ''}><div class="tpl-t">${esc(t.t)}</div>${t.chip ? `<span class="chip ${t.chipC || 'chip-solid'}">${t.chip}</span>` : ''}<div class="tpl-d">${esc(t.d)}</div></label>`).join('');
  byId('lapPeriode').innerHTML = ['bulan', 'bulanlalu', 'kuartal', 'semester', 'tahun'].map(k => `<option value="${k}">${LABEL_PRESET[k]}</option>`).join('') + '<option value="kustom">Rentang kustom</option>';
  byId('lapUnit').innerHTML = `<option value="">Seluruh satker (${S.unitList.length} unit)</option>` + S.unitList.map(u => `<option>${esc(u.n)}</option>`).join('');
  byId('lapSifat').innerHTML = ['Biasa', 'Penting', 'Rahasia'].map(x => `<label><input type="checkbox" value="${x}" checked> ${x}</label>`).join('');
  byId('lapJenis').innerHTML = ['Surat baru', 'Balasan', 'Disposisi'].map(x => `<label><input type="checkbox" value="${x}" checked> ${x}</label>`).join('');
  byId('lapTpl').dataset.siap = '1';
}

function renderLaporan() {
  if (!S.adm) return;
  bangunLaporan();
  const L = S.f.lap;
  byId('lapPeriode').value = L.periode; byId('lapDari').value = L.dari; byId('lapSampai').value = L.sampai; byId('lapUnit').value = L.unit;
  const tpl = TEMPLAT[L.tpl], page = byId('lapPage');
  page.className = 'a4' + (tpl.lanskap ? ' landscape' : '');
  byId('lapOrient').textContent = 'A4 ' + (tpl.lanskap ? 'LANSKAP' : 'POTRET');
  page.innerHTML = `<div class="a4-inner">${isiLaporan()}</div>`;
  requestAnimationFrame(() => skalaA4(page));
  const riwayat = S.adm.logAdmin.filter(l => l.a === 'CETAK_LAPORAN').slice(0, 8);
  byId('lapRiwayat').innerHTML = riwayat.length ? `<div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr><th>ID log / waktu</th><th>Nama dokumen / kueri</th><th>Keterangan</th><th>Dibuat oleh</th></tr></thead><tbody>${riwayat.map(l => `<tr><td class="no-cell">${esc(l.id.slice(-8).toUpperCase())}<span class="sub">${fmtWaktu(l.w)}</span></td><td><strong>${esc(l.t)}</strong></td><td class="small">${esc(l.k)}</td><td>${esc(l.p)}<span class="sub">${esc(l.r)}</span></td></tr>`).join('')}</tbody></table></div>` : kosong('Belum ada riwayat cetak', 'Setiap laporan yang dicetak/diekspor tercatat di Log_Aktivitas.', 'bi-clock-history');
}

function dataLaporan() {
  const L = S.f.lap;
  return saringRekap(S.adm.rekap, { dari: L.dari, sampai: L.sampai, unit: L.unit, sifatSet: L.sifat, jenisSet: L.jenis }).sort((a, b) => a.at - b.at);
}
function isiLaporan() {
  const L = S.f.lap, tpl = TEMPLAT[L.tpl], rows = dataLaporan(), a = agregat(rows), k = S.identitas, now = Date.now();
  const periode = fmtTglPanjang(L.dari) + ' s/d ' + fmtTglPanjang(L.sampai);
  const noDok = 'LAP-' + isoHari().replace(/-/g, '') + '/' + L.tpl.toUpperCase().slice(0, 3);
  const opt = { kop: byId('lapKop').checked, kpi: byId('lapKpi').checked, ttd: byId('lapTtd').checked, wm: byId('lapWm').checked };
  let isi = '';
  if (L.tpl === 'eksekutif') {
    const units = S.unitList.filter(u => !L.unit || u.n === L.unit);
    const tot = units.reduce((s, u) => { const p = a.per[u.n] || {}; s.m += p.masuk || 0; s.k += p.keluar || 0; s.t += p.tindak || 0; s.u += p.unread24 || 0; return s; }, { m: 0, k: 0, t: 0, u: 0 });
    isi = `<div class="lt-sub">Tabel 1.0 \u2014 Distribusi &amp; tingkat respons persuratan per satuan kerja</div>
      <table class="lt-tbl"><thead><tr><th>No</th><th>Satuan kerja</th><th class="num">Masuk</th><th class="num">Keluar</th><th class="num">Sirkulasi</th><th class="num">Tuntas (%)</th><th class="num">Unread &gt;24j</th><th class="num">Rata respon</th></tr></thead>
      <tbody>${units.map((u, i) => { const p = a.per[u.n] || { masuk: 0, keluar: 0, tindak: 0, unread24: 0 }; return `<tr><td class="num">${pad(i + 1)}</td><td>${esc(u.n)}</td><td class="num">${p.masuk}</td><td class="num">${p.keluar}</td><td class="num">${p.masuk + p.keluar}</td><td class="num">${p.tindak} (${fmtPersen(p.tindak, p.masuk)})</td><td class="num">${p.unread24}</td><td class="num">${fmtJamDurasi(p.rata)}</td></tr>`; }).join('')}</tbody>
      <tfoot><tr><td colspan="2">TOTAL KUMULATIF ${units.length} SATUAN KERJA</td><td class="num">${tot.m}</td><td class="num">${tot.k}</td><td class="num">${tot.m + tot.k}</td><td class="num">${tot.t} (${fmtPersen(tot.t, tot.m)})</td><td class="num">${tot.u}</td><td class="num">${fmtJamDurasi(a.rata)}</td></tr></tfoot></table>
      <div class="small mt-2" style="color:#475569">* Masuk dihitung per entri penerima; satu surat ke beberapa unit dihitung pada masing-masing unit. Komposisi sifat: Biasa ${a.sifat.Biasa.n}, Penting ${a.sifat.Penting.n}, Rahasia ${a.sifat.Rahasia.n}.</div>`;
  } else if (L.tpl === 'register') {
    isi = `<div class="lt-sub">Register agenda master \u2014 ${rows.length} naskah</div><table class="lt-tbl"><thead><tr><th>No</th><th>Nomor surat</th><th>Tgl surat</th><th>Dicatat</th><th>Pengirim</th><th>Tujuan</th><th>Perihal</th><th>Sifat</th><th>Jenis</th><th>Status</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr><td class="num">${i + 1}</td><td class="mono">${esc(r.no)}</td><td>${fmtTgl(r.tgl)}</td><td class="mono">${fmtTglMs(r.at)} ${fmtJam(r.at)}</td><td>${esc(r.dari)}</td><td>${esc(r.ke.map(x => x.u).join(', '))}</td><td>${r.hal ? esc(r.hal) : '<em>[Rahasia \u2014 disamarkan]</em>'}</td><td>${esc(r.sifat)}</td><td>${esc(r.jenis)}</td><td>${esc(r.st)} (${r.ke.filter(x => x.st !== 'Terkirim').length}/${r.ke.length})</td></tr>`).join('') || '<tr><td colspan="10" class="text-center">Tidak ada data pada periode ini.</td></tr>'}</tbody></table>`;
  } else if (L.tpl === 'sla') {
    const terbuka = [];
    rows.forEach(r => r.ke.forEach(x => { if (x.st === 'Terkirim' && now - r.at > 864e5) terbuka.push({ r, u: x.u, jam: (now - r.at) / 36e5 }); }));
    terbuka.sort((x, y) => y.jam - x.jam);
    isi = `<div class="lt-sub">Daftar penerima belum membaca &gt; 24 jam \u2014 ${terbuka.length} entri</div><table class="lt-tbl"><thead><tr><th>No</th><th>Nomor surat</th><th>Dikirim</th><th>Pengirim</th><th>Penerima (belum baca)</th><th>Sifat</th><th class="num">Umur</th></tr></thead>
      <tbody>${terbuka.map((x, i) => `<tr><td class="num">${i + 1}</td><td class="mono">${esc(x.r.no)}</td><td>${fmtWaktu(x.r.at, true)}</td><td>${esc(x.r.dari)}</td><td><strong>${esc(x.u)}</strong></td><td>${esc(x.r.sifat)}</td><td class="num">${x.jam >= 48 ? Math.floor(x.jam / 24) + ' hari' : Math.round(x.jam) + ' jam'}</td></tr>`).join('') || '<tr><td colspan="7" class="text-center">Tidak ada surat tertunda \u2014 seluruh unit responsif. \u2713</td></tr>'}</tbody></table>`;
  } else {
    const units = S.unitList, idx = {}; units.forEach((u, i) => idx[u.n] = i);
    const m = units.map(() => units.map(() => 0));
    rows.forEach(r => r.ke.forEach(x => { if (idx[r.dari] != null && idx[x.u] != null) m[idx[r.dari]][idx[x.u]]++; }));
    isi = `<div class="lt-sub">Matriks pengirim (baris) \u00D7 penerima (kolom) \u2014 ${rows.length} naskah</div><table class="lt-tbl" style="font-size:9.5px"><thead><tr><th>Dari \\ Ke</th>${units.map(u => `<th style="padding:4px;writing-mode:vertical-rl;transform:rotate(180deg);height:70px">${esc(u.k || u.n)}</th>`).join('')}<th class="num">\u03A3</th></tr></thead>
      <tbody>${units.map((u, i) => `<tr><td><strong>${esc(u.k || u.n)}</strong></td>${m[i].map(v => `<td class="num" style="padding:4px;${v ? 'background:rgba(15,76,58,' + Math.min(.5, .08 + v / 30) + ')!important;font-weight:700' : 'color:#CBD5E1'}">${v || '\u00B7'}</td>`).join('')}<td class="num"><strong>${m[i].reduce((x, y) => x + y, 0)}</strong></td></tr>`).join('')}</tbody>
      <tfoot><tr><td>\u03A3</td>${units.map((_, j) => `<td class="num" style="padding:4px">${m.reduce((s, row) => s + row[j], 0)}</td>`).join('')}<td class="num">${m.reduce((s, row) => s + row.reduce((x, y) => x + y, 0), 0)}</td></tr></tfoot></table>
      <div class="small mt-2" style="color:#475569">Kode unit: ${units.map(u => esc(u.k) + ' = ' + esc(u.n)).join('; ')}.</div>`;
  }
  const kpi = opt.kpi ? `<div class="lt-kpi"><div><div class="k">Total naskah sirkulasi</div><div class="v">${a.total}</div></div><div><div class="k">Dibaca / dibalas</div><div class="v">${a.st.Dibaca + a.st.Dibalas}</div><div class="k">${fmtPersen(a.st.Dibaca + a.st.Dibalas, a.tujuanTot)} dari ${a.tujuanTot} entri</div></div><div><div class="k">Belum dibaca</div><div class="v">${a.st.Terkirim}</div></div><div class="warn"><div class="k">Tertunda &gt; 24 jam</div><div class="v">${a.unread24}</div></div></div>` : '';
  const ttd = opt.ttd ? `<div class="lt-sign"><div class="lt-sign-box">${esc(k.kota ? k.kota + ', ' : '')}${fmtTglPanjang(isoHari())}<br>${esc(k.penandatangan_jabatan || 'Admin Surat')}<br><strong>${esc(k.singkatan || 'YASMA PB. Soedirman')}</strong><div class="lt-sign-space"></div><strong><u>${esc(k.penandatangan_nama || '( ...................................... )')}</u></strong></div></div>` : '';
  return `${watermark(opt.wm ? 'AUDIT INTERNAL' : '')}${opt.kop ? kopHtml('Sekretariat Pengurus \u2014 Sistem Persuratan Terpusat') : ''}
    <div class="d-flex justify-content-between mono" style="font-size:10px;color:#64748B"><span>No. dokumen: ${esc(noDok)}</span><span>Status: final resmi</span></div>
    <div class="lt-title"><span class="tag">${esc(tpl.t.toUpperCase())}</span><h3>${esc(tpl.t)}</h3><div class="per">PERIODE: ${esc(periode.toUpperCase())}${L.unit ? ' \u00B7 UNIT: ' + esc(L.unit.toUpperCase()) : ''} \u00B7 WAKTU CETAK: ${fmtWaktu(now)}</div></div>
    ${kpi}${isi}${ttd}
    ${kakiCetak('Data dihimpun otomatis dari Google Sheets (metadata register, tanpa isi naskah) \u00B7 ' + (k.nama_aplikasi || 'Aplikasi Surat Terpusat'), 'Operator: ' + S.unit)}`;
}
function cetakLaporan() {
  const L = S.f.lap, tpl = TEMPLAT[L.tpl];
  cetakHalaman(`<div class="a4${tpl.lanskap ? ' landscape' : ''}">${isiLaporan()}</div>`, tpl.lanskap, { target: tpl.t, ket: 'Periode ' + L.dari + ' s/d ' + L.sampai + (L.unit ? '; unit ' + L.unit : '') + '; ' + dataLaporan().length + ' naskah' });
  S.adm.logAdmin.unshift({ id: uid('L'), w: Date.now(), p: S.unit, r: 'Admin', a: 'CETAK_LAPORAN', t: tpl.t, k: 'Periode ' + L.dari + ' s/d ' + L.sampai });
  setTimeout(() => S.view === 'laporan' && renderLaporan(), 1000);
}
function csvLaporan() {
  const L = S.f.lap, rows = dataLaporan(), a = agregat(rows), tpl = TEMPLAT[L.tpl];
  let data;
  if (L.tpl === 'eksekutif') data = [['Satuan Kerja', 'Masuk', 'Keluar', 'Sirkulasi', 'Tuntas', 'Unread >24j', 'Rata Respon (jam)']].concat(S.unitList.filter(u => !L.unit || u.n === L.unit).map(u => { const p = a.per[u.n] || {}; return [u.n, p.masuk || 0, p.keluar || 0, (p.masuk || 0) + (p.keluar || 0), p.tindak || 0, p.unread24 || 0, p.rata == null ? '' : p.rata.toFixed(2).replace('.', ',')]; }));
  else if (L.tpl === 'matriks') { const u = S.unitList; data = [['Dari \\ Ke'].concat(u.map(x => x.n))].concat(u.map(d => [d.n].concat(u.map(k => rows.filter(r => r.dari === d.n && r.ke.some(x => x.u === k.n)).length)))); }
  else if (L.tpl === 'sla') { data = [['Nomor', 'Dikirim', 'Pengirim', 'Penerima', 'Sifat', 'Umur (jam)']]; rows.forEach(r => r.ke.forEach(x => { if (x.st === 'Terkirim' && Date.now() - r.at > 864e5) data.push([r.no, fmtWaktu(r.at), r.dari, x.u, r.sifat, Math.round((Date.now() - r.at) / 36e5)]); })); }
  else data = [['Nomor', 'Tanggal Surat', 'Dicatat', 'Pengirim', 'Tujuan', 'Perihal', 'Sifat', 'Jenis', 'Status']].concat(rows.map(r => [r.no, r.tgl, fmtWaktu(r.at), r.dari, r.ke.map(x => x.u).join(', '), r.hal || '[Rahasia]', r.sifat, r.jenis, r.st]));
  unduhCsv(L.tpl + '-' + L.dari + '_' + L.sampai + '.csv', data);
  api('catatCetak', S.token, { target: tpl.t + ' (CSV)', ket: 'Periode ' + L.dari + ' s/d ' + L.sampai }).catch(() => {});
  S.adm.logAdmin.unshift({ id: uid('L'), w: Date.now(), p: S.unit, r: 'Admin', a: 'CETAK_LAPORAN', t: tpl.t + ' (CSV)', k: 'Periode ' + L.dari + ' s/d ' + L.sampai });
  renderLaporan();
}


function renderAkun() {
  if (!S.adm) return;
  const f = S.f.akun = S.f.akun || { q: '', status: '', kelompok: '', jenis: '' };
  const semua = S.adm.akun, hariIni = tglKeMs(isoHari());
  const akunUnit = semua.filter(a => a.peran === 'Unit'), nSatker = new Set(akunUnit.map(a => a.nama)).size;
  const levelUnit = {}; akunUnit.forEach(a => { (levelUnit[a.nama] = levelUnit[a.nama] || []).push(a.level || ''); });
  const pasangan = a => { if (a.peran !== 'Unit' || !a.level) return ''; const ada = levelUnit[a.nama] || []; return ['Pimpinan', 'Operator'].filter(l => ada.indexOf(l) === -1)[0] || ''; };
  const rankLv = { Pimpinan: 0, Operator: 1 };
  byId('akunKpi').innerHTML = `
    <div class="kpi"><div class="kpi-label">Total akun terdaftar <i class="bi bi-people"></i></div><div class="kpi-value">${semua.length}</div><div class="kpi-foot"><span>${nSatker} satker (${akunUnit.length} akun: ${akunUnit.filter(a => a.level === 'Pimpinan').length} pimpinan, ${akunUnit.filter(a => a.level === 'Operator').length} operator) + ${semua.filter(a => a.peran === 'Admin').length} admin</span></div></div>
    <div class="kpi green"><div class="kpi-label">Akun aktif <i class="bi bi-check-circle"></i></div><div class="kpi-value">${semua.filter(a => a.aktif).length}</div><div class="kpi-foot"><span>${semua.filter(a => !a.aktif).length} nonaktif</span></div></div>
    <div class="kpi amber"><div class="kpi-label">Wajib ganti password <i class="bi bi-key"></i></div><div class="kpi-value">${semua.filter(a => a.wajib).length}</div><div class="kpi-foot"><span>Pending reset / akun baru</span></div></div>
    <div class="kpi slate"><div class="kpi-label">Login hari ini <i class="bi bi-box-arrow-in-right"></i></div><div class="kpi-value">${semua.filter(a => a.login >= hariIni).length}</div><div class="kpi-foot"><span>${semua.filter(a => a.terkunci).length} terkunci sementara</span></div></div>`;
  const list = semua.filter(a => cocok(f.q, a.nama, a.label, a.level, a.kode, a.pic, a.email) && (!f.kelompok || a.kelompok === f.kelompok) &&
    (!f.jenis || (f.jenis === 'tunggal' ? a.peran === 'Unit' && !a.level : a.level === f.jenis)) &&
    (!f.status || (f.status === 'aktif' ? a.aktif : f.status === 'nonaktif' ? !a.aktif : f.status === 'wajib' ? a.wajib : a.terkunci)))
    .sort((a, b) => (a.peran === 'Admin' ? -1 : b.peran === 'Admin' ? 1 : 0) || a.nama.localeCompare(b.nama, 'id') || ((a.level in rankLv ? rankLv[a.level] : 2) - (b.level in rankLv ? rankLv[b.level] : 2)));
  byId('akunList').innerHTML = list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th><th>Kode &amp; nama satuan kerja</th><th>Peran</th><th>PIC / email</th><th>Status password</th><th>Status</th><th>Login terakhir</th><th class="text-end">Aksi</th></tr></thead><tbody>${list.map((a, i) => `
    <tr${a._pending ? ' class="pending"' : ''}><td class="mono">${pad(i + 1)}</td><td><strong>${esc(a.label || a.nama)}</strong>${a.peran === 'Admin' ? ' <span class="chip chip-solid">PUSAT</span>' : ''}<span class="sub">ID: ${esc(a.kode || '\u2014')}${a.kelompok ? ' \u00B7 ' + esc(a.kelompok) : ''}</span>${a.tampil ? `<span class="sub"><i class="bi bi-building"></i> ${esc(a.tampil)}</span>` : ''}</td><td><span class="chip ${a.peran === 'Admin' ? 'chip-solid' : a.level === 'Pimpinan' ? 'chip-info' : a.level === 'Operator' ? 'chip-warn' : ''}">${a.peran === 'Admin' ? 'ADMIN SURAT' : a.level ? esc(a.level.toUpperCase()) : 'UNIT'}</span><span class="sub">${a.peran === 'Admin' ? '' : a.level === 'Operator' ? 'Disposisi: lihat &amp; cetak' : 'Disposisi: buat &amp; cetak'}</span></td><td>${esc(a.pic || '\u2014')}<span class="sub">${esc(a.email || '')}</span></td>
    <td>${a.wajib ? '<span class="chip chip-warn">WAJIB GANTI</span>' : '<span class="chip">MANDIRI</span>'}${a.peran === 'Unit' && a.level !== 'Operator' ? `<span class="sub">TTD: ${a.ttd === 'aktif' ? 'aktif' : a.ttd === 'tanpa-pin' ? 'PIN direset' : 'belum diatur'}</span>` : ''}</td>
    <td>${a.terkunci ? '<span class="chip chip-danger">TERKUNCI</span>' : a.aktif ? '<span class="chip chip-ok">AKTIF</span>' : '<span class="chip">NONAKTIF</span>'}</td>
    <td class="mono small">${a.login ? fmtTglMs(a.login) + '<span class="sub">' + fmtJam(a.login) + ' WIB</span>' : '<span class="text-muted-2">Belum pernah</span>'}</td>
    <td class="text-end"><div class="dropdown act-menu"><button type="button" class="icon-btn" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}' aria-label="Aksi untuk ${attr(a.label || a.nama)}"><i class="bi bi-three-dots-vertical"></i></button><ul class="dropdown-menu dropdown-menu-end">
      <li><button type="button" class="dropdown-item" data-ak-ubah="${attr(a.id)}"><i class="bi bi-pencil"></i> Ubah data</button></li>
      ${pasangan(a) ? `<li><button type="button" class="dropdown-item" data-ak-pasang="${attr(a.id)}" data-level="${attr(pasangan(a))}"><i class="bi bi-person-plus"></i> Buat akun ${esc(pasangan(a))}</button></li>` : ''}
      ${a.peran !== 'Admin' ? `<li><button type="button" class="dropdown-item" data-ak-reset="${attr(a.id)}"><i class="bi bi-key"></i> Reset password</button></li>
      ${a.ttd === 'aktif' ? `<li><button type="button" class="dropdown-item" data-ak-pin="${attr(a.id)}"><i class="bi bi-pen"></i> Reset PIN tanda tangan</button></li>` : ''}
      <li><hr class="dropdown-divider"></li><li><button type="button" class="dropdown-item ${a.aktif ? 'text-danger' : ''}" data-ak-status="${attr(a.id)}"><i class="bi ${a.aktif ? 'bi-slash-circle' : 'bi-check-circle'}"></i> ${a.aktif ? 'Nonaktifkan' : 'Aktifkan'} akun</button></li>` : ''}
    </ul></div></td></tr>`).join('')}</tbody></table></div>` : kosong('Tidak ada akun cocok', 'Ubah kata kunci pencarian.', 'bi-person-x');
  $$('[data-ak-ubah]').forEach(b => b.onclick = () => bukaFormAkun(b.dataset.akUbah));
  $$('[data-ak-reset]').forEach(b => b.onclick = () => bukaReset(b.dataset.akReset));
  $$('[data-ak-status]').forEach(b => b.onclick = () => ubahStatusAkun(b.dataset.akStatus));
  $$('[data-ak-pin]').forEach(b => b.onclick = () => resetPinTtd(b.dataset.akPin));
  $$('[data-ak-pasang]').forEach(b => b.onclick = () => bukaFormAkun(null, { dari: S.adm.akun.find(x => x.id === b.dataset.akPasang), level: b.dataset.level }));
  const aksiAkun = ['RESET_PASSWORD', 'BUAT_AKUN', 'UBAH_AKUN', 'AKTIFKAN_AKUN', 'NONAKTIFKAN_AKUN', 'AKUN_TERKUNCI', 'GANTI_PASSWORD', 'PUTUS_SESI', 'UBAH_KONFIGURASI', 'RESET_PIN_TTD', 'PIN_TERKUNCI'];
  const log = S.adm.logAdmin.filter(l => aksiAkun.includes(l.a)).slice(0, 15);
  byId('akunLog').innerHTML = log.length ? `<div class="tbl-wrap"><table class="tbl tbl-compact"><thead><tr><th>Waktu</th><th>Pelaku</th><th>Aksi sistem</th><th>Target</th><th>Keterangan</th></tr></thead><tbody>${log.map(l => `<tr><td class="mono small">${fmtTglMs(l.w)}<span class="sub">${fmtJam(l.w)} WIB</span></td><td>${esc(l.p)}</td><td><span class="chip ${/TERKUNCI|NONAKTIF/.test(l.a) ? 'chip-danger' : /RESET|PASSWORD/.test(l.a) ? 'chip-warn' : 'chip-ok'}">${esc(l.a)}</span></td><td>${esc(l.t)}</td><td class="small">${esc(l.k)}</td></tr>`).join('')}</tbody></table></div>` : kosong('Belum ada log akun', '', 'bi-journal');
}

const INFO_LEVEL = {
  Pimpinan: 'Kepala unit: seluruh fitur unit, termasuk membuat, menandatangani, dan membatalkan disposisi serta mengatur tanda tangan & PIN.',
  Operator: 'Staf tata usaha: membaca, mengirim, membalas, dan mencetak surat serta lembar disposisi, tetapi TIDAK dapat membuat disposisi.',
  '': 'Satu akun untuk seluruh fitur unit (termasuk disposisi). Untuk unit sekolah disarankan memakai akun Pimpinan + Operator.'
};
function unitTerdaftar(nama) {
  const n = String(nama || '').trim().toLowerCase();
  return n ? S.adm.akun.filter(x => x.peran === 'Unit' && x.nama.toLowerCase() === n) : [];
}
function bukaFormAkun(id, pre) {
  const a = id ? S.adm.akun.find(x => x.id === id) : null, dari = pre && pre.dari;
  byId('mAkunT').textContent = a ? 'Ubah Data Akun \u2014 ' + (a.label || a.nama) : dari ? 'Tambah Akun ' + pre.level + ' \u2014 ' + dari.nama : 'Tambah Akun Unit Baru';
  byId('akId').value = a ? a.id : '';
  byId('akUnitList').innerHTML = Array.from(new Set(S.adm.akun.filter(x => x.peran === 'Unit').map(x => x.nama))).map(n => `<option value="${attr(n)}"></option>`).join('');
  byId('akNama').value = a ? a.nama : dari ? dari.nama : ''; byId('akNama').disabled = !!(a || dari);
  byId('akKode').value = a ? a.kode : dari ? dari.kode : ''; byId('akKel').value = (a && a.kelompok) || (dari && dari.kelompok) || 'Sekolah';
  byId('akKel').disabled = !!(a && a.peran === 'Admin');
  byId('akLevelWrap').hidden = !!(a && a.peran === 'Admin');
  byId('akLevel').value = a ? (a.level || '') : dari ? pre.level : 'Pimpinan';
  byId('akLevel').dataset.manual = a || dari ? '1' : '';
  byId('akPic').value = a ? a.pic : ''; byId('akEmail').value = a ? a.email : '';
  byId('akPassWrap').hidden = !!a; byId('akPass').value = a ? '' : sandiAcak(10);
  sinkronFormAkun();
  modal('mAkun').show();
}
function sinkronFormAkun() {
  const baru = !byId('akId').value, ada = baru ? unitTerdaftar(byId('akNama').value) : [];
  byId('akKode').readOnly = ada.length > 0;
  if (ada.length) {
    byId('akKode').value = ada[0].kode || ''; byId('akKel').value = ada[0].kelompok || 'Sekolah'; byId('akKel').disabled = true;
    const punya = ada.map(x => x.level || '');
    if (!byId('akLevel').dataset.manual) byId('akLevel').value = ['Pimpinan', 'Operator'].filter(l => punya.indexOf(l) === -1)[0] || 'Operator';
    byId('akNamaHint').textContent = 'Unit sudah terdaftar (' + ada.map(x => x.label || x.nama).join(', ') + '). Akun ini menjadi akun tambahan unit tersebut; kode & kelompok mengikuti unit.';
  } else if (baru) {
    byId('akKel').disabled = false;
    if (!byId('akLevel').dataset.manual) byId('akLevel').value = byId('akKel').value === 'Sekolah' ? 'Pimpinan' : '';
    byId('akNamaHint').textContent = 'Nama tidak dapat diubah setelah dibuat (dipakai sebagai identitas surat). Untuk menambah akun Pimpinan/Operator pada unit yang ada, ketik nama unit yang sama.';
  } else {
    byId('akNamaHint').textContent = 'Nama unit terkunci karena dipakai sebagai identitas pada surat yang sudah ada. Kode & kelompok berlaku untuk semua akun unit ini.';
  }
  byId('akLevelHint').textContent = INFO_LEVEL[byId('akLevel').value] || '';
}
async function simpanAkun(ev) {
  ev.preventDefault();
  const d = { id: byId('akId').value, nama: byId('akNama').value.trim(), kode: byId('akKode').value.trim().toUpperCase(), kelompok: byId('akKel').value, level: byId('akLevelWrap').hidden ? '' : byId('akLevel').value, pic: byId('akPic').value.trim(), email: byId('akEmail').value.trim(), password: byId('akPass').value };
  if (!d.id && !d.nama) { byId('akNama').classList.add('is-invalid'); return; }
  if (!d.kode) { byId('akKode').classList.add('is-invalid'); return; }
  if (!d.id) { const e = cekSandi(d.password); if (e) { toast('Password tidak valid', e, 'warning'); return; } }
  const btn = byId('btnAkSimpan'); sibuk(btn, true, 'Menyimpan\u2026');
  try {
    const res = await api('adminSimpanAkun', S.token, d);
    if (!res.success) { toast('Gagal menyimpan', res.message, 'danger'); return; }
    const data = Object.assign({}, res.data), terkait = data.terkait || []; delete data.terkait;
    [data].concat(terkait).forEach(x => { const i = S.adm.akun.findIndex(y => y.id === x.id); if (i >= 0) S.adm.akun[i] = x; else S.adm.akun.push(x); });
    if (!d.id && !S.unitMap[data.nama]) { S.unitList.push({ n: data.nama, k: data.kode, g: data.kelompok }); S.unitMap[data.nama] = S.unitList[S.unitList.length - 1]; }
    modal('mAkun').hide();
    toast('Akun tersimpan', res.message + (d.id ? '' : ' Sampaikan password sementara ke ' + (data.level === 'Pimpinan' ? 'kepala unit' : 'PIC unit') + '.'), 'success');
    if (!d.id) salin(d.password);
    renderAkun(); perbaruiLencana(); simpanCache();
  } catch (e) { if (!e.ditangani) toast('Gagal menyimpan', pesanError(e), 'danger'); }
  finally { sibuk(btn, false); }
}
function bukaReset(id) {
  const a = S.adm.akun.find(x => x.id === id); if (!a) return;
  byId('rsNama').textContent = a.label || a.nama; byId('rsKode').textContent = 'ID: ' + (a.kode || '\u2014') + ' \u00B7 ' + (a.email || 'email belum diisi');
  byId('rsPass').value = sandiAcak(10);
  byId('btnRsSimpan').onclick = async () => {
    const p = byId('rsPass').value, e = cekSandi(p);
    if (e) { toast('Password tidak valid', e, 'warning'); return; }
    const btn = byId('btnRsSimpan'); sibuk(btn, true, 'Menerapkan\u2026');
    try {
      const res = await api('adminResetPassword', S.token, id, p);
      if (!res.success) { toast('Gagal reset', res.message, 'danger'); return; }
      Object.assign(a, res.data);
      S.adm.logAdmin.unshift({ id: uid('L'), w: Date.now(), p: S.unit, r: 'Admin', a: 'RESET_PASSWORD', t: a.label || a.nama, k: 'Password sementara diterbitkan; sesi akun dicabut' });
      modal('mReset').hide(); salin(p);
      toast('Password direset', res.message + ' Password sementara disalin ke papan klip.', 'success', { lama: 8000 });
      renderAkun();
    } catch (err) { if (!err.ditangani) toast('Gagal reset', pesanError(err), 'danger'); }
    finally { sibuk(btn, false); }
  };
  modal('mReset').show();
}
async function resetPinTtd(id) {
  const a = S.adm.akun.find(x => x.id === id); if (!a) return;
  if (!await konfirmasi('Reset PIN Tanda Tangan', `<p>PIN tanda tangan <strong>${esc(a.nama)}</strong> akan dihapus. Disposisi yang sudah ditandatangani tetap sah.</p><p class="mb-0">Kepala unit lalu membuat PIN baru di <em>Pengaturan &rarr; Tanda Tangan Digital</em> memakai password akun <strong>${esc(a.label || a.nama)}</strong>.</p>`, { ya: 'Reset PIN', bahaya: true })) return;
  try {
    const res = await api('adminResetPinTtd', S.token, id);
    if (!res.success) { toast('Gagal reset PIN', res.message, 'danger'); return; }
    Object.assign(a, res.data);
    S.adm.logAdmin.unshift({ id: uid('L'), w: Date.now(), p: S.unit, r: 'Admin', a: 'RESET_PIN_TTD', t: a.label || a.nama, k: 'PIN tanda tangan direset' });
    toast('PIN direset', res.message, 'success', { lama: 8000 });
    renderAkun();
  } catch (e) { if (!e.ditangani) toast('Gagal reset PIN', pesanError(e), 'danger'); }
}
async function ubahStatusAkun(id) {
  const a = S.adm.akun.find(x => x.id === id); if (!a) return;
  const aktif = !a.aktif;
  if (!aktif && !await konfirmasi('Nonaktifkan Akun', `<p>Akun <strong>${esc(a.label || a.nama)}</strong> tidak akan bisa login dan semua sesinya diputus. Surat yang sudah ada tetap tersimpan.</p><p class="mb-0">${a.level ? 'Unit tetap menerima surat selama masih ada akun lain yang aktif.' : 'Unit nonaktif tidak muncul sebagai pilihan tujuan surat baru.'}</p>`, { ya: 'Nonaktifkan', bahaya: true })) return;
  const lama = a.aktif; a.aktif = aktif; a._pending = true; renderAkun();
  try {
    const res = await api('adminSetStatusAkun', S.token, id, aktif);
    delete a._pending;
    if (!res.success) { a.aktif = lama; toast('Gagal', res.message, 'danger'); }
    else { Object.assign(a, res.data); toast('Status akun diperbarui', res.message, 'success'); }
  } catch (e) { delete a._pending; a.aktif = lama; if (!e.ditangani) toast('Gagal', pesanError(e), 'danger'); }
  renderAkun();
}


function renderAdminSet() {
  const k = S.identitas;
  const isi = { idNamaApp: 'nama_aplikasi', idYayasan: 'nama_yayasan', idSingkat: 'singkatan', idKota: 'kota', idAlamat: 'alamat', idTelp: 'telepon', idEmail: 'email', idWeb: 'website', idLogo: 'logo_url', idTtdNama: 'penandatangan_nama', idTtdJab: 'penandatangan_jabatan', idJabDisp: 'jabatan_disposisi', cfIdle: 'sesi_idle_menit', cfPoll: 'polling_detik', cfMaks: 'maks_percobaan_login', cfKunci: 'kunci_menit' };
  Object.entries(isi).forEach(([id, key]) => byId(id).value = k[key] || '');
  if (!byId('formPassAdm').dataset.siap) { pasangKekuatan(byId('aBaru'), byId('aStrength')); byId('formPassAdm').dataset.siap = '1'; }
}
async function simpanKonfigurasi(ev, peta) {
  ev.preventDefault();
  const form = ev.target;
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const obj = {}; Object.entries(peta).forEach(([id, key]) => obj[key] = byId(id).value.trim());
  const btn = form.querySelector('[type="submit"]'); sibuk(btn, true, 'Menyimpan\u2026');
  try {
    const res = await api('adminSimpanKonfigurasi', S.token, obj);
    if (!res.success) { toast('Gagal menyimpan', res.message, 'danger'); return; }
    S.identitas = res.data;
    ['sesi_idle_menit', 'polling_detik', 'maks_percobaan_login', 'kunci_menit'].forEach(x => S.konfig[x] = +res.data[x]);
    terapkanIdentitas(Object.assign({}, S.identitas, { versi: S.konfig.versi }));
    mulaiPolling(); simpanCache();
    toast('Pengaturan tersimpan', 'Berlaku untuk seluruh pengguna pada sesi/muat berikutnya.', 'success');
  } catch (e) { if (!e.ditangani) toast('Gagal menyimpan', pesanError(e), 'danger'); }
  finally { sibuk(btn, false); }
}

function pasangEventAdmin() {
  byId('btnAdmSegar').addEventListener('click', async () => { const b = byId('btnAdmSegar'); sibuk(b, true, 'Memuat\u2026'); await muatAdmin(S.adm && S.adm.tahun); sibuk(b, false); toast('Data diperbarui', 'Agregat dihitung ulang dari Google Sheets.', 'success'); });
  byId('btnMetrikCsv').addEventListener('click', eksporMetrik);
  byId('btnRekapSegar').addEventListener('click', async () => { const b = byId('btnRekapSegar'); sibuk(b, true, 'Memuat\u2026'); await muatAdmin(S.adm && S.adm.tahun); sibuk(b, false); });
  byId('btnRekapCsv').addEventListener('click', eksporRekap);
  byId('btnRekapCetak').addEventListener('click', () => { const f = S.f.rekap || {}; S.f.lap = Object.assign(S.f.lap || {}, { tpl: 'register', periode: 'kustom', dari: f.dari || S.adm.tahun + '-01-01', sampai: f.sampai || isoHari(), unit: '' }); go('laporan'); $$('input[name="lapTpl"]').forEach(r => r.checked = r.value === 'register'); });
  byId('rekapPer').addEventListener('change', e => { S.f.rekap.per = +e.target.value; S.f.rekap.hal = 1; renderRekap(); });
  byId('lapTpl').addEventListener('change', e => { if (e.target.name === 'lapTpl') { S.f.lap.tpl = e.target.value; renderLaporan(); } });
  byId('lapPeriode').addEventListener('change', e => { const L = S.f.lap; L.periode = e.target.value; if (L.periode !== 'kustom') [L.dari, L.sampai] = rentangPreset(L.periode); renderLaporan(); });
  ['lapDari', 'lapSampai'].forEach(id => byId(id).addEventListener('change', () => { const L = S.f.lap; L.periode = 'kustom'; L.dari = byId('lapDari').value; L.sampai = byId('lapSampai').value; renderLaporan(); }));
  byId('lapUnit').addEventListener('change', e => { S.f.lap.unit = e.target.value; renderLaporan(); });
  byId('lapSifat').addEventListener('change', () => { S.f.lap.sifat = $$('#lapSifat input:checked').map(i => i.value); renderLaporan(); });
  byId('lapJenis').addEventListener('change', () => { S.f.lap.jenis = $$('#lapJenis input:checked').map(i => i.value); renderLaporan(); });
  ['lapKop', 'lapKpi', 'lapTtd', 'lapWm'].forEach(id => byId(id).addEventListener('change', renderLaporan));
  byId('btnLapCetak').addEventListener('click', cetakLaporan);
  byId('btnLapCetak2').addEventListener('click', cetakLaporan);
  byId('btnLapCsv').addEventListener('click', csvLaporan);
  byId('btnAkunBaru').addEventListener('click', () => bukaFormAkun(null));
  byId('formAkun').addEventListener('submit', simpanAkun);
  ['akNama', 'akKode'].forEach(id => byId(id).addEventListener('input', e => e.target.classList.remove('is-invalid')));
  byId('akNama').addEventListener('input', debounce(sinkronFormAkun, 150));
  byId('akKel').addEventListener('change', sinkronFormAkun);
  byId('akLevel').addEventListener('change', () => { byId('akLevel').dataset.manual = '1'; sinkronFormAkun(); });
  byId('btnAkGen').addEventListener('click', () => byId('akPass').value = sandiAcak(10));
  byId('btnAkCopy').addEventListener('click', () => salin(byId('akPass').value));
  byId('btnRsGen').addEventListener('click', () => byId('rsPass').value = sandiAcak(10));
  byId('btnRsCopy').addEventListener('click', () => salin(byId('rsPass').value));
  const fa = () => { const f = S.f.akun; f.q = byId('akQ').value; f.status = byId('akStatus').value; f.kelompok = byId('akKelompok').value; f.jenis = byId('akJenis').value; renderAkun(); };
  byId('akQ').addEventListener('input', debounce(fa, 110));
  ['akStatus', 'akKelompok', 'akJenis'].forEach(id => byId(id).addEventListener('change', fa));
  byId('formPassAdm').addEventListener('submit', ev => simpanPassword(ev, ['aLama', 'aBaru', 'aUlang', 'aErr'], ev.target.querySelector('[type="submit"]')));
  byId('formIdentitas').addEventListener('submit', ev => simpanKonfigurasi(ev, { idNamaApp: 'nama_aplikasi', idYayasan: 'nama_yayasan', idSingkat: 'singkatan', idKota: 'kota', idAlamat: 'alamat', idTelp: 'telepon', idEmail: 'email', idWeb: 'website', idLogo: 'logo_url', idTtdNama: 'penandatangan_nama', idTtdJab: 'penandatangan_jabatan', idJabDisp: 'jabatan_disposisi' }));
  byId('formSistem').addEventListener('submit', ev => simpanKonfigurasi(ev, { cfIdle: 'sesi_idle_menit', cfPoll: 'polling_detik', cfMaks: 'maks_percobaan_login', cfKunci: 'kunci_menit' }));
}


const TTD = { img: new Map(), muat: new Map(), qr: null };
const JABATAN_BAWAAN = 'Kepala TU, Bendahara, Staff, Wakil Kurikulum, Wakil Kesiswaan, Wakil Bid. Agama';

function daftarJabatan() {
  const lihat = new Set();
  return String(S.identitas.jabatan_disposisi || JABATAN_BAWAAN).split(',').map(x => x.trim())
    .filter(x => { const k = x.toLowerCase(); if (!x || lihat.has(k)) return false; lihat.add(k); return true; }).slice(0, 20);
}
function dispSurat(idSurat) { return (S.disposisi || []).filter(d => d.surat === idSurat).sort((a, b) => b.at - a.at); }
function dispUntuk(dasar, s) { return dispSurat(dasar.id).concat(s && s.id !== dasar.id ? dispSurat(s.id) : []); }
function adaDisposisiSah(s) { return (S.disposisi || []).some(d => d.surat === s.id && d.st !== 'Dibatalkan'); }
function fmtKode(k) { return String(k || '').replace(/(.{4})(?=.)/g, '$1-'); }
function urlVerifikasi(kode) {
  const dasar = (window.YasmaApi && window.YasmaApi.urlVerifikasi()) || S.urlApp;
  return dasar && kode ? dasar + (dasar.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(kode) : '';
}
function ringkasJabatan(arr, n) { n = n || 3; return arr.slice(0, n).join(', ') + (arr.length > n ? ' +' + (arr.length - n) : ''); }

function muatTtd(file) {
  if (!file) return Promise.resolve('');
  if (TTD.img.has(file)) return Promise.resolve(TTD.img.get(file));
  if (TTD.muat.has(file)) return TTD.muat.get(file);
  const p = api('ambilTtd', S.token, file)
    .then(res => { TTD.muat.delete(file); if (!res.success) return ''; TTD.img.set(file, res.data.data); return res.data.data; })
    .catch(() => { TTD.muat.delete(file); return ''; });
  TTD.muat.set(file, p);
  return p;
}
function isiGambarTtd(root) {
  $$('img[data-ttd]', root).forEach(img => {
    const f = img.dataset.ttd;
    if (TTD.img.has(f)) { img.src = TTD.img.get(f); img.classList.add('siap'); return; }
    muatTtd(f).then(d => { if (d) { img.src = d; img.classList.add('siap'); } else img.closest('.ld-img, .ttd-prev, .ttd-mini') && img.closest('.ld-img, .ttd-prev, .ttd-mini').classList.add('gagal'); });
  });
}

function muatQr() {
  if (window.qrcode) return Promise.resolve();
  if (!TTD.qr) TTD.qr = loadScript(CDN.qr).catch(e => { TTD.qr = null; throw e; });
  return TTD.qr;
}
function svgQr(teks) {
  if (!window.qrcode || !teks) return '';
  try { const q = window.qrcode(0, 'M'); q.addData(teks); q.make(); return q.createSvgTag({ cellSize: 2, margin: 0, scalable: true }); } catch (e) { return ''; }
}
function isiQr(root) {
  const el = $$('[data-qr]', root).filter(x => !x.dataset.siap);
  if (!el.length) return Promise.resolve();
  const pasang = () => el.forEach(x => { const svg = svgQr(x.dataset.qr); if (svg) { x.innerHTML = svg; x.dataset.siap = '1'; } });
  if (window.qrcode) { pasang(); return Promise.resolve(); }
  return muatQr().then(pasang).catch(() => el.forEach(x => { x.innerHTML = '<span class="qr-gagal">QR gagal dimuat</span>'; }));
}
function siapkanAsetDisposisi(root) { isiGambarTtd(root); isiLogo(root); return isiQr(root); }
async function tungguAsetDisposisi(root) {
  await isiQr(root);
  await isiLogo(root);
  await Promise.all($$('img[data-ttd]', root).map(img => muatTtd(img.dataset.ttd).then(d => { if (d) { img.src = d; img.classList.add('siap'); } })));
}

function blokDisposisi(d) {
  const daftar = daftarJabatan(), lower = new Set(daftar.map(j => j.toLowerCase()));
  const semua = daftar.concat(d.kepada.filter(k => !lower.has(k.toLowerCase())));
  const pilih = new Set(d.kepada.map(k => k.toLowerCase()));
  const kota = S.identitas.kota ? S.identitas.kota + ', ' : '';
  const url = urlVerifikasi(d.kode);
  return `<div class="ld${d.st === 'Dibatalkan' ? ' batal' : ''}">
    <div class="ld-sub">Untuk dibaca dan ditembuskan kepada</div>
    <div class="ld-jab">${semua.map(j => `<div class="ld-j${pilih.has(j.toLowerCase()) ? ' on' : ''}"><span class="ld-box" aria-hidden="true">${pilih.has(j.toLowerCase()) ? '&#10003;' : ''}</span><span>${esc(j)}</span><span class="visually-hidden">${pilih.has(j.toLowerCase()) ? '(dipilih)' : ''}</span></div>`).join('')}</div>
    <div class="ld-sub">Catatan / instruksi</div>
    <div class="ld-cat">${esc(d.catatan)}</div>
    <div class="ld-foot">
      <div class="ld-qr">${url ? `<div class="ld-qr-img" data-qr="${attr(url)}" role="img" aria-label="QR verifikasi tanda tangan"></div>` : '<div class="ld-qr-img kosong"><i class="bi bi-qr-code" aria-hidden="true"></i></div>'}
        <div class="ld-qr-t"><strong>Ditandatangani secara elektronik</strong><br>${url ? 'Pindai QR untuk memeriksa keaslian.' : 'QR aktif setelah aplikasi dideploy.'}<br>Kode: <span class="mono">${esc(fmtKode(d.kode))}</span></div></div>
      <div class="ld-ttd">${esc(kota)}${fmtTglPanjang(isoHari(new Date(d.at)))}<br>${esc(d.ttd.jabatan)}
        <div class="ld-img"><img data-ttd="${attr(d.ttd.file)}" alt="Tanda tangan ${attr(d.ttd.nama)}"></div>
        <div class="ld-nama">${esc(d.ttd.nama)}</div>${d.ttd.nip ? `<div class="ld-nip">NIP/NIY ${esc(d.ttd.nip)}</div>` : ''}</div>
    </div>
    ${d.st === 'Dibatalkan' ? `<div class="ld-batal"><strong>DIBATALKAN</strong> ${fmtWaktu(d.batal)} &mdash; ${esc(d.alasan)}</div>` : ''}
  </div>`;
}
function blokDisposisiKosong() {
  const kota = S.identitas.kota ? S.identitas.kota + ', ' : '';
  return `<div class="ld kosong">
    <div class="ld-sub">Untuk dibaca dan ditembuskan kepada</div>
    <div class="ld-jab">${daftarJabatan().map(j => `<div class="ld-j"><span class="ld-box" aria-hidden="true"></span><span>${esc(j)}</span></div>`).join('')}</div>
    <div class="ld-sub">Catatan / instruksi</div>
    <div class="ld-cat ld-garis"></div>
    <div class="ld-foot"><div></div><div class="ld-ttd">${esc(kota)}.............................<br>Kepala ${esc(S.unit)}<div class="ld-img"></div><div class="ld-nama">( ...................................... )</div></div></div>
  </div>`;
}

function kartuDisposisi(dasar, s, saya) {
  const intern = dispUntuk(dasar, s);
  const lama = semuaSurat().filter(x => x.jenis === 'Disposisi' && x.induk === dasar.id);
  const item = intern.map(d => `<div class="track disp-item${d.st === 'Dibatalkan' ? ' batal' : ''}" role="button" tabindex="0" data-disp="${attr(d.id)}"><div class="min-w-0"><div class="track-u">${esc(ringkasJabatan(d.kepada))}</div><div class="track-s">${fmtWaktu(d.at)} &middot; ttd ${esc(d.ttd.nama)}</div></div><span class="chip ${d.st === 'Dibatalkan' ? 'chip-danger' : 'chip-ok'}">${d.st === 'Dibatalkan' ? 'DIBATALKAN' : '<i class="bi bi-patch-check"></i> SAH'}</span></div>`).join('');
  const itemLama = lama.map(d => `<div class="track" role="button" tabindex="0" data-go="detail" data-params="${attr(JSON.stringify({ id: d.id, dari: S.params.dari || 'masuk' }))}"><div class="min-w-0"><div class="track-u">${esc(d.dari)} &rarr; ${esc(d.ke.map(k => k.u).join(', '))}</div><div class="track-s">${fmtWaktu(d.at)} &middot; antarunit (versi lama)</div></div><span class="track-st ${esc(d.st)}">${esc(d.st.toUpperCase())}</span></div>`).join('');
  return `<div class="card-head"><h3 class="card-title"><i class="bi bi-pen"></i> Disposisi Internal</h3><span class="chip">${intern.filter(d => d.st !== 'Dibatalkan').length} SAH</span></div>
    ${item || itemLama ? item + itemLama : `<div class="empty py-3"><div class="empty-ic"><i class="bi bi-pen"></i></div><div class="empty-d">Belum ada disposisi untuk surat ini${saya ? (bolehDisposisi() ? '. Gunakan tombol "Disposisi Surat" untuk meneruskan arahan kepada jabatan di unit Anda.' : '. Disposisi dibuat dan ditandatangani oleh akun Pimpinan unit; lembarnya dapat Anda cetak setelah ditandatangani.') : '.'}</div></div>`}
    ${intern.some(d => d.st !== 'Dibatalkan') ? `<button type="button" class="btn btn-outline btn-sm w-100 mt-1" id="aDispCetak"><i class="bi bi-printer"></i> Cetak lembar disposisi</button>` : ''}
    ${saya && bolehDisposisi() ? `<button type="button" class="btn btn-outline btn-sm w-100 mt-1" id="aDisp2"><i class="bi bi-plus-lg"></i> Buat disposisi</button>` : ''}`;
}
function pasangKartuDisposisi(w, idSurat) {
  $$('[data-disp]', w).forEach(b => {
    b.onclick = () => lihatDisposisi(b.dataset.disp);
    b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lihatDisposisi(b.dataset.disp); } };
  });
  const b2 = byId('aDisp2'); if (b2) b2.onclick = () => bukaDisposisi(idSurat);
  const b3 = byId('aDispCetak'); if (b3) b3.onclick = () => go('cetak', { id: idSurat, hanyaDisp: 1, dari: S.params.dari || 'masuk' });
}
function acaraDisposisi(dasar, s) {
  return dispUntuk(dasar, s).map(d => ({ t: d.at, cls: 'purple', h: 'Disposisi internal ditandatangani ' + d.ttd.nama, d: 'Untuk ' + d.kepada.join(', ') + (d.st === 'Dibatalkan' ? ' (dibatalkan)' : '') }));
}

function bukaDisposisi(id) {
  if (!bolehDisposisi()) { toast('Khusus akun Pimpinan', 'Akun Operator tidak dapat membuat disposisi. Anda tetap dapat melihat dan mencetak lembar disposisi.', 'warning'); return; }
  const s = S.surat.get(id); if (!s) return;
  const dasar = suratDasar(s);
  S.dispCid = null;
  byId('dispRef').innerHTML = `<span class="ref-tag">SURAT YANG DIDISPOSISIKAN</span><div class="ref-grid"><div><div class="ml">Nomor</div><div class="mv">${esc(dasar.no)}</div></div><div><div class="ml">Pengirim</div><div class="mv">${esc(dasar.dari)}</div></div></div><div class="ref-title">"${esc(dasar.hal)}"</div>`;
  byId('dispJab').innerHTML = daftarJabatan().map(j => `<label class="jab"><input type="checkbox" value="${attr(j)}"><span>${esc(j)}</span></label>`).join('');
  byId('dispCatatan').value = ''; byId('cDisp').textContent = '0 / 2000'; byId('dispCatatan').classList.remove('is-invalid');
  byId('dispPin').value = ''; byId('dispErr').textContent = ''; byId('dispJabErr').textContent = '';
  renderTtdDisposisi();
  byId('btnDispKirim').onclick = () => kirimDisposisi(s.id);
  modal('mDisposisi').show();
}
function renderTtdDisposisi() {
  const t = S.ttd, siap = !!(t && t.pin);
  byId('dispTtd').innerHTML = siap
    ? `<div class="ttd-who"><div class="ttd-mini"><img data-ttd="${attr(t.file)}" alt="Tanda tangan ${attr(t.nama)}"></div><div class="min-w-0"><div class="tw-l">Ditandatangani oleh</div><div class="tw-n">${esc(t.nama)}</div><div class="tw-j">${esc(t.jabatan)}${t.nip ? ' &middot; NIP/NIY ' + esc(t.nip) : ''}</div></div></div>`
    : `<div class="alert-inline alert-warn mb-0"><i class="bi bi-exclamation-triangle"></i><div><span class="ai-h">${t ? 'PIN tanda tangan perlu dibuat ulang' : 'Tanda tangan kepala unit belum diatur'}</span>${t ? 'PIN direset oleh Admin Surat. Buat PIN baru memakai password ' + akunTtd() + '.' : 'Atur sekali di Pengaturan sebelum membuat disposisi.'} <button type="button" class="link-btn" id="dispAturTtd">Atur sekarang</button></div></div>`;
  byId('dispPinWrap').hidden = !siap;
  byId('btnDispKirim').disabled = !siap;
  if (siap) isiGambarTtd(byId('dispTtd'));
  else byId('dispAturTtd').onclick = () => { modal('mDisposisi').hide(); bukaTtd(); };
}
async function kirimDisposisi(id) {
  const kepada = $$('#dispJab input:checked').map(i => i.value), catatan = byId('dispCatatan').value.trim(), pin = byId('dispPin').value.trim();
  const err = byId('dispErr'); err.textContent = ''; byId('dispJabErr').textContent = '';
  if (!kepada.length) { byId('dispJabErr').textContent = 'Pilih minimal satu jabatan tujuan.'; return; }
  if (!catatan) { byId('dispCatatan').classList.add('is-invalid'); byId('dispCatatan').focus(); return; }
  byId('dispCatatan').classList.remove('is-invalid');
  if (!/^\d{6}$/.test(pin)) { err.textContent = 'Masukkan PIN tanda tangan 6 angka.'; byId('dispPin').focus(); return; }
  const btn = byId('btnDispKirim'); sibuk(btn, true, 'Menandatangani...');
  S.dispCid = S.dispCid || uid('d');
  try {
    const res = await api('buatDisposisi', S.token, { idSurat: id, kepada, catatan, pin, cid: S.dispCid });
    if (!res.success) {
      err.textContent = res.message;
      if (res.code === 'PIN_SALAH' || res.code === 'TERKUNCI') { byId('dispPin').value = ''; byId('dispPin').focus(); }
      if (res.code === 'BELUM_TTD' || res.code === 'BELUM_PIN') { S.ttd = S.ttd && res.code === 'BELUM_PIN' ? Object.assign({}, S.ttd, { pin: false }) : S.ttd; renderTtdDisposisi(); }
      return;
    }
    S.dispCid = null;
    S.disposisi = (S.disposisi || []).filter(x => x.id !== res.data.id).concat([res.data]);
    const s = S.surat.get(id), m = s && milikSaya(s); if (m && m.st === 'Terkirim') { m.st = 'Dibaca'; m.rd = Date.now(); }
    modal('mDisposisi').hide(); simpanCache(); renderUlang();
    toast('Disposisi ditandatangani', 'Untuk ' + kepada.join(', ') + '.', 'success', { aksi: 'Cetak lembar', onAksi: () => go('cetak', { id, disp: res.data.id, dari: S.params.dari || 'masuk' }), lama: 8000 });
  } catch (e) { if (!e.ditangani) err.textContent = pesanError(e); }
  finally { sibuk(btn, false); }
}

function lihatDisposisi(idDisp) {
  const d = (S.disposisi || []).find(x => x.id === idDisp); if (!d) return;
  const s = S.surat.get(d.surat), dasar = s ? suratDasar(s) : null;
  byId('dlRef').innerHTML = `<span class="ref-tag">DISPOSISI ATAS SURAT</span><div class="ref-grid"><div><div class="ml">Nomor</div><div class="mv">${esc(d.no || (dasar && dasar.no) || '-')}</div></div><div><div class="ml">Status</div><div class="mv">${d.st === 'Dibatalkan' ? '<span class="chip chip-danger">DIBATALKAN</span>' : '<span class="chip chip-ok"><i class="bi bi-patch-check"></i> SAH</span>'}</div></div></div>${dasar ? `<div class="ref-title">"${esc(dasar.hal)}"</div>` : ''}`;
  byId('dlIsi').innerHTML = blokDisposisi(d);
  siapkanAsetDisposisi(byId('dlIsi'));
  byId('dlBatal').hidden = true; byId('dlAlasan').value = ''; byId('dlPin').value = ''; byId('dlErr').textContent = '';
  const bBatal = byId('btnDlBatal');
  bBatal.hidden = d.st === 'Dibatalkan' || !bolehDisposisi();
  bBatal.onclick = () => { byId('dlBatal').hidden = false; byId('dlAlasan').focus(); };
  byId('btnDlBatalOk').onclick = () => batalkanDisposisi(d.id);
  byId('btnDlCetak').onclick = () => { modal('mDispLihat').hide(); go('cetak', { id: d.surat, disp: d.id, dari: S.params.dari || 'masuk' }); };
  byId('btnDlCetak').hidden = !s;
  modal('mDispLihat').show();
}
async function batalkanDisposisi(idDisp) {
  const alasan = byId('dlAlasan').value.trim(), pin = byId('dlPin').value.trim(), err = byId('dlErr');
  err.textContent = '';
  if (alasan.length < 5) { err.textContent = 'Tuliskan alasan pembatalan (minimal 5 karakter).'; byId('dlAlasan').focus(); return; }
  if (!/^\d{6}$/.test(pin)) { err.textContent = 'Masukkan PIN tanda tangan 6 angka.'; byId('dlPin').focus(); return; }
  const btn = byId('btnDlBatalOk'); sibuk(btn, true, 'Membatalkan...');
  try {
    const res = await api('batalkanDisposisi', S.token, idDisp, pin, alasan);
    if (!res.success) { err.textContent = res.message; if (res.code === 'PIN_SALAH') byId('dlPin').value = ''; return; }
    S.disposisi = (S.disposisi || []).map(x => x.id === idDisp ? res.data : x);
    simpanCache(); renderUlang(); lihatDisposisi(idDisp);
    toast('Disposisi dibatalkan', 'QR pada lembar lama kini menyatakan DIBATALKAN.', 'warning');
  } catch (e) { if (!e.ditangani) err.textContent = pesanError(e); }
  finally { sibuk(btn, false); }
}

function renderTtdCard() {
  const w = byId('setTtd'); if (!w) return;
  const t = S.ttd;
  if (!bolehDisposisi()) {
    w.innerHTML = `<div class="card-head"><div><h3 class="card-title"><i class="bi bi-pen"></i> Tanda Tangan Digital Kepala Unit</h3><div class="card-sub">Diatur dan dipakai oleh akun Pimpinan untuk menandatangani disposisi.</div></div>${t ? (t.pin ? '<span class="chip chip-ok">AKTIF</span>' : '<span class="chip chip-warn">PIN PERLU DIBUAT</span>') : '<span class="chip">BELUM DIATUR</span>'}</div>
      ${t ? `<div class="ttd-card"><div class="ttd-prev"><img data-ttd="${attr(t.file)}" alt="Tanda tangan ${attr(t.nama)}"></div><div class="min-w-0"><div class="ml">Penandatangan</div><div class="mv">${esc(t.nama)}</div><div class="ms">${esc(t.jabatan)}${t.nip ? ' &middot; NIP/NIY ' + esc(t.nip) : ''}</div></div></div>` : ''}
      <div class="alert-inline alert-info-soft mb-0"><i class="bi bi-person-lock"></i><div><strong>Akun Operator.</strong> Membuat dan membatalkan disposisi serta mengatur tanda tangan &amp; PIN hanya dapat dilakukan dari akun <strong>${esc(S.unit)} (Pimpinan)</strong>. Anda tetap dapat membuka dan mencetak lembar disposisi dari detail surat.</div></div>`;
    isiGambarTtd(w);
    return;
  }
  w.innerHTML = `<div class="card-head"><div><h3 class="card-title"><i class="bi bi-pen"></i> Tanda Tangan Digital Kepala Unit</h3><div class="card-sub">Dipakai pada lembar disposisi. Setiap penandatanganan wajib memasukkan PIN.</div></div>${t ? (t.pin ? '<span class="chip chip-ok">AKTIF</span>' : '<span class="chip chip-warn">PIN PERLU DIBUAT</span>') : '<span class="chip">BELUM DIATUR</span>'}</div>
    ${t ? `<div class="ttd-card"><div class="ttd-prev"><img data-ttd="${attr(t.file)}" alt="Tanda tangan ${attr(t.nama)}"></div><div class="min-w-0"><div class="ml">Penandatangan</div><div class="mv">${esc(t.nama)}</div><div class="ms">${esc(t.jabatan)}${t.nip ? ' &middot; NIP/NIY ' + esc(t.nip) : ''}</div><div class="ms">Diperbarui ${fmtWaktu(t.at)}</div></div></div>`
    : '<div class="empty py-3"><div class="empty-ic"><i class="bi bi-pen"></i></div><div class="empty-t">Belum ada tanda tangan</div><div class="empty-d">Kepala unit menggambar tanda tangan dan membuat PIN 6 angka, cukup sekali.</div></div>'}
    ${t && !t.pin ? '<div class="alert-inline alert-warn"><i class="bi bi-key"></i><div>PIN tanda tangan telah direset oleh Admin Surat. Buat PIN baru memakai password ' + akunTtd() + '.</div></div>' : ''}
    <div class="d-flex justify-content-end mt-2"><button type="button" class="btn ${t && t.pin ? 'btn-outline' : 'btn-primary'}" id="btnTtdAtur"><i class="bi bi-pen"></i> ${t ? (t.pin ? 'Ubah tanda tangan / PIN' : 'Buat PIN baru') : 'Atur tanda tangan'}</button></div>`;
  byId('btnTtdAtur').onclick = bukaTtd;
  isiGambarTtd(w);
}

const PAD = { ctx: null, aktif: false, titik: null, kotor: false, dpr: 1 };
function bukaTtd() {
  if (!bolehDisposisi()) return;
  const t = S.ttd, punyaPin = !!(t && t.pin);
  byId('ttdNama').value = t ? t.nama : '';
  byId('ttdNip').value = t ? t.nip : '';
  byId('ttdJab').value = t ? t.jabatan : 'Kepala ' + S.unit;
  byId('ttdPinBaru').value = ''; byId('ttdPinUlang').value = ''; byId('ttdOtor').value = ''; byId('ttdErr').textContent = '';
  byId('ttdFile').value = '';
  byId('ttdReq').hidden = !!t;
  byId('ttdLamaInfo').innerHTML = t ? `<span class="ttd-lama"><img data-ttd="${attr(t.file)}" alt=""></span> Kosongkan area di atas untuk tetap memakai tanda tangan tersimpan.` : 'Tanda tangan dipotong otomatis dan disimpan privat di Drive yayasan.';
  byId('ttdPinReq').hidden = punyaPin;
  byId('ttdPinHint').textContent = punyaPin ? 'Kosongkan bila PIN tidak diganti. PIN 6 angka, bukan angka sama/berurutan.' : 'PIN 6 angka untuk setiap penandatanganan. Jangan gunakan angka sama/berurutan dan jangan bagikan ke staf.';
  byId('ttdOtorL').textContent = punyaPin ? 'PIN tanda tangan saat ini' : 'Password ' + akunTtd();
  byId('ttdOtor').setAttribute('inputmode', punyaPin ? 'numeric' : 'text');
  byId('ttdOtor').maxLength = punyaPin ? 6 : 64;
  byId('ttdOtorHint').textContent = punyaPin ? 'Wajib untuk mengubah data tanda tangan.' : 'Untuk keamanan, pembuatan PIN memakai password ' + akunTtd() + '.';
  isiGambarTtd(byId('ttdLamaInfo'));
  modal('mTtd').show();
}
function siapkanPad() {
  const cv = byId('ttdCanvas'), kotak = cv.parentElement;
  const w = Math.max(240, kotak.clientWidth), h = 200, dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0B1F4D'; ctx.lineWidth = 2.4;
  Object.assign(PAD, { ctx, aktif: false, titik: null, kotor: false, dpr });
  byId('ttdHint').hidden = false;
}
function posPad(e) { const r = byId('ttdCanvas').getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function garisPad(a, b, tekan) {
  const ctx = PAD.ctx;
  ctx.lineWidth = tekan ? 1.2 + tekan * 2.8 : 2.4;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}
function tandaiPad() { if (!PAD.kotor) { PAD.kotor = true; byId('ttdHint').hidden = true; byId('ttdErr').textContent = ''; } }
function pasangPad() {
  const cv = byId('ttdCanvas');
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {   }
    PAD.aktif = true; PAD.titik = posPad(e);
    garisPad(PAD.titik, { x: PAD.titik.x + 0.1, y: PAD.titik.y + 0.1 }, e.pointerType === 'pen' ? e.pressure : 0);
    tandaiPad();
  });
  cv.addEventListener('pointermove', e => {
    if (!PAD.aktif) return;
    const daftar = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    (daftar.length ? daftar : [e]).forEach(ev => { const p = posPad(ev); garisPad(PAD.titik, p, ev.pointerType === 'pen' ? ev.pressure : 0); PAD.titik = p; });
  });
  const selesai = () => { PAD.aktif = false; };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cv.addEventListener(n, selesai));
}
function bersihkanPad() {
  const cv = byId('ttdCanvas'); PAD.ctx.save(); PAD.ctx.setTransform(1, 0, 0, 1, 0, 0); PAD.ctx.clearRect(0, 0, cv.width, cv.height); PAD.ctx.restore();
  PAD.kotor = false; byId('ttdHint').hidden = false;
}
function hasilPad() {
  if (!PAD.kotor) return '';
  const cv = byId('ttdCanvas'), W = cv.width, H = cv.height, data = PAD.ctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0 || x1 - x0 < 30 * PAD.dpr || y1 - y0 < 10 * PAD.dpr) return null;
  const tepi = Math.round(6 * PAD.dpr);
  x0 = Math.max(0, x0 - tepi); y0 = Math.max(0, y0 - tepi); x1 = Math.min(W - 1, x1 + tepi); y1 = Math.min(H - 1, y1 + tepi);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.min(1, 600 / w, 240 / h);
  const out = document.createElement('canvas'); out.width = Math.max(1, Math.round(w * k)); out.height = Math.max(1, Math.round(h * k));
  out.getContext('2d').drawImage(cv, x0, y0, w, h, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}
function unggahTtd(file) {
  if (!file) return;
  if (!/^image\/(png|jpeg)$/.test(file.type)) { byId('ttdErr').textContent = 'Gunakan gambar PNG atau JPG.'; return; }
  if (file.size > 8 * 1024 * 1024) { byId('ttdErr').textContent = 'Gambar terlalu besar (maks 8 MB).'; return; }
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    bersihkanPad();
    const cv = byId('ttdCanvas'), W = cv.width, H = cv.height, k = Math.min(W / img.width, H / img.height) * 0.92;
    const w = img.width * k, h = img.height * k, x = (W - w) / 2, y = (H - h) / 2;
    const ctx = PAD.ctx; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(img, x, y, w, h);
    const d = ctx.getImageData(0, 0, W, H), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const terang = (p[i] + p[i + 1] + p[i + 2]) / 3; if (terang > 215) p[i + 3] = 0; else if (terang > 170) p[i + 3] = Math.round(p[i + 3] * (215 - terang) / 45); }
    ctx.putImageData(d, 0, 0); ctx.restore();
    URL.revokeObjectURL(url); tandaiPad();
  };
  img.onerror = () => { URL.revokeObjectURL(url); byId('ttdErr').textContent = 'Gambar tidak dapat dibaca.'; };
  img.src = url;
}
function cekPinBaruLokal(p) {
  if (!/^\d{6}$/.test(p)) return 'PIN harus 6 angka.';
  if (/^(\d)\1{5}$/.test(p) || '01234567890'.indexOf(p) >= 0 || '09876543210'.indexOf(p) >= 0) return 'PIN terlalu mudah ditebak (angka sama atau berurutan).';
  return '';
}
async function simpanTtd(ev) {
  ev.preventDefault();
  const t = S.ttd, punyaPin = !!(t && t.pin), err = byId('ttdErr');
  const salah = (pesan, id) => { err.textContent = pesan; if (id) byId(id).focus(); };
  err.textContent = '';
  const nama = byId('ttdNama').value.trim(), jabatan = byId('ttdJab').value.trim(), nip = byId('ttdNip').value.trim();
  const pinBaru = byId('ttdPinBaru').value.trim(), ulang = byId('ttdPinUlang').value.trim(), otor = byId('ttdOtor').value;
  if (nama.length < 3) return salah('Isi nama lengkap kepala unit.', 'ttdNama');
  if (jabatan.length < 3) return salah('Isi jabatan penandatangan.', 'ttdJab');
  if (nip && !/^[0-9 .-]{4,40}$/.test(nip)) return salah('NIP/NIY hanya boleh berisi angka, spasi, titik, atau tanda hubung.', 'ttdNip');
  const gambar = hasilPad();
  if (gambar === null) return salah('Tanda tangan terlalu kecil. Gambar lebih besar memenuhi area.');
  if (!gambar && !t) return salah('Gambar tanda tangan terlebih dahulu (atau unggah gambar).');
  if (!punyaPin && !pinBaru) return salah('Buat PIN tanda tangan 6 angka.', 'ttdPinBaru');
  if (pinBaru) { const e = cekPinBaruLokal(pinBaru); if (e) return salah(e, 'ttdPinBaru'); if (pinBaru !== ulang) return salah('Ulangi PIN baru tidak sama.', 'ttdPinUlang'); }
  if (!otor) return salah(punyaPin ? 'Masukkan PIN tanda tangan saat ini.' : 'Masukkan password ' + akunTtd() + '.', 'ttdOtor');
  const d = { nama, nip, jabatan, ttd: gambar || '', pinBaru };
  if (punyaPin) d.pinLama = otor; else d.password = otor;
  const btn = byId('btnTtdSimpan'); sibuk(btn, true, 'Menyimpan...');
  try {
    const res = await api('simpanPenandatangan', S.token, d);
    if (!res.success) { salah(res.message, res.code === 'PIN_SALAH' || res.code === 'TERKUNCI' || /Password/.test(res.message) ? 'ttdOtor' : null); if (res.code === 'PIN_SALAH') byId('ttdOtor').value = ''; return; }
    if (gambar) TTD.img.set(res.data.file, gambar);
    S.ttd = res.data; simpanCache();
    modal('mTtd').hide();
    toast('Tanda tangan tersimpan', 'Siap dipakai untuk menandatangani disposisi.', 'success');
    renderTtdCard();
    if (byId('mDisposisi').classList.contains('show')) renderTtdDisposisi();
  } catch (e) { if (!e.ditangani) salah(pesanError(e)); }
  finally { sibuk(btn, false); }
}

function pasangEventDisposisi() {
  byId('dispSemua').addEventListener('click', () => {
    const kotak = $$('#dispJab input'), semua = kotak.every(i => i.checked);
    kotak.forEach(i => { i.checked = !semua; }); byId('dispJabErr').textContent = '';
  });
  byId('dispJab').addEventListener('change', () => { byId('dispJabErr').textContent = ''; });
  ['dispPin', 'dlPin', 'ttdPinBaru', 'ttdPinUlang'].forEach(id => byId(id).addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); }));
  byId('dispPin').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); byId('btnDispKirim').click(); } });
  byId('mTtd').addEventListener('shown.bs.modal', siapkanPad);
  pasangPad();
  byId('ttdHapus').addEventListener('click', bersihkanPad);
  byId('ttdFile').addEventListener('change', e => unggahTtd(e.target.files[0]));
  byId('formTtd').addEventListener('submit', simpanTtd);
  window.addEventListener('resize', debounce(() => { if (byId('mTtd').classList.contains('show') && !PAD.kotor) siapkanPad(); }, 200));
}

window.__YASMA_JS_LENGKAP__ = VERSI_APP;
window.YASMA = {
  versi: VERSI_APP, get state() { return S; }, get tulis() { return T; },
  go, kembali, renderUlang, pollSekarang, milikSaya, hitungBelumDibaca
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

})();
