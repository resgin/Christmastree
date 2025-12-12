const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'images');
const htmlFile = path.join(__dirname, 'index.html');

// 尝试加载 sharp，如果没有则使用 jimp
let sharp = null;
let jimp = null;

try {
    sharp = require('sharp');
    console.log('使用 sharp 进行图片压缩');
} catch (e) {
    try {
        jimp = require('jimp');
        console.log('使用 jimp 进行图片压缩');
    } catch (e2) {
        console.log('未找到图片压缩库，将直接使用原图');
        console.log('提示：运行 "npm install sharp" 或 "npm install jimp" 来启用图片压缩功能');
    }
}

// 压缩图片的通用函数
async function compressImage(filePath, maxWidth = 1920, quality = 85) {
    try {
        if (sharp) {
            // 使用 sharp 压缩
            const metadata = await sharp(filePath).metadata();
            const shouldResize = metadata.width > maxWidth;
            
            let pipeline = sharp(filePath);
            if (shouldResize) {
                pipeline = pipeline.resize(maxWidth, null, {
                    withoutEnlargement: true,
                    fit: 'inside'
                });
            }
            
            const buffer = await pipeline
                .jpeg({ quality: quality, mozjpeg: true })
                .toBuffer();
            
            return buffer;
        } else if (jimp) {
            // 使用 jimp 压缩
            const image = await jimp.read(filePath);
            
            if (image.bitmap.width > maxWidth) {
                image.resize(maxWidth, jimp.AUTO);
            }
            
            const buffer = await image
                .quality(quality)
                .getBufferAsync(jimp.MIME_JPEG);
            
            return buffer;
        }
    } catch (error) {
        console.log(`    警告: 图片压缩失败 (${error.message})，将使用原图`);
        // 如果压缩失败，返回原始文件
    }
    
    // 不压缩或压缩失败，直接读取
    return fs.readFileSync(filePath);
}

// 读取 images 文件夹中的所有 jpg 文件
const files = fs.readdirSync(imagesDir)
    .filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg'))
    .sort();

const imagesData = {};

async function convertImages() {
    console.log('开始转换图片...\n');
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(imagesDir, file);
        
        try {
            const stats = fs.statSync(filePath);
            const originalSize = stats.size;
            console.log(`处理 ${i + 1}/${files.length}: ${file}`);
            console.log(`  原始大小: ${(originalSize / 1024).toFixed(2)} KB`);
            
            // 压缩图片
            const compressedBuffer = await compressImage(filePath, 1920, 85);
            const compressedSize = compressedBuffer.length;
            const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
            
            console.log(`  压缩后: ${(compressedSize / 1024).toFixed(2)} KB (减少 ${compressionRatio}%)`);
            
            if (compressedBuffer.length === 0) {
                console.error(`  ✗ 错误: ${file} 压缩后为空!`);
                continue;
            }
            
            const base64String = compressedBuffer.toString('base64');
            const key = path.parse(file).name;
            imagesData[key] = `data:image/jpeg;base64,${base64String}`;
            
            console.log(`  ✓ 转换成功 (base64 长度: ${base64String.length})\n`);
        } catch (error) {
            console.error(`  ✗ 错误: 无法处理 ${file}:`, error.message, '\n');
        }
    }
    
    // 验证数据
    console.log(`转换完成，共 ${Object.keys(imagesData).length} 张图片`);
    const totalBase64Size = Object.values(imagesData).reduce((sum, val) => sum + val.length, 0);
    console.log(`总 base64 大小: ${(totalBase64Size / 1024).toFixed(2)} KB\n`);
    
    // 读取 HTML 文件
    let htmlContent = fs.readFileSync(htmlFile, 'utf8');
    
    // 创建 base64 数据的内联 JavaScript 代码
    const base64DataScript = `
        // 图片 base64 数据（自动生成，已压缩优化）
        const imagesBase64 = ${JSON.stringify(imagesData, null, 2)};
`;
    
    // 查找旧的 base64 数据并替换
    const scriptPattern = /<script>\s*\/\/\s*图片 base64 数据.*?<\/script>/s;
    if (scriptPattern.test(htmlContent)) {
        htmlContent = htmlContent.replace(scriptPattern, `<script>${base64DataScript}</script>`);
        console.log('✓ 已更新 HTML 文件中的 base64 数据');
    } else {
        // 如果没找到，在 </head> 前插入
        if (htmlContent.includes('</head>')) {
            htmlContent = htmlContent.replace('</head>', `<script>${base64DataScript}</script>\n    </head>`);
            console.log('✓ 已在 HTML 文件中添加 base64 数据');
        } else {
            console.error('❌ 未找到 </head> 标签');
            process.exit(1);
        }
    }
    
    fs.writeFileSync(htmlFile, htmlContent);
    console.log(`\n✅ 成功将 ${Object.keys(imagesData).length} 张图片的 base64 数据嵌入到 index.html`);
    console.log(`📁 输出文件: ${htmlFile}`);
}

// 执行转换
convertImages().catch(error => {
    console.error('转换过程中发生错误:', error);
    process.exit(1);
});
