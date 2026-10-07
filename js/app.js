/* Kết nối giao diện: lịch, lớp học, cài đặt và nút xuất hóa đơn. */
(function () {
  var E = Utils.escapeHtml;
  var $ = function (sel) { return document.querySelector(sel); };

  var view = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    classId: '',
    selected: new Set(),
    editingClassId: null,
    billCtx: null,
    noteKey: null
  };

  /* Thứ 2..Chủ nhật, map sang Date.getDay() */
  var WEEKDAY_OPTIONS = [
    { v: 1, label: 'T2' }, { v: 2, label: 'T3' }, { v: 3, label: 'T4' },
    { v: 4, label: 'T5' }, { v: 5, label: 'T6' }, { v: 6, label: 'T7' }, { v: 0, label: 'CN' }
  ];

  /* ===================== Tiện ích giao diện ===================== */

  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2400);
  }

  function openModal(id) { $(id).hidden = false; }
  function closeModal(id) { $(id).hidden = true; }

  function bindMoney(input) {
    input.addEventListener('focus', function () {
      var n = Utils.parseMoney(input.value);
      input.value = n ? String(n) : '';
      input.select();
    });
    input.addEventListener('blur', function () {
      var n = Utils.parseMoney(input.value);
      input.value = n ? Utils.formatMoney(n) : '';
    });
  }

  function bindTime(input) {
    input.addEventListener('blur', function () {
      var t = Utils.normalizeTime(input.value);
      if (t) input.value = t;
      else if (input.value.trim()) { toast('Giờ không hợp lệ, ví dụ đúng: 18:00 hoặc 6h30'); input.value = ''; }
    });
  }

  function slotLines(cls) {
    if (!cls.slots || !cls.slots.length) return '<div>📅 Chưa đặt lịch</div>';
    return Store.sortSlots(cls.slots).map(function (sl, i) {
      var h = Utils.durationHours(sl.startTime, sl.endTime);
      return '<div class="slot-line">' +
        '<span class="ico">' + (i === 0 ? '📅' : '&nbsp;') + '</span>' +
        '<b>' + E(thuLabel(sl.weekday)) + '</b>' +
        '<span>' + E(sl.startTime) + ' – ' + E(sl.endTime) + '</span>' +
        '<span class="h">' + Utils.formatHours(h) + '</span>' +
        '<span class="g">' + Utils.formatMoney(Store.slotPrice(cls, sl)) + 'đ</span>' +
      '</div>';
    }).join('');
  }

  /* ===================== Tab ===================== */

  $('#tabs').addEventListener('click', function (e) {
    var btn = e.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('is-active', t === btn); });
    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.toggle('is-active', p.id === 'panel-' + btn.dataset.tab);
    });
  });

  /* ===================== Lịch & hóa đơn ===================== */

  function currentSessions() {
    return Store.sessionsInMonth(view.year, view.month, view.classId);
  }

  function selectedSessions() {
    return currentSessions().filter(function (s) { return view.selected.has(s.key); });
  }

  function renderMonthLabel() {
    $('#monthLabel').textContent = 'Tháng ' + view.month + '/' + view.year;
    $('#monthInput').value = view.year + '-' + Utils.pad(view.month);
  }

  function renderStats(sessions) {
    var teach = sessions.filter(function (s) { return s.status !== 'off'; });
    var off = sessions.length - teach.length;
    var total = Invoice.totalOf(sessions);
    var hours = teach.reduce(function (h, s) { return h + Utils.durationHours(s.startTime, s.endTime); }, 0);
    $('#stats').innerHTML = [
      { k: 'Số buổi dạy', v: teach.length },
      { k: 'Tổng số giờ', v: (Math.round(hours * 10) / 10) + 'h' },
      { k: 'Buổi nghỉ', v: off },
      { k: 'Tổng tiền', v: Utils.formatMoney(total) + ' đ', accent: true }
    ].map(function (s) {
      return '<div class="stat' + (s.accent ? ' accent' : '') + '">' +
        '<div class="k">' + s.k + '</div><div class="v">' + s.v + '</div></div>';
    }).join('');
  }

  function sessionHtml(s) {
    var off = s.status === 'off';
    var hours = Utils.durationHours(s.startTime, s.endTime);
    var tags = '';
    if (s.slot) tags += '<span class="tag slot">Ca ' + s.slot + '/' + s.slotCount + '</span>';
    if (s.isExtra) tags += '<span class="tag extra">Dạy thêm</span>';
    if (off) tags += '<span class="tag off">Nghỉ</span>';
    if (s.timeEdited && !off) tags += '<span class="tag edited">Giờ riêng</span>';
    if (s.priceEdited && !off) tags += '<span class="tag edited">Giá riêng</span>';
    var sub = [];
    if (hours) sub.push(Utils.formatHours(hours));
    if (s.student) sub.push(s.student);
    if (s.note) sub.push(s.note);
    var daSua = (s.timeEdited || s.priceEdited) && !s.isExtra;

    return '<div class="session' + (off ? ' is-off' : '') +
        (view.selected.has(s.key) ? ' is-sel' : '') + '" style="--c:' + E(s.color) + '">' +
      '<label class="check"><input type="checkbox" data-sel="' + E(s.key) + '"' +
        (view.selected.has(s.key) ? ' checked' : '') + '></label>' +
      '<div class="s-main">' +
        '<div class="s-name">' + E(s.className) + tags + '</div>' +
        (sub.length ? '<div class="s-sub">' + E(sub.join(' · ')) + '</div>' : '') +
        (s.comment ? '<div class="s-comment">💬 ' + E(s.comment) + '</div>' : '') +
      '</div>' +
      '<div class="s-time">' +
        '<input class="time" value="' + E(s.startTime) + '" data-tstart="' + E(s.key) +
          '" aria-label="Giờ bắt đầu"' + (off ? ' disabled' : '') + '>' +
        '<span class="sep">–</span>' +
        '<input class="time" value="' + E(s.endTime) + '" data-tend="' + E(s.key) +
          '" aria-label="Giờ kết thúc"' + (off ? ' disabled' : '') + '>' +
      '</div>' +
      '<div class="s-price">' +
        '<input class="money" value="' + Utils.formatMoney(s.price) + '" data-price="' + E(s.key) +
          '" aria-label="Giá buổi này"' + (off ? ' disabled' : '') + '><span class="unit">đ</span>' +
      '</div>' +
      '<div class="s-actions">' +
        (daSua ? '<button class="btn tiny" data-reset="' + E(s.key) +
          '" title="Bỏ chỉnh riêng, dùng lại giờ và giá của lớp">⟲ Đặt lại</button>' : '') +
        '<button class="btn tiny' + (s.comment ? ' has-note' : '') + '" data-note="' + E(s.key) + '">' +
          (s.comment ? '💬 Sửa nhận xét' : '💬 Nhận xét') + '</button>' +
        '<button class="btn tiny" data-toggle="' + E(s.key) + '">' +
          (off ? '↺ Dạy lại' : '⊘ Nghỉ') + '</button>' +
        '<button class="btn tiny" data-bill="' + E(s.key) + '" title="Xuất bill riêng buổi này">🧾 Bill</button>' +
        (s.isExtra ? '<button class="btn tiny danger" data-delextra="' + E(s.extraId) +
          '" title="Xoá ca dạy thêm này">🗑</button>' : '') +
      '</div>' +
    '</div>';
  }

  function renderSessions() {
    var sessions = currentSessions();
    renderMonthLabel();
    renderStats(sessions);

    var box = $('#sessionList');
    if (!Store.get().classes.length) {
      box.innerHTML = '<div class="empty"><h3>Chưa có lớp nào</h3>' +
        '<p>Tạo một lớp với lịch cố định (VD: Thứ 3 &amp; Thứ 5, 18:00–19:30, 500.000đ/buổi),<br>' +
        'phần mềm sẽ tự sinh lịch từng tháng và tính tiền.</p>' +
        '<button class="btn primary" id="emptyAddClass">+ Thêm lớp đầu tiên</button></div>';
      $('#emptyAddClass').addEventListener('click', function () { openClassModal(null); });
      syncSelectionUI(sessions);
      return;
    }
    if (!sessions.length) {
      box.innerHTML = '<div class="empty"><h3>Tháng này không có buổi nào</h3>' +
        '<p>Kiểm tra lại lịch của lớp, hoặc thêm một buổi dạy thêm.</p></div>';
      syncSelectionUI(sessions);
      return;
    }

    var html = '';
    var lastDate = null;
    var today = Utils.todayISO();
    sessions.forEach(function (s) {
      if (s.date !== lastDate) {
        if (lastDate !== null) html += '</div>';
        html += '<div class="day-group"><div class="day-head">' +
          '<span' + (s.date === today ? ' class="today"' : '') + '>' +
          E(Utils.weekdayName(s.date)) + ', ' + Utils.formatDate(s.date) + '</span>' +
          (s.date === today ? '<span class="today">• Hôm nay</span>' : '') +
          '<button class="link-btn" data-addslot="' + E(s.date) +
            '" title="Thêm một ca dạy nữa trong ngày này">+ thêm giờ</button>' + '</div>';
        lastDate = s.date;
      }
      html += sessionHtml(s);
    });
    html += '</div>';
    box.innerHTML = html;
    syncSelectionUI(sessions);
  }

  function syncSelectionUI(sessions) {
    var keys = sessions.map(function (s) { return s.key; });
    /* bỏ các lựa chọn không còn trong tầm nhìn hiện tại */
    Array.from(view.selected).forEach(function (k) {
      if (keys.indexOf(k) === -1) view.selected.delete(k);
    });
    var n = view.selected.size;
    var sel = selectedSessions();
    $('#selCount').textContent = n
      ? 'Đã chọn ' + n + ' buổi · ' + Utils.formatMoney(Invoice.totalOf(sel)) + ' đ'
      : 'Đã chọn 0 buổi';
    $('#checkAll').checked = n > 0 && n === keys.length;
    $('#billSelected').disabled = n === 0;
  }

  /* Ghi thay đổi về đúng nơi: buổi dạy thêm sửa thẳng, buổi theo lịch ghi dạng ghi đè */
  function patchSession(s, patch) {
    if (s.isExtra) {
      var ex = Store.get().extras.find(function (x) { return x.id === s.extraId; });
      if (!ex) return;
      Object.assign(ex, patch);
      Store.save();
    } else {
      Store.setOverride(s.key, patch);
    }
  }

  function findSession(key) {
    return currentSessions().find(function (x) { return x.key === key; });
  }

  $('#sessionList').addEventListener('change', function (e) {
    var t = e.target;

    if (t.dataset.sel) {
      if (t.checked) view.selected.add(t.dataset.sel); else view.selected.delete(t.dataset.sel);
      t.closest('.session').classList.toggle('is-sel', t.checked);
      syncSelectionUI(currentSessions());
      return;
    }

    if (t.dataset.price) {
      var s = findSession(t.dataset.price);
      if (s) { patchSession(s, { price: Utils.parseMoney(t.value) }); renderSessions(); }
      return;
    }

    if (t.dataset.tstart || t.dataset.tend) {
      var key = t.dataset.tstart || t.dataset.tend;
      var field = t.dataset.tstart ? 'startTime' : 'endTime';
      var ss = findSession(key);
      if (!ss) return;
      var raw = t.value.trim();
      var patch = {};

      if (!raw) {
        /* Xoá trống = dùng lại giờ của lớp */
        patch[field] = '';
      } else {
        var val = Utils.normalizeTime(raw);
        if (!val) { toast('Giờ không hợp lệ. Ví dụ: 18:00 hoặc 6h30.'); renderSessions(); return; }
        patch[field] = val;
      }
      patchSession(ss, patch);

      var sau = findSession(key);
      if (sau && sau.startTime && sau.endTime && sau.endTime <= sau.startTime) {
        toast('Giờ kết thúc không sau giờ bắt đầu — kiểm tra lại nhé.');
      }
      renderSessions();
    }
  });

  $('#sessionList').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var all = currentSessions();
    var find = function (key) { return all.find(function (x) { return x.key === key; }); };

    if (btn.dataset.addslot) {
      openExtraModal(btn.dataset.addslot);
    } else if (btn.dataset.toggle) {
      var s = find(btn.dataset.toggle);
      if (!s) return;
      if (s.isExtra) { toast('Ca dạy thêm: xoá bằng nút 🗑 nếu không dạy nữa.'); return; }
      Store.setOverride(s.key, { status: s.status === 'off' ? 'teach' : 'off' });
      renderSessions();
    } else if (btn.dataset.reset) {
      var r = find(btn.dataset.reset);
      if (r) {
        Store.setOverride(r.key, { price: '', startTime: '', endTime: '' });
        renderSessions();
        toast('Đã dùng lại giờ và giá của lớp.');
      }
    } else if (btn.dataset.delextra) {
      if (confirm('Xoá ca dạy thêm này?')) { Store.removeExtra(btn.dataset.delextra); renderSessions(); }
    } else if (btn.dataset.note) {
      var n = find(btn.dataset.note);
      if (n) openNoteModal(n);
    } else if (btn.dataset.bill) {
      var b = find(btn.dataset.bill);
      if (b) showBill('single', [b], { period: Utils.weekdayName(b.date) + ', ' + Utils.formatDate(b.date) });
    }
  });

  /* ===================== Nhận xét ===================== */

  function openNoteModal(s) {
    view.noteKey = s.key;
    $('#noteWhen').textContent = s.className + ' — ' + Utils.weekdayName(s.date) + ', ' +
      Utils.formatDate(s.date) + ' · ' + s.startTime + '–' + s.endTime +
      (s.slot ? ' (ca ' + s.slot + '/' + s.slotCount + ')' : '');
    $('#noteText').value = s.comment || '';
    openModal('#noteModal');
    $('#noteText').focus();
  }

  $('#saveNote').addEventListener('click', function () {
    var s = findSession(view.noteKey);
    if (!s) { closeModal('#noteModal'); return; }
    patchSession(s, { comment: $('#noteText').value.trim() });
    closeModal('#noteModal');
    renderSessions();
    toast('Đã lưu nhận xét.');
  });

  function thangHienTai() { return view.year + '-' + Utils.pad(view.month); }

  function renderLevelPicker(chon) {
    $('#rvLevels').innerHTML = Store.REVIEW_LEVELS.map(function (m) {
      var on = m === chon;
      return '<button type="button" class="wd wide' + (on ? ' on' : '') +
        '" data-level="' + E(m) + '" aria-pressed="' + on + '">' + E(m) + '</button>';
    }).join('');
  }

  $('#rvLevels').addEventListener('click', function (e) {
    var el = e.target.closest('.wd');
    if (!el) return;
    var dangBat = el.classList.contains('on');
    renderLevelPicker(dangBat ? '' : el.dataset.level);   // bấm lại để bỏ chọn
  });

  function napReview() {
    var rv = Store.getReview($('#rvClass').value, thangHienTai());
    renderLevelPicker(rv ? rv.level : '');
    $('#rvText').value = rv ? rv.text : '';
  }

  $('#monthReviewBtn').addEventListener('click', function () {
    var classes = Store.get().classes;
    if (!classes.length) { toast('Tạo lớp trước đã nhé.'); return; }
    $('#rvClass').innerHTML = classes.map(function (c) {
      return '<option value="' + E(c.id) + '">' + E(c.name) + '</option>';
    }).join('');
    if (view.classId) $('#rvClass').value = view.classId;
    $('#reviewTitle').textContent = 'Nhận xét tháng ' + view.month + '/' + view.year;
    napReview();
    openModal('#reviewModal');
  });

  $('#rvClass').addEventListener('change', napReview);

  $('#saveReview').addEventListener('click', function () {
    var el = document.querySelector('#rvLevels .wd.on');
    Store.setReview($('#rvClass').value, thangHienTai(), {
      text: $('#rvText').value,
      level: el ? el.dataset.level : ''
    });
    closeModal('#reviewModal');
    renderSessions();
    toast('Đã lưu nhận xét tháng.');
  });

  $('#checkAll').addEventListener('change', function () {
    var sessions = currentSessions();
    view.selected.clear();
    if (this.checked) sessions.forEach(function (s) { view.selected.add(s.key); });
    renderSessions();
  });

  $('#prevMonth').addEventListener('click', function () { shiftMonth(-1); });
  $('#nextMonth').addEventListener('click', function () { shiftMonth(1); });
  $('#thisMonth').addEventListener('click', function () {
    var d = new Date();
    view.year = d.getFullYear(); view.month = d.getMonth() + 1;
    view.selected.clear(); renderSessions();
  });
  $('#monthInput').addEventListener('change', function () {
    if (!this.value) return;
    var p = this.value.split('-');
    view.year = Number(p[0]); view.month = Number(p[1]);
    view.selected.clear(); renderSessions();
  });

  function shiftMonth(delta) {
    var m = view.month + delta;
    view.year += Math.floor((m - 1) / 12);
    view.month = ((m - 1) % 12 + 12) % 12 + 1;
    view.selected.clear();
    renderSessions();
  }

  $('#classFilter').addEventListener('change', function () {
    view.classId = this.value;
    view.selected.clear();
    renderSessions();
  });

  /* ===================== Xuất hóa đơn ===================== */

  function monthPeriod() { return 'Tháng ' + view.month + '/' + view.year; }

  /* Giữ lại ngữ cảnh để bật/tắt "Kèm nhận xét" là vẽ lại được ngay */
  function showBill(kind, sessions, opts) {
    view.billCtx = { kind: kind, sessions: sessions, opts: opts || {} };
    renderBillArea();
    openModal('#billModal');
  }

  function renderBillArea() {
    var ctx = view.billCtx;
    if (!ctx) return;
    var opts = Object.assign({}, ctx.opts, { withReview: $('#billWithReview').checked });
    $('#billArea').innerHTML = ctx.kind === 'perClass'
      ? Invoice.perClass(ctx.sessions, opts)
      : Invoice.single(ctx.sessions, opts);
  }

  $('#billWithReview').addEventListener('change', renderBillArea);

  $('#billSelected').addEventListener('click', function () {
    var sel = selectedSessions();
    if (!sel.length) { toast('Chưa chọn buổi nào.'); return; }
    showBill('single', sel, { period: Invoice.periodLabel(sel) });
  });

  $('#billMonth').addEventListener('click', function () {
    var sessions = currentSessions();
    if (!sessions.length) { toast('Tháng này chưa có buổi nào.'); return; }
    showBill('single', sessions, { period: monthPeriod() });
  });

  $('#billPerClass').addEventListener('click', function () {
    var sessions = view.selected.size ? selectedSessions() : currentSessions();
    if (!sessions.length) { toast('Chưa có buổi nào để xuất.'); return; }
    showBill('perClass', sessions, { period: view.selected.size ? null : monthPeriod() });
  });

  $('#exportCsv').addEventListener('click', function () {
    var sessions = view.selected.size ? selectedSessions() : currentSessions();
    if (!sessions.length) { toast('Chưa có buổi nào để xuất.'); return; }
    Invoice.download('buoi-day-' + view.year + '-' + Utils.pad(view.month) + '.csv', Invoice.csv(sessions), 'text/csv');
    toast('Đã tải file CSV.');
  });

  $('#billPrint').addEventListener('click', function () { window.print(); });
  $('#billCsv').addEventListener('click', function () {
    Invoice.download('hoa-don-' + view.year + '-' + Utils.pad(view.month) + '.csv',
      Invoice.csv(view.billCtx ? view.billCtx.sessions : []), 'text/csv');
    toast('Đã tải file CSV.');
  });

  /* ===================== Lớp học ===================== */

  function renderClassFilter() {
    var sel = $('#classFilter');
    var classes = Store.get().classes;
    sel.innerHTML = '<option value="">Tất cả lớp</option>' + classes.map(function (c) {
      return '<option value="' + E(c.id) + '">' + E(c.name) + '</option>';
    }).join('');
    sel.value = classes.some(function (c) { return c.id === view.classId; }) ? view.classId : '';
    view.classId = sel.value;
  }

  function renderClasses() {
    var classes = Store.get().classes;
    var box = $('#classList');
    if (!classes.length) {
      box.innerHTML = '<div class="empty"><h3>Chưa có lớp nào</h3>' +
        '<p>Mỗi lớp gồm: các thứ trong tuần, khung giờ và giá mỗi buổi.</p></div>';
      return;
    }
    box.innerHTML = classes.map(function (c) {
      return '<div class="card class-card" style="--c:' + E(c.color) + '">' +
        '<h3>' + E(c.name) + '</h3>' +
        '<div class="meta">' +
          (c.student ? '<div>👤 ' + E(c.student) + '</div>' : '') +
          slotLines(c) +
          (c.startDate || c.endDate ? '<div>📆 ' +
            (c.startDate ? 'từ ' + Utils.formatDate(c.startDate) : '') +
            (c.endDate ? ' đến ' + Utils.formatDate(c.endDate) : '') + '</div>' : '') +
          (c.note ? '<div>📝 ' + E(c.note) + '</div>' : '') +
          (c.active === false ? '<div><span class="tag off">Tạm ngưng</span></div>' : '') +
        '</div>' +
        '<div class="price">' + Utils.formatMoney(c.price) +
          ' đ<span class="s-sub"> / buổi (mặc định)</span></div>' +
        '<div class="row-btns">' +
          '<button class="btn" data-edit="' + E(c.id) + '">Sửa</button>' +
          '<button class="btn ghost" data-pause="' + E(c.id) + '">' +
            (c.active === false ? 'Mở lại' : 'Tạm ngưng') + '</button>' +
          '<button class="btn danger ghost" data-del="' + E(c.id) + '">Xoá</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  $('#classList').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.edit) openClassModal(btn.dataset.edit);
    else if (btn.dataset.pause) {
      var c = Store.classById(btn.dataset.pause);
      Store.updateClass(c.id, { active: c.active === false });
      renderAll();
    } else if (btn.dataset.del) {
      var cls = Store.classById(btn.dataset.del);
      if (confirm('Xoá lớp "' + cls.name + '"?\nMọi chỉnh sửa giá và buổi dạy thêm của lớp này cũng bị xoá.')) {
        Store.removeClass(cls.id); renderAll(); toast('Đã xoá lớp.');
      }
    }
  });

  function thuLabel(wd) { return wd === 0 ? 'Chủ nhật' : 'Thứ ' + (wd + 1); }

  /* Đọc các khung giờ đang hiện trên hộp thoại (nguồn sự thật là DOM) */
  function readSlots() {
    return Array.from(document.querySelectorAll('#clsSlots .slot-row')).map(function (row) {
      var gia = row.querySelector('.slot-price').value.trim();
      return {
        id: row.dataset.id,
        weekday: Number(row.dataset.wd),
        startTime: row.querySelector('.slot-start').value.trim(),
        endTime: row.querySelector('.slot-end').value.trim(),
        price: gia ? Utils.parseMoney(gia) : null
      };
    });
  }

  function renderSlots(slots) {
    slots = Store.sortSlots(slots);
    var giaMacDinh = Utils.parseMoney($('#clsPrice').value) || Store.get().settings.defaultPrice;

    $('#clsSlots').innerHTML = slots.length ? slots.map(function (sl) {
      var hours = Utils.durationHours(Utils.normalizeTime(sl.startTime), Utils.normalizeTime(sl.endTime));
      return '<div class="slot-row" data-id="' + E(sl.id) + '" data-wd="' + sl.weekday + '">' +
        '<span class="slot-day">' + E(thuLabel(sl.weekday)) +
          (hours ? '<small>' + Utils.formatHours(hours) + '</small>' : '') + '</span>' +
        '<input class="slot-start" value="' + E(sl.startTime) + '" aria-label="Giờ bắt đầu">' +
        '<span class="sep">–</span>' +
        '<input class="slot-end" value="' + E(sl.endTime) + '" aria-label="Giờ kết thúc">' +
        '<input class="slot-price money" value="' + (sl.price ? Utils.formatMoney(sl.price) : '') +
          '" placeholder="' + Utils.formatMoney(giaMacDinh) + '" aria-label="Giá buổi này">' +
        '<button type="button" class="icon-btn" data-dupslot title="Thêm một ca nữa cùng ' +
          E(thuLabel(sl.weekday)) + '">＋</button>' +
        '<button type="button" class="icon-btn" data-delslot title="Xoá khung giờ này">×</button>' +
      '</div>';
    }).join('') : '<div class="hint slot-empty">Chọn thứ ở trên để thêm buổi học.</div>';

    document.querySelectorAll('#clsWeekdays .wd').forEach(function (el) {
      var on = slots.some(function (sl) { return sl.weekday === Number(el.dataset.wd); });
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', String(on));
    });
    document.querySelectorAll('#clsSlots .slot-start, #clsSlots .slot-end').forEach(bindTime);
    document.querySelectorAll('#clsSlots .slot-price').forEach(bindMoney);
  }

  function renderWeekdayPicker() {
    $('#clsWeekdays').innerHTML = WEEKDAY_OPTIONS.map(function (o) {
      return '<button type="button" class="wd" data-wd="' + o.v +
        '" aria-pressed="false">' + o.label + '</button>';
    }).join('');
  }

  /* Khung giờ mới lấy mẫu từ khung đã có, để chọn nhiều thứ cùng giờ cho nhanh */
  function slotMoi(wd, dangCo) {
    var mau = dangCo[0];
    return Store.newSlot(wd,
      mau ? Utils.normalizeTime(mau.startTime) : '18:00',
      mau ? Utils.normalizeTime(mau.endTime) : '19:30',
      mau ? mau.price : null);
  }

  $('#clsWeekdays').addEventListener('click', function (e) {
    var el = e.target.closest('.wd');
    if (!el) return;
    var wd = Number(el.dataset.wd);
    var slots = readSlots();
    if (slots.some(function (sl) { return sl.weekday === wd; })) {
      slots = slots.filter(function (sl) { return sl.weekday !== wd; });
    } else {
      slots.push(slotMoi(wd, slots));
    }
    renderSlots(slots);
  });

  $('#clsSlots').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var row = btn.closest('.slot-row');
    var slots = readSlots();

    if (btn.hasAttribute('data-delslot')) {
      renderSlots(slots.filter(function (sl) { return sl.id !== row.dataset.id; }));
    } else if (btn.hasAttribute('data-dupslot')) {
      var goc = slots.find(function (sl) { return sl.id === row.dataset.id; });
      var dai = Utils.durationHours(Utils.normalizeTime(goc.startTime), Utils.normalizeTime(goc.endTime)) * 60 || 90;
      var batDau = Utils.normalizeTime(goc.endTime) || '19:30';
      slots.push(Store.newSlot(goc.weekday, batDau, Utils.addMinutes(batDau, dai), goc.price));
      renderSlots(slots);
    }
  });

  /* Đổi giá mặc định thì ô gợi ý trên từng khung giờ phải đổi theo */
  $('#clsPrice').addEventListener('blur', function () { renderSlots(readSlots()); });

  function openClassModal(id) {
    view.editingClassId = id;
    var c = id ? Store.classById(id) : null;
    $('#classModalTitle').textContent = c ? 'Sửa lớp' : 'Thêm lớp';
    $('#clsName').value = c ? c.name : '';
    $('#clsStudent').value = c ? c.student : '';
    $('#clsPrice').value = Utils.formatMoney(c ? c.price : Store.get().settings.defaultPrice);
    $('#clsStartDate').value = c ? c.startDate : '';
    $('#clsEndDate').value = c ? c.endDate : '';
    $('#clsNote').value = c ? c.note : '';
    renderWeekdayPicker();
    renderSlots(c ? c.slots.map(function (sl) { return Object.assign({}, sl); }) : []);
    openModal('#classModal');
    $('#clsName').focus();
  }

  $('#addClassBtn').addEventListener('click', function () { openClassModal(null); });

  $('#saveClass').addEventListener('click', function () {
    var name = $('#clsName').value.trim();
    if (!name) { toast('Nhập tên lớp đã nhé.'); $('#clsName').focus(); return; }

    var slots = readSlots();
    if (!slots.length) { toast('Chọn ít nhất một thứ trong tuần.'); return; }

    var hong = slots.find(function (sl) {
      return !Utils.normalizeTime(sl.startTime) || !Utils.normalizeTime(sl.endTime);
    });
    if (hong) { toast('Khung giờ ' + thuLabel(hong.weekday) + ' chưa hợp lệ. Ví dụ: 18:00.'); return; }

    slots = slots.map(function (sl) {
      return {
        id: sl.id,
        weekday: sl.weekday,
        startTime: Utils.normalizeTime(sl.startTime),
        endTime: Utils.normalizeTime(sl.endTime),
        price: sl.price
      };
    });
    var nguoc = slots.find(function (sl) { return sl.endTime <= sl.startTime; });
    if (nguoc) toast('Khung giờ ' + thuLabel(nguoc.weekday) + ': giờ kết thúc không sau giờ bắt đầu.');

    var data = {
      name: name,
      student: $('#clsStudent').value.trim(),
      slots: Store.sortSlots(slots),
      price: Utils.parseMoney($('#clsPrice').value),
      startDate: $('#clsStartDate').value,
      endDate: $('#clsEndDate').value,
      note: $('#clsNote').value.trim()
    };
    if (view.editingClassId) Store.updateClass(view.editingClassId, data);
    else Store.addClass(data);
    closeModal('#classModal');
    renderAll();
    toast('Đã lưu lớp.');
  });

  /* ===================== Buổi dạy thêm ===================== */

  /* Gợi ý khung giờ: nối tiếp ca cuối cùng của lớp đó trong ngày, dài bằng ca thường */
  function suggestSlot(classId, date) {
    var cls = Store.classById(classId);
    if (!cls || !date) return { start: '', end: '' };
    var thu = Utils.weekdayOf(date);
    /* ưu tiên khung giờ của đúng thứ đó, không có thì lấy khung đầu tiên của lớp */
    var slots = Store.sortSlots(cls.slots || []);
    var mau = slots.find(function (sl) { return sl.weekday === thu; }) || slots[0];
    var dai = (mau ? Utils.durationHours(mau.startTime, mau.endTime) * 60 : 0) || 90;

    var trongNgay = Store.sessionsInMonth(
      Number(date.slice(0, 4)), Number(date.slice(5, 7)), classId
    ).filter(function (x) { return x.date === date; });

    if (!trongNgay.length) {
      return mau ? { start: mau.startTime, end: mau.endTime } : { start: '18:00', end: '19:30' };
    }
    var start = trongNgay[trongNgay.length - 1].endTime || (mau ? mau.endTime : '19:30');
    return { start: start, end: Utils.addMinutes(start, dai) };
  }

  function fillSlotSuggestion() {
    var g = suggestSlot($('#exClass').value, $('#exDate').value);
    $('#exStart').value = g.start;
    $('#exEnd').value = g.end;
  }

  function openExtraModal(date) {
    var classes = Store.get().classes;
    if (!classes.length) { toast('Tạo lớp trước đã nhé.'); return; }
    $('#exClass').innerHTML = classes.map(function (c) {
      return '<option value="' + E(c.id) + '">' + E(c.name) + '</option>';
    }).join('');
    if (view.classId) $('#exClass').value = view.classId;

    if (!date) {
      var d = new Date();
      var isCurrent = d.getFullYear() === view.year && d.getMonth() + 1 === view.month;
      date = isCurrent ? Utils.todayISO() : view.year + '-' + Utils.pad(view.month) + '-01';
    }
    $('#exDate').value = date;
    fillSlotSuggestion();
    $('#exPrice').value = '';
    $('#exNote').value = '';
    openModal('#extraModal');
  }

  $('#addExtraBtn').addEventListener('click', function () { openExtraModal(null); });
  $('#exClass').addEventListener('change', fillSlotSuggestion);
  $('#exDate').addEventListener('change', fillSlotSuggestion);

  $('#saveExtra').addEventListener('click', function () {
    var classId = $('#exClass').value;
    var date = $('#exDate').value;
    if (!classId || !date) { toast('Chọn lớp và ngày nhé.'); return; }
    var priceRaw = $('#exPrice').value.trim();
    Store.addExtra({
      classId: classId, date: date,
      startTime: Utils.normalizeTime($('#exStart').value),
      endTime: Utils.normalizeTime($('#exEnd').value),
      price: priceRaw ? Utils.parseMoney(priceRaw) : undefined,
      note: $('#exNote').value.trim()
    });
    closeModal('#extraModal');
    var d = Utils.fromISO(date);
    view.year = d.getFullYear(); view.month = d.getMonth() + 1;
    renderAll();
    toast('Đã thêm ca ngày ' + Utils.formatDate(date) + '.');
  });

  /* ===================== Cài đặt ===================== */

  function renderSettings() {
    var s = Store.get().settings;
    $('#setName').value = s.teacherName;
    $('#setPhone').value = s.phone;
    $('#setAddress').value = s.address;
    $('#setBank').value = s.bankInfo;
    $('#setPrice').value = Utils.formatMoney(s.defaultPrice);
    $('#setPrefix').value = s.invoicePrefix;
    $('#qrPreview').innerHTML = s.qrImage
      ? '<img src="' + E(s.qrImage) + '" alt="Mã QR chuyển khoản đang dùng">'
      : '<span class="hint">Chưa có mã QR — hóa đơn chỉ in phần chữ.</span>';
    $('#qrClear').disabled = !s.qrImage;
  }

  $('#qrPick').addEventListener('click', function () { $('#qrFile').click(); });

  $('#qrFile').addEventListener('change', function () {
    var file = this.files[0];
    this.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert('Ảnh QR nặng ' + Math.round(file.size / 1024) + 'KB, vượt giới hạn 1MB.\n' +
        'Chụp lại hoặc thu nhỏ ảnh giúp em nhé.');
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      Store.get().settings.qrImage = String(reader.result);
      Store.save();
      renderSettings();
      toast('Đã đổi mã QR.');
    };
    reader.readAsDataURL(file);
  });

  $('#qrClear').addEventListener('click', function () {
    Store.get().settings.qrImage = '';
    Store.save();
    renderSettings();
    toast('Hóa đơn sẽ không in mã QR nữa.');
  });

  function bindSetting(sel, key, parse) {
    $(sel).addEventListener('change', function () {
      Store.get().settings[key] = parse ? parse(this.value) : this.value.trim();
      Store.save();
      toast('Đã lưu.');
    });
  }
  bindSetting('#setName', 'teacherName');
  bindSetting('#setPhone', 'phone');
  bindSetting('#setAddress', 'address');
  bindSetting('#setBank', 'bankInfo', function (v) { return v.trim(); });
  bindSetting('#setPrice', 'defaultPrice', Utils.parseMoney);
  bindSetting('#setPrefix', 'invoicePrefix');

  $('#backupBtn').addEventListener('click', function () {
    Invoice.download('exportbill-sao-luu-' + Utils.todayISO() + '.json', Store.exportJSON(), 'application/json');
    toast('Đã tải file sao lưu.');
  });
  $('#restoreBtn').addEventListener('click', function () { $('#restoreFile').click(); });
  $('#restoreFile').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        Store.importJSON(String(reader.result));
        renderAll(); renderSettings();
        toast('Đã khôi phục dữ liệu.');
      } catch (err) {
        alert('Không đọc được file sao lưu: ' + err.message);
      }
    };
    reader.readAsText(file);
    this.value = '';
  });
  $('#resetBtn').addEventListener('click', function () {
    if (confirm('Xoá toàn bộ lớp học, lịch và cài đặt?\nNên tải file sao lưu trước khi làm việc này.')) {
      Store.resetAll(); renderAll(); renderSettings(); toast('Đã xoá toàn bộ dữ liệu.');
    }
  });

  /* ===================== Khởi tạo ===================== */

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) {
      var m = e.target.closest('.modal');
      if (m) m.hidden = true;
    } else if (e.target.classList.contains('modal')) {
      e.target.hidden = true;
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.querySelectorAll('.modal:not([hidden])').forEach(function (m) { m.hidden = true; });
  });

  function renderAll() {
    renderClassFilter();
    renderClasses();
    renderSessions();
  }

  Store.load();
  document.querySelectorAll('input.money').forEach(bindMoney);
  ['#exStart', '#exEnd'].forEach(function (s) { bindTime($(s)); });
  renderSettings();
  renderAll();
})();
