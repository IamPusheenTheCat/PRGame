# 🧪 多用户登录切换测试指南

## 测试目的

验证以下功能：
1. ✅ 同一设备可以切换不同用户
2. ✅ 用户登出后，另一个用户登录能看到自己的群组
3. ✅ App关闭再打开会自动登录上次的账号
4. ✅ 点击"登出"后不会自动登录

---

## 📋 测试 1：自动登录功能

### 测试步骤

1. **首次登录**
   ```
   - 打开 App
   - 输入用户名 "Alice"
   - 选择图标
   - 创建群组 "Test Group"
   - 记下邀请码（例如：A1B2）
   ```

2. **关闭并重启 App（不点击登出）**
   ```
   - 完全关闭 App（从后台划掉）
   - 重新打开 App
   ```

3. **验证结果**
   ```
   ✅ 应该自动登录为 "Alice"
   ✅ 应该直接进入 "Test Group" 圆桌页面
   ✅ 不需要重新输入用户名
   ```

### 预期日志
```
[Auth] Initializing...
[Auth] Device ID: exists
[Auth] Looking up user with device_id: xxx
[Auth] User lookup result: found
[Nav] User logged in, loading groups...
[Nav] Auto-switching to first group: Test Group
```

---

## 📋 测试 2：登出后不自动登录

### 测试步骤

1. **继续上一个测试，当前已登录 "Alice"**

2. **点击登出**
   ```
   - 点击右上角设置图标
   - 滚动到底部
   - 点击 "登出" 按钮
   ```

3. **关闭并重启 App**
   ```
   - 完全关闭 App
   - 重新打开 App
   ```

4. **验证结果**
   ```
   ✅ 应该显示欢迎页或登录页
   ❌ 不应该自动登录为 "Alice"
   ✅ 需要重新输入用户名才能登录
   ```

### 预期日志
```
[Auth] Initializing...
[Auth] Device ID: not found
[Auth] Initialized without user
```

---

## 📋 测试 3：多用户切换（核心功能）

### 测试步骤

#### 第一步：创建用户 A 和群组

1. **登录用户 A**
   ```
   - 打开 App
   - 输入 "Alice"
   - 选择吉他图标 🎸
   - 创建群组 "Band Group"
   - 记下邀请码（例如：X7Y9）
   ```

2. **添加惩罚**
   ```
   - 点击 Alice 自己的头像
   - 添加惩罚："唱一首歌"
   - 添加惩罚："跳一支舞"
   ```

#### 第二步：切换到用户 B

3. **登出用户 A**
   ```
   - 设置 → 登出
   ```

4. **登录用户 B**
   ```
   - 输入 "Bob"
   - 选择鼓图标 🥁
   - 点击"加入群组"
   - 输入邀请码：X7Y9
   ```

5. **验证用户 B 状态**
   ```
   ✅ 应该能看到 "Band Group"
   ✅ 应该能看到成员：Alice, Bob
   ✅ 应该能看到 Alice 添加的 2 个惩罚
   ```

6. **用户 B 添加惩罚**
   ```
   - 点击 Alice 的头像
   - 添加惩罚："弹贝斯演奏一首"
   ```

#### 第三步：切换回用户 A

7. **登出用户 B**
   ```
   - 设置 → 登出
   ```

8. **重新登录用户 A**
   ```
   - 输入 "Alice"（必须完全一样）
   - 选择任意图标（会被更新）
   ```

9. **验证用户 A 回到群组**
   ```
   ✅ 应该自动进入 "Band Group"（不需要重新输入邀请码）
   ✅ 应该看到 Bob 添加的惩罚
   ✅ 应该看到自己之前添加的惩罚
   ✅ "开始惩罚轮盘" 按钮应该可见（Alice 是管理员）
   ```

#### 第四步：启动游戏（只有管理员可见）

10. **用户 A 启动游戏**
    ```
    - 点击 "开始惩罚轮盘"
    - 选择 Alice（迟到者）
    - 点击 "开始抽取"
    - 应该能看到轮盘动画
    - 应该能抽到一个惩罚
    ```

11. **切换到用户 B 查看**
    ```
    - 登出 Alice
    - 登录 Bob
    - 验证：❌ 没有 "开始惩罚轮盘" 按钮（Bob 不是管理员）
    - 但可以看到所有成员和惩罚
    ```

---

## 📋 测试 4：App 关闭重启后状态保持（已修复）

### 测试步骤

1. **当前已登录 "Alice"，在 "Band Group" 中**

2. **完全关闭 App**
   ```
   - 按 Home 键
   - 从后台划掉 App
   ```

3. **重新打开 App**
   ```
   - 点击 App 图标
   ```

4. **验证结果**
   ```
   ✅ 自动登录为 "Alice"
   ✅ 显示短暂的"加载中..."（约 0.5 秒）
   ✅ 自动进入 "Band Group" 圆桌页面
   ✅ 所有数据都在（成员、惩罚）
   ✅ "开始惩罚轮盘" 按钮可见（管理员）
   ⚠️ 不会停留在"加入/创建群组"页面
   ```

### 预期日志
```
[Nav] User logged in, loading groups...
[GroupStore] Loading user groups for: xxx
[GroupStore] Found groups: 1
[Nav] Auto-switching to first group: Band Group
[JoinCreate] Checking groups...
[JoinCreate] User has group, navigating to RoundTable
```

---

## 🐛 已修复的 Bug

### Bug 1: 多用户切换时群组混淆

**Bug 描述**
之前的版本中，如果用户 A 登出后，用户 B 登录，用户 B 会看到用户 A 的群组或者看不到任何群组。

**修复内容**
1. 移除了 `userGroups.length === 0` 的条件检查
2. 每次用户登录都会重新从数据库加载群组
3. 用户登出时自动清空所有群组状态

**验证修复**
```javascript
// 修复前（有 bug）
if (user && userGroups.length === 0) {  // ❌ 第二次登录时 length 不为 0，不会加载
  await loadUserGroups(user.id);
}

// 修复后（正确）
if (user) {  // ✅ 每次用户登录都会加载
  await loadUserGroups(user.id);
} else {
  clearGroup();  // ✅ 登出时清空
}
```

---

### Bug 2: 重新打开 App 后停留在"加入/创建群组"页面

**Bug 描述**
用户关闭 App 再打开时，虽然能自动登录，但会停留在"加入/创建群组"页面，看不到已有的群组。

**原因**
导航初始化时，群组数据还在异步加载中，`currentGroup` 为 `null`，所以导航到 `JoinCreate` 页面。

**修复内容**
在 `JoinCreateScreen` 中添加了自动检测逻辑：
1. 进入页面后等待 500ms 让群组加载完成
2. 如果检测到用户已有群组，自动导航到圆桌页面
3. 如果确实没有群组，显示"加入/创建"选项

**验证修复**
```javascript
// 在 JoinCreateScreen 中添加
useEffect(() => {
  const timer = setTimeout(() => {
    if (currentGroup) {
      // ✅ 有群组 → 自动跳转
      navigation.reset({ routes: [{ name: 'RoundTable' }] });
    } else {
      // ✅ 没有群组 → 显示选项
      setIsCheckingGroups(false);
    }
  }, 500);
  return () => clearTimeout(timer);
}, [currentGroup]);
```

---

## 📊 测试检查清单

### 自动登录
- [ ] App 关闭再打开，自动登录上次的账号
- [ ] 点击"登出"后关闭 App，不会自动登录
- [ ] 自动登录后能看到之前的群组

### 多用户切换
- [ ] 用户 A 登出后，用户 B 能正常登录
- [ ] 用户 B 能看到自己加入的群组，而不是用户 A 的群组
- [ ] 用户 B 登出后，用户 A 重新登录能回到自己的群组
- [ ] 用户数据不会混淆（惩罚、成员列表等）

### 管理员权限
- [ ] 只有管理员能看到"开始惩罚轮盘"按钮
- [ ] 非管理员用户看不到该按钮
- [ ] 管理员能正常启动游戏

### 数据持久化
- [ ] 添加的惩罚在切换用户后仍然存在
- [ ] 群组成员列表正确
- [ ] 邀请码始终有效

---

## 🎥 测试演示脚本（给审核团队）

如果需要录制演示视频，按以下脚本操作：

```
00:00 - 00:20  创建用户 Alice，创建群组，添加 2 个惩罚
00:20 - 00:30  点击设置 → 登出
00:30 - 00:50  创建用户 Bob，加入群组，添加 2 个惩罚
00:50 - 01:00  点击设置 → 登出
01:00 - 01:20  重新登录 Alice（自动回到群组）
01:20 - 01:40  点击"开始惩罚轮盘"，选择迟到者，抽取惩罚
01:40 - 02:00  完成惩罚，猜测作者
```

---

## 💡 技术细节

### 设备 ID 存储
```javascript
const DEVICE_ID_KEY = 'punishment_roulette_device_id';

// 登录时保存
await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);

// 登出时删除
await AsyncStorage.removeItem(DEVICE_ID_KEY);

// App启动时读取
const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
```

### 用户识别逻辑
```javascript
// 1. 用户通过 device_id 识别（不是用户名）
// 2. 如果 device_id 存在且数据库有匹配的用户 → 自动登录
// 3. 如果 device_id 不存在 → 显示登录页
// 4. 同一设备可以通过"登出"切换用户
```

### 群组加载逻辑
```javascript
// 1. 用户登录成功 → 查询用户所属的所有群组
// 2. 如果有群组 → 自动切换到第一个群组
// 3. 加载群组的成员和惩罚列表
// 4. 用户登出 → 清空所有群组状态
```

---

## ❓ 常见问题

### Q: 为什么用户 A 登出后，用户 B 能正常工作了？
A: 因为我们修复了 bug，现在每次用户登录都会重新从数据库加载该用户的群组，而不是使用之前缓存的数据。

### Q: 用户数据存储在哪里？
A: 
- 设备 ID：本地 AsyncStorage
- 用户信息、群组、惩罚：Supabase 数据库

### Q: 如果我想清除所有数据重新开始怎么办？
A: 点击"登出"，然后重新安装 App，或者在设置中清除应用数据。

---

## 🎯 测试成功标准

所有以下情况都应该正常工作：
1. ✅ 单用户正常使用（创建、加入群组）
2. ✅ 多用户在同一设备切换
3. ✅ App 关闭重启后自动登录
4. ✅ 管理员和非管理员权限区分
5. ✅ 数据不会混淆或丢失

