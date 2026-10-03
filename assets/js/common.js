/* ============ 前台公共逻辑 ============
 * 导航 / 马甲配色（仅供马甲详情页） / 等高线底纹 / 图片填充 / 封面卡 / 标签筛选
 * 马甲列表只出现在「祂的马甲」页，顶部不再重复渲染切换条。
 * ===================================== */
(function (global) {
  var NAV = [
    { key: 'home',      href: 'index.html',    text: '首页' },
    { key: 'story',     href: 'story.html',    text: '祂的踪迹' },
    { key: 'avatars',   href: 'avatars.html',  text: '祂的马甲' },
    { key: 'view',      href: 'view.html',     text: '祂的视角' },
    { key: 'record',    href: 'record.html',   text: '目击记录' },
    { key: 'relations', href: 'relations.html',text: '关系网' },
    { key: 'things',    href: 'things.html',   text: '祂的东西' },
    { key: 'stories',   href: 'stories.html',  text: '故事全列表' },
    { key: 'fanworks',  href: 'fanworks.html', text: '网友作品' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  /* ---------- 页面语义底纹：每种页面配一种与内容呼应的线纹 ----------
   * story/about = 等高线（呼应「祂的踪迹」的地图）
   * avatars     = 印章框（马甲 = 一枚枚印）
   * view/read   = 稿纸界行（竖排稿纸的界栏）
   * record     = 划改线（被后人改错的目击记录）
   * relations  = 星座连线（关系网）
   * things     = 陈列格（博物馆展柜）
   * stories    = 书脊（书的目录）
   * fanworks   = 半调网点（印刷品）
   * gallery    = 胶片齿孔（插画 = 一格一格的底片）
   * 全部只用 currentColor，透明度交给 CSS，跟着马甲主色走。 */
  function texRng(seed) {
    var st = (seed >>> 0) || 1;
    return function () { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
  }

  /* ---------- 页面底纹 ----------
   * 每个页面一种与内容呼应的线纹，全部只用 currentColor，透明度交给 CSS。
   *   view      = 等高线（祂的视角，与首页 hero 同一套 contour 算法）
   *   story     = 路网 · 脚印 · 铁轨 · 枕木（祂的踪迹）
   *   record    = 碎纸与裂纹（目击记录 / 历史误读）
   *   avatars   = 空的人形 + 问号（马甲 = 身份悬念）
   *   things    = 宅邸外观线框（祂的东西）
   *   stories   = 中文作文纸：字格行+窄行交替（故事全列表）
   *   fanworks  = 四芒星平铺（网友作品）
   *   relations = 星座连线（关系网）
   *   about     = 等高线（关于本站）
   *   gallery   = 胶片齿孔（插画 = 一格一格的底片）
   * 图案由固定种子生成，同一页面每次渲染完全一致。 */
  function pageTex(key) {
    if (key === 'home') return ''; /* 首页 hero 已有等高线，不再叠页面底纹 */
    var W = 1440, H = 900, i, j, k, x, y, inner = '', wob = false, extra = '';
    var rnd = texRng(1013 + String(key).length * 7717);

    /* 二次贝塞尔采样与法向偏移：给「祂的踪迹」的路网排布枕木与脚印 */
    function qpt(a, b, c, t) {
      var u = 1 - t;
      return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0],
              u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]];
    }
    function sampleSegs(segs, n) {
      var out = [];
      for (i = 0; i < segs.length; i++) {
        for (j = 0; j < n; j++) out.push(qpt(segs[i][0], segs[i][1], segs[i][2], j / n));
      }
      out.push(segs[segs.length - 1][2]);
      return out;
    }
    function offsetPts(pts, d) {
      var o = [], n = pts.length;
      for (i = 0; i < n; i++) {
        var p = pts[i], q = pts[Math.min(i + 1, n - 1)], r = pts[Math.max(i - 1, 0)];
        var dx = q[0] - r[0], dy = q[1] - r[1], L = Math.sqrt(dx * dx + dy * dy) || 1;
        o.push([p[0] - dy / L * d, p[1] + dx / L * d]);
      }
      return o;
    }
    function poly(pts) {
      var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (i = 1; i < pts.length; i++) d += 'L' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
      return d;
    }
    function pl(pts, attr) { return '<path d="' + poly(pts) + '"' + (attr || '') + '/>'; }

    if (key === 'view') {
      /* 等高线：与首页 hero 同一套 contour 算法的不规则线纹 */
      return contour({ rings: 18, r0: 64, step: 56, seed: 23, scale: 240, w: 1, cx: 560, cy: 500, satellite: false });
    } else if (key === 'story') {
      /* 踪迹：一条公路（双路边线 + 中心虚线）、一条铁轨（钢轨 + 枕木）、
       * 沿铁轨左右交替的脚印，再加一条虚线支路与几处停靠点。 */
      var roadSegs = [
        [[-110, 786], [430, 606], [920, 726]],
        [[920, 726], [1250, 812], [1590, 664]]
      ];
      var railSegs = [
        [[1590, 476], [1200, 336], [860, 254]],
        [[860, 254], [430, 192], [-110, 112]]
      ];
      var rp = sampleSegs(roadSegs, 30), fp = sampleSegs(railSegs, 30);
      var road = pl(offsetPts(rp, 11)) + pl(offsetPts(rp, -11)) +
                 pl(rp, ' stroke-dasharray="16 13"');
      var rail = pl(offsetPts(fp, 5.6)) + pl(offsetPts(fp, -5.6));
      var ties = '', steps = '', k = 0;
      for (i = 3; i < fp.length - 3; i++) {
        var p = fp[i], q = fp[Math.min(i + 1, fp.length - 1)], r = fp[i - 1];
        var dx = q[0] - r[0], dy = q[1] - r[1], L = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = -dy / L, ny = dx / L, ux = dx / L, uy = dy / L;
        if (i % 2 === 0) {
          ties += '<line x1="' + (p[0] + nx * 12).toFixed(1) + '" y1="' + (p[1] + ny * 12).toFixed(1) +
                  '" x2="' + (p[0] - nx * 12).toFixed(1) + '" y2="' + (p[1] - ny * 12).toFixed(1) + '"/>';
        }
        if (i % 4 === 1) {
          var side = (k % 2 ? 15 : -15); k++;
          var bx = p[0] + nx * side, by = p[1] + ny * side;
          var ang = (Math.atan2(uy, ux) * 57.2958).toFixed(0);
          steps += '<ellipse cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" rx="4.8" ry="7.8" ' +
                   'transform="rotate(' + ang + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1) + ')"/>';
        }
      }
      var stops = '';
      [8, 26, 44].forEach(function (t) {
        var pp = fp[t] || fp[fp.length - 1];
        stops += '<circle cx="' + pp[0].toFixed(0) + '" cy="' + pp[1].toFixed(0) + '" r="5"/>';
      });
      var branch = '<path d="M-110 436 Q340 546 760 424 Q1120 336 1590 404" stroke-dasharray="10 11"/>';
      inner = '<g fill="none" stroke="currentColor" stroke-width="1.1">' + road + '</g>' +
              '<g fill="none" stroke="currentColor" stroke-width="1" opacity=".9">' + rail + ties + '</g>' +
              '<g fill="none" stroke="currentColor" stroke-width="1" opacity=".8">' + steps + '</g>' +
              '<g fill="none" stroke="currentColor" stroke-width="1.1" opacity=".9">' + stops + '</g>' +
              '<g fill="none" stroke="currentColor" stroke-width=".9" opacity=".55">' + branch + '</g>';
    } else if (key === 'record' || key === 'misread') {
      /* 目击记录：撕碎的纸片（撕边不平、行被截断）＋几道贯穿的裂纹 */
      wob = true;
      var bits = '';
      for (i = 0; i < 12; i++) {
        var bx = 40 + rnd() * (W - 240), by = 40 + rnd() * (H - 200);
        var bw = 96 + rnd() * 156, bh = 116 + rnd() * 136;
        var rot = (rnd() * 52 - 26).toFixed(1);
        var n = 6 + Math.floor(rnd() * 4);
        var d = 'M' + bx.toFixed(0) + ' ' + by.toFixed(0) +
                'L' + (bx + bw).toFixed(0) + ' ' + (by + (rnd() * 8 - 4)).toFixed(0);
        var yy = by;
        for (j = 0; j < n; j++) {
          yy += bh / n;
          d += 'L' + (bx + bw + (rnd() * 14 - 7)).toFixed(0) + ' ' + yy.toFixed(0);
        }
        var xx = bx + bw;
        for (j = 0; j < n; j++) {
          xx -= bw / n;
          d += 'L' + xx.toFixed(0) + ' ' + (by + bh + (rnd() * 14 - 7)).toFixed(0);
        }
        d += 'Z';
        var lines = '', ly = by + 30;
        while (ly < by + bh - 16) {
          var lw = bw * (0.28 + rnd() * 0.56);
          lines += '<line x1="' + (bx + 16).toFixed(0) + '" y1="' + ly.toFixed(0) +
                   '" x2="' + (bx + 16 + lw).toFixed(0) + '" y2="' + (ly + (rnd() * 5 - 2.5)).toFixed(0) + '"/>';
          ly += 22 + rnd() * 11;
        }
        bits += '<g transform="rotate(' + rot + ' ' + bx.toFixed(0) + ' ' + by.toFixed(0) + ')">' +
                '<path d="' + d + '"/><g stroke-width="1.7">' + lines + '</g></g>';
      }
      var cr = '';
      for (i = 0; i < 5; i++) {
        var sx = rnd() * W, sy = rnd() * H, ang2 = rnd() * 6.2832;
        var cd = 'M' + sx.toFixed(0) + ' ' + sy.toFixed(0);
        var ns = 5 + Math.floor(rnd() * 4), len = 70 + rnd() * 100;
        for (j = 0; j < ns; j++) {
          ang2 += (rnd() - 0.5) * 1.15;
          sx += Math.cos(ang2) * len / ns; sy += Math.sin(ang2) * len / ns;
          cd += 'L' + sx.toFixed(0) + ' ' + sy.toFixed(0);
        }
        cr += '<path d="' + cd + '"/>';
      }
      inner = '<g fill="none" stroke="currentColor" stroke-width="1">' + bits + '</g>' +
              '<g fill="none" stroke="currentColor" stroke-width="1.3" opacity=".6">' + cr + '</g>';
    } else if (key === 'avatars' || key === 'avatar') {
      /* 马甲：空的人形轮廓（头 + 肩身，底部敞口），每个胸前都悬一个问号 */
      wob = true;
      var figs = '';
      var PP = [[1146, 690, 1.05], [236, 604, 0.74], [706, 128, 0.52], [1372, 196, 0.6]];
      for (i = 0; i < PP.length; i++) {
        var fx = PP[i][0], fy = PP[i][1], sc = PP[i][2];
        figs += '<g transform="translate(' + fx + ' ' + fy + ') scale(' + sc + ')">' +
          '<circle cx="0" cy="-98" r="37"/>' +
          '<path d="M-79 170 C-79 36 -47 -52 0 -52 C47 -52 79 36 79 170"/>' +
          '<line x1="-79" y1="170" x2="-27" y2="170"/><line x1="27" y1="170" x2="79" y2="170"/>' +
          '<text x="0" y="88" text-anchor="middle" font-family="Georgia,\'Times New Roman\',serif" font-size="106" fill="currentColor" stroke="none">?</text>' +
          '</g>';
      }
      inner = '<g fill="none" stroke="currentColor" stroke-width="2.6">' + figs + '</g>';
        } else if (key === 'things') {
      /* 祂的东西：宅邸外观线框（正立面）。中央山墙主楼 + 柱式门廊 + 两翼 + 烟囱 + 围栏。 */
      wob = true;
      var hs = '';
      function win(x, y, w, h) {
        return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>' +
               '<line x1="' + (x + w / 2) + '" y1="' + y + '" x2="' + (x + w / 2) + '" y2="' + (y + h) + '"/>' +
               '<line x1="' + x + '" y1="' + (y + h / 2) + '" x2="' + (x + w) + '" y2="' + (y + h / 2) + '"/>';
      }
      /* 地面与围栏 */
      hs += '<line x1="180" y1="796" x2="1260" y2="796"/>';
      hs += '<line x1="200" y1="822" x2="1240" y2="822"/><line x1="200" y1="856" x2="1240" y2="856"/>';
      for (x = 214; x <= 1226; x += 28) hs += '<line x1="' + x + '" y1="822" x2="' + x + '" y2="856"/>';
      /* 主楼 + 檐口 + 双层山墙 */
      hs += '<rect x="500" y="316" width="440" height="480"/>';
      hs += '<line x1="486" y1="316" x2="954" y2="316"/>';
      hs += '<path d="M500 316 L720 178 L940 316 M552 316 L720 216 L888 316"/>';
      /* 圆窗与烟囱 */
      hs += '<circle cx="720" cy="282" r="30"/><line x1="690" y1="282" x2="750" y2="282"/><line x1="720" y1="252" x2="720" y2="312"/>';
      hs += '<path d="M824 236 L824 156 L864 156 L864 276"/><line x1="816" y1="156" x2="872" y2="156"/>';
      /* 上层三窗 */
      hs += win(540, 352, 68, 94) + win(686, 352, 68, 94) + win(832, 352, 68, 94);
      /* 门廊：横梁 + 双柱 + 拱门 + 三级台阶 */
      hs += '<line x1="636" y1="508" x2="804" y2="508"/>';
      hs += '<line x1="660" y1="516" x2="660" y2="704"/><line x1="650" y1="516" x2="670" y2="516"/><line x1="650" y1="704" x2="670" y2="704"/>';
      hs += '<line x1="780" y1="516" x2="780" y2="704"/><line x1="770" y1="516" x2="790" y2="516"/><line x1="770" y1="704" x2="790" y2="704"/>';
      hs += '<path d="M692 704 L692 576 A28 28 0 0 1 748 576 L748 704"/><line x1="720" y1="700" x2="720" y2="570"/>';
      hs += '<line x1="664" y1="716" x2="776" y2="716"/><line x1="640" y1="734" x2="800" y2="734"/><line x1="616" y1="752" x2="824" y2="752"/>';
      /* 下层两窗 */
      hs += win(540, 516, 68, 130) + win(832, 516, 68, 130);
      /* 两翼 */
      hs += '<rect x="264" y="480" width="236" height="316"/><line x1="252" y1="480" x2="512" y2="480"/>';
      hs += '<rect x="940" y="480" width="236" height="316"/><line x1="928" y1="480" x2="1188" y2="480"/>';
      hs += win(312, 552, 58, 100) + win(406, 552, 58, 100);
      hs += win(978, 552, 58, 100) + win(1072, 552, 58, 100);
      inner = '<g fill="none" stroke="currentColor" stroke-width="1">' + hs + '</g>';
        } else if (key === 'stories') {
      /* 故事全列表：中文作文纸。一行字格 + 一条细窄连通行交替（考试作文纸样式）。 */
      var cell = 40, narrow = 14;
      var gx0 = 104, gx1 = 1344;
      var gy0 = 168, groups = 12;
      var gd = 'M' + gx0 + ' ' + gy0 + 'L' + gx1 + ' ' + gy0, md = '', y0 = gy0;
      for (k = 0; k < groups; k++) {
        for (x = gx0; x <= gx1; x += cell) gd += 'M' + x + ' ' + y0 + 'L' + x + ' ' + (y0 + cell);
        gd += 'M' + gx0 + ' ' + (y0 + cell) + 'L' + gx1 + ' ' + (y0 + cell);
        gd += 'M' + gx0 + ' ' + (y0 + cell + narrow) + 'L' + gx1 + ' ' + (y0 + cell + narrow);
        for (x = gx0; x < gx1; x += cell) {
          if (rnd() < 0.22) {
            var mw = 10 + rnd() * 16, mx = x + (cell - mw) / 2, my2 = y0 + cell * 0.62;
            md += 'M' + mx.toFixed(0) + ' ' + my2.toFixed(0) + 'L' + (mx + mw).toFixed(0) + ' ' + my2.toFixed(0);
          }
        }
        y0 += cell + narrow;
      }
      var frame = '<rect x="72" y="96" width="1304" height="750"/>' +
                  '<line x1="72" y1="168" x2="1376" y2="168"/>' +
                  '<line x1="724" y1="96" x2="724" y2="168"/>';
      inner = '<path d="' + gd + '" fill="none" stroke="currentColor" stroke-width=".9"/>' +
              '<path d="' + md + '" fill="none" stroke="currentColor" stroke-width="1.9" opacity=".85"/>' +
              '<g fill="none" stroke="currentColor" stroke-width="1.2">' + frame + '</g>';
        } else if (key === 'fanworks') {
      /* 网友作品：四芒星平铺（行间错开），大小随位置起伏，间杂小星点 */
      var sid = 'ptxs' + (++seq);
      extra = '<path id="' + sid + '" d="M0 -10 C1.25 -3 3 -1.25 10 0 C3 1.25 1.25 3 0 10 ' +
              'C-1.25 3 -3 1.25 -10 0 C-3 -1.25 -1.25 -3 0 -10 Z"/>';
      var stars = '', row = 0;
      for (y = 34; y < H + 40; y += 96, row++) {
        for (x = 34 + (row % 2) * 48; x < W + 40; x += 96) {
          var rr = 0.62 + Math.abs(Math.sin(x / 148) * Math.cos(y / 132)) * 1.15;
          stars += '<use href="#' + sid + '" transform="translate(' + x + ' ' + y + ') scale(' + rr.toFixed(2) + ')"/>';
          if (rnd() < 0.16) {
            stars += '<circle cx="' + (x + 42 + rnd() * 12) + '" cy="' + (y + 38 + rnd() * 14) + '" r="1.7" fill="currentColor" stroke="none"/>';
          }
        }
      }
      inner = '<g fill="none" stroke="currentColor" stroke-width="1.2" vector-effect="non-scaling-stroke">' + stars + '</g>';
    } else if (key === 'relations') {
      var pts = [];
      for (i = 0; i < 26; i++) pts.push([70 + rnd() * (W - 140), 66 + rnd() * (H - 132)]);
      var ln = '';
      for (i = 0; i < pts.length; i++) {
        for (j = i + 1; j < pts.length; j++) {
          var dx2 = pts[i][0] - pts[j][0], dy2 = pts[i][1] - pts[j][1];
          if (dx2 * dx2 + dy2 * dy2 < 200 * 200) {
            ln += '<line x1="' + pts[i][0].toFixed(0) + '" y1="' + pts[i][1].toFixed(0) +
                  '" x2="' + pts[j][0].toFixed(0) + '" y2="' + pts[j][1].toFixed(0) + '"/>';
          }
        }
      }
      var dt = '';
      pts.forEach(function (p) { dt += '<circle cx="' + p[0].toFixed(0) + '" cy="' + p[1].toFixed(0) + '" r="2.6" fill="currentColor" stroke="none"/>'; });
      inner = '<g fill="none" stroke="currentColor" stroke-width="1">' + ln + '</g>' + dt;
    } else if (key === 'gallery') {
      var holes = '';
      for (var side2 = 0; side2 < 2; side2++) {
        var hx = side2 === 0 ? 52 : W - 70;
        for (y = 38; y < H - 20; y += 56) holes += '<rect x="' + hx + '" y="' + y + '" width="18" height="26" rx="4"/>';
      }
      inner = '<g fill="none" stroke="currentColor" stroke-width="1">' + holes + '</g>';
    } else {
      /* about / 其他：等高线 */
      wob = true;
      var rings = '';
      for (i = 0; i < 12; i++) rings += '<circle cx="1190" cy="860" r="' + (70 + i * 88) + '"/>';
      for (i = 0; i < 4; i++) rings += '<circle cx="120" cy="60" r="' + (34 + i * 52) + '"/>';
      inner = '<g fill="none" stroke="currentColor" stroke-width="1">' + rings + '</g>';
    }

    if (!inner) return '';
    var id = 'ptx' + (++seq);
    var defs = (wob ? '<filter id="' + id + '" x="-6%" y="-6%" width="112%" height="112%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="2" seed="4" result="t"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="t" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' : '') + extra;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      (defs ? '<defs>' + defs + '</defs>' : '') +
      (wob ? '<g filter="url(#' + id + ')">' + inner + '</g>' : inner) + '</svg>';
  }

  /* dim：内容密集或需要专注阅读的页面，把底纹压得更淡 */
  var TEX_SOFT = { stories: 1, story: 1, things: 1, record: 1, misread: 1, read: 1, view: 1 };
  function mountPageTex(key, dim) {
    if (document.querySelector('.page-tex')) return;
    var svg = pageTex(key);
    if (!svg) return;
    var soft = dim || TEX_SOFT[key];
    document.body.insertAdjacentHTML('afterbegin',
      '<div class="page-tex' + (soft ? ' dim' : '') + '" aria-hidden="true">' + svg + '</div>');
  }

  function initNav(active, texKey, dimTex) {
    var s = Store.load();
    var nav = document.querySelector('.site-nav');
    if (!nav) return;
    var brand = nav.querySelector('.brand');
    if (brand) {
      brand.innerHTML =
        '<span class="mark">' + esc((s.site.seal || 'A').slice(0, 1)) + '</span>' +
        '<span><div class="name">' + esc(s.site.title) + '</div>' +
        '<div class="sub">' + esc(s.site.sub || '') + '</div></span>';
      brand.href = 'index.html';
    }
    var box = document.createElement('div');
    box.className = 'nav-links';
    box.innerHTML = NAV.map(function (n) {
      return '<a href="' + n.href + '"' + (n.key === active ? ' class="active"' : '') + '>' + n.text + '</a>';
    }).join('') +
      '<a href="about.html">关于</a>';
    nav.appendChild(box);

    var btn = document.createElement('button');
    btn.className = 'nav-toggle';
    btn.textContent = '☰';
    btn.onclick = function () { box.classList.toggle('open'); };
    nav.insertBefore(btn, box);

    if (!document.querySelector('.wash')) {
      document.body.insertAdjacentHTML('afterbegin', '<div class="wash"></div>');
    }
    mountPageTex(texKey || active, dimTex);
    // 马甲切换条已按需求移除（列表只保留在「祂的马甲」页）。
    // 顺手清掉历史版本存在本地的马甲配色，避免旧访客停留在已不可切换的主题里。
    try { localStorage.removeItem(AVKEY); } catch (e) { }
  }

  /* ---------- 颜色工具 ---------- */
  function hex2rgb(h) {
    h = String(h || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return [91, 135, 207];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgba(hex, a) {
    var c = hex2rgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  function hueShift(hex, deg) {
    var c = hex2rgb(hex), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) {
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    h = (h + deg + 360) % 360;
    var cc = (1 - Math.abs(2 * l - 1)) * s, x = cc * (1 - Math.abs((h / 60) % 2 - 1)), m = l - cc / 2;
    var p = h < 60 ? [cc, x, 0] : h < 120 ? [x, cc, 0] : h < 180 ? [0, cc, x] :
            h < 240 ? [0, x, cc] : h < 300 ? [x, 0, cc] : [cc, 0, x];
    return '#' + p.map(function (v) {
      var n = Math.round((v + m) * 255);
      return ('0' + Math.max(0, Math.min(255, n)).toString(16)).slice(-2);
    }).join('');
  }

  /* ---------- 马甲配色 ----------
   * 只服务于「祂的马甲」页与马甲详情页（avatar.html）：
   * 进入某个马甲，整站强调色换成该马甲的 color；返回列表/首页即回到本相默认色。
   * 数据源：人物关系里 group === 'avatar'（或 role 含「马甲」）的条目。
   */
  var AVKEY = 'aht.avatar';
  var DEFAULT_AV = { key: 'akhet', name: '本相', meta: 'Akhet · 北非', a1: '#5b87cf', a2: '#c8a558' };

  function isAvatar(r) {
    return r.group === 'avatar' || (r.role && r.role.indexOf('马甲') >= 0);
  }

  function avatarList() {
    var s = Store.load();
    var list = [DEFAULT_AV];
    (s.relations || []).forEach(function (r) {
      if (!isAvatar(r)) return;
      list.push({
        key: 'rel-' + r.id,
        name: r.name,
        meta: r.role || '',
        a1: r.color || '#5b87cf',
        a2: hueShift(r.color || '#5b87cf', 150)
      });
    });
    return list;
  }

  function applyAvatar(av, silent) {
    var r = document.documentElement;
    r.style.setProperty('--a1', av.a1);
    r.style.setProperty('--a2', av.a2);
    r.style.setProperty('--a1-soft', rgba(av.a1, .16));
    r.style.setProperty('--a2-soft', rgba(av.a2, .16));
    r.setAttribute('data-avatar', av.key);
    if (!silent) { try { localStorage.setItem(AVKEY, JSON.stringify(av)); } catch (e) { } }
  }

  function currentAvatar() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(AVKEY) || 'null'); } catch (e) { }
    var list = avatarList();
    if (saved) {
      var hit = list.filter(function (x) { return x.key === saved.key; })[0];
      return hit || saved;
    }
    return list[0];
  }

  /* ---------- 等高线地图纹 ---------- */
  var seq = 0;
  function contour(opts) {
    opts = opts || {};
    var n = opts.rings || 15, r0 = opts.r0 || 70, step = opts.step || 52;
    var cx = opts.cx || 500, cy = opts.cy || 520;
    var id = 'cf' + (++seq);
    var circles = '';
    for (var i = 0; i < n; i++) circles += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r0 + i * step) + '"/>';
    var extra = '';
    if (opts.satellite !== false) {
      extra = '<g filter="url(#' + id + ')" fill="none" stroke="currentColor" stroke-width="1">' +
        '<circle cx="150" cy="170" r="40"/><circle cx="150" cy="170" r="80"/><circle cx="150" cy="170" r="120"/>' +
        '<circle cx="860" cy="880" r="50"/><circle cx="860" cy="880" r="95"/>' +
        '</g>';
    }
    return '<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><filter id="' + id + '" x="-40%" y="-40%" width="180%" height="180%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.0018" numOctaves="4" seed="' + (opts.seed || 9) + '" result="t"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="t" scale="' + (opts.scale || 210) + '" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter></defs>' +
      '<g filter="url(#' + id + ')" fill="none" stroke="currentColor" stroke-width="' + (opts.w || 1.1) + '">' + circles + '</g>' +
      extra + '</svg>';
  }
  function mountContour(sel, opts) {
    var el = document.querySelector(sel);
    if (!el) return;
    el.innerHTML = contour(opts);
  }

  /* ---------- 图片填充 ---------- */
  function fillImages(root) {
    (root || document).querySelectorAll('[data-img]').forEach(function (el) {
      var id = el.getAttribute('data-img');
      if (!id) { el.classList.add('no-img'); return; }
      Store.imageURL(id).then(function (u) {
        if (!u) { el.classList.add('no-img'); return; }
        if (el.tagName === 'IMG') el.src = u;
        else el.style.backgroundImage = 'url("' + u + '")';
        el.classList.add('has-img');
      });
    });
  }

  /* ---------- 封面卡：插画 / 题名 / 重点句 ---------- */
  /* ---------- 影音附件 ----------
   * 故事 / 祂的视角 / 目击记录都可挂一组 media：
   *   { type:'image'|'video'|'audio', id:'img_x'|'med_x'|'', url:'', cover:'img_y', caption:'' }
   * 有 id → 取本地 IndexedDB 里的二进制；没有 id → 用 url 直链。 */
  function mediaCount(o) {
    var c = { image: 0, video: 0, audio: 0 };
    ((o && o.media) || []).forEach(function (m) { if (m && c[m.type] != null) c[m.type]++; });
    return c;
  }
  function mediaBadge(o) {
    var c = mediaCount(o), p = [];
    if (c.image) p.push(c.image + ' 图');
    if (c.video) p.push(c.video + ' 视频');
    if (c.audio) p.push(c.audio + ' 音乐');
    return p.length ? '<span class="cover-md">◈ ' + p.join(' / ') + '</span>' : '';
  }
  function mediaHTML(o) {
    var list = ((o && o.media) || []).filter(function (m) { return m && (m.id || m.url); });
    if (!list.length) return '';
    var c = mediaCount(o), info = [];
    if (c.image) info.push(c.image + ' 张图');
    if (c.video) info.push(c.video + ' 段视频');
    if (c.audio) info.push(c.audio + ' 段音乐');
    var body = list.map(function (m) {
      var srcAttr = m.id ? ' data-md="' + esc(m.id) + '"' : ' src="' + esc(m.url) + '"';
      var cap = m.caption ? '<figcaption>' + esc(m.caption) + '</figcaption>' : '';
      if (m.type === 'audio') {
        return '<div class="md-audio"><audio controls preload="metadata"' + srcAttr + '></audio>' +
          (m.caption ? '<span class="md-cap">' + esc(m.caption) + '</span>' : '') + '</div>';
      }
      if (m.type === 'video') {
        return '<figure class="md-fig md-video"><video controls preload="metadata" playsinline' +
          (m.cover ? ' data-poster="' + esc(m.cover) + '"' : '') + srcAttr + '></video>' + cap + '</figure>';
      }
      return '<figure class="md-fig md-img">' +
        (m.id ? '<img data-md="' + esc(m.id) + '" alt="' + esc(m.caption || '') + '">' : '<img src="' + esc(m.url) + '" alt="' + esc(m.caption || '') + '">') +
        cap + '</figure>';
    }).join('');
    return '<section class="media-block"><div class="sec-head"><span class="sec-num">APPENDIX</span>' +
      '<span class="sec-title">影音附件</span><span class="sec-en">' + esc(info.join(' · ')) + '</span></div>' +
      '<div class="media-grid">' + body + '</div></section>';
  }
  function fillMedia(root) {
    (root || document).querySelectorAll('[data-md]').forEach(function (el) {
      var id = el.getAttribute('data-md');
      var poster = el.getAttribute('data-poster');
      if (poster) Store.imageURL(poster).then(function (u) { if (u) el.setAttribute('poster', u); }).catch(function () { });
      Promise.resolve(Store.mediaURL(id)).then(function (u) { if (u) el.setAttribute('src', u); }).catch(function () { });
    });
  }

  function coverHTML(a) {
    var m = Store.medium(a.medium);
    var inner = '';
    if (a.coverType === 'image' && a.coverImage) {
      inner = '<span class="cover-img" data-img="' + a.coverImage + '"></span>';
    } else if (a.coverType === 'quote') {
      inner = '<div class="cover-quote"><span class="q-mark">“</span><p>' + esc(a.coverQuote || a.subtitle || '') + '</p></div>';
    } else {
      inner = '<div class="cover-title"><div class="ct-era">' + esc([a.era, a.region].filter(Boolean).join(' · ')) + '</div>' +
        '<h3>' + esc(a.title) + '</h3>' +
        (a.subtitle ? '<div class="ct-sub">' + esc(a.subtitle) + '</div>' : '') + '</div>';
    }
    return inner +
      '<div class="cover-foot">' +
      '<span class="tag tag-gold">' + esc(m.name) + '</span>' +
      '<span class="cover-era">' + esc(a.era || m.era || '') + '</span>' +
      mediaBadge(a) +
      '</div>';
  }

  /* extraAttr：可选，附加在 <a> 上的属性串（如 'data-src="note"'），用于跨页复用同一张卡 */
  function articleCard(a, extraAttr) {
    return '<a class="cover-card reveal"' + (extraAttr ? ' ' + extraAttr : '') + ' href="read.html?id=' + encodeURIComponent(a.id) + '" data-cover="' + (a.coverType || 'title') + '">' +
      coverHTML(a) +
      '<div class="cover-meta"><strong>' + esc(a.title) + '</strong>' +
      '<span>' + esc([a.era, a.region].filter(Boolean).join(' · ')) + '</span></div>' +
      '</a>';
  }

  /* 目击记录（misread / slander）的封面卡：与故事卡同一视觉语言，但标注来源 */
  function misreadCard(m, extraAttr) {
    var src = (m.kind || 'misread') === 'slander' ? 'slander' : 'misread';
    return '<a class="cover-card reveal"' + (extraAttr ? ' ' + extraAttr : ' data-src="' + src + '"') +
      ' href="misread.html?id=' + encodeURIComponent(m.id) + '" data-cover="quote">' +
      '<div class="cover-quote"><span class="q-mark">“</span><p>' + esc(m.summary || m.title || '') + '</p></div>' +
      '<div class="cover-foot"><span class="tag tag-warm">' + esc((m.versions || []).length) + ' 个版本</span>' +
      '<span class="cover-era">' + esc([m.era, m.region].filter(Boolean).join(' · ')) + '</span>' +
      mediaBadge(m) + '</div>' +
      '<div class="cover-meta"><strong>' + esc(m.title) + '</strong>' +
      '<span>' + esc([m.era, m.region].filter(Boolean).join(' · ')) + '</span></div>' +
      '</a>';
  }

  /* ---------- 标签筛选条 ---------- */
  function tagBar(tags, onPick, activeTags) {
    var set = activeTags || [];
    var box = document.createElement('div');
    box.className = 'tag-bar';
    box.innerHTML = '<button class="t-chip all' + (set.length ? '' : ' on') + '" data-t="">全部</button>' +
      tags.map(function (t) {
        return '<button class="t-chip' + (set.indexOf(t) >= 0 ? ' on' : '') + '" data-t="' + esc(t) + '">' + esc(t) + '</button>';
      }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.t-chip');
      if (!b) return;
      var t = b.getAttribute('data-t');
      var cur = Array.prototype.slice.call(box.querySelectorAll('.t-chip.on'))
        .map(function (x) { return x.getAttribute('data-t'); })
        .filter(Boolean);   // 「全部」不参与组合
      if (!t) cur = [];
      else {
        var i = cur.indexOf(t);
        if (i >= 0) cur.splice(i, 1); else cur.push(t);
      }
      Array.prototype.forEach.call(box.querySelectorAll('.t-chip'), function (x) {
        var v = x.getAttribute('data-t');
        x.classList.toggle('on', v ? cur.indexOf(v) >= 0 : cur.length === 0);
      });
      onPick(cur);
    });
    return box;
  }

  function matchTags(item, tags) {
    if (!tags || !tags.length) return true;
    var own = item.tags || [];
    return tags.every(function (t) { return own.indexOf(t) >= 0; });
  }

  function reveal(scope) {
    var els = (scope || document).querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.06 });
    els.forEach(function (e) { io.observe(e); });
  }

  function q(name) {
    var m = location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  function sortArticles(list) {
    return list.slice().sort(function (a, b) {
      if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });
  }

  /* 空态 */
  function empty(text) {
    return '<div class="empty">' + esc(text || '还没有内容') + '</div>';
  }

  global.Common = {
    NAV: NAV,
    initNav: initNav, fillImages: fillImages, fillMedia: fillMedia, coverHTML: coverHTML,
    mediaHTML: mediaHTML, mediaBadge: mediaBadge, mediaCount: mediaCount,
    articleCard: articleCard, misreadCard: misreadCard,
    reveal: reveal, q: q, esc: esc, sortArticles: sortArticles, empty: empty,
    contour: contour, mountContour: mountContour, pageTex: pageTex,
    avatarList: avatarList, applyAvatar: applyAvatar, currentAvatar: currentAvatar, isAvatar: isAvatar,
    tagBar: tagBar, matchTags: matchTags, rgba: rgba, hueShift: hueShift
  };
})(window);
