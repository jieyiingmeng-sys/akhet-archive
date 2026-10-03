/* cloud.js —— 云端只读数据预取 + 一键发布（Cloudflare Pages + KV）
 *
 * 用法：放在 snapshot.js / store.js 之前加载。
 *   · 访客（非后台页、非 #edit）→ 同步 GET /api/data，命中即写入 window.SNAPSHOT，
 *     之后 store.js 的只读逻辑自动以云端数据渲染（store.js 无需改动）。
 *   · 后台页 / #edit → 跳过预取，直接用本地可写数据（localStorage）。
 *   · 云端不可用（未配置 KV、离线、404）→ 静默跳过，退回 seed / localStorage。
 *
 * 说明：预取用同步 XHR，是为在页面渲染脚本执行前就让数据就绪；站点极小、同源，影响可忽略。
 *       若浏览器控制台出现同步 XHR 废弃警告属正常，不影响功能。
 */
(function () {
  var CLOUD = {
    URL: '/api/data',
    /* 把当前内容打包对象上传到云端 KV（store.js 调用） */
    publish: function (obj, token) {
      return fetch(CLOUD.URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (token || '')
        },
        body: JSON.stringify(obj)
      }).then(function (r) {
        if (r.ok) return 'ok';
        if (r.status === 401) return '令牌错误（401）';
        if (r.status === 404) return '云端接口未部署（404，先在 Cloudflare 后台绑定 KV 并重部署）';
        if (r.status === 400) return '数据不是合法 JSON（400）';
        return 'HTTP ' + r.status;
      }).catch(function (e) {
        return '网络错误：' + (e && e.message || e);
      });
    }
  };
  window.AHT_CLOUD = CLOUD;

  try {
    var path = location.pathname || '';
    var isAdmin = /(^|\/)(admin|poor-dot-created)(\.html)?$/.test(path) || /#edit/.test(location.hash || '');
    if (isAdmin) return; // 后台 / 编辑模式：不走云端只读，直接用本地可写
    var xhr = new XMLHttpRequest();
    xhr.open('GET', CLOUD.URL, false); // 同步，确保渲染前就绪
    xhr.setRequestHeader('Cache-Control', 'no-store');
    xhr.send();
    if (xhr.status === 200 && xhr.responseText) {
      var d = JSON.parse(xhr.responseText);
      if (d && typeof d === 'object') window.SNAPSHOT = d;
    }
  } catch (e) { /* 离线 / 失败 → 退回本地 */ }
})();
