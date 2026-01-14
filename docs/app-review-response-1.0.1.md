# App Review Response - Version 1.0.1

## Response to Apple Review Team

---

### Subject: Response to Rejection - Punishment Roulette v1.0.1

Dear App Review Team,

Thank you for testing our app. We understand the issue you encountered and would like to clarify how the app works.

---

## Why "开始惩罚轮盘" (Start Punishment Roulette) Was Not Available

**This is a multiplayer party game** that requires at least 2 users and some punishment items to be set up before the game can start. The "Start Punishment Roulette" button only appears when:

1. ✅ You are the **group admin** (creator of the group)
2. ✅ At least **one punishment item** has been added
3. ✅ At least **2 members** are in the group

---

## How to Test the App (Step-by-Step)

### Option 1: Single Device Testing (Recommended)

You can test the full flow on a single iPhone by creating multiple users:

#### Step 1: Create First User (Admin)
1. Open the app
2. Enter a name (e.g., "Alice")
3. Select any icon/instrument
4. Click "创建群组" (Create Group)
5. Enter group name (e.g., "Test Group")
6. Click "创建" (Create)
7. **Note the 4-digit invite code** (e.g., "A1B2")

#### Step 2: Add Punishments
1. On the main screen, tap any member's avatar
2. Add a punishment (e.g., "Sing a song")
3. Click "添加" (Add)
4. Repeat to add 2-3 punishments

#### Step 3: Create Second User
1. Click "设置" (Settings) in top-right
2. Scroll down and click "退出群组" (Leave Group)
3. Click "登出" (Logout)
4. Enter a different name (e.g., "Bob")
5. Select any icon
6. Click "加入群组" (Join Group)
7. Enter the invite code from Step 1
8. Join the group

#### Step 4: Add More Punishments
1. Tap other members' avatars
2. Add 2-3 more punishments
3. Now you have enough punishments to start

#### Step 5: Switch Back to Admin
1. Logout again (Settings → Logout)
2. Login with first user's name ("Alice")
3. You will automatically rejoin your group

#### Step 6: Start the Game
1. Now you'll see **"开始惩罚轮盘"** button (only visible to admin)
2. Click it to start the game
3. Select which member is "late"
4. The punishment roulette will spin!

---

### Option 2: Two-Device Testing

You can also test with 2 devices (2 iPhones or iPhone + iPad):

1. **Device 1**: Create group and note invite code
2. **Device 2**: Join group using the code
3. **Both devices**: Add punishments for each other
4. **Device 1 (admin)**: Click "开始惩罚轮盘" to start

---

## Regarding iPad Compatibility

We noticed the review mentioned testing on **iPad Air 11-inch (M3)**. 

**This app is designed for iPhone only.** We have configured:
- `"supportsTablet": false` in app.json
- `"UIDeviceFamily": [1]` in Info.plist (1 = iPhone only)

The app should not appear in iPad App Store. If it does, this may be a configuration issue on our end that we're happy to fix based on your guidance.

---

## Summary

The issue is not a bug, but rather:
1. The app requires **multiple users** to function (it's a party game)
2. The **"Start" button is only visible to the group admin**
3. At least **one punishment must be added** before starting

We understand this creates a more complex testing scenario. If you'd like, we can provide:
- A video demo of the complete flow
- Remote testing assistance via TestFlight
- Any additional information you need

---

## Changes in Version 1.0.1

- Fixed iPhone-only configuration to prevent iPad installation
- Added payment intent tracking (backend analytics only, no user-facing changes)
- Minor bug fixes

---

Thank you for your patience in reviewing our app. We're happy to provide any additional information or testing assistance you may need.

Best regards,
Punishment Roulette Team

---

## 中文版本（备用）

尊敬的审核团队：

感谢您测试我们的应用。关于无法"开始惩罚轮盘"的问题，我想说明：

**这是一个多人派对游戏**，需要满足以下条件才能开始：
1. 您必须是群组管理员（创建者）
2. 至少添加1个惩罚项目
3. 至少有2名成员

### 完整测试步骤：

1. 创建用户和群组，记下邀请码
2. 点击成员头像添加2-3个惩罚
3. 退出并创建第二个用户
4. 用邀请码加入群组
5. 再添加几个惩罚
6. 重新登录第一个用户（管理员）
7. 此时会看到"开始惩罚轮盘"按钮

关于iPad：本应用仅支持iPhone，不应在iPad上安装。

如需演示视频或远程协助测试，我们随时提供帮助。

谢谢！


