// 工具函数

/**
 * 获取名字的显示文本
 * 超过8个字符显示首字母缩写
 */
export function getDisplayName(name: string): string {
  if (name.length <= 8) {
    return name;
  }
  
  // 尝试按大写字母分割（驼峰命名）
  const parts = name.split(/(?=[A-Z])/);
  if (parts.length >= 2) {
    return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  }
  
  // 否则取前两个字符
  return name.slice(0, 2).toUpperCase();
}

/**
 * 获取头像渐变色索引
 */
export function getAvatarGradientIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 6;
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return '今天';
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
}

/**
 * 格式化时间
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * 计算过期状态
 */
export function getExpiryStatus(expiresAt: string | null): {
  isExpired: boolean;
  daysLeft: number | null;
} {
  if (!expiresAt) {
    return { isExpired: false, daysLeft: null };
  }

  const expiry = new Date(expiresAt);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return {
    isExpired: days <= 0,
    daysLeft: days > 0 ? days : 0,
  };
}

/**
 * 生成设备 ID
 */
export function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

