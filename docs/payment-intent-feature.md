# 💰 付费意愿追踪功能

## 功能说明

为了更好地了解用户对付费功能的兴趣，我们添加了一个简单的追踪机制：当用户在"解锁惩罚表"页面点击"确认支付"按钮时，系统会在后端记录这个行为。

这个功能完全在后台运行，不影响用户体验，但可以帮助我们：
- 📊 了解有多少用户对付费功能感兴趣
- 💡 为未来的付费功能提供数据支持
- 🎯 优化定价策略

---

## 实现细节

### 1. 数据库变更

在 `pr_users` 表中添加了新字段：

```sql
showed_payment_intent BOOLEAN DEFAULT FALSE
```

### 2. 应用更改

**在 Supabase SQL Editor 中运行**：

```bash
# 运行迁移脚本
/Users/ran/Desktop/usc/聚会惩罚app/docs/add-payment-intent-field.sql
```

或者直接运行：

```sql
ALTER TABLE pr_users 
ADD COLUMN IF NOT EXISTS showed_payment_intent BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN pr_users.showed_payment_intent IS '是否点击过付费按钮，表示有付费意愿';
```

### 3. 代码变更

#### 📄 `database.ts`
```typescript
export interface User {
  // ... 其他字段
  showed_payment_intent?: boolean; // 是否点击过付费按钮
}
```

#### 📄 `authStore.ts`
新增方法：
```typescript
recordPaymentIntent: async () => Promise<void>
```

#### 📄 `UnlockScreen.tsx`
在用户点击"确认支付"时调用：
```typescript
recordPaymentIntent().catch(err => 
  console.error('Failed to record payment intent:', err)
);
```

---

## 查询统计数据

### 查看有付费意愿的用户数量

```sql
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN showed_payment_intent = true THEN 1 ELSE 0 END) as users_with_payment_intent,
  ROUND(
    100.0 * SUM(CASE WHEN showed_payment_intent = true THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) as percentage
FROM pr_users;
```

### 查看有付费意愿的用户详情

```sql
SELECT 
  id,
  name,
  instruments,
  created_at,
  showed_payment_intent
FROM pr_users
WHERE showed_payment_intent = true
ORDER BY created_at DESC;
```

### 按创建时间统计付费意愿趋势

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_users,
  SUM(CASE WHEN showed_payment_intent = true THEN 1 ELSE 0 END) as users_with_intent
FROM pr_users
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 数据导出（用于分析）

```sql
-- 导出所有用户的付费意愿数据
SELECT 
  id,
  name,
  ARRAY_TO_STRING(instruments, ', ') as instruments,
  punctuality,
  showed_payment_intent,
  created_at
FROM pr_users
ORDER BY created_at DESC;
```

---

## 隐私说明

- ✅ 只记录用户是否点击过付费按钮（布尔值）
- ✅ 不记录点击时间或频率
- ✅ 不影响用户体验
- ✅ 完全在后台运行
- ✅ 第一次点击后不再重复记录

---

## 注意事项

1. **非阻塞操作**：记录操作在后台进行，即使失败也不会影响解锁流程
2. **仅记录一次**：同一用户多次点击只记录第一次
3. **匿名性**：这个标记对其他用户不可见
4. **演示模式**：当前为演示模式，点击即可"解锁"（无需真实支付）

---

## 后续优化建议

如果需要更详细的追踪，可以考虑：

1. **记录点击时间**：添加 `payment_intent_at TIMESTAMP`
2. **记录点击次数**：添加 `payment_intent_count INTEGER`
3. **记录群组上下文**：在哪个群组尝试解锁
4. **A/B 测试**：不同价格点的转化率

但目前这个简单的布尔标记已经足够了解基本的用户意向。


