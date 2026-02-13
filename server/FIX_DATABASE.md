# 修复数据库 Schema 错误

## 问题
错误：`The column main.Game.isGameDistribution does not exist in the current database`

## 原因
数据库结构没有更新，缺少新增的字段：
- `isGameDistribution`
- `gameDistributionId`
- `sourceUrl`
- `htmlFileName`

## 解决步骤

在服务器上执行以下命令：

```bash
cd /data/projects/SolaGameCube/server

# 方法 1：使用 migrate deploy（生产环境推荐）
npx prisma migrate deploy

# 或者方法 2：使用 migrate dev（开发环境）
npx prisma migrate dev
```

**注意：**
- `migrate deploy` 适用于生产环境，只应用未执行的迁移，不会创建新的迁移
- `migrate dev` 适用于开发环境，会创建新的迁移（如果有 schema 变更）

## 如果迁移失败

如果迁移失败，可以尝试：

```bash
# 1. 检查迁移状态
npx prisma migrate status

# 2. 如果数据库和 schema 不同步，可以重置（⚠️ 会丢失数据）
npx prisma migrate reset

# 3. 或者手动应用迁移
npx prisma db push
```

## 验证

迁移成功后，可以验证：

```bash
# 查看数据库结构
npx prisma studio
```

或者直接重启服务，看是否还有错误。
