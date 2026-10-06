/* ============ 轻量 Markdown 解析器（离线可用，无外部依赖） ============
 * 支持：标题 / 粗体 / 斜体 / 删除线 / 高亮 / 行内代码 / 代码块
 *      引用 / 有序无序列表 / 分割线 / 链接 / 图片（含 img:ID 本地图）
 *      夹注 {{...}}、朱批 %%...%%、居中题记 ::...::
 * ==================================================================== */
(function (global) {
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 行内解析
  function inline(t) {
    t = esc(t);
    // 行内代码
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    // 图片 ![alt](src)：本地图（img:ID 或 img_/med_ 形式）用 data-img 交给 fillImages 异步解析；
    // 外链（http/https/相对路径）直接保留 src。
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, src) {
      // 本地图：img:ID / img_ID / med:ID / med_ID 都归一为 img_xxx / med_xxx（与 Store.uid 生成的 id 一致）
      var m2 = src.match(/^(img|med)[:_]([A-Za-z0-9]+)$/i);
      if (m2) {
        var id = m2[1].toLowerCase() + '_' + m2[2];
        return '<img alt="' + alt + '" class="md-img" data-img="' + id + '">';
      }
      return '<img alt="' + alt + '" src="' + src + '" class="md-img">';
    });
    // 链接
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, href) {
      var ext = /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + href + '"' + ext + '>' + txt + '</a>';
    });
    // 朱批 / 批注 %%...%%
    t = t.replace(/%%([^%]+)%%/g, '<span class="md-zhu">$1</span>');
    // 夹注 {{...}}
    t = t.replace(/\{\{([^}]+)\}\}/g, '<span class="md-note">$1</span>');
    // 高亮 ==...==  (先于粗体)
    t = t.replace(/==([^=]+)==/g, '<mark>$1</mark>');
    // 粗体
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 斜体
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    // 删除线
    t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    // 题记 ::...::（整行居中）在块级处理，这里兜底
    return t;
  }

  function parse(src) {
    if (!src) return '';
    var lines = src.replace(/\r\n?/g, '\n').split('\n');
    var out = [], i = 0, n = lines.length;

    function flushList(buf, ordered) {
      if (!buf.length) return;
      var tag = ordered ? 'ol' : 'ul';
      out.push('<' + tag + '>' + buf.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</' + tag + '>');
      buf.length = 0;
    }

    while (i < n) {
      var line = lines[i];

      // 空行
      if (/^\s*$/.test(line)) { i++; continue; }

      // 代码块
      if (/^\s*```/.test(line)) {
        i++;
        var code = [];
        while (i < n && !/^\s*```/.test(lines[i])) { code.push(esc(lines[i])); i++; }
        i++;
        out.push('<pre><code>' + code.join('\n') + '</code></pre>');
        continue;
      }

      // 分割线
      if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) { out.push('<hr>'); i++; continue; }

      // 题记 ::...::
      var cm = line.match(/^\s*::(.+)::\s*$/);
      if (cm) { out.push('<p class="md-epigraph">' + inline(cm[1]) + '</p>'); i++; continue; }

      // 标题
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        var lv = h[1].length;
        out.push('<h' + lv + '>' + inline(h[2].trim()) + '</h' + lv + '>');
        i++; continue;
      }

      // 引用
      if (/^\s*>\s?/.test(line)) {
        var q = [];
        while (i < n && /^\s*>\s?/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        out.push('<blockquote>' + q.map(inline).join('<br>') + '</blockquote>');
        continue;
      }

      // 列表
      if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
        var ordered = /^\s*\d+[.)]\s+/.test(line);
        var buf = [];
        while (i < n && (new RegExp(ordered ? '^\\s*\\d+[.)]\\s+' : '^\\s*[-*+]\\s+').test(lines[i]))) {
          buf.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/, ''));
          i++;
        }
        flushList(buf, ordered);
        continue;
      }

      // 段落（连续非空行合成一段，单换行转 <br>）
      var para = [];
      while (i < n && !/^\s*$/.test(lines[i]) &&
             !/^\s*```/.test(lines[i]) &&
             !/^\s*#{1,6}\s/.test(lines[i]) &&
             !/^\s*>\s?/.test(lines[i]) &&
             !/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(lines[i]) &&
             !/^\s*[-*+]\s+/.test(lines[i]) &&
             !/^\s*\d+[.)]\s+/.test(lines[i]) &&
             !/^\s*::.*::\s*$/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      if (para.length) out.push('<p>' + para.map(inline).join('<br>') + '</p>');
    }
    return out.join('\n');
  }

  global.MD = { parse: parse, esc: esc };
})(window);
