/* Halaman verifikasi QR tanda tangan disposisi (publik, baca-saja). Data dari GET ?action=verifikasi&v=KODE. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function status(label, ket, warna, latar) {
    var s = $('status');
    s.style.borderColor = warna || '#CBD5E1';
    s.style.background = latar || '#F8FAFC';
    s.innerHTML = '<div class="sl" style="color:' + esc(warna || '#334155') + '">' + esc(label) + '</div><div class="sd">' + esc(ket) + '</div>';
  }

  function tampil(v) {
    if (v.yayasan) $('yys').textContent = v.yayasan;
    status(v.label, v.keterangan, v.warna, v.latar);
    var t = $('rincian');
    t.innerHTML = (v.baris || []).map(function (b) { return '<tr><td class="k">' + esc(b[0]) + '</td><td>' + esc(b[1]).replace(/\n/g, '<br>') + '</td></tr>'; }).join('');
    t.hidden = !(v.baris && v.baris.length);
    $('formKode').hidden = v.status === 'sah' || v.status === 'batal';
  }

  function periksa(kode) {
    var k = String(kode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!k) { status('MASUKKAN KODE', 'Pindai QR pada lembar disposisi, atau ketik kode verifikasi yang tercetak di bawah QR.', '#334155'); $('formKode').hidden = false; $('rincian').hidden = true; return; }
    status('MEMERIKSA\u2026', 'Menghubungi server untuk memeriksa kode verifikasi.', '#334155');
    $('status').querySelector('.sl').insertAdjacentHTML('afterbegin', '<span class="muat"></span>');
    if (!window.YasmaApi) { status('TIDAK DAPAT MEMERIKSA', 'Berkas js/api.js tidak termuat.', '#475569', '#F1F5F9'); return; }
    window.YasmaApi.ambil('verifikasi', { v: k })
      .then(function (res) {
        if (!res || !res.success) throw new Error((res && res.message) || 'Respons server tidak valid.');
        tampil(res.data);
      })
      .catch(function (e) {
        status('TIDAK DAPAT MEMERIKSA', (e && e.message) || 'Terjadi kendala saat memeriksa. Silakan coba lagi beberapa saat lagi.', '#475569', '#F1F5F9');
        $('formKode').hidden = false;
      });
  }

  $('formKode').addEventListener('submit', function (e) {
    e.preventDefault();
    var k = $('kode').value;
    try { history.replaceState(null, '', location.pathname + '?v=' + encodeURIComponent(k.toUpperCase().replace(/[^A-Z0-9]/g, ''))); } catch (x) { }
    periksa(k);
  });

  var v = new URLSearchParams(location.search).get('v') || '';
  $('kode').value = v;
  periksa(v);
})();
