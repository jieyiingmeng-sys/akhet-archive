# AKHET · 文明档案（OC 角色设定站）

纯静态站点。无构建步骤、无外部依赖、不联网也能跑。
双击 `index.html` 即可打开；如需完整体验（localStorage / IndexedDB 正常隔离）建议起一个本地静态服务：

```
python -m http.server 8080
# 然后访问 http://127.0.0.1:8080/index.html
```

角色：**阿赫特 / Akhet**——全世界每个地区掌管文明文化的神的本相。
伏羲、托特、恩基、普罗米修斯、羽蛇神都是祂的马甲，不存在意识分流，从头到尾都是同一个祂在走。

---

## 一、页面结构（一级栏目九个）

| # | 页面 | 作用 |
|---|---|---|
| 01 | `story.html` | 祂的踪迹：**真实世界地图线图** + 时间轴。切时代 → 地图标记变化；三种视角可切换（历史时间轴 / 祂的概念分节点 / 按时代分组）。时间轴左侧是竖向拉轴（刻度 = 事件节点，可拖动 / 点击 / 方向键） |
| 02 | `avatars.html` | 祂的马甲：本相 + 五个马甲的卡片墙 |
| — | `avatar.html?id=r2` | 马甲详情：主视觉 + 相册 + 相关故事/笔记 |
| 03 | `view.html` | 祂的视角：祂自己的笔记，封面墙 + tag 筛选 |
| 04 | `record.html` | 目击记录：历史误读 / 诋毁与冠名混乱两类 |
| — | `misread.html?id=m1` | 误读详情：失真记载分版本 + 现实史料外链 + 回链到祂的笔记 |
| 05 | `relations.html` | 社交关系网：中心放射图。只收「他人」，马甲不在此列 |
| 06 | `things.html` | 祂的东西：持有物 / 产业 / 作品，置物架式堆放，左点右显 |
| 07 | `stories.html` | 故事全列表：tag + 关键词 + 载体三重检索 |
| 08 | `fanworks.html` | 网友作品：主创精选 + tag 筛选 |
| 09 | `gallery.html` | 插画：瀑布流 + 灯箱 |
| — | `read.html?id=s1` | 阅读器：文章/笔记以所属时代与国家的书籍形态呈现（11 套载体） |
| — | `about.html` | 关于：站点说明、栏目表、载体清单、Markdown 语法、存储说明 |
| — | `admin.html` | 后台（备用）：全部内容自助增删改，图片上传，导入导出 |
| — | `poor-dot-created.html` | 隐藏管理页：内容与后台一致、不在导航里、无口令，靠隐藏网址直接打开 |

马甲列表只出现在「祂的马甲」页（早期版本顶部有切换条，已按需求移除，避免与该页重复）。
进入某个马甲详情页（`avatar.html?id=`）时，整站强调色会整体换成该马甲的 `color`（点托特 → 埃及金，点伏羲 → 中国红），离开即回到本相默认色。

---

## 二、书籍载体（时代 × 国家）

文章与笔记点开后，会以所属时代与国家的书籍形态出现。共 11 套，均为纯 CSS：

| id | 载体 | 时代 | 地区 |
|---|---|---|---|
| `clay` | 泥板 | 青铜时代 | 两河流域 · 苏美尔 |
| `papyrus` | 纸莎草卷 | 古王国时期 | 古埃及 |
| `bamboo` | 竹简 | 先秦—汉 | 中国 |
| `silk` | 帛书卷轴 | 战国—汉 | 中国 |
| `thread` | 线装古籍 | 宋—清 | 中国 |
| `washi` | 和纸册子 | 平安—江户 | 日本 |
| `codex` | 羊皮手抄本 | 中世纪 | 欧洲 |
| `palm` | 贝叶经 | 古代—中古 | 南亚 · 东南亚 |
| `quipu` | 结绳记事 | 印加 | 安第斯 |
| `letterpress` | 铅印平装 | 近代 | 全球 |
| `modern` | 现代电子文本 | 当代 | 全球 |

竹简 / 帛书 / 线装 / 和纸 默认竖排右起（`writing-mode: vertical-rl`），阅读器提供「改横排」开关。

---

## 三、文件与职责

```
aht-archive/
├── index.html      首页：主视觉 + 人物简介（身份/性格/外貌/经历）+ 九个入口 + 最近入藏
├── story.html      故事：真实世界地图 + 时间轴（三个视角）
├── avatars.html    马甲列表      avatar.html   马甲详情
├── view.html       祂的视角（笔记封面墙）
├── record.html     目击记录列表  misread.html  误读详情
├── relations.html  关系网放射图
├── things.html     持有物 / 产业 / 作品（置物架）
├── stories.html    故事全列表（tag 检索）
├── fanworks.html   网友作品      gallery.html  插画
├── read.html       阅读器（书籍载体）
├── about.html      关于           admin.html   后台
└── assets/
    ├── css/
    │   ├── base.css    全站主题（深色夜间展厅）、导航、底纹
    │   ├── front.css   首页 / 封面墙 / 画廊等前台组件
    │   ├── media.css   11 套书籍载体皮肤 + 阅读器展柜外壳
    │   ├── atlas.css   世界地图 / 竖向拉轴 / 马甲卡 / 置物架 / 放射图 / 筛选条
    │   └── admin.css   后台
    └── js/
        ├── store.js    数据层（localStorage + IndexedDB）、载体定义、种子版本
        ├── seed.js     种子数据：阿赫特的真实设定 + 示例文本
        ├── worldmap.js 世界地图线图数据（Natural Earth 110m 海岸线 + 投影 / 逆投影）
        ├── markdown.js 自研 Markdown 解析器（含自定义语法）
        ├── common.js   导航、马甲配色、等高线底纹、封面卡、标签筛选
        └── admin.js    后台：schema 驱动的通用 CRUD + 文章编辑器 + 地图取点器
```

---

## 四、数据模型

所有文字数据存在 `localStorage['aht.v1']`，是一个 JSON 对象：

```js
{
  site:      { title, sub, seal, intro, about, heroImage },
  profile:   { name, alias, quote, portrait, identity, personality, appearance, bio,
               fields:[{k,v}] },
  eras:      [{ id, name, range, note }],          // 时代（地图与时间轴共用）
  places:    [{ id, eraId, name, region, lat, lon, desc, storyIds:[] }],  // 地图标记，真实经纬度
  timeline:  [{ id, eraId, placeId, year, title, desc, tag, link }],  // 历史时间轴
  concepts:  [{ id, order, title, desc, link }],   // 祂的概念分节点（另一条浏览轴）
  relations: [{ id, name, group, role, color, portrait, album:[], desc, link, storyIds:[] }],
  articles:  [{ id, kind:'story'|'note', title, subtitle, coverType, coverQuote, coverImage,
                medium, era, region, year, tags:[], avatarIds:[], body, pinned }],
  misreads:  [{ id, kind:'misread'|'slander', title, era, region, summary, tags:[],
                versions:[{label,body}], refs:[{label,url}], noteId, storyIds:[] }],
  things:    [{ id, type:'hold'|'industry'|'work', name, imageId, desc, tags:[] }],
  fans:      [{ id, title, author, imageId, tags:[], url, featured }],
  gallery:   [{ id, title, caption, tags:[], imageId, ratio }],
  images:    [{ id, name, at }]
}
```

几处约定：

- **`relations.group`**：`avatar`（马甲）/ `god`（神族）/ `power`（位高权重的人）/ `mortal`（未被记名的普通人）/ `special`（特殊个体）。
  - `group === 'avatar'`（或 `role` 含「马甲」）的条目会进入「祂的马甲」页，其 `color` 就是进入该马甲页时的整站强调色（副色由 `hueShift(+150°)` 推出）。
  - 关系网只显示非马甲的条目。
- **`articles.kind`**：`story` 进「故事全列表」，`note` 进「祂的视角」。两者都走同一个阅读器 `read.html?id=`。
- **`places.lat / lon`** 是真实经纬度（北纬为正 / 西经为负），页面上通过 `worldmap.js` 的投影函数换算成图面坐标，所以标记点永远落在真实地理位置上；后台「地图标记」里可以直接点地图取点。
- 图片存在 `IndexedDB`（库 `aht_imgs`），写不进去时自动降级为 base64 存 localStorage。导出 JSON **不含**图片二进制。

### 世界地图是怎么来的

`assets/js/worldmap.js` 是**生成好的静态数据**，站点本身不依赖任何地图服务、不加载任何瓦片、不含任何密钥，离线可用：

- 海岸线取自 **Natural Earth 110m 陆地数据**（公有领域，美国 NGA 制作），仅保留海岸线轮廓，**不含任何政区界线**；
- 投影为 **Natural Earth（Robinson 风格）投影**，裁掉南极洲后归一化到 `1000 × 443` 的 viewBox；
- 同一文件里给出 `proj(lon, lat)` 与逆投影 `unproj(x, y)`，前台标记定位与后台「点图取点」用的是同一套换算，所以不会错位；
- 视觉上以「陆地淡填充 + 海岸线描边 + 每个陆块向外扩三圈的等高线回声 + 手绘抖动滤镜」呈现，并叠加投影后的经纬网；
- 角标标注「示意性线图 · 仅海岸线轮廓 · 不作为界线依据」。

### 种子版本机制

`store.js` 里有 `SEED_VERSION`。首次打开写入种子数据；之后以本地数据为准。
当种子升级且用户**没有**手动改过（`dirty === false`）时，会用新种子覆盖本地数据；一旦用户在后台改过任何东西，就打上 `dirty`，此后不再被覆盖。

---

## 五、正文 Markdown 语法

自研解析器（`assets/js/markdown.js`），除标准语法外支持三种自定义标记：

| 写法 | 效果 |
|---|---|
| `::题记::` | 开篇题记（居中斜体） |
| `{{夹注}}` | 行间小字夹注 |
| `%%朱批%%` | 朱批（强调色批注） |

---

## 六、后台

`poor-dot-created.html` 是隐藏管理页：内容与后台完全一致，但不在任何导航/页脚里显示，也不设口令——站主直接用这个隐藏网址打开就能编辑。安全靠「隐蔽」而非「加密」，网址请勿外泄。`admin.html` 保留作同功能备用入口。

15 个面板：站点 / 档案、主视觉、时代、地图标记、时间轴、概念分节点、马甲与关系、故事、祂的笔记、目击记录、祂的东西、网友作品、插画、图片库、备份。

后台是 **schema 驱动**的：新增一个集合，只要在 `assets/js/admin.js` 的 `SCHEMA` 里加一段字段描述即可，无需写界面代码。字段类型支持 `text / textarea / select / num / color / bool / tags / img / imgmulti / storymulti / map`。

`map` 类型是「地图标记」专用的取点器：渲染同一张世界地图线图，点击任意位置即把该点经纬度写进 `lat` / `lon` 两个输入框（用的是逆投影），手填经纬度时标记也会实时移动。

---

## 七、已验证

jsdom 冒烟测试 **133 项全通过**：九个栏目首页渲染、马甲页卡片与详情配色、顶部切换条确已移除、世界地图海岸线 / 经纬网 / 苏美尔点位真实投影校验、竖向拉轴刻度、地图时代切换、误读版本切换、置物架联动、tag 与关键词检索、8 套阅读器载体、后台 15 个面板的增删改、地图取点器与 Markdown 实时预览。
