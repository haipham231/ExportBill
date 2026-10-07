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

  /* Bù các trường còn thiếu rồi nâng cấp dữ liệu cũ. Dùng chung cho mở app và khôi phục file. */
  function normalize(st) {
    var base = defaultState();
    Object.keys(base).forEach(function (k) {
      if (st[k] === undefined) st[k] = base[k];
    });
    Object.keys(base.settings).forEach(function (k) {
      if (st.settings[k] === undefined) st.settings[k] = base.settings[k];
    });
    migrate(st);
    return st;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : defaultState();
    } catch (e) {
      state = defaultState();
    }
    return normalize(state);
  }

  /* Bản cũ: lớp có weekdays[] + một khung giờ dùng chung, ghi đè khoá "lopId|ngày".
     Bản mới: mỗi thứ là một slot có id riêng, ghi đè khoá "lopId|slotId|ngày". */
  function migrate(state) {
    var caiCu = false;
    state.classes.forEach(function (c) {
      if (Array.isArray(c.slots)) return;
      caiCu = true;
      c.slots = (c.weekdays || []).map(function (wd) {
        return newSlot(wd, c.startTime, c.endTime, null);
      });
      delete c.weekdays;
      delete c.startTime;
      delete c.endTime;
    });
    if (!caiCu) return;

    var moi = {};
    Object.keys(state.overrides).forEach(function (k) {
      var phan = k.split('|');
      if (phan.length === 3) { moi[k] = state.overrides[k]; return; }
      var cls = state.classes.find(function (c) { return c.id === phan[0]; });
      if (!cls) return;
      var thu = Utils.fromISO(phan[1]).getDay();
      var slot = cls.slots.find(function (sl) { return sl.weekday === thu; });
      if (slot) moi[cls.id + '|' + slot.id + '|' + phan[1]] = state.overrides[k];
    });
    state.overrides = moi;
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

  function newSlot(weekday, startTime, endTime, price) {
    return {
      id: Utils.uid('s'),
      weekday: weekday,
      startTime: startTime || '18:00',
      endTime: endTime || '19:30',
      price: (price === undefined || price === null || price === '') ? null : Number(price)
    };
  }

  function addClass(data) {
    var slots = data.slots;
    /* Dạng cũ: một danh sách thứ dùng chung một khung giờ */
    if (!slots) {
      slots = (data.weekdays || []).map(function (wd) {
        return newSlot(wd, data.startTime, data.endTime, null);
      });
    }
    var c = {
      id: Utils.uid('c'),
      name: data.name || 'Lớp mới',
      student: data.student || '',
      slots: slots,
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

  /* Khung giờ của lớp, sắp theo thứ 2 → chủ nhật rồi tới giờ bắt đầu */
  var THU_TU = [1, 2, 3, 4, 5, 6, 0];
  function sortSlots(slots) {
    return slots.slice().sort(function (a, b) {
      var d = THU_TU.indexOf(a.weekday) - THU_TU.indexOf(b.weekday);
      return d !== 0 ? d : (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0);
    });
  }

  function slotPrice(cls, slot) {
    return (slot && slot.price !== null && slot.price !== undefined && slot.price !== '')
      ? Number(slot.price) : Number(cls.price) || 0;
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

  function overrideKey(classId, slotId, date) { return classId + '|' + slotId + '|' + date; }

  /* key chính là session.key của buổi đó */
  function setOverride(key, patch) {
    var s = get();
    s.overrides[key] = Object.assign({}, s.overrides[key], patch);
    var o = s.overrides[key];
    var empty = Object.keys(o).every(function (k) {
      return o[k] === undefined || o[k] === null || o[k] === '';
    });
    if (empty) delete s.overrides[key];
    save();
  }

  function clearOverride(key) {
    delete get().overrides[key];
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

  function buildSession(cls, slot, date, extra) {
    var s = get();
    var key = extra ? 'x|' + extra.id : overrideKey(cls.id, slot.id, date);
    var ov = extra ? null : s.overrides[key];
    var giaLich = slot ? slotPrice(cls, slot) : Number(cls.price) || 0;

    var price = giaLich;
    var priceEdited = false;
    if (extra && extra.price !== undefined && extra.price !== null && extra.price !== '') {
      price = extra.price; priceEdited = true;
    } else if (ov && ov.price !== undefined && ov.price !== null && ov.price !== '') {
      price = ov.price; priceEdited = true;
    }
    return {
      key: key,
      classId: cls.id,
      className: cls.name,
      student: cls.student,
      color: cls.color,
      slotId: slot ? slot.id : null,
      date: date,
      startTime: (extra && extra.startTime) || (ov && ov.startTime) || (slot && slot.startTime) || '',
      endTime: (extra && extra.endTime) || (ov && ov.endTime) || (slot && slot.endTime) || '',
      /* buổi dạy thêm vốn đã có giờ riêng, chỉ đánh dấu khi lệch khung giờ cố định */
      timeEdited: !extra && !!(ov && (ov.startTime || ov.endTime)),
      price: Number(price) || 0,
      priceEdited: priceEdited,
      status: extra ? 'teach' : ((ov && ov.status) || 'teach'),
      note: (extra && extra.note) || (ov && ov.note) || '',
      isExtra: !!extra,
      extraId: extra ? extra.id : null,
      slot: 0, slotCount: 1
    };
  }

  /* Tất cả buổi trong tháng (month: 1-12), đã sắp theo ngày rồi giờ. */
  function sessionsInMonth(year, month, classId) {
    var s = get();
    var out = [];
    var classes = s.classes.filter(function (c) {
      return c.active !== false && (!classId || c.id === classId);
    });

    var days = Utils.daysInMonth(year, month);
    classes.forEach(function (cls) {
      (cls.slots || []).forEach(function (slot) {
        for (var d = 1; d <= days; d++) {
          var dt = new Date(year, month - 1, d);
          if (dt.getDay() !== slot.weekday) continue;
          var iso = Utils.toISO(dt);
          if (cls.startDate && iso < cls.startDate) continue;
          if (cls.endDate && iso > cls.endDate) continue;
          out.push(buildSession(cls, slot, iso, null));
        }
      });
    });

    var prefix = year + '-' + Utils.pad(month);
    s.extras.forEach(function (e) {
      if (e.date.indexOf(prefix) !== 0) return;
      if (classId && e.classId !== classId) return;
      var cls = classById(e.classId);
      if (!cls) return;
      out.push(buildSession(cls, null, e.date, e));
    });

    out.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
      return a.className.localeCompare(b.className, 'vi');
    });

    /* Một lớp dạy nhiều ca trong cùng ngày thì đánh số ca để hóa đơn khỏi lẫn */
    var byDay = {};
    out.forEach(function (ss) {
      var k = ss.classId + '|' + ss.date;
      (byDay[k] = byDay[k] || []).push(ss);
    });
    Object.keys(byDay).forEach(function (k) {
      var list = byDay[k];
      if (list.length < 2) return;
      list.forEach(function (ss, i) { ss.slot = i + 1; ss.slotCount = list.length; });
    });
    return out;
  }

  /* ---------- Sao lưu ---------- */

  function exportJSON() { return JSON.stringify(get(), null, 2); }

  function importJSON(text) {
    var data = JSON.parse(text);
    if (!data || !Array.isArray(data.classes)) throw new Error('Tệp sao lưu không hợp lệ.');
    /* Không gọi load() ở đây: load() đọc lại localStorage và sẽ xoá mất dữ liệu vừa nhập */
    state = normalize(data);
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
    exportJSON: exportJSON, importJSON: importJSON, resetAll: resetAll,
    newSlot: newSlot, sortSlots: sortSlots, slotPrice: slotPrice, WEEKDAY_ORDER: THU_TU
  };
})();
