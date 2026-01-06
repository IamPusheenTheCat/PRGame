// 乐器和图标列表

export interface IconItem {
  id: string;
  name: string;
  icon: string; // FontAwesome icon name
}

// 乐队专用乐器 (使用 FontAwesome 4 兼容的图标)
export const INSTRUMENTS: IconItem[] = [
  { id: 'guitar', name: '吉他', icon: 'music' },
  { id: 'drums', name: '鼓', icon: 'circle' },
  { id: 'keyboard', name: '键盘', icon: 'th' },
  { id: 'vocal', name: '主唱', icon: 'microphone' },
  { id: 'bass', name: '贝斯', icon: 'music' },
  { id: 'saxophone', name: '萨克斯', icon: 'volume-up' },
  { id: 'trumpet', name: '小号', icon: 'bullhorn' },
  { id: 'violin', name: '小提琴', icon: 'music' },
  { id: 'other', name: '其他', icon: 'ellipsis-h' },
];

// 通用图标（非乐队）- 使用 FontAwesome 4 兼容的图标
export const GENERAL_ICONS: IconItem[] = [
  { id: 'star', name: '明星', icon: 'star' },
  { id: 'heart', name: '爱心', icon: 'heart' },
  { id: 'bolt', name: '闪电', icon: 'bolt' },
  { id: 'fire', name: '火焰', icon: 'fire' },
  { id: 'rocket', name: '火箭', icon: 'rocket' },
  { id: 'diamond', name: '钻石', icon: 'diamond' },
  { id: 'crown', name: '皇冠', icon: 'certificate' },
  { id: 'trophy', name: '奖杯', icon: 'trophy' },
  { id: 'gamepad', name: '游戏', icon: 'gamepad' },
  { id: 'coffee', name: '咖啡', icon: 'coffee' },
  { id: 'beer', name: '啤酒', icon: 'beer' },
  { id: 'pizza', name: '美食', icon: 'cutlery' },
  { id: 'plane', name: '飞机', icon: 'plane' },
  { id: 'car', name: '汽车', icon: 'car' },
  { id: 'bicycle', name: '自行车', icon: 'bicycle' },
  { id: 'camera', name: '相机', icon: 'camera' },
  { id: 'film', name: '电影', icon: 'film' },
  { id: 'book', name: '书本', icon: 'book' },
  { id: 'code', name: '代码', icon: 'code' },
  { id: 'paint', name: '画笔', icon: 'paint-brush' },
  { id: 'basketball', name: '运动', icon: 'futbol-o' },
  { id: 'user', name: '达人', icon: 'user' },
  { id: 'paw', name: '宠物', icon: 'paw' },
  { id: 'sun', name: '太阳', icon: 'sun-o' },
  { id: 'moon', name: '月亮', icon: 'moon-o' },
  { id: 'umbrella', name: '雨伞', icon: 'umbrella' },
  { id: 'leaf', name: '树叶', icon: 'leaf' },
  { id: 'gift', name: '礼物', icon: 'gift' },
  { id: 'magic', name: '魔法', icon: 'magic' },
  { id: 'smile', name: '笑脸', icon: 'smile-o' },
];

export const getIconById = (id: string, isBand: boolean = true): IconItem | undefined => {
  const list = isBand ? INSTRUMENTS : [...INSTRUMENTS, ...GENERAL_ICONS];
  return list.find((i) => i.id === id);
};

export const getIconNames = (ids: string[], isBand: boolean = true): string => {
  return ids
    .map((id) => getIconById(id, isBand)?.name)
    .filter(Boolean)
    .join(' · ');
};

// 兼容旧 API
export const getInstrumentById = getIconById;
export const getInstrumentNames = getIconNames;

