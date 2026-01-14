#!/usr/bin/env python3
"""
App Store 截图尺寸调整脚本
将截图调整为 App Store 要求的各种尺寸
"""

import os
from PIL import Image, ImageDraw, ImageFont
import sys

# App Store 要求的截图尺寸（宽 x 高）
REQUIRED_SIZES = {
    'iphone_67_portrait': (1242, 2688),   # iPhone 6.7" 竖屏 (14/15/16 Pro Max)
    'iphone_67_landscape': (2688, 1242),  # iPhone 6.7" 横屏
    'iphone_65_portrait': (1284, 2778),    # iPhone 6.5" 竖屏 (11 Pro Max, XS Max)
    'iphone_65_landscape': (2778, 1284),   # iPhone 6.5" 横屏
}

def resize_with_padding(image, target_size, background_color=(0, 0, 0)):
    """
    调整图片尺寸，保持宽高比，用背景色填充空白
    """
    target_width, target_height = target_size
    original_width, original_height = image.size
    
    # 计算缩放比例，确保图片能完全放入目标尺寸
    scale = min(target_width / original_width, target_height / original_height)
    
    # 计算新尺寸
    new_width = int(original_width * scale)
    new_height = int(original_height * scale)
    
    # 缩放图片
    resized_image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # 创建目标尺寸的画布
    canvas = Image.new('RGB', target_size, background_color)
    
    # 计算居中位置
    x_offset = (target_width - new_width) // 2
    y_offset = (target_height - new_height) // 2
    
    # 如果是 RGBA 模式，需要处理透明背景
    if resized_image.mode == 'RGBA':
        canvas.paste(resized_image, (x_offset, y_offset), resized_image)
    else:
        canvas.paste(resized_image, (x_offset, y_offset))
    
    return canvas

def resize_with_crop(image, target_size):
    """
    调整图片尺寸，裁剪多余部分，保持宽高比
    """
    target_width, target_height = target_size
    original_width, original_height = image.size
    
    # 计算缩放比例，确保能填满目标尺寸
    scale = max(target_width / original_width, target_height / original_height)
    
    # 计算新尺寸
    new_width = int(original_width * scale)
    new_height = int(original_height * scale)
    
    # 缩放图片
    resized_image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # 计算裁剪位置（居中裁剪）
    x_offset = (new_width - target_width) // 2
    y_offset = (new_height - target_height) // 2
    
    # 裁剪
    cropped_image = resized_image.crop((
        x_offset, 
        y_offset, 
        x_offset + target_width, 
        y_offset + target_height
    ))
    
    return cropped_image

def process_screenshots(input_dir='.', output_dir='resized', method='padding', background_color=(26, 26, 46)):
    """
    处理截图文件夹中的所有图片
    
    Args:
        input_dir: 输入文件夹路径
        output_dir: 输出文件夹路径
        method: 'padding' 或 'crop'
        background_color: 填充背景色 (RGB)
    """
    # 创建输出文件夹
    os.makedirs(output_dir, exist_ok=True)
    
    # 获取所有图片文件
    image_extensions = ('.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG')
    image_files = [f for f in os.listdir(input_dir) 
                   if f.endswith(image_extensions) and not f.startswith('.')]
    
    if not image_files:
        print(f"❌ 在 {input_dir} 中没有找到图片文件")
        return
    
    print(f"📸 找到 {len(image_files)} 张图片")
    print(f"📁 输出目录: {output_dir}")
    print(f"🎨 处理方式: {method}")
    print("-" * 50)
    
    for image_file in image_files:
        input_path = os.path.join(input_dir, image_file)
        base_name = os.path.splitext(image_file)[0]
        
        try:
            # 打开图片
            image = Image.open(input_path)
            print(f"\n处理: {image_file}")
            print(f"  原始尺寸: {image.size[0]} x {image.size[1]}")
            
            # 为每种尺寸生成图片
            for size_name, target_size in REQUIRED_SIZES.items():
                if method == 'padding':
                    resized = resize_with_padding(image, target_size, background_color)
                else:
                    resized = resize_with_crop(image, target_size)
                
                # 生成输出文件名
                output_filename = f"{base_name}_{size_name}.png"
                output_path = os.path.join(output_dir, output_filename)
                
                # 保存
                resized.save(output_path, 'PNG', quality=95)
                print(f"  ✅ {size_name}: {target_size[0]} x {target_size[1]} → {output_filename}")
        
        except Exception as e:
            print(f"  ❌ 处理 {image_file} 时出错: {e}")
    
    print("\n" + "=" * 50)
    print(f"✅ 完成！所有图片已保存到 {output_dir}/")
    print(f"\n📋 生成的文件:")
    for size_name, size in REQUIRED_SIZES.items():
        print(f"   - {size_name}: {size[0]} x {size[1]}")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='调整 App Store 截图尺寸')
    parser.add_argument('--input', '-i', default='.', 
                       help='输入文件夹路径 (默认: 当前目录)')
    parser.add_argument('--output', '-o', default='resized',
                       help='输出文件夹路径 (默认: resized)')
    parser.add_argument('--method', '-m', choices=['padding', 'crop'], default='padding',
                       help='调整方式: padding=填充背景, crop=裁剪 (默认: padding)')
    parser.add_argument('--bg-color', '-b', nargs=3, type=int, default=[26, 26, 46],
                       metavar=('R', 'G', 'B'),
                       help='背景色 RGB (默认: 26 26 46 - 深色主题)')
    
    args = parser.parse_args()
    
    # 检查 PIL 是否安装
    try:
        from PIL import Image
    except ImportError:
        print("❌ 需要安装 Pillow 库")
        print("   运行: pip install Pillow")
        sys.exit(1)
    
    process_screenshots(
        input_dir=args.input,
        output_dir=args.output,
        method=args.method,
        background_color=tuple(args.bg_color)
    )


