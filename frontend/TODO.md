- VN详情页中，有时候对于刚抓取的页面，releases面板中显示的所有releases都被视为了非官方然后进行了暗淡处理，然而在刷新页面之后、或者之后再重进页面这个问题会消失
  → 前端已缓解：VNReleases 只在 `official === false`（明确已知非官方）时暗淡，避免刚抓取时 `official` 未定值被当成非官方。
  → 后端待办：刚抓取的 VN 内嵌 releases 的 `official` 字段有时尚未解析（undefined），根因在抓取/序列化侧。
