/* ============ 数据层 ============
 * 文字数据 → localStorage（key: aht.v1）
 * 图片     → IndexedDB（db: aht_imgs），失败自动降级为 base64 存 localStorage
 * 无构建、无外部依赖，双击 HTML 即可运行
 * ================================= */
(function (global) {
  var KEY = 'aht.v1';
  var DBN = 'aht_imgs';
  var STORE = 'images';

  /* 11 套「时代 × 国家」书籍载体 */
  var MEDIUMS = [
    { id: 'clay',       name: '泥板',       era: '青铜时代',   region: '两河流域 · 苏美尔', hint: '楔形文字压印于湿泥板' },
    { id: 'papyrus',    name: '纸莎草卷',   era: '古王国时期', region: '古埃及',            hint: '横展卷轴，圣书体与世俗体' },
    { id: 'bamboo',     name: '竹简',       era: '先秦—汉',    region: '中国',              hint: '竹片编缀，竖排右起漆书' },
    { id: 'silk',       name: '帛书卷轴',   era: '战国—汉',    region: '中国',              hint: '丝帛为纸，卷轴收放' },
    { id: 'thread',     name: '线装古籍',   era: '宋—清',      region: '中国',              hint: '宣纸朱丝栏，版框鱼尾' },
    { id: 'washi',      name: '和纸册子',   era: '平安—江户',  region: '日本',              hint: '和纸纵书，袋缀装帧' },
    { id: 'codex',      name: '羊皮手抄本', era: '中世纪',     region: '欧洲',              hint: '犊皮纸双栏，彩绘首字母' },
    { id: 'palm',       name: '贝叶经',     era: '古代—中古',  region: '南亚 · 东南亚',     hint: '贝叶刻写，穿孔穿绳' },
    { id: 'quipu',      name: '结绳记事',   era: '印加',       region: '安第斯',            hint: '无文字，以绳结记数记事' },
    { id: 'letterpress',name: '铅印平装',   era: '近代',       region: '全球',              hint: '活字排版，机制纸平装' },
    { id: 'modern',     name: '现代电子文本',era: '当代',       region: '全球',              hint: '屏幕阅读，等宽与超链接' },
    { id: 'none',       name: '无载体',       era: '',            region: '',                hint: '纯展示，无书籍形态' }
  ];

  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  var SEED_VERSION = 3; // 种子升级时 +1：用户未手动改过的本地数据会被新种子覆盖（v2：地图标记改真实经纬度；v3：地图标记支持聚合组合并）

  /* ---------- 空数据模板（字段即后台可编辑项） ---------- */
  function blank() {
    return {
      version: SEED_VERSION,
      dirty: false,
      site: {
        title: 'AKHET',
        sub: 'CIVILIZATION · ARCHIVE',
        seal: 'A',
        intro: '',
        about: '',
        heroImage: ''
      },
      profile: {
        name: '阿赫特', alias: 'Akhet · 文明之神', quote: '',
        portrait: '',
        identity: '',   // 身份
        personality: '',// 性格
        appearance: '', // 外貌
        bio: '',        // 主要经历 / 长传
        fields: []      // [{k,v}] 自定义字段
      },
      eras: [],      // 时代（地图随时代切换）[{id,name,range,note}]
      places: [],    // 地图标记 [{id,eraId,name,region,x,y,desc,storyIds:[]}]
      timeline: [],  // 历史时间轴 [{id,eraId,year,title,desc,tag,placeId,link}]
      concepts: [],  // 祂的概念分节点（另一条浏览轴）[{id,order,title,desc,link}]
      relations: [], // 人物关系 / 马甲 [{id,name,role,group,desc,color,portrait,album:[],link,storyIds:[]}]
      articles: [],  // 故事 + 祂的笔记 [{id,kind,title,...}]
      misreads: [],  // 目击记录（历史误读 / 诋毁与冠名混乱）[{id,kind,title,...}]
      things: [],    // 持有物 / 产业 / 作品 [{id,type,name,imageId,desc,tags:[]}]
      fans: [],      // 网友作品 [{id,title,author,imageId,tags:[],url,featured}]
      gallery: [],   // 插画 [{id,title,caption,tags:[],imageId,ratio}]
      images: []     // 图片索引 [{id,name,at}]
    };
  }

  var ARRAYS = ['eras', 'places', 'timeline', 'concepts', 'relations',
                'articles', 'misreads', 'things', 'fans', 'gallery', 'images'];

  /* ---------- 访客版（只读快照） ----------
   * 站点目录里放了 assets/js/snapshot.js（后台「发布」一键生成）时，
   * 访客打开任何页面都会载入它并进入只读：内容照常看，但改不动、也不写本地。
   * 你自己在地址后加 #edit（或后台点「进入编辑模式」）即切回本地可写数据。
   */
  function isReadOnly() {
    return !!global.SNAPSHOT && !/#edit/.test((global.location && global.location.hash) || '');
  }

  /* ---------- 读写 ---------- */
  var cache = null;

  function load() {
    if (cache) return cache;
    if (isReadOnly()) {
      cache = Object.assign(blank(), global.SNAPSHOT);
      cache.__ro = true;
      ARRAYS.forEach(function (k) { if (!Array.isArray(cache[k])) cache[k] = []; });
      return cache;
    }
    try {
      var raw = localStorage.getItem(KEY);
      var d = raw ? JSON.parse(raw) : null;
      if (d && d.version !== SEED_VERSION && !d.dirty) d = null; // 版本落后且没改过 → 用新种子
      if (d) {
        var b = blank();
        cache = Object.assign(b, d);
        cache.version = SEED_VERSION;
        cache.profile = Object.assign(b.profile, d.profile || {});
        cache.site = Object.assign(b.site, d.site || {});
        ARRAYS.forEach(function (k) { if (!Array.isArray(cache[k])) cache[k] = []; });
        if (!Array.isArray(cache.profile.fields)) cache.profile.fields = [];
        return cache;
      }
    } catch (e) { console.warn('读取本地数据失败', e); }
    cache = global.SEED ? mergeSeed(blank()) : blank();
    save();
    return cache;
  }

  function markDirty() {
    load();
    if (cache.dirty || cache.__ro) return;   // 访客版不落盘
    cache.dirty = true;
    save();
  }

  function mergeSeed(b) {
    var s = global.SEED || {};
    Object.keys(s).forEach(function (k) {
      if (k === 'profile' || k === 'site') b[k] = Object.assign(b[k], s[k] || {});
      else b[k] = s[k];
    });
    return b;
  }

  function save() {
    if (cache && cache.__ro) return true;    // 访客版：只读，不写本地
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
      return true;
    } catch (e) {
      alert('本地存储写入失败（可能已满）：' + e.message + '\n建议到后台「备份」导出 JSON 后清理图片。');
      return false;
    }
  }

  function reset(data) {
    if (cache && cache.__ro) return cache;   // 访客版不允许改写数据
    cache = data || blank(); save(); return cache;
  }

  /* ---------- 图片：IndexedDB ---------- */
  var dbp = null;
  function openDB() {
    if (dbp) return dbp;
    dbp = new Promise(function (res) {
      if (!global.indexedDB) return res(null);
      var req;
      try { req = indexedDB.open(DBN, 1); } catch (e) { return res(null); }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { res(null); };
    });
    return dbp;
  }
  function idbPut(id, blob) {
    return openDB().then(function (db) {
      if (!db) throw new Error('no-idb');
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(blob, id);
        tx.oncomplete = function () { res(true); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function idbGet(id) {
    return openDB().then(function (db) {
      if (!db) return null;
      return new Promise(function (res) {
        var tx = db.transaction(STORE, 'readonly');
        var r = tx.objectStore(STORE).get(id);
        r.onsuccess = function () { res(r.result || null); };
        r.onerror = function () { res(null); };
      });
    });
  }
  function idbDel(id) {
    return openDB().then(function (db) {
      if (!db) return;
      return new Promise(function (res) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { res(); };
      });
    });
  }
  function lsPut(id, d) { localStorage.setItem(DBN + ':' + id, d); }
  function lsGet(id) { return localStorage.getItem(DBN + ':' + id); }
  function lsDel(id) { localStorage.removeItem(DBN + ':' + id); }

  /* ---------- 图片压缩 ---------- */
  function compress(file, maxW) {
    maxW = maxW || 1800;
    return new Promise(function (res) {
      if (!/^image\//.test(file.type)) return res(file);
      var img = new Image(), fr = new FileReader();
      fr.onload = function () {
        img.onload = function () {
          var scale = Math.min(1, maxW / img.width);
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (b) { res(b || file); }, 'image/jpeg', 0.86);
        };
        img.onerror = function () { res(file); };
        img.src = fr.result;
      };
      fr.onerror = function () { res(file); };
      fr.readAsDataURL(file);
    });
  }

  var urlCache = {};
  function putImage(file) {
    var id = uid('img');
    return compress(file).then(function (blob) {
      return idbPut(id, blob).catch(function () {
        return new Promise(function (res, rej) {
          var fr = new FileReader();
          fr.onload = function () { lsPut(id, fr.result); res(); };
          fr.onerror = rej;
          fr.readAsDataURL(blob);
        });
      }).then(function () { return id; });
    });
  }
  /* 图片 / 音视频共用：取可播放的 URL（IndexedDB 优先，降级 localStorage，再查快照） */
  function fileURL(id) {
    if (!id) return Promise.resolve('');
    if (urlCache[id]) return Promise.resolve(urlCache[id]);
    var snap = global.SNAPSHOT && global.SNAPSHOT.__imgs;      // 访客版：二进制内嵌在快照里
    if (snap && snap[id]) { urlCache[id] = snap[id]; return Promise.resolve(snap[id]); }
    return idbGet(id).then(function (blob) {
      if (blob) { urlCache[id] = URL.createObjectURL(blob); return urlCache[id]; }
      var d = lsGet(id);
      if (d) { urlCache[id] = d; return d; }
      return '';
    }).catch(function () {
      var d = lsGet(id); if (d) { urlCache[id] = d; return d; } return '';
    });
  }
  function imageURL(id) { return fileURL(id); }
  function mediaURL(id) { return fileURL(id); }

  /* 音视频：不能压缩，原样存二进制。IndexedDB 不可用时降级 localStorage，
   * 本地容量不足会 reject，由后台提示改用外链。 */
  function putMedia(file) {
    var id = uid('med');
    return idbPut(id, file).then(function () { return id; }).catch(function () {
      return new Promise(function (res, rej) {
        var fr = new FileReader();
        fr.onload = function () {
          try { lsPut(id, fr.result); res(id); } catch (e) { rej(e); }
        };
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
    });
  }
  function delMedia(id) { return delImage(id); }
  function delImage(id) {
    if (urlCache[id]) { URL.revokeObjectURL(urlCache[id]); delete urlCache[id]; }
    lsDel(id);
    return idbDel(id);
  }

  /* ---------- 导入导出 ---------- */
  function exportJSON() { return JSON.stringify(load(), null, 2); }
  function importJSON(txt) { reset(JSON.parse(txt)); return load(); }

  /* 生成访客版快照：数据 + 全部图片（base64）打包。buildSnapshot 返回纯对象，
   * exportSnapshot 产出可覆盖 assets/js/snapshot.js 的 JS 文本，exportCloud 供后台 PUT 到云端。 */
  function buildSnapshot() {
    var d = load();
    var ids = {};
    // 收集全部图片引用：封面 / 媒体 / 图片库里的独立 JSON 值（img_xxx / med_xxx），
    // 以及 markdown 正文里嵌的写法（img:xxx / img_xxx / med:xxx / med_xxx 皆可），统一归一为 img_xxx / med_xxx。
    JSON.stringify(d).replace(/(img|med)[:_]([A-Za-z0-9]+)/g, function (m, p, suf) {
      ids[p.toLowerCase() + '_' + suf] = 1; return m;
    });
    var jobs = Object.keys(ids).map(function (id) {
      return idbGet(id).then(function (blob) {
        if (!blob) { var b = lsGet(id); return b ? [id, b] : null; }
        return new Promise(function (res) {
          var fr = new FileReader();
          fr.onload = function () { res([id, fr.result]); };
          fr.onerror = function () { res(null); };
          fr.readAsDataURL(blob);
        });
      }).catch(function () { return null; });
    });
    return Promise.all(jobs).then(function (list) {
      var imgs = {};
      list.forEach(function (x) { if (x) imgs[x[0]] = x[1]; });
      var out = JSON.parse(JSON.stringify(d));
      out.__imgs = imgs;
      out.__at = new Date().toISOString().slice(0, 10);
      delete out.dirty; delete out.version;
      return out;
    });
  }
  /* 生成可覆盖 assets/js/snapshot.js 的访客版快照文件 */
  function exportSnapshot() {
    return buildSnapshot().then(function (out) {
      return '/* 访客版快照 —— 由后台「发布」生成（' + out.__at + '）\n' +
        ' * 本文件存在时，全站只读：内容照常浏览，但改不动数据。\n' +
        ' * 管理员在网址后加 #edit（或后台点「进入编辑模式」）即切回本地可写数据。\n' +
        ' * 更新内容后，在后台重新导出并覆盖本文件即可。 */\n' +
        'window.SNAPSHOT = ' + JSON.stringify(out) + ';\n';
    });
  }
  /* 云端发布用的纯数据对象（不含 JS 包装） */
  function exportCloud() { return buildSnapshot(); }

  /* ---------- 辅助 ---------- */
  function medium(id) {
    for (var i = 0; i < MEDIUMS.length; i++) if (MEDIUMS[i].id === id) return MEDIUMS[i];
    return { id: id || 'thread', name: '纸页', era: '', region: '', hint: '' };
  }
  function allTags(keys) {
    var s = {};
    (keys || ['articles', 'gallery', 'things', 'fans', 'misreads']).forEach(function (k) {
      (load()[k] || []).forEach(function (it) {
        (it.tags || []).forEach(function (t) { s[t] = (s[t] || 0) + 1; });
      });
    });
    return Object.keys(s).sort(function (a, b) { return s[b] - s[a]; });
  }
  function byId(coll, id) {
    var l = load()[coll] || [];
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }
  function stories() {
    return (load().articles || []).filter(function (a) { return (a.kind || 'story') === 'story'; });
  }
  function notes() {
    return (load().articles || []).filter(function (a) { return a.kind === 'note'; });
  }

  /* ---------- 全站可读条目的统一视图 ----------
   * 「故事全列表」不是「故事的列表」，而是所有可读条目的总目录，收录四类来源：
   *   story   —— 故事（articles.kind === 'story'，缺省亦视为 story）
   *   note    —— 祂的视角里的笔记（articles.kind === 'note'）
   *   misread —— 目击记录 · 历史误读
   *   slander —— 目击记录 · 诋毁与冠名混乱
   * 四类之间可以互相关联（misread.storyIds / misread.noteId），
   * 也可以彼此都没有对方——只被故事记下的事，不会因此进不了这张表。
   * 统一后每条都带 _src / _label / _href，便于同一面封面墙渲染与筛选。
   */
  var SRC_LABEL = { story: '故事', note: '祂的视角', misread: '历史误读', slander: '诋毁与冠名混乱' };

  function readables() {
    var d = load(), out = [];
    (d.articles || []).forEach(function (a) {
      var k = (a.kind || 'story') === 'note' ? 'note' : 'story';
      var o = Object.assign({}, a);
      o._src = k;
      o._label = SRC_LABEL[k];
      o._href = 'read.html?id=' + encodeURIComponent(a.id);
      if (!o.tags) o.tags = [];
      out.push(o);
    });
    (d.misreads || []).forEach(function (m) {
      var k = (m.kind || 'misread') === 'slander' ? 'slander' : 'misread';
      var o = Object.assign({}, m);
      o._src = k;
      o._label = SRC_LABEL[k];
      o._href = 'misread.html?id=' + encodeURIComponent(m.id);
      if (!o.tags) o.tags = [];
      out.push(o);
    });
    return out;
  }

  /* 是否与另一类条目互相关联（用于「独立条目」筛选） */
  function crossLinked(o) {
    if (o._src === 'misread' || o._src === 'slander') {
      return !!((o.storyIds || []).length || o.noteId);
    }
    var d = load();
    return (d.misreads || []).some(function (m) {
      return m.noteId === o.id || (m.storyIds || []).indexOf(o.id) >= 0;
    });
  }

  global.Store = {
    MEDIUMS: MEDIUMS, uid: uid, blank: blank, ARRAYS: ARRAYS,
    SRC_LABEL: SRC_LABEL,
    load: load, save: save, reset: reset, markDirty: markDirty,
    putImage: putImage, imageURL: imageURL, delImage: delImage,
    putMedia: putMedia, mediaURL: mediaURL, delMedia: delMedia,
    exportJSON: exportJSON, importJSON: importJSON, exportSnapshot: exportSnapshot, exportCloud: exportCloud,
    isReadOnly: isReadOnly,
    medium: medium, allTags: allTags, byId: byId,
    stories: stories, notes: notes, readables: readables, crossLinked: crossLinked
  };
})(window);
