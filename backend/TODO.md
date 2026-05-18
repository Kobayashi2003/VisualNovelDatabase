# VNDB Kana API — 代码审查问题

优先级顺序：**待追加 → 待优化**

---

## 第一部分 — 待追加

---

### `VN.image` — 缺少 `votecount` 子字段

**位置：** `vndb/search/remote/fields.py`

`VNDBFields.VN.IMAGE._fields` 缺少 `'VOTECOUNT'`。`image` 列为 JSONB，无需迁移，
该子字段仅是未被请求和存储。

**需要的修改：**
- 在 `VNDBFields.VN.IMAGE._fields` 中添加 `'VOTECOUNT'`
- 现有记录可通过 `backfill_column('vn', 'image', remote_fields=[...])` 补填

---

### `VN.screenshots` — 缺少 `id` 和 `votecount` 子字段

**位置：** `vndb/search/remote/fields.py`

API 的 `screenshots.*` 与 `image.*` 拥有相同的子字段（包括 `id` 和 `votecount`），
但 `VNDBFields.VN.SCREENSHOTS._fields` 同时缺少 `'ID'` 和 `'VOTECOUNT'`。

**需要的修改：**
- 在 `VNDBFields.VN.SCREENSHOTS._fields` 中添加 `'ID'` 和 `'VOTECOUNT'`

---

### `Character.image` — 缺少 `votecount` 子字段

**位置：** `vndb/search/remote/fields.py`

API 文档说明角色的 `image.*` 子字段与 VN 的 `image.*` 相同（除 `thumbnail` 和
`thumbnail_dims` 外），包含 `votecount`。
`VNDBFields.Character.IMAGE._fields` 未包含 `'VOTECOUNT'`。

**需要的修改：**
- 在 `VNDBFields.Character.IMAGE._fields` 中添加 `'VOTECOUNT'`

---

### `Release.images` — 缺少 `votecount` 子字段

**位置：** `vndb/search/remote/fields.py`

`Release.images.*` 继承了 VN 的所有 `image.*` 子字段，包括 `votecount`。
`VNDBFields.Release.IMAGES._fields` 未包含 `'VOTECOUNT'`。

**需要的修改：**
- 在 `VNDBFields.Release.IMAGES._fields` 中添加 `'VOTECOUNT'`

---

### `Character.gender` — 整列及字段均缺失

**位置：** `vndb/database/models.py`、`vndb/search/remote/fields.py`、`vndb/migrations/`

Kana API 于 2025-04-05 新增了角色的 `gender` 字段。`Character` 模型和 `VNDBFields.Character`
均未包含此字段。

**注意类型：** API 返回的 `gender` 是**两个字符串组成的数组** `[非剧透, 剧透]`
（可选值：`"m"`、`"f"`、`"o"`、`"a"` 或 `null`），结构与 `character.sex` 相同。
必须使用 `Column(ARRAY(String))`，**不能**用 `Column(String)`。

**需要的修改：**
- 在 `Character` 中添加 `gender = Column(ARRAY(String))`
- 在 `VNDBFields.Character._fields` 中添加 `'GENDER'`
- 生成并执行数据库迁移
- 使用 `backfill_column` 对现有记录补填

---

### `Trait.sexual` — 整列及字段均缺失

**位置：** `vndb/database/models.py`、`vndb/search/remote/fields.py`、`vndb/migrations/`

Kana API 于 2025-06-02 新增了特性的 `sexual` 布尔字段，用于标识该特性是否为性相关内容。
`Trait` 模型和 `VNDBFields.Trait` 均未包含此字段。

**需要的修改：**
- 在 `Trait` 中添加 `sexual = Column(Boolean)`
- 在 `VNDBFields.Trait._fields` 中添加 `'SEXUAL'`
- 生成并执行数据库迁移
- 使用 `backfill_column` 对现有记录补填

---

## 第二部分 — 待优化（能正常运行但实现不够规范）

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

# 其它

- 考虑加入设置页面，用于控制例如query的默认参数（如`from=local`）等全局选项，避免在代码中硬编码
- search_releases_by_producer_id
- search_characters_by_seiyuu_id
- 列补全函数