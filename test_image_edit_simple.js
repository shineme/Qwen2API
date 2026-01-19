/**
 * 图片编辑测试脚本 - Base64 版本
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'http://127.0.0.1:3000';
const API_KEY = 'sk-123456';

// 从本地缓存读取图片并转为 base64
const CACHE_DIR = path.join(__dirname, 'caches', 'images');

async function testImageEditWithBase64() {
    console.log('=== 测试图片编辑 (Base64) ===\n');

    // 查找一个已缓存的图片
    let imageBase64 = null;
    let filename = null;

    if (fs.existsSync(CACHE_DIR)) {
        const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.png'));
        if (files.length > 0) {
            filename = files[0];
            const imagePath = path.join(CACHE_DIR, filename);
            const imageBuffer = fs.readFileSync(imagePath);
            imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
            console.log(`使用本地图片: ${filename}`);
            console.log(`Base64 长度: ${imageBase64.length} 字符\n`);
        }
    }

    if (!imageBase64) {
        console.error('未找到缓存的图片，请先生成一张图片');
        console.log('提示: 先调用图片生成 API 生成一张图片，图片会被缓存到 caches/images/ 目录');
        return;
    }

    const requestBody = {
        "model": "qwen-max-latest-image-edit",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "把这张图片变成黑白素描风格"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": imageBase64
                        }
                    }
                ]
            }
        ],
        "stream": false
    };

    console.log('编辑指令: 把这张图片变成黑白素描风格');
    console.log('\n发送请求...\n');

    try {
        const response = await fetch(`${API_BASE}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log('响应状态:', response.status);
        const data = await response.json();
        console.log('响应内容:', JSON.stringify(data, null, 2));

        // 提取并显示结果图片URL
        const imageMatch = data.choices?.[0]?.message?.content?.match(/!\[image\]\((.*?)\)/);
        if (imageMatch) {
            console.log('\n✅ 编辑成功！');
            console.log('编辑后图片:', imageMatch[1]);
        }
    } catch (error) {
        console.error('请求失败:', error.message);
    }
}

testImageEditWithBase64();
