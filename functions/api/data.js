/**
 * Cloudflare Pages Function —— 站点数据读写（KV）
 *
 * 路由：/api/data
 *   GET  → 返回已发布的数据（访客端 cloud.js 调用）
 *   PUT  → 写入数据（后台「发布到云端」调用，需 Bearer 令牌）
 *
 * Cloudflare 后台需配置：
 *   1) Storage → KV → 新建命名空间（例如 akhet-archive-data）
 *   2) 项目 Settings → Functions → KV namespace bindings → 绑定变量名 AKHET_KV 到该命名空间
 *   3) 项目 Settings → Environment variables → 增加 PUBLISH_TOKEN（生产环境），值自定义强随机串
 *   4) 改完点 Save 后务必「Retry deployment」一次，让绑定/变量生效
 *
 * 数据在 KV 里的键为 "site"，值为 JSON 文本（与 window.SNAPSHOT 同结构，含 __imgs 等）。
 */

const KEY = 'site';

export async function onRequestGet(context) {
  try {
    const val = await context.env.AKHET_KV.get(KEY);
    if (val === null) return new Response('', { status: 404 });
    return new Response(val, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return new Response('kv error: ' + (e && e.message || e), { status: 500 });
  }
}

export async function onRequestPut(context) {
  const tok = context.env.PUBLISH_TOKEN || '';
  const auth = context.request.headers.get('Authorization') || '';
  if (!tok || auth !== 'Bearer ' + tok) {
    return new Response('unauthorized', { status: 401 });
  }
  let body;
  try {
    body = await context.request.text();
    JSON.parse(body); // 校验为合法 JSON，避免写入垃圾
  } catch (e) {
    return new Response('bad json', { status: 400 });
  }
  try {
    await context.env.AKHET_KV.put(KEY, body);
    return new Response('ok');
  } catch (e) {
    return new Response('kv error: ' + (e && e.message || e), { status: 500 });
  }
}
