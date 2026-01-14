import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RATING_REQUESTED_KEY = '@rating_requested';
const MIN_UNLOCK_COUNT_KEY = '@unlock_count';

/**
 * 请求用户评分
 * 
 * 评分请求时机：
 * - 用户第一次解锁惩罚表时
 * - 或者解锁 3 次后
 * - 每个用户只请求一次
 */
export async function requestRatingIfAppropriate(): Promise<void> {
  try {
    // 检查是否已经请求过
    const hasRequested = await AsyncStorage.getItem(RATING_REQUESTED_KEY);
    if (hasRequested === 'true') {
      console.log('[Rating] Already requested rating, skipping');
      return;
    }

    // 检查是否支持应用内评分
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) {
      console.log('[Rating] Store review not available on this device');
      return;
    }

    // 获取解锁次数
    const unlockCountStr = await AsyncStorage.getItem(MIN_UNLOCK_COUNT_KEY);
    const unlockCount = unlockCountStr ? parseInt(unlockCountStr, 10) : 0;
    const newUnlockCount = unlockCount + 1;

    // 保存新的解锁次数
    await AsyncStorage.setItem(MIN_UNLOCK_COUNT_KEY, newUnlockCount.toString());
    console.log('[Rating] Unlock count:', newUnlockCount);

    // 第一次解锁或第三次解锁时请求评分
    if (newUnlockCount === 1 || newUnlockCount === 3) {
      console.log('[Rating] Requesting rating...');
      await StoreReview.requestReview();
      
      // 标记已请求
      await AsyncStorage.setItem(RATING_REQUESTED_KEY, 'true');
      console.log('[Rating] Rating requested successfully');
    }
  } catch (error) {
    console.error('[Rating] Error requesting rating:', error);
  }
}

/**
 * 检查是否可以显示评分请求
 */
export async function canRequestRating(): Promise<boolean> {
  try {
    const hasRequested = await AsyncStorage.getItem(RATING_REQUESTED_KEY);
    const isAvailable = await StoreReview.isAvailableAsync();
    return hasRequested !== 'true' && isAvailable;
  } catch (error) {
    console.error('[Rating] Error checking rating availability:', error);
    return false;
  }
}

/**
 * 重置评分请求状态（仅用于测试）
 */
export async function resetRatingState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RATING_REQUESTED_KEY);
    await AsyncStorage.removeItem(MIN_UNLOCK_COUNT_KEY);
    console.log('[Rating] Rating state reset');
  } catch (error) {
    console.error('[Rating] Error resetting rating state:', error);
  }
}

