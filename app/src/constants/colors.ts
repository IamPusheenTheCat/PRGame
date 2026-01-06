// 颜色常量 - 与原型设计一致

export const Colors = {
  // 背景色
  background: {
    primary: '#0a0a1a',
    secondary: '#12122a',
    tertiary: '#1a1a35',
  },

  // 主题色
  primary: '#ff5757',
  primaryDark: '#ff4040',
  
  // 状态色
  success: '#10b981',
  warning: '#fbbf24',
  error: '#ef4444',
  danger: '#ef4444',  // 与 error 相同
  info: '#06b6d4',

  // 文字色
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    muted: 'rgba(255, 255, 255, 0.35)',
    disabled: 'rgba(255, 255, 255, 0.2)',
  },

  // 边框色
  border: {
    default: 'rgba(255, 255, 255, 0.08)',
    light: 'rgba(255, 255, 255, 0.06)',
    focus: '#ff5757',
  },

  // 头像渐变色
  avatarGradients: [
    ['#667eea', '#764ba2'], // 紫色
    ['#f093fb', '#f5576c'], // 粉色
    ['#4facfe', '#00f2fe'], // 蓝色
    ['#43e97b', '#38f9d7'], // 绿色
    ['#fa709a', '#fee140'], // 橙粉
    ['#a18cd1', '#fbc2eb'], // 浅紫
  ],

  // 玻璃效果
  glass: {
    background: 'rgba(255, 255, 255, 0.04)',
    backgroundStrong: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.06)',
  },
};

export default Colors;

