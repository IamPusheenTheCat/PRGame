# 📸 App Store 截图处理工具

## 使用方法

### 基本用法

```bash
# 处理当前目录的所有截图
python3 resize_screenshots.py
```

### 高级选项

```bash
# 指定输入和输出目录
python3 resize_screenshots.py --input ./screenshots --output ./app_store_screenshots

# 使用裁剪模式（而不是填充背景）
python3 resize_screenshots.py --method crop

# 自定义背景色（RGB）
python3 resize_screenshots.py --bg-color 0 0 0  # 黑色背景
```

## 生成的尺寸

脚本会为每张截图生成 4 种尺寸：

| 尺寸名称 | 宽 x 高 | 用途 |
|---------|---------|------|
| `iphone_67_portrait` | 1242 x 2688 | iPhone 6.7" 竖屏 (14/15/16 Pro Max) |
| `iphone_67_landscape` | 2688 x 1242 | iPhone 6.7" 横屏 |
| `iphone_65_portrait` | 1284 x 2778 | iPhone 6.5" 竖屏 (11 Pro Max, XS Max) |
| `iphone_65_landscape` | 2778 x 1284 | iPhone 6.5" 横屏 |

## 处理方式

### Padding（默认）
- 保持原始宽高比
- 用背景色填充空白区域
- 适合：不想裁剪内容的截图

### Crop
- 保持原始宽高比
- 裁剪多余部分
- 适合：内容可以裁剪的截图

## 安装依赖

```bash
pip3 install -r requirements.txt
```

## 输出

所有处理后的图片保存在 `resized/` 文件夹中，文件名格式：
```
原文件名_尺寸名称.png
```

例如：
- `Simulator Screenshot - iPhone 16 Pro - 2026-01-06 at 16.07.56_iphone_67_portrait.png`


