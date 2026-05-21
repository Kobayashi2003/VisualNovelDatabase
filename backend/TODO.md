# VNDB Kana API — 代码审查问题

## 待优化（能正常运行但实现不够规范）

---

### `Staff.aid` — 列类型有误

**位置：** `vndb/database/models.py`、`vndb/migrations/`

Kana API 返回 `staff.aid` 为**整数**，但本地模型定义为 `Column(String)`。
SQLAlchemy 会将其转为字符串存储，数据不会丢失，但语义上类型有误，可能影响排序或数值比较。

**需要的修改：**
- 将 `Staff` 模型中的 `aid = Column(String)` 改为 `aid = Column(Integer)`
- 生成并执行数据库迁移

---

### `Character.birthday` — 存储格式不规范

**位置：** `vndb/database/models.py`、`vndb/search/common.py`、`vndb/migrations/`

API 返回 `birthday` 为整数数组 `[month, day]`，但模型以 `Column(String)` 存储。
`process_birthday()` 调用 `str()` 后存入 `"[3, 14]"` 这样的字符串——数据可读，但格式与
API 类型不一致。

**需要的修改：**
- 将 `Character` 中的 `birthday = Column(String)` 改为 `birthday = Column(ARRAY(Integer))`
- 更新 `search/common.py` 中的 `process_birthday()` 使其直接返回原始数组
- 生成并执行数据库迁移

---

### `Release.resolution` — 存储格式不规范

**位置：** `vndb/database/models.py`、`vndb/search/common.py`、`vndb/migrations/`

API 返回 `resolution` 可能为 `null`、字符串 `"non-standard"` 或整数数组 `[width, height]`。
`process_resolution()` 调用 `str()` 将其存为 `"[1920, 1080]"` 字符串——与 `birthday` 问题相同，
数据可读但类型不规范。

**需要的修改：**
- 将 `Release` 中的 `resolution = Column(String)` 改为 `resolution = Column(ARRAY(Integer))`
  （需同时处理 `null` 和 `"non-standard"` 的情况，建议在迁移前评估是否需要额外的标记列）
- 相应更新 `process_resolution()`
- 生成并执行数据库迁移
