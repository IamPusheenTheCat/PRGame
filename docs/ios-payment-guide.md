# iOS 内购实现指南

## 前置要求

1. **Apple 开发者账号** - $99/年
2. **App Store Connect 账号** - 用于配置内购产品
3. **Expo Development Build** - 不能用 Expo Go（内购需要原生模块）

---

## 方案一：RevenueCat（推荐）

RevenueCat 简化了 Apple IAP 的实现，处理收据验证、订阅管理等复杂逻辑。

### 1. 注册 RevenueCat

访问 https://www.revenuecat.com/ 注册免费账号

### 2. 安装依赖

```bash
cd app
npx expo install react-native-purchases
```

### 3. 配置 App Store Connect

1. 登录 [App Store Connect](https://appstoreconnect.apple.com/)
2. 创建 App（如果还没有）
3. 进入 **功能** > **App 内购买项目**
4. 添加产品：
   - **类型**: 消耗型（解锁惩罚表）
   - **产品 ID**: `com.yourapp.unlock_punishments`
   - **参考名称**: 解锁惩罚来源
   - **价格**: $2.99 (Tier 3)

### 4. 配置 RevenueCat

1. 在 RevenueCat 控制台创建项目
2. 添加 iOS App，输入 Bundle ID
3. 上传 App Store Connect API Key
4. 创建 Entitlement: `unlock_punishments`
5. 创建 Offering，关联产品

### 5. 代码实现

```typescript
// app/src/lib/purchases.ts
import Purchases, { PurchasesPackage } from 'react-native-purchases';

const REVENUECAT_API_KEY = 'your_revenuecat_api_key';

// 初始化（在 App.tsx 中调用）
export async function initializePurchases(userId: string) {
  await Purchases.configure({
    apiKey: REVENUECAT_API_KEY,
    appUserID: userId,
  });
}

// 获取可购买产品
export async function getUnlockPackage(): Promise<PurchasesPackage | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages[0] || null;
  } catch (error) {
    console.error('获取产品失败:', error);
    return null;
  }
}

// 购买解锁
export async function purchaseUnlock(): Promise<boolean> {
  try {
    const pkg = await getUnlockPackage();
    if (!pkg) {
      throw new Error('产品不可用');
    }
    
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    
    // 检查是否购买成功
    if (customerInfo.entitlements.active['unlock_punishments']) {
      return true;
    }
    return false;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('用户取消购买');
    } else {
      console.error('购买失败:', error);
    }
    return false;
  }
}

// 恢复购买
export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active['unlock_punishments'];
  } catch (error) {
    console.error('恢复购买失败:', error);
    return false;
  }
}

// 检查是否已购买
export async function checkUnlockStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active['unlock_punishments'];
  } catch (error) {
    console.error('检查购买状态失败:', error);
    return false;
  }
}
```

### 6. 更新 SettingsScreen

```typescript
// 替换模拟付款逻辑
import { purchaseUnlock, checkUnlockStatus, restorePurchases } from '../lib/purchases';

const handleUnlock = async () => {
  setUnlocking(true);
  try {
    const success = await purchaseUnlock();
    if (success) {
      // 记录到 Supabase
      await unlockPunishments(currentGroup.id, user.id);
      Alert.alert('🎉', '解锁成功！现在可以查看谁写的惩罚了');
    }
  } catch (error) {
    Alert.alert('错误', '购买失败，请重试');
  } finally {
    setUnlocking(false);
  }
};

// 添加恢复购买按钮
const handleRestorePurchases = async () => {
  const restored = await restorePurchases();
  if (restored) {
    await unlockPunishments(currentGroup.id, user.id);
    Alert.alert('成功', '已恢复购买');
  } else {
    Alert.alert('提示', '没有找到可恢复的购买');
  }
};
```

### 7. 创建 Development Build

Expo Go 不支持内购，需要创建开发版本：

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录
eas login

# 配置
eas build:configure

# 创建 iOS 开发版本
eas build --profile development --platform ios
```

### 8. app.json 配置

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.punishmentwheel",
      "usesIcloudStorage": false,
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "plugins": [
      "react-native-purchases"
    ]
  }
}
```

---

## 方案二：expo-in-app-purchases

如果不想用第三方服务：

### 安装

```bash
npx expo install expo-in-app-purchases
```

### 代码

```typescript
import * as InAppPurchases from 'expo-in-app-purchases';

const PRODUCT_ID = 'com.yourapp.unlock_punishments';

// 初始化
export async function initIAP() {
  await InAppPurchases.connectAsync();
}

// 购买
export async function purchase() {
  const { responseCode, results } = await InAppPurchases.getProductsAsync([PRODUCT_ID]);
  
  if (responseCode === InAppPurchases.IAPResponseCode.OK && results?.length) {
    const { responseCode: purchaseResponse } = await InAppPurchases.purchaseItemAsync(PRODUCT_ID);
    
    if (purchaseResponse === InAppPurchases.IAPResponseCode.OK) {
      // 购买成功，需要自己验证收据
      return true;
    }
  }
  return false;
}
```

> ⚠️ 注意：expo-in-app-purchases 需要自己实现收据验证，比较复杂

---

## 测试内购

### Sandbox 测试账号

1. App Store Connect > 用户和访问 > 沙盒测试员
2. 添加测试账号（使用不同于真实 Apple ID 的邮箱）
3. 在设备上退出 App Store 登录
4. 测试购买时会提示登录沙盒账号

### 注意事项

- 沙盒购买不会实际扣款
- 订阅在沙盒中会加速过期（1个月 = 5分钟）
- 必须在真机上测试，模拟器不支持

---

## Apple 审核要求

1. **恢复购买按钮** - 必须提供恢复购买功能
2. **清晰的价格显示** - 在购买前显示实际价格
3. **隐私政策** - App 必须有隐私政策链接
4. **购买说明** - 清楚说明用户购买的是什么

---

## 收入分成

- Apple 抽成 **30%**（小型开发者计划 15%）
- 需要设置银行账户和税务信息才能收款

---

## 时间估算

| 步骤 | 时间 |
|------|------|
| 申请开发者账号 | 1-2 天（审核） |
| 配置 App Store Connect | 1-2 小时 |
| 配置 RevenueCat | 30 分钟 |
| 代码实现 | 2-4 小时 |
| 测试 | 1-2 天 |
| 审核通过 | 1-7 天 |

**总计**: 约 1-2 周


