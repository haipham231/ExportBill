/* Dựng hóa đơn để xem trước / in ra PDF, và xuất CSV. */
var Invoice = (function () {
  var E = Utils.escapeHtml;

  function totalOf(sessions) {
    return sessions.reduce(function (sum, s) {
      return sum + (s.status === 'off' ? 0 : s.price);
    }, 0);
  }

  function billable(sessions) {
    return sessions.filter(function (s) { return s.status !== 'off'; });
  }

  /* Mô tả kỳ thu cho một nhóm buổi bất kỳ: "07/10/2026" hoặc "07/10/2026 – 30/10/2026".
     Hóa đơn cả tháng truyền sẵn nhãn "Tháng 10/2026" nên không dùng hàm này. */
  function periodLabel(sessions, fallback) {
    if (!sessions.length) return fallback || '';
    var dates = sessions.map(function (s) { return s.date; }).sort();
    var first = dates[0], last = dates[dates.length - 1];
    if (first === last) return Utils.formatDate(first);
    return Utils.formatDate(first) + ' – ' + Utils.formatDate(last);
  }

  /* Số hóa đơn suy ra từ chính nội dung, nên xem trước bao nhiêu lần cũng ra một số:
     HD-202610-01 (tháng 10, lớp thứ nhất) · HD-20261008-01 (riêng buổi 08/10). */
  function invoiceNo(sessions) {
    var st = Store.get();
    var prefix = st.settings.invoicePrefix || 'HD';
    if (!sessions.length) return prefix;
    var dates = sessions.map(function (s) { return s.date; }).sort();
    var sameDay = dates[0] === dates[dates.length - 1];
    var stamp = dates[0].replace(/-/g, '').slice(0, sameDay ? 8 : 6);
    var ids = [];
    sessions.forEach(function (s) { if (ids.indexOf(s.classId) === -1) ids.push(s.classId); });
    var suffix = '';
    if (ids.length === 1) {
      var idx = st.classes.findIndex(function (c) { return c.id === ids[0]; });
      if (idx >= 0) suffix = '-' + String(idx + 1).padStart(2, '0');
    }
    return prefix + '-' + stamp + suffix;
  }

  function totalHours(sessions) {
    return billable(sessions).reduce(function (h, s) {
      return h + Utils.durationHours(s.startTime, s.endTime);
    }, 0);
  }

  function rowsHtml(sessions, showClass) {
    return sessions.map(function (s, i) {
      var hours = Utils.durationHours(s.startTime, s.endTime);
      var time = s.startTime && s.endTime
        ? s.startTime + ' – ' + s.endTime + (hours ? ' (' + Utils.formatHours(hours) + ')' : '')
        : '—';
      var desc = [];
      if (s.slot) desc.push('Ca ' + s.slot + '/' + s.slotCount);
      if (s.isExtra) desc.push('Dạy thêm');
      if (s.note) desc.push(s.note);
      return '<tr>' +
        '<td class="c">' + (i + 1) + '</td>' +
        '<td>' + E(Utils.weekdayName(s.date)) + ', ' + Utils.formatDate(s.date) +
          (desc.length ? '<div class="sub">' + E(desc.join(' · ')) + '</div>' : '') + '</td>' +
        (showClass ? '<td>' + E(s.className) + '</td>' : '') +
        '<td>' + E(time) + '</td>' +
        '<td class="r">' + Utils.formatMoney(s.price) + '</td>' +
        '<td class="r b">' + Utils.formatMoney(s.price) + '</td>' +
        '</tr>';
    }).join('');
  }

  /* Dựng một tờ hóa đơn. meta: { title, invoiceNo, period, payerName, payerNote } */
  function sheetHtml(sessions, meta) {
    var st = Store.get().settings;
    var list = billable(sessions);
    var skipped = sessions.filter(function (s) { return s.status === 'off'; });
    var total = totalOf(sessions);
    var classNames = {};
    list.forEach(function (s) { classNames[s.className] = true; });
    var showClass = Object.keys(classNames).length > 1;

    var issuer = [];
    if (st.teacherName) issuer.push('<div class="big">' + E(st.teacherName) + '</div>');
    if (st.phone) issuer.push('<div>ĐT: ' + E(st.phone) + '</div>');
    if (st.address) issuer.push('<div>' + E(st.address) + '</div>');
    if (!issuer.length) issuer.push('<div class="muted">(Điền thông tin của bạn ở tab Cài đặt)</div>');

    return '' +
      '<section class="invoice-sheet">' +
        '<header class="inv-head">' +
          '<div class="inv-issuer">' + issuer.join('') + '</div>' +
          '<div class="inv-title">' +
            '<h1>' + E(meta.title || 'PHIẾU THU HỌC PHÍ') + '</h1>' +
            '<div class="inv-meta">Số: <b>' + E(meta.invoiceNo) + '</b></div>' +
            '<div class="inv-meta">Ngày lập: ' + Utils.formatDate(Utils.todayISO()) + '</div>' +
          '</div>' +
        '</header>' +

        '<div class="inv-party">' +
          '<div><span class="lbl">Học viên / Lớp:</span> <b>' + E(meta.payerName || '—') + '</b>' +
            (meta.payerNote ? '<div class="sub">' + E(meta.payerNote) + '</div>' : '') + '</div>' +
          '<div><span class="lbl">Kỳ thanh toán:</span> <b>' + E(meta.period) + '</b></div>' +
        '</div>' +

        '<table class="inv-table">' +
          '<thead><tr>' +
            '<th class="c" style="width:38px">STT</th>' +
            '<th>Ngày dạy</th>' +
            (showClass ? '<th>Lớp</th>' : '') +
            '<th style="width:170px">Thời gian</th>' +
            '<th class="r" style="width:110px">Đơn giá</th>' +
            '<th class="r" style="width:120px">Thành tiền</th>' +
          '</tr></thead>' +
          '<tbody>' + (list.length ? rowsHtml(list, showClass) :
            '<tr><td colspan="' + (showClass ? 6 : 5) + '" class="c muted">Không có buổi nào</td></tr>') + '</tbody>' +
          '<tfoot><tr>' +
            '<td colspan="' + (showClass ? 4 : 3) + '" class="r">Tổng số buổi: <b>' + list.length +
              '</b> · Tổng số giờ: <b>' + Utils.formatHours(totalHours(sessions)) + '</b></td>' +
            '<td class="r">TỔNG CỘNG</td>' +
            '<td class="r total">' + Utils.formatMoney(total) + ' đ</td>' +
          '</tr></tfoot>' +
        '</table>' +

        '<div class="inv-words">Bằng chữ: <i>' + E(Utils.docSoTien(total)) + '</i></div>' +

        (skipped.length ? '<div class="inv-note">Các buổi nghỉ không tính phí: ' +
          E(skipped.map(function (s) { return Utils.formatDate(s.date); }).join(', ')) + '</div>' : '') +

        (st.bankInfo || st.qrImage ?
          '<div class="inv-bank">' +
            (st.bankInfo ? '<div class="inv-bank-text">' +
              '<div class="lbl">Thông tin thanh toán</div>' +
              '<div>' + E(st.bankInfo).replace(/\n/g, '<br>') + '</div>' +
              '<div class="inv-bank-amount">Số tiền: <b>' + Utils.formatMoney(total) + ' đ</b></div>' +
            '</div>' : '') +
            (st.qrImage ? '<div class="inv-bank-qr">' +
              '<img src="' + E(st.qrImage) + '" alt="Mã QR chuyển khoản">' +
              '<div class="qr-cap">Quét để chuyển khoản</div>' +
            '</div>' : '') +
          '</div>' : '') +

        '<div class="inv-sign">' +
          '<div><div class="lbl">Người nộp tiền</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>' +
          '<div><div class="lbl">Người thu tiền</div><div class="sign-line">(Ký, ghi rõ họ tên)</div>' +
            (st.teacherName ? '<div class="sign-name">' + E(st.teacherName) + '</div>' : '') + '</div>' +
        '</div>' +
      '</section>';
  }

  /* Gộp các buổi thành 1 hóa đơn duy nhất. */
  function single(sessions, opts) {
    opts = opts || {};
    var names = [];
    sessions.forEach(function (s) {
      var label = s.className + (s.student ? ' (' + s.student + ')' : '');
      if (names.indexOf(label) === -1) names.push(label);
    });
    return sheetHtml(sessions, {
      title: opts.title,
      invoiceNo: opts.invoiceNo || invoiceNo(sessions),
      period: opts.period || periodLabel(sessions),
      payerName: names.join(' · ') || '—',
      payerNote: opts.payerNote || ''
    });
  }

  /* Mỗi lớp một hóa đơn riêng. */
  function perClass(sessions, opts) {
    opts = opts || {};
    var groups = {};
    var order = [];
    sessions.forEach(function (s) {
      if (!groups[s.classId]) { groups[s.classId] = []; order.push(s.classId); }
      groups[s.classId].push(s);
    });
    return order.map(function (id) {
      var g = groups[id];
      return sheetHtml(g, {
        title: opts.title,
        invoiceNo: invoiceNo(g),
        period: opts.period || periodLabel(g),
        payerName: g[0].className + (g[0].student ? ' (' + g[0].student + ')' : ''),
        payerNote: opts.payerNote || ''
      });
    }).join('');
  }

  /* ---------- CSV ---------- */

  function csv(sessions) {
    var head = ['Ngày', 'Thứ', 'Ca', 'Lớp', 'Học viên', 'Bắt đầu', 'Kết thúc', 'Số giờ', 'Đơn giá', 'Thành tiền', 'Trạng thái', 'Ghi chú'];
    var rows = sessions.map(function (s) {
      var money = s.status === 'off' ? 0 : s.price;
      return [
        Utils.formatDate(s.date),
        Utils.weekdayName(s.date),
        s.slot ? s.slot + '/' + s.slotCount : '',
        s.className,
        s.student,
        s.startTime, s.endTime,
        Utils.durationHours(s.startTime, s.endTime),
        s.price, money,
        s.status === 'off' ? 'Nghỉ' : (s.isExtra ? 'Dạy thêm' : 'Đã dạy'),
        s.note
      ];
    });
    rows.push([]);
    rows.push(['', '', '', '', '', '', '', totalHours(sessions), 'TỔNG CỘNG', totalOf(sessions), '', '']);
    return [head].concat(rows).map(function (r) {
      return r.map(function (v) {
        var str = String(v === null || v === undefined ? '' : v);
        return /[",;\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
      }).join(',');
    }).join('\r\n');
  }

  function download(filename, content, mime) {
    var blob = new Blob(['﻿' + content], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  return {
    single: single, perClass: perClass, csv: csv, download: download, invoiceNo: invoiceNo,
    totalOf: totalOf, billable: billable, periodLabel: periodLabel, totalHours: totalHours
  };
})();
