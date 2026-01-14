# 测试踢出成员实时更新功能

## 📋 测试目标

验证：
1. 成员被踢出时，其他成员能实时看到更新
2. 被踢出的成员能收到提示信息并导航到加入群组页面

---

## 🧪 测试场景 1：其他成员看到实时更新

### 测试步骤

**准备：** 3 个设备
- 设备 A：管理员
- 设备 B：普通成员（将被踢出）
- 设备 C：普通成员（观察者）

**操作：**
1. 三个设备都进入同一个群组的圆桌页面
2. 设备 A（管理员）进入设置 → 管理成员
3. 设备 A 踢出设备 B 的用户
4. 观察设备 C

**预期结果：**
- ✅ 设备 C 自动刷新，设备 B 的用户从圆桌上消失
- ✅ 响应时间：< 2 秒
- ✅ 无需手动刷新

**控制台日志（设备 C）：**
```
[Realtime] Group members changed: DELETE
[GroupStore] Loading members for group: xxx
```

---

## 🧪 测试场景 2：被踢出的用户收到提示

### 测试步骤

**准备：** 2 个设备
- 设备 A：管理员
- 设备 B：普通成员（将被踢出）

**操作：**
1. 设备 B 在圆桌页面保持打开
2. 设备 A（管理员）进入设置 → 管理成员
3. 设备 A 踢出设备 B 的用户
4. 观察设备 B

**预期结果：**
- ✅ 设备 B 弹出提示："已被移除 - 您已被管理员移除，请加入新的群组吧！"
- ✅ 点击"确定"后，自动导航到"加入群组/创建群组"页面
- ✅ 设备 B 的用户不再显示在原群组中

**控制台日志（设备 B）：**
```
[Realtime] Group members changed: DELETE
[Realtime] Current user was kicked from group
[RoundTable] User was kicked from group
[GroupStore] Loading user groups for: xxx
```

---

## 🧪 测试场景 3：被踢出后重新加入

### 测试步骤

**准备：** 2 个设备
- 设备 A：管理员
- 设备 B：普通成员（被踢出后重新加入）

**操作：**
1. 设备 A 踢出设备 B 的用户
2. 设备 B 收到提示，点击"确定"
3. 设备 B 输入邀请码重新加入群组
4. 观察设备 A 和设备 B

**预期结果：**
- ✅ 设备 A 自动显示设备 B 重新加入
- ✅ 设备 B 成功进入圆桌页面
- ✅ 所有数据正常显示

---

## 🧪 测试场景 4：管理员无法踢出自己

### 测试步骤

**操作：**
1. 管理员进入设置 → 管理成员
2. 观察管理员自己的条目

**预期结果：**
- ✅ 管理员自己显示"（你）"标签
- ✅ 管理员显示"管理员"角色标签
- ✅ 管理员自己没有"❌"踢出按钮

---

## 🧪 测试场景 5：多个成员同时被踢出

### 测试步骤

**准备：** 4 个设备
- 设备 A：管理员
- 设备 B、C、D：普通成员

**操作：**
1. 所有设备在圆桌页面
2. 设备 A 快速踢出设备 B 和设备 C
3. 观察所有设备

**预期结果：**
- ✅ 设备 B 和设备 C 都收到提示
- ✅ 设备 D 自动刷新，看不到设备 B 和 C
- ✅ 设备 A 的成员列表自动更新

---

## 🐛 常见问题排查

### 问题 1：其他成员看不到实时更新

**可能原因：**
- Realtime 未启用（运行 `check-realtime-setup.sql`）
- 网络连接问题

**检查：**
```sql
-- 在 Supabase SQL Editor 运行
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'pr_members';
```

### 问题 2：被踢出的用户没有收到提示

**可能原因：**
- `useRealtime` 的 `onKicked` 回调未触发
- Realtime DELETE 事件未收到

**检查控制台：**
应该看到：
```
[Realtime] Group members changed: DELETE
[Realtime] Current user was kicked from group
```

如果看不到，检查：
1. `payload.old?.user_id` 是否正确
2. 用户 ID 是否匹配

### 问题 3：提示弹出后无法导航

**可能原因：**
- Navigation 引用问题
- 路由配置问题

**检查：**
确保 `JoinCreate` 路由存在于 `RootStackParamList`

---

## ✅ 验证清单

测试完成后，确认：

- [ ] 其他成员能实时看到被踢出的用户消失
- [ ] 被踢出的用户收到友好提示
- [ ] 被踢出的用户能成功导航到加入页面
- [ ] 被踢出的用户可以重新加入群组
- [ ] 管理员无法踢出自己
- [ ] 控制台日志正确显示 DELETE 事件
- [ ] 响应时间在 2 秒内

---

## 📝 实现细节

### 1. useRealtime Hook

```typescript
export function useRealtime(groupId: string | null, onKicked?: () => void) {
  // 监听成员变化
  .on('postgres_changes', {
    event: '*',
    table: 'pr_members',
    filter: `group_id=eq.${groupId}`,
  }, async (payload) => {
    // 检查是否是当前用户被删除
    if (payload.eventType === 'DELETE' && user && payload.old?.user_id === user.id) {
      if (onKicked) {
        onKicked();
      }
      return;
    }
    
    // 重新加载成员列表
    const members = await loadMembers(groupId);
    
    // 双重检查：确保当前用户还在成员列表中
    if (payload.eventType === 'DELETE' && user) {
      const isStillMember = members.some(m => m.user_id === user.id);
      if (!isStillMember && onKicked) {
        onKicked();
      }
    }
  });
}
```

### 2. RoundTableScreen

```typescript
const handleKicked = async () => {
  // 重新加载用户群组列表
  if (user) {
    await loadUserGroups(user.id);
  }
  
  // 清除当前群组
  clearGroup();
  
  // 显示提示
  Alert.alert(
    '已被移除',
    '您已被管理员移除，请加入新的群组吧！',
    [{ text: '确定', onPress: () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'JoinCreate' }],
      });
    }}],
    { cancelable: false }
  );
};

useRealtime(currentGroup?.id || null, handleKicked);
```

---

## 🎯 测试完成标准

所有测试场景通过，且：
1. 实时更新延迟 < 2 秒
2. 用户体验流畅，无卡顿
3. 提示信息清晰友好
4. 控制台无错误日志
5. 被踢出的用户能顺利重新加入

