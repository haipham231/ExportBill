/* Lưu trữ dữ liệu (localStorage) và sinh danh sách buổi dạy theo lịch cố định. */
var Store = (function () {
  var KEY = 'exportbill.v1';
  var state = null;
  var listeners = [];

  function defaultState() {
    return {
      settings: {
        teacherName: 'NGUYEN THU HA',
        phone: '',
        address: '',
        bankInfo: 'VPBank – 2420001013 – NGUYEN THU HA',
        qrImage: 'assets/qr-vpbank.png',
        defaultPrice: 500000,
        invoicePrefix: 'HD'
      },
      classes: [],
      /* key "classId|YYYY-MM-DD" -> { status, price, startTime, endTime, note } */
      overrides: {},
      /* buổi dạy thêm / dạy bù nằm ngoài lịch cố định */
      extras: []
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : defaultState();
    } catch (e) {
      state = defaultState();
    }
    var base = defaultState();
    Object.keys(base).forEach(function (k) {
      if (state[k] === undefined) state[k] = base[k];
    });
    Object.keys(base.settings).forEach(function (k) {
      if (state.settings[k] === undefined) state.settings[k] = base.settings[k];
    });
    return state;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      alert('Không lưu được dữ liệu vào trình duyệt: ' + e.message);
    }
    listeners.forEach(function (fn) { fn(state); });
  }

  function onChange(fn) { listeners.push(fn); }
  function get() { return state || load(); }

  /* ---------- Lớp học ---------- */

  function addClass(data) {
    var c = {
      id: Utils.uid('c'),
      name: data.name || 'Lớp mới',
      student: data.student || '',
      weekdays: data.weekdays || [],
      startTime: data.startTime || '18:00',
      endTime: data.endTime || '19:30',
      price: data.price !== undefined ? data.price : get().settings.defaultPrice,
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      note: data.note || '',
      active: data.active !== false,
      color: data.color || pickColor()
    };
    get().classes.push(c);
    save();
    return c;
  }

  function pickColor() {
    var palette = ['#2f6fed', '#e0613a', '#1f9d6b', '#8a4fd1', '#c2345e', '#0f8ea8', '#b4791a'];
    return palette[get().classes.length % palette.length];
  }

  function updateClass(id, patch) {
    var c = get().classes.find(function (x) { return x.id === id; });
    if (!c) return;
    Object.assign(c, patch);
    save();
  }

  function removeClass(id) {
    var s = get();
    s.classes = s.classes.filter(function (c) { return c.id !== id; });
    s.extras = s.extras.filter(function (e) { return e.classId !== id; });
    Object.keys(s.overrides).forEach(function (k) {
      if (k.split('|')[0] === id) delete s.overrides[k];
    });
    save();
  }

  function classById(id) {
    return get().classes.find(function (c) { return c.id === id; }) || null;
  }

  /* ---------- Ghi đè từng buổi ---------- */

  function overrideKey(classId, date) { return classId + '|' + date; }

  function setOverride(classId, date, patch) {
    var s = get();
    var k = overrideKey(classId, date);
    s.overrides[k] = Object.assign({}, s.overrides[k], patch);
    var o = s.overrides[k];
    var empty = Object.keys(o).every(function (key) {
      return o[key] === undefined || o[key] === null || o[key] === '';
    });
    if (empty) delete s.overrides[k];
    save();
  }

  function clearOverride(classId, date) {
    delete get().overrides[overrideKey(classId, date)];
    save();
  }

  /* ---------- Buổi dạy thêm ---------- */

  function addExtra(data) {
    var e = {
      id: Utils.uid('e'),
      classId: data.classId,
      date: data.date,
      startTime: data.startTime || '',
      endTime: data.endTime || '',
      price: data.price,
      note: data.note || ''
    };
    get().extras.push(e);
    save();
    return e;
  }

  function removeExtra(id) {
    var s = get();
    s.extras = s.extras.filter(function (e) { return e.id !== id; });
    save();
  }

  /* ---------- Sinh buổi dạy theo lịch ---------- */

  function buildSession(cls, date, extra) {
    var s = get();
    var ov = extra ? null : s.overrides[overrideKey(cls.id, date)];
    var price = cls.price;
    var priceEdited = false;
    if (extra && extra.price !== undefined && extra.price !== null && extra.price !== '') {
      price = extra.price; priceEdited = true;
    } else if (ov && ov.price !== undefined && ov.price !== null && ov.price !== '') {
      price = ov.price; priceEdited = true;
    }
    return {
      key: extra ? 'x|' + extra.id : overrideKey(cls.id, date),
      classId: cls.id,
      className: cls.name,
      student: cls.student,
      color: cls.color,
      date: date,
      startTime: (extra && extra.startTime) || (ov && ov.startTime) || cls.startTime,
      endTime: (extra && extra.endTime) || (ov && ov.endTime) || cls.endTime,
      price: Number(price) || 0,
      priceEdited: priceEdited,
      status: extra ? 'teach' : ((ov && ov.status) || 'teach'),
      note: (extra && extra.note) || (ov && ov.note) || '',
      isExtra: !!extra,
      extraId: extra ? extra.id : null
    };
  }

  /* Tất cả buổi trong tháng (month: 1-12), đã sắp theo ngày rồi giờ. */
  function sessionsInMonth(year, month, classId) {
    var s = get();
    var out = [];
    var classes = s.classes.filter(function (c) {
      return c.active !== false && (!classId || c.id === classId);
    });

    classes.forEach(function (cls) {
      var days = Utils.daysInMonth(year, month);
      for (var d = 1; d <= days; d++) {
        var dt = new Date(year, month - 1, d);
        if (cls.weekdays.indexOf(dt.getDay()) === -1) continue;
        var iso = Utils.toISO(dt);
        if (cls.startDate && iso < cls.startDate) continue;
        if (cls.endDate && iso > cls.endDate) continue;
        out.push(buildSession(cls, iso, null));
      }
    });

    var prefix = year + '-' + Utils.pad(month);
    s.extras.forEach(function (e) {
      if (e.date.indexOf(prefix) !== 0) return;
      if (classId && e.classId !== classId) return;
      var cls = classById(e.classId);
      if (!cls) return;
      out.push(buildSession(cls, e.date, e));
    });

    out.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
      return a.className.localeCompare(b.className, 'vi');
    });
    return out;
  }

  /* ---------- Sao lưu ---------- */

  function exportJSON() { return JSON.stringify(get(), null, 2); }

  function importJSON(text) {
    var data = JSON.parse(text);
    if (!data || !Array.isArray(data.classes)) throw new Error('Tệp sao lưu không hợp lệ.');
    state = data;
    load();
    save();
  }

  function resetAll() {
    state = defaultState();
    save();
  }

  return {
    load: load, save: save, get: get, onChange: onChange,
    addClass: addClass, updateClass: updateClass, removeClass: removeClass, classById: classById,
    setOverride: setOverride, clearOverride: clearOverride, overrideKey: overrideKey,
    addExtra: addExtra, removeExtra: removeExtra,
    sessionsInMonth: sessionsInMonth,
    exportJSON: exportJSON, importJSON: importJSON, resetAll: resetAll
  };
})();
