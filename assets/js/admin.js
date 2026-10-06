/* ============ 后台 ============
 * Schema 驱动的通用 CRUD：新增集合只需在 SCHEMA 里加一段描述。
 * 文章 / 目击记录 有专用编辑器（Markdown 实时预览、多版本记载）。
 * ============================== */
(function (global) {
  var esc = Common.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 部分环境（无头 / 内嵌 webview）没有 scrollIntoView，不能直接调用 */
  function scrollIn(el) {
    if (el && typeof el.scrollIntoView === 'function') {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { }
    }
  }

  /* ---------------- 字段 schema ---------------- */
  var GROUPS = [
    { v: 'avatar', t: '马甲' }, { v: 'god', t: '神族' }, { v: 'power', t: '位高权重的人' },
    { v: 'mortal', t: '未被记名的普通人' }, { v: 'special', t: '特殊个体' }
  ];
  var THING_TYPES = [
    { v: 'hold', t: '持有物' }, { v: 'industry', t: '产业' }, { v: 'work', t: '作品' }
  ];
  var MISREAD_KINDS = [
    { v: 'misread', t: '历史误读' }, { v: 'slander', t: '诋毁与冠名混乱' }
  ];

  var SCHEMA = {
    eras: {
      label: '时代', hint: '地图与时间轴共用。切换时代时，地图上的标记与说明随之变化。',
      mk: function () { return { id: Store.uid('e'), name: '新时代', range: '', note: '' }; },
      title: function (o) { return o.name + (o.range ? '　·　' + o.range : ''); },
      sub: function (o) { return o.note || ''; },
      fields: [
        { k: 'name', t: '名称' }, { k: 'range', t: '年代区间' },
        { k: 'note', t: '说明', type: 'textarea' }
      ]
    },
    places: {
      label: '地图标记', hint: '经纬度填真实坐标（北纬为正 / 西经为负），也可以直接点下方地图取点，或直接填「地点 / 国家名」自动定位；「所属时代」决定该标记出现在哪个时代的地图上。填了「关联故事」的标记可点击跳转。「聚合组」同名的标记会合并成一个点，点开可展开列表。',
      mk: function () { return { id: Store.uid('p'), eraId: '', name: '新标记', region: '', lat: 0, lon: 0, group: '', desc: '', storyIds: [] }; },
      title: function (o) { return o.name + (o.region ? '　·　' + o.region : '') + (o.group ? '　·　组：' + o.group : ''); },
      sub: function (o, s) { return eraName(s, o.eraId) + '　·　' + geoText(o) + '　·　' + (o.desc || ''); },
      fields: [
        { k: 'name', t: '名称' },
        { k: 'eraId', t: '所属时代', type: 'select', opts: 'eras' },
        { k: 'region', t: '区域 / 文明' },
        { k: 'group', t: '聚合组（同名合并成一个点，可留空）' },
        { k: '_place', t: '按地点 / 国家名定位（可留空）', type: 'place' },
        { k: '_geo', t: '点图取点（点击地图设置经纬度）', type: 'map' },
        { k: 'lat', t: '纬度 lat（北正南负）', type: 'num' },
        { k: 'lon', t: '经度 lon（东正西负）', type: 'num' },
        { k: 'desc', t: '说明', type: 'textarea' },
        { k: 'storyIds', t: '关联故事', type: 'storymulti' }
      ]
    },
    timeline: {
      label: '时间轴', hint: '「祂的踪迹」页历史视角的节点。可挂到某个时代与某个地图标记上。',
      mk: function () { return { id: Store.uid('t'), eraId: '', placeId: '', year: '', title: '新事件', desc: '', tag: '', link: '' }; },
      title: function (o) { return (o.year ? o.year + '　·　' : '') + o.title; },
      sub: function (o) { return o.desc || ''; },
      fields: [
        { k: 'year', t: '年代' }, { k: 'title', t: '标题' },
        { k: 'eraId', t: '所属时代', type: 'select', opts: 'eras' },
        { k: 'placeId', t: '地图标记', type: 'select', opts: 'places' },
        { k: 'tag', t: '标签（起点 / 转折 / 杀戮 …）' },
        { k: 'link', t: '跳转到文章 id', type: 'select', opts: 'articles', blank: '（不跳转）' },
        { k: 'desc', t: '说明', type: 'textarea' }
      ]
    },
    concepts: {
      label: '概念分节点', hint: '「祂的踪迹」页的另一条浏览轴：按主题而非年代。与历史时间轴可互相切换。',
      mk: function () { return { id: Store.uid('c'), order: 99, title: '新节点', desc: '', link: '' }; },
      title: function (o) { return o.order + '. ' + o.title; },
      sub: function (o) { return o.desc || ''; },
      fields: [
        { k: 'order', t: '排序', type: 'num' }, { k: 'title', t: '标题' },
        { k: 'link', t: '跳转到文章 id', type: 'select', opts: 'articles', blank: '（不跳转）' },
        { k: 'desc', t: '说明', type: 'textarea' }
      ]
    },
    relations: {
      label: '马甲与关系', hint: '「分组」为「马甲」的条目会自动进入全站顶部的马甲切换器；其「强调色」就是切换后的整站主色。',
      mk: function () { return { id: Store.uid('r'), name: '新人物', group: 'god', role: '', color: '#6b727b', desc: '', link: '', portrait: '', album: [], storyIds: [] }; },
      title: function (o) { return o.name + (o.role ? '　·　' + o.role : ''); },
      sub: function (o) { return o.desc || ''; },
      fields: [
        { k: 'name', t: '名称' },
        { k: 'group', t: '分组', type: 'select', opts: GROUPS },
        { k: 'role', t: '身份 / 副标题' },
        { k: 'color', t: '强调色', type: 'color' },
        { k: 'portrait', t: '主视觉', type: 'img' },
        { k: 'album', t: '相册（多图）', type: 'imgmulti' },
        { k: 'link', t: '外链' },
        { k: 'storyIds', t: '关联故事', type: 'storymulti' },
        { k: 'desc', t: '说明', type: 'textarea' }
      ]
    },
    things: {
      label: '祂的东西', hint: '持有物 / 产业 / 作品三类，前台以「置物架」形式堆放，左侧点击右侧显示介绍。',
      mk: function () { return { id: Store.uid('th'), type: 'hold', name: '新条目', desc: '', imageId: '', tags: [], media: [] }; },
      title: function (o) { return '[' + thingTypeName(o.type) + '] ' + o.name; },
      sub: function (o) { return o.desc || ''; },
      fields: [
        { k: 'name', t: '名称' },
        { k: 'type', t: '类别', type: 'select', opts: THING_TYPES },
        { k: 'imageId', t: '图', type: 'img' },
        { k: 'tags', t: '标签', type: 'tags' },
        { k: 'desc', t: '介绍', type: 'textarea' },
        { k: 'media', t: '影音 / 试听 / 试玩', type: 'media' }
      ]
    },
    fans: {
      label: '网友作品', hint: '勾选「主创精选」会进入页面顶部的精选区。',
      mk: function () { return { id: Store.uid('f'), title: '新作品', author: '', imageId: '', tags: [], url: '', featured: false }; },
      title: function (o) { return (o.featured ? '★ ' : '') + o.title + (o.author ? '　·　' + o.author : ''); },
      sub: function (o) { return (o.tags || []).join(' / '); },
      fields: [
        { k: 'title', t: '标题' }, { k: 'author', t: '作者' },
        { k: 'url', t: '原链接' },
        { k: 'imageId', t: '图', type: 'img' },
        { k: 'tags', t: '标签', type: 'tags' },
        { k: 'featured', t: '主创精选', type: 'bool' }
      ]
    },
    gallery: {
      label: '插画', hint: '插画墙。ratio 控制在墙上的占位比例。',
      mk: function () { return { id: Store.uid('g'), title: '新插画', caption: '', tags: [], imageId: '', ratio: '3/4' }; },
      title: function (o) { return o.title; },
      sub: function (o) { return o.caption || ''; },
      fields: [
        { k: 'title', t: '标题' }, { k: 'caption', t: '说明' },
        { k: 'imageId', t: '图', type: 'img' },
        { k: 'tags', t: '标签', type: 'tags' },
        { k: 'cat', t: '分级', type: 'select', opts: [{ v: 'finished', t: '插画' }, { v: 'sketch', t: '摸鱼' }, { v: 'manga', t: '故事漫' }] },
        { k: 'ratio', t: '比例', type: 'select', opts: [{ v: '3/4', t: '3/4 竖' }, { v: '1/1', t: '1/1 方' }, { v: '16/9', t: '16/9 横' }] }
      ]
    }
  };

  function eraName(s, id) {
    var e = (s.eras || []).filter(function (x) { return x.id === id; })[0];
    return e ? e.name : '（未指定时代）';
  }
  function geoText(o) {
    if (typeof o.lat !== 'number' || typeof o.lon !== 'number') {
      return (o.x != null ? '旧坐标 x' + o.x + '/y' + o.y : '未定位');
    }
    return Math.abs(o.lat).toFixed(1) + (o.lat >= 0 ? '°N' : '°S') + ' ' +
           Math.abs(o.lon).toFixed(1) + (o.lon >= 0 ? '°E' : '°W');
  }
  /* 地图取点器：世界地图线图 + 已有标记，点击写入 lat / lon 两个输入框 */
  function mapPickerHTML(lat, lon) {
    var M = window.WorldMap;
    if (!M) return '<div class="dim">worldmap.js 未加载，只能手填经纬度。</div>';
    var c = (typeof lat === 'number' && typeof lon === 'number') ? M.proj(lon, lat) : null;
    var rings = M.rings.map(function (r) { return '<path d="' + r.d + '"/>'; }).join('');
    var grid = M.grid.map(function (d) { return '<path d="' + d + '"/>'; }).join('');
    return '<div class="map-pick">' +
      '<svg viewBox="0 0 ' + M.W + ' ' + M.H + '" preserveAspectRatio="none" aria-label="世界地图取点">' +
      '<g class="mp-grid" fill="none">' + grid + '</g>' +
      '<g class="mp-land">' + rings + '</g>' +
      '<g class="mp-coast" fill="none">' + rings + '</g>' +
      '</svg>' +
      '<i class="mk"' + (c ? ' style="left:' + (c[0] / M.W * 100).toFixed(2) + '%;top:' + (c[1] / M.H * 100).toFixed(2) + '%"' : '') + '></i>' +
      '</div>';
  }
  function bindMapPicker(box, o) {
    var host = box.querySelector('.f-map');
    if (!host || !window.WorldMap) return;
    var M = window.WorldMap;
    function set(lat, lon) {
      var li = box.querySelector('input[data-k="lat"]'), lo = box.querySelector('input[data-k="lon"]');
      if (li) li.value = Math.round(lat * 100) / 100;
      if (lo) lo.value = Math.round(lon * 100) / 100;
      var c = M.proj(lon, lat), mk = host.querySelector('.mk');
      if (mk) { mk.style.left = (c[0] / M.W * 100) + '%'; mk.style.top = (c[1] / M.H * 100) + '%'; }
    }
    var svg = host.querySelector('svg');
    if (svg) svg.addEventListener('click', function (ev) {
      var r = svg.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var g = WorldMap.unproj((ev.clientX - r.left) / r.width * M.W, (ev.clientY - r.top) / r.height * M.H);
      set(g[1], g[0]);
    });
    var li = box.querySelector('input[data-k="lat"]'), lo = box.querySelector('input[data-k="lon"]');
    [li, lo].forEach(function (inp) {
      if (inp) inp.addEventListener('input', function () {
        var la = parseFloat(li && li.value), lo2 = parseFloat(lo && lo.value);
        if (isNaN(la) || isNaN(lo2)) return;
        var c = M.proj(lo2, la), mk = host.querySelector('.mk');
        if (mk) { mk.style.left = (c[0] / M.W * 100) + '%'; mk.style.top = (c[1] / M.H * 100) + '%'; }
      });
    });
  }
  /* 地名反查：填「埃及」「开罗」这类地名 → 自动写入 lat / lon（离线，无网络请求） */
  function fmtLat(lat) { return Math.abs(lat).toFixed(2) + '°' + (lat >= 0 ? 'N' : 'S'); }
  function fmtLon(lon) { return Math.abs(lon).toFixed(2) + '°' + (lon >= 0 ? 'E' : 'W'); }
  function bindPlacePicker(box) {
    var host = box.querySelector('.f-place');
    if (!host || !window.Places) return;
    var inp = host.querySelector('input[data-k]');
    var out = host.querySelector('[data-role="out"]');
    var btn = host.querySelector('[data-act="geo"]');
    function go() {
      var q = (inp && inp.value || '').trim();
      if (!q) { if (out) out.textContent = ''; return; }
      var r = window.Places.lookup(q);
      if (!r) {
        if (out) out.innerHTML = '<b class="bad">没找到「' + esc(q) + '」。可以直接在地图上点，或手填经纬度。</b>';
        return;
      }
      var li = box.querySelector('input[data-k="lat"]'), lo = box.querySelector('input[data-k="lon"]');
      if (li) li.value = Math.round(r.lat * 100) / 100;
      if (lo) lo.value = Math.round(r.lon * 100) / 100;
      if (out) out.innerHTML = '<b class="ok">已定位 ' + esc(r.name) + ' → ' + fmtLat(r.lat) + ' ' + fmtLon(r.lon) +
        '（记得点保存）</b>';
      var M = window.WorldMap;
      if (M) {
        var c = M.proj(r.lon, r.lat), mk = box.querySelector('.f-map .mk');
        if (mk) { mk.style.left = (c[0] / M.W * 100) + '%'; mk.style.top = (c[1] / M.H * 100) + '%'; }
      }
    }
    if (btn) btn.onclick = go;
    if (inp) inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); go(); }
    });
  }
  function thingTypeName(v) {
    var t = THING_TYPES.filter(function (x) { return x.v === v; })[0];
    return t ? t.t : v;
  }

  /* ---------------- 入口（无口令，靠隐藏网址访问） ---------------- */
  // 后台不放在任何导航/页脚里，普通游客看不到入口，也进不去编辑。
  // 站主直接用隐藏网址（如 poor-dot-created.html）打开即可进入编辑，不需要口令。
  // 安全模型是「隐蔽」而非「加密」：只要知道这个网址就拥有完整编辑权，请勿外泄。
  function gate(appEl, done) { done(); }

  /* ---------------- 通用列表编辑器 ---------------- */
  function selectOpts(spec, s) {
    if (Array.isArray(spec)) return spec;
    if (spec === 'eras') return (s.eras || []).map(function (x) { return { v: x.id, t: x.name }; });
    if (spec === 'places') return (s.places || []).map(function (x) { return { v: x.id, t: x.name }; });
    if (spec === 'articles') return sortA(s.articles || []).map(function (x) { return { v: x.id, t: (x.kind === 'note' ? '[笔记] ' : '') + x.title }; });
    return [];
  }
  function sortA(l) { return Common.sortArticles(l); }

  function fieldHTML(f, val, s, o) {
    var v = val == null ? '' : val;
    var cls = 'f-' + (f.type || 'text');
    if (f.type === 'textarea') {
      return '<label class="' + cls + '"><span>' + f.t + '</span><textarea data-k="' + f.k + '">' + esc(v) + '</textarea></label>';
    }
    if (f.type === 'select') {
      var opts = selectOpts(f.opts, s);
      var head = f.blank ? '<option value="">' + esc(f.blank) + '</option>' : '';
      return '<label class="' + cls + '"><span>' + f.t + '</span><select data-k="' + f.k + '">' + head +
        opts.map(function (x) { return '<option value="' + esc(x.v) + '"' + (String(v) === String(x.v) ? ' selected' : '') + '>' + esc(x.t) + '</option>'; }).join('') +
        '</select></label>';
    }
    if (f.type === 'num') {
      return '<label class="' + cls + '"><span>' + f.t + '</span><input type="number" data-k="' + f.k + '" value="' + esc(v) + '"></label>';
    }
    if (f.type === 'color') {
      return '<label class="' + cls + '"><span>' + f.t + '</span><input type="color" data-k="' + f.k + '" value="' + esc(v || '#6b727b') + '"></label>';
    }
    if (f.type === 'bool') {
      return '<label class="' + cls + '"><span>' + f.t + '</span><input type="checkbox" data-k="' + f.k + '"' + (v ? ' checked' : '') + '></label>';
    }
    if (f.type === 'tags') {
      return '<label class="' + cls + '"><span>' + f.t + '（逗号分隔）</span><input data-k="' + f.k + '" value="' + esc((v || []).join(',')) + '"></label>';
    }
    if (f.type === 'map') {
      return '<div class="' + cls + '"><span>' + f.t + '</span>' + mapPickerHTML(
        (typeof o.lat === 'number') ? o.lat : (o.lat ? parseFloat(o.lat) : NaN),
        (typeof o.lon === 'number') ? o.lon : (o.lon ? parseFloat(o.lon) : NaN)) + '</div>';
    }
    if (f.type === 'place') {
      var pnames = (window.Places && window.Places.names) ? window.Places.names() : [];
      return '<div class="' + cls + '"><span>' + f.t + '</span>' +
        '<div class="pl-row">' +
        '<input list="plList" data-k="' + f.k + '" placeholder="如：埃及 / 开罗 / 长安 / 君士坦丁堡" value="' + esc(v) + '">' +
        '<button class="btn mini" data-act="geo">定位</button></div>' +
        '<datalist id="plList">' + pnames.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
        '<p class="pl-out" data-role="out"></p></div>';
    }
    if (f.type === 'media') {
      return '<div class="' + cls + '"><span>' + f.t + '（多图 / 视频 / 音乐 / 外链）</span>' + mediaEditorHTML(Array.isArray(val) ? val : []) + '</div>';
    }
    if (f.type === 'img') {
      return '<div class="' + cls + '" data-k="' + f.k + '"><span>' + f.t + '</span>' +
        '<div class="img-pick"><span class="thumb" data-img="' + esc(v) + '"></span>' +
        '<input type="file" accept="image/*"><button class="btn mini" data-act="clear">清除</button></div></div>';
    }
    if (f.type === 'imgmulti') {
      return '<div class="' + cls + '" data-k="' + f.k + '"><span>' + f.t + '</span>' +
        '<div class="img-grid">' + (v || []).map(function (i) {
          return '<span class="img-cell"><i class="thumb" data-img="' + esc(i) + '"></i><b data-act="del" data-i="' + esc(i) + '">×</b></span>';
        }).join('') + '</div><input type="file" accept="image/*" multiple></div>';
    }
    if (f.type === 'storymulti') {
      var all = sortA(s.articles || []);
      return '<div class="' + cls + '" data-k="' + f.k + '"><span>' + f.t + '</span><div class="chk">' +
        all.map(function (a) {
          return '<label><input type="checkbox" value="' + esc(a.id) + '"' + ((v || []).indexOf(a.id) >= 0 ? ' checked' : '') + '>' +
            esc((a.kind === 'note' ? '[笔记] ' : '') + a.title) + '</label>';
        }).join('') + '</div></div>';
    }
    return '<label class="' + cls + '"><span>' + f.t + '</span><input data-k="' + f.k + '" value="' + esc(v) + '"></label>';
  }

  function readField(el, f) {
    if (f.type === 'bool') return !!$('input[data-k="' + f.k + '"]', el).checked;
    if (f.type === 'num') return Number($('input[data-k="' + f.k + '"]', el).value || 0);
    if (f.type === 'tags') {
      var t = $('input[data-k="' + f.k + '"]', el).value.split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
      return t;
    }
    if (f.type === 'img' || f.type === 'imgmulti') {
      var box = el.querySelector('.f-' + f.type + '[data-k="' + f.k + '"]');
      return box ? (box._v || (f.type === 'imgmulti' ? [] : '')) : (f.type === 'imgmulti' ? [] : '');
    }
    if (f.type === 'storymulti') {
      var c = el.querySelector('.f-storymulti[data-k="' + f.k + '"]');
      return c ? $$('input:checked', c).map(function (x) { return x.value; }) : [];
    }
    var n = el.querySelector('[data-k="' + f.k + '"]');
    return n ? n.value : '';
  }

  function renderList(key, host) {
    var s = Store.load();
    var cfg = SCHEMA[key];
    var list = s[key] || [];
    host.innerHTML = '<div class="sec-head"><span class="sec-num">' + cfg.label + '</span>' +
      '<span class="sec-title">' + list.length + ' 条</span></div>' +
      (cfg.hint ? '<p class="hint">' + esc(cfg.hint) + '</p>' : '') +
      '<div class="row"><button class="btn primary" id="add">＋ 新增</button></div>' +
      '<div class="list">' + list.map(function (o, i) {
        return '<div class="list-item" data-i="' + i + '">' +
          '<div class="li-main"><strong>' + esc(cfg.title(o)) + '</strong><span>' + esc(cfg.sub(o, s)) + '</span></div>' +
          '<div class="mini"><button data-act="edit">编辑</button><button data-act="up">↑</button><button data-act="down">↓</button><button data-act="del">删除</button></div>' +
          '</div>';
      }).join('') + '</div><div class="form-box" id="formBox"></div>';
    Common.fillImages(host);

    $('#add', host).onclick = function () { editItem(key, host, null); };
    $$('.list-item', host).forEach(function (it) {
      var i = Number(it.getAttribute('data-i'));
      $$('button', it).forEach(function (b) {
        b.onclick = function () {
          var act = b.getAttribute('data-act');
          var d = Store.load();
          if (act === 'edit') editItem(key, host, i);
          else if (act === 'del') {
            if (!confirm('删除这一条？')) return;
            d[key].splice(i, 1); Store.markDirty(); Store.save(); renderList(key, host);
          } else if (act === 'up' && i > 0) {
            var t = d[key][i]; d[key][i] = d[key][i - 1]; d[key][i - 1] = t;
            Store.markDirty(); Store.save(); renderList(key, host);
          } else if (act === 'down' && i < d[key].length - 1) {
            var t2 = d[key][i]; d[key][i] = d[key][i + 1]; d[key][i + 1] = t2;
            Store.markDirty(); Store.save(); renderList(key, host);
          }
        };
      });
    });
  }

  function editItem(key, host, idx) {
    var s = Store.load();
    var cfg = SCHEMA[key];
    var o = idx == null ? cfg.mk() : s[key][idx];
    var box = $('#formBox', host);
    box.innerHTML = '<div class="editor-card">' +
      '<div class="form-stack">' + cfg.fields.map(function (f) { return fieldHTML(f, o[f.k], s, o); }).join('') + '</div>' +
      '<div class="row"><button class="btn primary" id="sv">保存</button><button class="btn" id="cc">取消</button>' +
      (idx != null ? '<button class="btn danger" id="rm">删除</button>' : '') + '</div></div>';
    scrollIn(box);

    // 图片字段：把当前值先存到节点上，未重新上传时保持原值
    $$('.f-img, .f-imgmulti', box).forEach(function (h) {
      var k = h.getAttribute('data-k');
      var cur = o[k];
      h._v = h.classList.contains('f-imgmulti') ? (Array.isArray(cur) ? cur.slice() : []) : (cur || '');
    });

    Common.fillImages(box);
    bindUploads(box);
    bindMapPicker(box, o);
    bindPlacePicker(box);
    cfg.fields.forEach(function (f) {
      if (f.type === 'media') {
        if (!Array.isArray(o[f.k])) o[f.k] = [];
        bindMediaEditor(box, o[f.k]);
      }
    });

    $('#cc', box).onclick = function () { box.innerHTML = ''; };
    if (idx != null) $('#rm', box).onclick = function () {
      if (!confirm('删除这一条？')) return;
      Store.load()[key].splice(idx, 1); Store.markDirty(); Store.save(); renderList(key, host);
    };
    $('#sv', box).onclick = function () {
      var d = Store.load();
      cfg.fields.forEach(function (f) {
        // 取点器 / 地名搜索 / 媒体 只负责触发对应写入，本身不入库（媒体由 bindMediaEditor 原地改写 o[f.k]）
        if (f.type === 'map' || f.type === 'place' || f.type === 'media') return;
        o[f.k] = readField(box, f);
      });
      if (idx == null) d[key].unshift(o); else d[key][idx] = o;
      Store.markDirty();
      if (Store.save()) renderList(key, host);
    };
  }

  /* 上传：写入 IndexedDB 并回填字段 */
  function bindUploads(scope) {
    $$('input[type=file]', scope).forEach(function (fi) {
      if (fi.id === 'md_file') return;
      fi.onchange = function () {
        var files = Array.prototype.slice.call(fi.files || []);
        if (!files.length) return;
        var host = fi.closest('.f-img, .f-imgmulti');
        var multi = host.classList.contains('f-imgmulti');
        var cur = host._v || (multi ? [] : '');
        Promise.all(files.map(function (f) { return Store.putImage(f); })).then(function (ids) {
          host._v = multi ? cur.concat(ids) : ids[0];
          Store.load().images = (Store.load().images || []).concat(ids.map(function (i) { return { id: i, name: 'upload', at: Date.now() }; }));
          Store.markDirty();
          if (multi) {
            var g = $('.img-grid', host);
            g.insertAdjacentHTML('beforeend', ids.map(function (i) {
              return '<span class="img-cell"><i class="thumb" data-img="' + i + '"></i><b data-act="del" data-i="' + i + '">×</b></span>';
            }).join(''));
            Common.fillImages(g);
          } else {
            var t = $('.thumb', host); t.setAttribute('data-img', host._v); Common.fillImages(host);
          }
          toast('已上传 ' + ids.length + ' 张');
        });
        fi.value = '';
      };
    });
    $$('.f-img [data-act=clear]', scope).forEach(function (b) {
      b.onclick = function () {
        var host = b.closest('.f-img'); host._v = '';
        var t = $('.thumb', host); t.removeAttribute('data-img'); t.style.backgroundImage = ''; t.className = 'thumb';
      };
    });
    $$('.f-imgmulti [data-act=del]', scope).forEach(function (b) {
      b.onclick = function () {
        var host = b.closest('.f-imgmulti');
        var id = b.getAttribute('data-i');
        host._v = (host._v || []).filter(function (x) { return x !== id; });
        b.parentNode.remove();
      };
    });
  }

  /* 在 Markdown 正文光标处插入本地图片（语法 ![](img:ID)，发布后云端也能解析） */
  function bindImageInserter(box, upd) {
    var btn = $('#f_insimg', box), pop = $('#f_imgpop', box), ta = $('#f_body', box);
    if (!btn) return;
    btn.onclick = function () {
      var imgs = (Store.load().images || []).slice().reverse();
      if (!imgs.length) { toast('图片库还没有图，先到「图片库」标签上传'); return; }
      pop.innerHTML = '<div class="img-pop-h">点击插入到正文光标处</div>' +
        imgs.map(function (o) {
          return '<span class="img-cell" data-ins="' + esc(o.id) + '"><i class="thumb" data-img="' + esc(o.id) + '"></i></span>';
        }).join('');
      Common.fillImages(pop);
      pop.style.display = pop.style.display === 'none' ? '' : 'none';
      pop.querySelectorAll('[data-ins]').forEach(function (c) {
        c.onclick = function () {
          var id = c.getAttribute('data-ins');
          var token = '![](' + (id.indexOf('img_') === 0 ? 'img:' + id.slice(4) : id) + ')';
          insertAtCursor(ta, token);
          if (upd) upd();
          pop.style.display = 'none';
        };
      });
    };
  }
  function insertAtCursor(ta, text) {
    var s = ta.selectionStart || 0, e = ta.selectionEnd || 0;
    ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
    var p = s + text.length;
    ta.setSelectionRange(p, p); ta.focus();
  }

  /* ---------------- 影音附件编辑器（故事 / 祂的视角 / 目击记录共用） ----------
   * list 为条目上的 media 数组引用，编辑期间直接改写它，由调用方在保存时写回。 */
  function mediaListHTML(list) {
    return list.map(function (m, i) {
      var kind = m.type === 'video' ? '<b class="md-kind">▶ 视频</b>'
               : m.type === 'audio' ? '<b class="md-kind">♪ 音乐</b>'
               : '<b class="md-kind">◈ 图</b>';
      var thumb = (m.type === 'image' && m.id)
        ? '<span class="thumb sm" data-img="' + esc(m.id) + '"></span>'
        : '<span class="md-ico">' + (m.type === 'video' ? '▶' : m.type === 'audio' ? '♪' : '◈') + '</span>';
      return '<div class="sub-item md-item" data-i="' + i + '">' + kind + thumb +
        '<input class="md_cap" placeholder="说明文字" value="' + esc(m.caption || '') + '">' +
        '<span class="md-src">' + esc(m.id ? '本地文件' : (m.url || '')) + '</span>' +
        '<button class="btn mini" data-act="md-up">↑</button>' +
        '<button class="btn mini" data-act="md-dn">↓</button>' +
        '<button class="btn mini" data-act="md-rm">移除</button></div>';
    }).join('');
  }
  function mediaEditorHTML(list) {
    return '<div class="sub-block"><div class="sub-head">影音附件（多图 / 视频 / 音乐）</div>' +
      '<div id="mdList">' + (list.length ? mediaListHTML(list) : '<div class="dim">暂无附件。</div>') + '</div>' +
      '<div class="md-add">' +
      '<select id="md_type"><option value="image">图片</option><option value="video">视频</option><option value="audio">音乐</option></select>' +
      '<input type="file" id="md_file" accept="image/*,video/*,audio/*" multiple>' +
      '<input id="md_url" placeholder="或粘贴外链 https://…">' +
      '<input id="md_cap" placeholder="说明文字">' +
      '<button class="btn mini" data-act="md-go">＋ 加入</button></div>' +
      '<p class="hint">本地上传的文件存在浏览器 IndexedDB 里；视频、音频体积较大，超出浏览器容量时会失败，届时请改用外链。</p>' +
      '</div>';
  }
  function bindMediaEditor(box, list) {
    function draw() {
      var el = $('#mdList', box);
      el.innerHTML = list.length ? mediaListHTML(list) : '<div class="dim">暂无附件。</div>';
      Common.fillImages(el);
      $$('.md-item', el).forEach(function (it) {
        var i = Number(it.getAttribute('data-i'));
        var cap = $('.md_cap', it);
        if (cap) cap.oninput = function () { list[i].caption = cap.value; };
      });
    }
    function move(i, d) {
      var j = i + d;
      if (j < 0 || j >= list.length) return;
      var t = list[i]; list[i] = list[j]; list[j] = t; draw();
    }
    function add() {
      var type = $('#md_type', box).value;
      var files = Array.prototype.slice.call($('#md_file', box).files || []);
      var url = ($('#md_url', box).value || '').trim();
      var cap = ($('#md_cap', box).value || '').trim();
      if (url) {
        list.push({ type: type, id: '', url: url, caption: cap });
        $('#md_url', box).value = ''; $('#md_cap', box).value = ''; $('#md_file', box).value = '';
        draw(); toast('已加入外链');
        return;
      }
      if (!files.length) { toast('先选择文件，或填写外链'); return; }
      var jobs = files.map(function (f) {
        if (/^image\//.test(f.type)) {
          return Store.putImage(f).then(function (id) { return { type: 'image', id: id, url: '', caption: cap }; });
        }
        if (/^(video|audio)\//.test(f.type)) {
          var t = /^video\//.test(f.type) ? 'video' : 'audio';
          return Store.putMedia(f).then(function (id) { return { type: t, id: id, url: '', caption: cap }; })
            .catch(function () { toast('「' + f.name + '」太大，浏览器存不下，请改用外链'); return null; });
        }
        return Promise.resolve(null);
      });
      Promise.all(jobs).then(function (arr) {
        var n = 0;
        arr.forEach(function (x) { if (x) { list.push(x); n++; } });
        $('#md_file', box).value = ''; $('#md_cap', box).value = '';
        draw(); Store.markDirty();
        if (n) toast('已加入 ' + n + ' 个附件');
      });
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act^=md-]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'md-go') { add(); return; }
      var it = b.closest('.md-item');
      var i = it ? Number(it.getAttribute('data-i')) : -1;
      if (act === 'md-rm') { list.splice(i, 1); draw(); }
      else if (act === 'md-up') move(i, -1);
      else if (act === 'md-dn') move(i, 1);
    });
    draw();
  }

  /* ---------------- 文章 / 笔记编辑器 ---------------- */
  function renderArticles(host, kind) {
    var s = Store.load();
    var all = (s.articles || []).filter(function (a) { return (a.kind || 'story') === kind; });
    var list = sortA(all);
    host.innerHTML = '<div class="sec-head"><span class="sec-num">' + (kind === 'note' ? '祂的笔记' : '故事') + '</span>' +
      '<span class="sec-title">' + list.length + ' 篇</span></div>' +
      '<div class="row"><button class="btn primary" id="new">＋ 新建</button></div>' +
      '<div class="list">' + list.map(function (a) {
        var i = s.articles.indexOf(a);
        return '<div class="list-item" data-i="' + i + '">' +
          '<div class="li-main"><strong>' + (a.pinned ? '★ ' : '') + esc(a.title) + '</strong>' +
          '<span>' + esc([a.era, a.region, Store.medium(a.medium).name].filter(Boolean).join(' · ')) + '</span></div>' +
          '<div class="mini"><button data-act="edit">编辑</button><button data-act="del">删除</button></div></div>';
      }).join('') + '</div><div id="formBox"></div>';

    $('#new', host).onclick = function () {
      var a = {
        id: Store.uid('a'), kind: kind, title: '新' + (kind === 'note' ? '笔记' : '故事'), subtitle: '',
        coverType: 'title', coverQuote: '', coverImage: '',
        medium: 'thread', era: '', region: '', year: '', tags: [], avatarIds: [], body: '', media: [],
        pinned: false, createdAt: Date.now(), updatedAt: Date.now()
      };
      Store.load().articles.unshift(a); Store.markDirty(); Store.save();
      editArticle(host, kind, 0);
    };
    $$('.list-item', host).forEach(function (it) {
      var i = Number(it.getAttribute('data-i'));
      $$('button', it).forEach(function (b) {
        b.onclick = function () {
          if (b.getAttribute('data-act') === 'edit') editArticle(host, kind, i);
          else {
            if (!confirm('删除这篇？')) return;
            Store.load().articles.splice(i, 1); Store.markDirty(); Store.save(); renderArticles(host, kind);
          }
        };
      });
    });
  }

  function editArticle(host, kind, idx, rerender) {
    rerender = rerender || function () { renderArticles(host, kind); };
    var s = Store.load();
    var a = s.articles[idx];
    var box = $('#formBox', host);
    var MED = Store.MEDIUMS;
    var avs = (s.relations || []).filter(Common.isAvatar);

    var med = (a.media || []).slice();
    var medHTML = mediaEditorHTML(med);

    box.innerHTML = '<div class="editor-card">' +
      '<div class="grid2">' +
      '<label><span>标题</span><input id="f_title" value="' + esc(a.title) + '"></label>' +
      '<label><span>副标题</span><input id="f_sub" value="' + esc(a.subtitle || '') + '"></label>' +
      '</div>' +
      '<div class="grid3">' +
      '<label><span>载体（书籍形态）</span><select id="f_med">' +
      MED.map(function (m) { return '<option value="' + m.id + '"' + (a.medium === m.id ? ' selected' : '') + '>' + esc(m.name) + '　·　' + esc(m.region) + '</option>'; }).join('') +
      '</select></label>' +
      '<label><span>时代</span><input id="f_era" value="' + esc(a.era || '') + '"></label>' +
      '<label><span>地区 / 国家</span><input id="f_region" value="' + esc(a.region || '') + '"></label>' +
      '</div>' +
      '<div class="grid3">' +
      '<label><span>封面形式</span><select id="f_ct">' +
      [['title', '题名卡'], ['quote', '重点句'], ['image', '插画']].map(function (x) {
        return '<option value="' + x[0] + '"' + (a.coverType === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select></label>' +
      '<label><span>重点句（quote 时用）</span><input id="f_cq" value="' + esc(a.coverQuote || '') + '"></label>' +
      '<div class="f-img" id="f_ci_w"><span>封面图（image 时用）</span><div class="img-pick">' +
      '<span class="thumb" data-img="' + esc(a.coverImage || '') + '"></span>' +
      '<input type="file" accept="image/*"><button class="btn mini" data-act="clear">清除</button></div></div>' +
      '</div>' +
      '<div class="grid2">' +
      '<label><span>标签（逗号分隔）</span><input id="f_tags" value="' + esc((a.tags || []).join(',')) + '"></label>' +
      '<label><span>关联马甲</span><div class="chk">' + avs.map(function (r) {
        return '<label><input type="checkbox" class="f_av" value="' + esc(r.id) + '"' + ((a.avatarIds || []).indexOf(r.id) >= 0 ? ' checked' : '') + '>' + esc(r.name) + '</label>';
      }).join('') + '</div></label>' +
      '</div>' +
      '<label class="f-bool"><span>置顶</span><input type="checkbox" id="f_pin"' + (a.pinned ? ' checked' : '') + '></label>' +
      '<div class="editor"><div class="ed-col"><span class="lbl">Markdown 正文</span>' +
      '<div class="md-bar"><button class="btn mini" id="f_insimg" type="button">🖼 插入图片</button>' +
      '<span class="dim">（从图片库选一张，插入到光标处）</span></div>' +
      '<textarea id="f_body" class="md">' + esc(a.body || '') + '</textarea>' +
      '<div class="img-pop" id="f_imgpop" style="display:none"></div></div>' +
      '<div class="ed-col"><span class="lbl">预览</span><div class="preview md-body" id="pv"></div></div></div>' +
      '<p class="hint">语法：# 标题、**粗**、*斜*、&gt; 引用、- 列表、--- 分割线、::题记::、{{夹注}}、%%朱批%%</p>' +
      medHTML +
      '<div class="row"><button class="btn primary" id="sv">保存</button><button class="btn" id="cc">关闭</button>' +
      '<a class="btn" target="_blank" href="read.html?id=' + encodeURIComponent(a.id) + '">预览页面 ↗</a></div>' +
      '</div>';

    scrollIn(box);
    var fci = $('#f_ci_w', box); fci._v = a.coverImage || '';
    Common.fillImages(box); bindUploads(box);
    bindMediaEditor(box, med);

    var pv = $('#pv', box), ta = $('#f_body', box);
    var upd = function () { pv.innerHTML = MD.parse(ta.value); Common.fillImages(pv); };
    ta.oninput = upd; upd();
    bindImageInserter(box, upd);

    $('#cc', box).onclick = function () { box.innerHTML = ''; };
    $('#sv', box).onclick = function () {
      var d = Store.load();
      a.title = $('#f_title', box).value || '无题';
      a.subtitle = $('#f_sub', box).value;
      a.medium = $('#f_med', box).value;
      a.era = $('#f_era', box).value;
      a.region = $('#f_region', box).value;
      a.coverType = $('#f_ct', box).value;
      a.coverQuote = $('#f_cq', box).value;
      a.coverImage = fci._v || '';
      a.tags = $('#f_tags', box).value.split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
      a.avatarIds = $$('.f_av:checked', box).map(function (x) { return x.value; });
      a.pinned = $('#f_pin', box).checked;
      a.body = ta.value;
      a.media = med;
      a.updatedAt = Date.now();
      Store.markDirty();
      if (Store.save()) { toast('已保存'); rerender(); }
    };
  }

  /* ---------------- 目击记录编辑器 ---------------- */
  function renderMisreads(host) {
    var s = Store.load();
    var list = s.misreads || [];
    host.innerHTML = '<div class="sec-head"><span class="sec-num">目击记录</span><span class="sec-title">' + list.length + ' 条</span></div>' +
      '<p class="hint">「历史误读」= 记载失真，可分版本对照；「诋毁与冠名混乱」= 恶意诋毁与张冠李戴，可挂多个故事并回链到祂自己的笔记。</p>' +
      '<div class="row"><button class="btn primary" id="new">＋ 新建</button></div>' +
      '<div class="list">' + list.map(function (m, i) {
        return '<div class="list-item" data-i="' + i + '"><div class="li-main"><strong>' +
          (m.kind === 'slander' ? '[诋毁 / 冠名] ' : '[误读] ') + esc(m.title) + '</strong>' +
          '<span>' + esc([m.era, m.region].filter(Boolean).join(' · ')) + '　·　' + esc(m.summary || '') + '</span></div>' +
          '<div class="mini"><button data-act="edit">编辑</button><button data-act="del">删除</button></div></div>';
      }).join('') + '</div><div id="formBox"></div>';

    $('#new', host).onclick = function () {
      var m = { id: Store.uid('m'), kind: 'misread', title: '新条目', era: '', region: '', summary: '', tags: [], versions: [], refs: [], media: [], noteId: '', storyIds: [] };
      Store.load().misreads.unshift(m); Store.markDirty(); Store.save(); editMisread(host, 0);
    };
    $$('.list-item', host).forEach(function (it) {
      var i = Number(it.getAttribute('data-i'));
      $$('button', it).forEach(function (b) {
        b.onclick = function () {
          if (b.getAttribute('data-act') === 'edit') editMisread(host, i);
          else {
            if (!confirm('删除这条？')) return;
            Store.load().misreads.splice(i, 1); Store.markDirty(); Store.save(); renderMisreads(host);
          }
        };
      });
    });
  }

  /* ---------------- 故事全列表（合并故事 / 祂的视角 / 目击记录） ---------------- */
  function renderAllReadables(host) {
    var s = Store.load();
    var arts = (s.articles || []).map(function (a, i) {
      return { _src: (a.kind || 'story') === 'note' ? 'note' : 'story', _i: i, _o: a };
    });
    var mis = (s.misreads || []).map(function (m, i) {
      return { _src: (m.kind || 'misread') === 'slander' ? 'slander' : 'misread', _i: i, _o: m };
    });
    var items = arts.concat(mis).sort(function (x, y) { return (y._o.updatedAt || 0) - (x._o.updatedAt || 0); });

    var srcs = [['all', '全部'], ['story', '故事'], ['note', '祂的视角'], ['misread', '历史误读'], ['slander', '诋毁与冠名混乱']];
    var cur = 'all';

    function segHTML() {
      return '<div class="seg">' + srcs.map(function (x) {
        return '<button data-src="' + x[0] + '"' + (x[0] === cur ? ' class="on"' : '') + '>' + x[1] + '</button>';
      }).join('') + '</div>';
    }

    function draw() {
      var list = cur === 'all' ? items : items.filter(function (it) { return it._src === cur; });
      host.innerHTML = '<div class="sec-head"><span class="sec-num">故事全列表</span><span class="sec-title">' + items.length + ' 条</span></div>' +
        '<p class="hint">故事 · 祂的视角（笔记）· 目击记录（历史误读 / 诋毁与冠名混乱）统一在此管理。可下钻到「祂的踪迹」「祂的马甲」「关系网」交叉查看。</p>' +
        '<div class="row">' + segHTML() + '<button class="btn primary" id="new">＋ 新建</button></div>' +
        '<div class="list">' + list.map(function (it) {
          var o = it._o;
          var label = Store.SRC_LABEL[it._src] || it._src;
          var meta;
          if (it._src === 'misread' || it._src === 'slander') meta = [o.era, o.region, o.summary].filter(Boolean).join('　·　');
          else meta = [o.era, o.region, Store.medium(o.medium).name].filter(Boolean).join('　·　');
          return '<div class="list-item" data-src="' + it._src + '" data-i="' + it._i + '">' +
            '<div class="li-main"><span class="src-tag">' + label + '</span>' + (o.pinned ? ' <strong>★ </strong>' : '') +
            '<strong>' + esc(o.title) + '</strong><span>' + esc(meta) + '</span></div>' +
            '<div class="mini"><button data-act="edit">编辑</button><button data-act="del">删除</button></div></div>';
        }).join('') + '</div><div id="formBox"></div>';

      $$('.seg button', host).forEach(function (b) {
        b.onclick = function () { cur = b.getAttribute('data-src'); draw(); };
      });
      $('#new', host).onclick = newItem;
      bindList();
    }

    function newItem() {
      var types = [['story', '故事'], ['note', '祂的视角（笔记）'], ['misread', '历史误读'], ['slander', '诋毁与冠名混乱']];
      var pick = prompt('新建哪种？\n' + types.map(function (x, i) { return (i + 1) + '. ' + x[1]; }).join('\n'), '1');
      if (pick == null) return;
      var idx = parseInt(pick, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= types.length) return;
      var kind = types[idx][0];
      var d = Store.load();
      if (kind === 'story' || kind === 'note') {
        var a = {
          id: Store.uid('a'), kind: kind, title: '新' + (kind === 'note' ? '笔记' : '故事'), subtitle: '',
          coverType: 'title', coverQuote: '', coverImage: '',
          medium: 'thread', era: '', region: '', year: '', tags: [], avatarIds: [], body: '', media: [],
          pinned: false, createdAt: Date.now(), updatedAt: Date.now()
        };
        d.articles.unshift(a); Store.markDirty(); Store.save();
        editArticle(host, kind, d.articles.indexOf(a), function () { renderAllReadables(host); });
      } else {
        var m = { id: Store.uid('m'), kind: kind, title: '新条目', era: '', region: '', summary: '', tags: [], versions: [], refs: [], media: [], noteId: '', storyIds: [] };
        d.misreads.unshift(m); Store.markDirty(); Store.save();
        editMisread(host, d.misreads.indexOf(m), function () { renderAllReadables(host); });
      }
    }

    function bindList() {
      $$('.list-item', host).forEach(function (it) {
        var src = it.getAttribute('data-src'), i = Number(it.getAttribute('data-i'));
        $$('button', it).forEach(function (b) {
          b.onclick = function () {
            if (b.getAttribute('data-act') === 'edit') {
              if (src === 'misread' || src === 'slander') editMisread(host, i, function () { renderAllReadables(host); });
              else editArticle(host, src, i, function () { renderAllReadables(host); });
            } else {
              if (!confirm('删除这条？')) return;
              if (src === 'misread' || src === 'slander') Store.load().misreads.splice(i, 1);
              else Store.load().articles.splice(i, 1);
              Store.markDirty(); Store.save(); draw();
            }
          };
        });
      });
    }

    draw();
  }

  function editMisread(host, idx, rerender) {
    rerender = rerender || function () { renderMisreads(host); };
    var s = Store.load();
    var m = s.misreads[idx];
    var box = $('#formBox', host);
    var arts = sortA(s.articles || []);

    var verHTML = (m.versions || []).map(function (v, i) {
      return '<div class="sub-item" data-i="' + i + '"><input class="v_l" placeholder="版本名" value="' + esc(v.label) + '">' +
        '<textarea class="v_b" placeholder="这一版的记载">' + esc(v.body || '') + '</textarea>' +
        '<button class="btn mini" data-act="rm">移除</button></div>';
    }).join('');
    var refHTML = (m.refs || []).map(function (r, i) {
      return '<div class="sub-item" data-i="' + i + '"><input class="r_l" placeholder="来源名" value="' + esc(r.label) + '">' +
        '<input class="r_u" placeholder="https://" value="' + esc(r.url || '') + '">' +
        '<button class="btn mini" data-act="rm">移除</button></div>';
    }).join('');

    var med = (m.media || []).slice();
    var medHTML = mediaEditorHTML(med);

    box.innerHTML = '<div class="editor-card">' +
      '<div class="grid2">' +
      '<label><span>标题</span><input id="m_t" value="' + esc(m.title) + '"></label>' +
      '<label><span>类型</span><select id="m_k">' + MISREAD_KINDS.map(function (x) {
        return '<option value="' + x.v + '"' + (m.kind === x.v ? ' selected' : '') + '>' + x.t + '</option>';
      }).join('') + '</select></label>' +
      '</div>' +
      '<div class="grid3">' +
      '<label><span>时代</span><input id="m_era" value="' + esc(m.era || '') + '"></label>' +
      '<label><span>地区</span><input id="m_reg" value="' + esc(m.region || '') + '"></label>' +
      '<label><span>标签（逗号分隔）</span><input id="m_tags" value="' + esc((m.tags || []).join(',')) + '"></label>' +
      '</div>' +
      '<label><span>一句话结论</span><textarea id="m_sum">' + esc(m.summary || '') + '</textarea></label>' +
      '<div class="sub-block"><div class="sub-head">失真的记载（可分版本）<button class="btn mini" id="addV">＋</button></div>' +
      '<div id="vList">' + verHTML + '</div></div>' +
      '<div class="sub-block"><div class="sub-head">现实史料外链 / 参考来源<button class="btn mini" id="addR">＋</button></div>' +
      '<div id="rList">' + refHTML + '</div></div>' +
      '<div class="grid2">' +
      '<label><span>对应的阿赫特笔记（回链）</span><select id="m_note"><option value="">（无）</option>' +
      arts.map(function (a) { return '<option value="' + esc(a.id) + '"' + (m.noteId === a.id ? ' selected' : '') + '>' + esc((a.kind === 'note' ? '[笔记] ' : '') + a.title) + '</option>'; }).join('') +
      '</select></label>' +
      '<label><span>相关故事</span><div class="chk">' + arts.map(function (a) {
        return '<label><input type="checkbox" class="m_st" value="' + esc(a.id) + '"' + ((m.storyIds || []).indexOf(a.id) >= 0 ? ' checked' : '') + '>' + esc(a.title) + '</label>';
      }).join('') + '</div></label>' +
      '</div>' +
      medHTML +
      '<div class="row"><button class="btn primary" id="sv">保存</button><button class="btn" id="cc">关闭</button></div></div>';

    scrollIn(box);
    bindMediaEditor(box, med);
    $('#addV', box).onclick = function () {
      $('#vList', box).insertAdjacentHTML('beforeend',
        '<div class="sub-item"><input class="v_l" placeholder="版本名"><textarea class="v_b" placeholder="这一版的记载"></textarea><button class="btn mini" data-act="rm">移除</button></div>');
    };
    $('#addR', box).onclick = function () {
      $('#rList', box).insertAdjacentHTML('beforeend',
        '<div class="sub-item"><input class="r_l" placeholder="来源名"><input class="r_u" placeholder="https://"><button class="btn mini" data-act="rm">移除</button></div>');
    };
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act=rm]');
      if (b) b.parentNode.remove();
    });
    $('#cc', box).onclick = function () { box.innerHTML = ''; };
    $('#sv', box).onclick = function () {
      m.title = $('#m_t', box).value || '无题';
      m.kind = $('#m_k', box).value;
      m.era = $('#m_era', box).value;
      m.region = $('#m_reg', box).value;
      m.tags = $('#m_tags', box).value.split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
      m.summary = $('#m_sum', box).value;
      m.versions = $$('#vList .sub-item', box).map(function (d) {
        return { label: $('.v_l', d).value, body: $('.v_b', d).value };
      }).filter(function (v) { return v.label || v.body; });
      m.refs = $$('#rList .sub-item', box).map(function (d) {
        return { label: $('.r_l', d).value, url: $('.r_u', d).value };
      }).filter(function (r) { return r.label || r.url; });
      m.noteId = $('#m_note', box).value;
      m.storyIds = $$('.m_st:checked', box).map(function (x) { return x.value; });
      m.media = med;
      Store.markDirty();
      if (Store.save()) { toast('已保存'); rerender(); }
    };
  }

  /* ---------------- 站点 / 档案 ---------------- */
  function renderSite(host) {
    var s = Store.load();
    host.innerHTML = '<div class="sec-head"><span class="sec-num">站点</span><span class="sec-title">标题与说明</span></div>' +
      '<div class="grid2">' +
      '<label><span>站名</span><input data-s="title" value="' + esc(s.site.title) + '"></label>' +
      '<label><span>副标题</span><input data-s="sub" value="' + esc(s.site.sub) + '"></label>' +
      '<label><span>印记字</span><input data-s="seal" value="' + esc(s.site.seal) + '"></label>' +
      '</div>' +
      '<label><span>首页引言</span><textarea data-s="intro">' + esc(s.site.intro) + '</textarea></label>' +
      '<label><span>关于页正文（Markdown）</span><textarea class="md" data-s="about">' + esc(s.site.about) + '</textarea></label>' +
      '<div class="sec-head"><span class="sec-num">档案</span><span class="sec-title">身份 / 性格 / 外貌 / 经历</span></div>' +
      '<div class="grid2">' +
      '<label><span>姓名</span><input data-p="name" value="' + esc(s.profile.name) + '"></label>' +
      '<label><span>称号</span><input data-p="alias" value="' + esc(s.profile.alias) + '"></label>' +
      '<label><span>一句话</span><input data-p="quote" value="' + esc(s.profile.quote) + '"></label>' +
      '</div>' +
      '<label><span>身份</span><textarea data-p="identity">' + esc(s.profile.identity) + '</textarea></label>' +
      '<label><span>性格</span><textarea data-p="personality">' + esc(s.profile.personality) + '</textarea></label>' +
      '<label><span>外貌</span><textarea data-p="appearance">' + esc(s.profile.appearance) + '</textarea></label>' +
      '<label><span>主要经历</span><textarea data-p="bio">' + esc(s.profile.bio) + '</textarea></label>' +
      '<div class="sub-block"><div class="sub-head">自定义字段（前台档案表逐行显示）<button class="btn mini" id="addF">＋</button></div>' +
      '<div id="fList">' + (s.profile.fields || []).map(function (f, i) {
        return '<div class="sub-item" data-i="' + i + '"><input class="f_k" placeholder="字段名" value="' + esc(f.k) + '">' +
          '<textarea class="f_v" placeholder="内容">' + esc(f.v) + '</textarea>' +
          '<button class="btn mini" data-act="rmf">移除</button></div>';
      }).join('') + '</div></div>' +
      '<div class="row"><button class="btn primary" id="sv">保存</button></div>';

    $('#addF', host).onclick = function () {
      $('#fList', host).insertAdjacentHTML('beforeend',
        '<div class="sub-item"><input class="f_k" placeholder="字段名"><textarea class="f_v" placeholder="内容"></textarea><button class="btn mini" data-act="rmf">移除</button></div>');
    };
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act=rmf]');
      if (b) b.parentNode.remove();
    });
    $('#sv', host).onclick = function () {
      var d = Store.load();
      $$('[data-s]', host).forEach(function (n) { d.site[n.getAttribute('data-s')] = n.value; });
      $$('[data-p]', host).forEach(function (n) { d.profile[n.getAttribute('data-p')] = n.value; });
      d.profile.fields = $$('#fList .sub-item', host).map(function (el) {
        return { k: $('.f_k', el).value, v: $('.f_v', el).value };
      }).filter(function (f) { return f.k || f.v; });
      Store.markDirty();
      if (Store.save()) toast('已保存');
    };
  }

  function renderPortrait(host) {
    var s = Store.load();
    var pf = s.profile;
    host.innerHTML = '<div class="sec-head"><span class="sec-num">主视觉</span><span class="sec-title">首页人物插图</span></div>' +
      '<div class="f-img" id="pf_w"><span>首页主视觉图</span><div class="img-pick">' +
      '<span class="thumb big" data-img="' + esc(pf.portrait || '') + '"></span>' +
      '<input type="file" accept="image/*"><button class="btn mini" data-act="clear">清除</button></div></div>' +
      '<div class="row"><button class="btn primary" id="sv">保存</button></div>';
    var w = $('#pf_w', host); w._v = pf.portrait || '';
    Common.fillImages(host); bindUploads(host);
    $('#sv', host).onclick = function () {
      Store.load().profile.portrait = w._v || '';
      Store.markDirty(); if (Store.save()) toast('已保存');
    };
  }

  /* ---------------- 图片库 ---------------- */
  function renderImages(host) {
    var s = Store.load();
    var imgs = s.images || [];
    host.innerHTML = '<div class="sec-head"><span class="sec-num">图片库</span><span class="sec-title">' + imgs.length + ' 张</span></div>' +
      '<div class="drop" id="drop">把图片拖到这里，或点击选择（自动压到长边 1800px 后存入 IndexedDB）</div>' +
      '<input type="file" id="fi" accept="image/*" multiple hidden>' +
      '<div class="img-grid" id="ig">' + imgs.map(function (o) {
        return '<span class="img-cell"><i class="thumb" data-img="' + esc(o.id) + '"></i>' +
          '<b data-act="delimg" data-i="' + esc(o.id) + '">×</b></span>';
      }).join('') + '</div>';
    Common.fillImages(host);

    var drop = $('#drop', host), fi = $('#fi', host);
    drop.onclick = function () { fi.click(); };
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = function () { drop.classList.remove('over'); };
    drop.ondrop = function (e) {
      e.preventDefault(); drop.classList.remove('over');
      add(Array.prototype.slice.call(e.dataTransfer.files));
    };
    fi.onchange = function () { add(Array.prototype.slice.call(fi.files)); fi.value = ''; };

    function add(files) {
      files = files.filter(function (f) { return /^image\//.test(f.type); });
      if (!files.length) return;
      Promise.all(files.map(Store.putImage)).then(function (ids) {
        var d = Store.load();
        d.images = (d.images || []).concat(ids.map(function (i) { return { id: i, name: 'upload', at: Date.now() }; }));
        Store.markDirty(); Store.save(); renderImages(host);
        toast('已上传 ' + ids.length + ' 张');
      });
    }
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act=delimg]');
      if (!b) return;
      var id = b.getAttribute('data-i');
      var d = Store.load();
      d.images = (d.images || []).filter(function (x) { return x.id !== id; });
      Store.delImage(id); Store.markDirty(); Store.save(); renderImages(host);
    });
  }

  /* ---------------- 备份 ---------------- */
  function renderBackup(host) {
    host.innerHTML = '<div class="sec-head"><span class="sec-num">备份</span><span class="sec-title">导出 / 导入 / 清空</span></div>' +
      '<p class="hint">文字、图片索引都在浏览器本地。换电脑、清缓存前请先导出 JSON。图片本身存在 IndexedDB，导出 JSON 不含图片二进制。</p>' +
      '<div class="row"><button class="btn primary" id="ex">导出 JSON</button>' +
      '<button class="btn" id="cp">复制到剪贴板</button>' +
      '<button class="btn danger" id="rs">恢复种子数据</button></div>' +
      '<label><span>导入 JSON（粘贴后点导入）</span><textarea id="im" class="md" placeholder="把之前导出的 JSON 粘到这里"></textarea></label>' +
      '<div class="row"><button class="btn" id="imgo">导入</button></div>' +
      '<div class="sec-head"><span class="sec-num">访客版</span><span class="sec-title">发布 / 撤销只读快照</span></div>' +
      '<p class="hint">两种发布方式：<b>① 导出只读快照</b>把 snapshot.js 下载下来，覆盖到仓库后由 AI 代上线（适合不想碰后台配置时）；<b>② 发布到云端</b>直接把内容写到站点的 Cloudflare KV，所有访客刷新即见，无需动仓库（需先填下方「发布令牌」，令牌要与 Cloudflare 后台设置的 PUBLISH_TOKEN 一致）。</p>' +
      '<label><span>发布令牌（仅存本机浏览器，不进仓库）</span><input id="tok" class="md" type="password" placeholder="与 Cloudflare 后台 PUBLISH_TOKEN 一致" value="' + esc(localStorage.getItem('aht.pubtok') || '') + '"></label>' +
      '<div class="row"><button class="btn" id="pub">导出只读快照</button>' +
      '<button class="btn primary" id="pubc">发布到云端（一键上线）</button>' +
      '<span id="pubState" class="dim"></span></div>';

    $('#ex', host).onclick = function () {
      var blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'akhet-archive-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
    };
    $('#cp', host).onclick = function () {
      var t = Store.exportJSON();
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('已复制'); });
      else toast('浏览器不支持，请改用导出');
    };
    $('#imgo', host).onclick = function () {
      try { Store.importJSON($('#im', host).value); toast('导入成功'); location.reload(); }
      catch (e) { alert('导入失败：' + e.message); }
    };
    $('#rs', host).onclick = function () {
      if (!confirm('会用内置种子覆盖当前全部本地数据，确定？')) return;
      localStorage.removeItem('aht.v1'); location.reload();
    };
    var snap = window.SNAPSHOT ? '已发布（' + esc(window.SNAPSHOT.__at || '') + '）' : '未发布（当前站点可编辑）';
    $('#pubState', host).innerHTML = snap;
    $('#tok', host).oninput = function () { localStorage.setItem('aht.pubtok', $('#tok', host).value); };
    $('#pub', host).onclick = function () {
      $('#pubState', host).textContent = '正在打包图片…';
      Store.exportSnapshot().then(function (txt) {
        var blob = new Blob([txt], { type: 'text/javascript' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'snapshot.js';
        a.click();
        $('#pubState', host).innerHTML = '已导出 snapshot.js，覆盖到仓库 assets/js/snapshot.js 后生效';
      }).catch(function (e) {
        $('#pubState', host).textContent = '打包失败：' + (e && e.message || e);
      });
    };
    $('#pubc', host).onclick = function () {
      var tok = $('#tok', host).value;
      if (!tok) { alert('请先填写发布令牌（与 Cloudflare 后台 PUBLISH_TOKEN 一致）'); return; }
      $('#pubState', host).textContent = '正在打包并上传云端…';
      Store.exportCloud().then(function (obj) {
        return AHT_CLOUD.publish(obj, tok);
      }).then(function (r) {
        if (r === 'ok') $('#pubState', host).innerHTML = '已发布到云端 ✅ 访客刷新即见（约数秒）';
        else $('#pubState', host).textContent = '发布失败：' + r;
      }).catch(function (e) {
        $('#pubState', host).textContent = '发布出错：' + (e && e.message || e);
      });
    };
  }

  /* ---------------- toast ---------------- */
  var tt = null;
  function toast(msg) {
    var el = $('.toast') || (function () {
      var d = document.createElement('div'); d.className = 'toast'; document.body.appendChild(d); return d;
    })();
    el.textContent = msg; el.classList.add('on');
    clearTimeout(tt); tt = setTimeout(function () { el.classList.remove('on'); }, 1800);
  }

  /* ---------------- 启动 ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    var appEl = $('#app');
    gate(appEl, function () {
      var TABS = [
        { k: 'site', t: '站点 / 档案', fn: renderSite },
        { k: 'portrait', t: '主视觉', fn: renderPortrait },
        { k: 'eras', t: '时代', fn: function (h) { renderList('eras', h); } },
        { k: 'places', t: '地图标记', fn: function (h) { renderList('places', h); } },
        { k: 'timeline', t: '时间轴', fn: function (h) { renderList('timeline', h); } },
        { k: 'concepts', t: '概念分节点', fn: function (h) { renderList('concepts', h); } },
        { k: 'relations', t: '马甲与关系', fn: function (h) { renderList('relations', h); } },
        { k: 'stories', t: '故事全列表', fn: renderAllReadables },
        { k: 'things', t: '祂的东西', fn: function (h) { renderList('things', h); } },
        { k: 'fans', t: '网友作品', fn: function (h) { renderList('fans', h); } },
        { k: 'gallery', t: '祂的影像', fn: function (h) { renderList('gallery', h); } },
        { k: 'images', t: '图片库', fn: renderImages },
        { k: 'backup', t: '备份', fn: renderBackup }
      ];
      appEl.innerHTML = '<div class="tabs">' + TABS.map(function (x, i) {
        return '<button class="tab' + (i === 0 ? ' on' : '') + '" data-k="' + x.k + '">' + x.t + '</button>';
      }).join('') + '</div><div class="pane on" id="pane"></div>';

      var pane = $('#pane', appEl);
      function open(k) {
        var t = TABS.filter(function (x) { return x.k === k; })[0];
        $$('.tab', appEl).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-k') === k); });
        pane.innerHTML = ''; t.fn(pane);
        location.hash = '#' + k;
      }
      $$('.tab', appEl).forEach(function (b) {
        b.onclick = function () { open(b.getAttribute('data-k')); };
      });
      var h = (location.hash || '').replace('#', '');
      open(TABS.filter(function (x) { return x.k === h; })[0] ? h : 'site');

      // 任何改动都打标，防止后续种子版本覆盖用户数据
      ['input', 'change'].forEach(function (ev) {
        appEl.addEventListener(ev, function () { Store.markDirty(); }, true);
      });
      appEl.addEventListener('click', function (e) {
        if (e.target.closest('.tab')) return;
        Store.markDirty();
      }, true);
    });
  });

  global.Admin = { SCHEMA: SCHEMA };
})(window);
