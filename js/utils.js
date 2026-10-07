/* Tiện ích chung: ngày tháng, tiền tệ, đọc số thành chữ. */
var Utils = (function () {
  var THU = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  var THU_NGAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  function pad(n) { return String(n).padStart(2, '0'); }

  function toISO(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function fromISO(iso) {
    var p = iso.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function todayISO() { return toISO(new Date()); }

  function formatDate(iso) {
    var d = fromISO(iso);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function weekdayOf(iso) { return fromISO(iso).getDay(); }
  function weekdayName(iso) { return THU[weekdayOf(iso)]; }

  /* Số ngày trong tháng (month: 1-12) */
  function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }

  /* "6h", "6:00", "18h30", "1830" -> "18:00" dạng HH:MM. Trả '' nếu không đọc được. */
  function normalizeTime(raw) {
    if (!raw) return '';
    var s = String(raw).trim().toLowerCase().replace(/\s+/g, '');
    var m = s.match(/^(\d{1,2})[h:.]?(\d{2})?$/);
    if (!m) return '';
    var h = Number(m[1]);
    var mi = m[2] ? Number(m[2]) : 0;
    if (h > 23 || mi > 59) return '';
    return pad(h) + ':' + pad(mi);
  }

  /* Khoảng thời gian dạy, tính theo giờ. */
  function durationHours(start, end) {
    if (!start || !end) return 0;
    var a = start.split(':').map(Number);
    var b = end.split(':').map(Number);
    var mins = (b[0] * 60 + b[1]) - (a[0] * 60 + a[1]);
    if (mins <= 0) mins += 24 * 60;
    return mins / 60;
  }

  function formatMoney(n) {
    return Math.round(Number(n) || 0).toLocaleString('vi-VN');
  }

  /* Nhận "500000", "500.000", "500k", "1tr5", "1,5tr" -> số. */
  function parseMoney(raw) {
    if (raw === null || raw === undefined) return 0;
    var s = String(raw).trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return 0;
    var m = s.match(/^([\d.,]+)(k|tr|m|trieu|triệu)?([\d]*)$/);
    if (!m) return 0;
    var num = m[1].replace(/\./g, '').replace(/,/g, '.');
    // "500.000" -> dấu chấm là phân cách nghìn; "1,5tr" -> dấu phẩy là thập phân
    var value = Number(num);
    if (isNaN(value)) return 0;
    var unit = m[2];
    if (unit === 'k') value *= 1000;
    else if (unit) value *= 1000000;
    // "1tr5" -> phần đuôi là nửa đơn vị kế tiếp
    if (unit && m[3]) {
      var step = unit === 'k' ? 100 : 100000;
      value += Number(m[3]) * step;
    }
    return Math.round(value);
  }

  /* ---- Đọc số tiền thành chữ ---- */
  var CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function docBaChuSo(so, dayDu) {
    var tram = Math.floor(so / 100);
    var chuc = Math.floor((so % 100) / 10);
    var dv = so % 10;
    var out = [];
    if (tram > 0 || dayDu) {
      out.push(CHU_SO[tram], 'trăm');
      if (chuc === 0 && dv > 0) out.push('lẻ');
    }
    if (chuc > 1) {
      out.push(CHU_SO[chuc], 'mươi');
      if (dv === 1) { out.push('mốt'); return out.join(' '); }
    } else if (chuc === 1) {
      out.push('mười');
      if (dv === 1) { out.push('một'); return out.join(' '); }
    }
    if (dv > 0) out.push(dv === 5 && chuc > 0 ? 'lăm' : CHU_SO[dv]);
    return out.join(' ');
  }

  function docSoTien(n) {
    n = Math.round(Math.abs(Number(n) || 0));
    if (n === 0) return 'Không đồng';
    var groups = [];
    while (n > 0) { groups.unshift(n % 1000); n = Math.floor(n / 1000); }
    var HANG = ['', ' nghìn', ' triệu', ' tỷ'];
    var parts = [];
    for (var i = 0; i < groups.length; i++) {
      if (groups[i] === 0) continue;
      var pow = groups.length - 1 - i;
      var hang = pow < 4 ? HANG[pow] : HANG[pow % 3] + ' tỷ'.repeat(Math.floor(pow / 3));
      parts.push(docBaChuSo(groups[i], i !== 0) + hang);
    }
    var text = parts.join(' ').replace(/\s+/g, ' ').trim() + ' đồng';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function escapeHtml(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  return {
    THU: THU, THU_NGAN: THU_NGAN,
    pad: pad, toISO: toISO, fromISO: fromISO, todayISO: todayISO,
    formatDate: formatDate, weekdayOf: weekdayOf, weekdayName: weekdayName,
    daysInMonth: daysInMonth, normalizeTime: normalizeTime, durationHours: durationHours,
    formatMoney: formatMoney, parseMoney: parseMoney, docSoTien: docSoTien,
    uid: uid, escapeHtml: escapeHtml
  };
})();
