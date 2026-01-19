/**
 * 图片编辑 (image-edit) 功能测试脚本
 * 
 * 使用方法:
 * 1. 确保项目已启动 (npm start)
 * 2. 运行: node test_image_edit.js
 */

const API_BASE = 'http://127.0.0.1:3000';
const API_KEY = 'sk-123456'; // 替换为你的 API Key

/**
 * 示例1: 使用 -image-edit 模型，直接在 content 中提供图片 URL 进行编辑
 */
async function testImageEditWithUrl() {
    console.log('=== 测试1: 使用图片URL进行编辑 ===\n');

    // 假设你已经有一张生成的图片URL (可以先用 t2i 生成一张)
    const existingImageUrl = 'https://cdn.qwenlm.ai/output/19e1e885-48a8-4e50-9a6a-cee4f4ce9595/t2i/1ffd2bc0-1c61-45a9-b637-2567b3ba159f/1768788025.png?key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZXNvdXJjZV91c2VyX2lkIjoiMTllMWU4ODUtNDhhOC00ZTUwLTlhNmEtY2VlNGY0Y2U5NTk1IiwicmVzb3VyY2VfaWQiOiIxNzY4Nzg4MDI1IiwicmVzb3VyY2VfY2hhdF9pZCI6IjBmYjZlYTk3LWIzZGMtNDg2OS04ZjQ0LThmY2ZhZDUwZGM3MyJ9.Z7c9jaCLV9lCJQR489PCMbjHIf1ZE853d4ETxd9Zohc';

    const requestBody = {
        "model": "qwen-max-latest-image-edit", // 使用 -image-edit 后缀
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "把这只猫咪变成橙色的"
                    },
                    {
                        "type": "image",
                        "image": existingImageUrl // 要编辑的图片
                    }
                ]
            }
        ],
        "stream": false
    };

    try {
        const response = await fetch(`${API_BASE}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log('响应状态:', response.status);
        console.log('响应内容:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('请求失败:', error.message);
    }
}

/**
 * 示例2: 多轮对话方式 - 先生成图片，再编辑
 * 这模拟了用户先生成一张图，然后在后续对话中编辑它
 */
async function testImageEditMultiTurn() {
    console.log('\n=== 测试2: 多轮对话编辑 ===\n');

    // 模拟之前的对话历史，包含 assistant 返回的图片
    const requestBody = {
        "model": "qwen-max-latest-image-edit",
        "messages": [
            {
                "role": "user",
                "content": "画一只在花园里的小猫咪"
            },
            {
                "role": "assistant",
                "content": "![image](https://cdn.qwenlm.ai/output/test/example.png)" // 模拟之前生成的图片
            },
            {
                "role": "user",
                "content": "把背景改成夜晚星空"
            }
        ],
        "stream": false
    };

    try {
        const response = await fetch(`${API_BASE}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log('响应状态:', response.status);
        console.log('响应内容:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('请求失败:', error.message);
    }
}

/**
 * 示例3: 完整流程 - 先生成图片，获取URL，再编辑
 */
async function testFullFlow() {
    console.log('\n=== 测试3: 完整流程 (生成 -> 编辑) ===\n');

    // Step 1: 生成图片
    console.log('Step 1: 生成原始图片...');
    const genResponse = await fetch(`${API_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            "model": "qwen-max-latest-image",
            "messages": [
                {
                    "role": "user",
                    "content": "画一只白色的猫咪，卡通风格"
                }
            ],
            "size": "1:1",
            "stream": false
        })
    });

    const genData = await genResponse.json();
    console.log('生成结果:', JSON.stringify(genData, null, 2));

    // 从响应中提取图片URL
    const imageMatch = genData.choices?.[0]?.message?.content?.match(/!\[image\]\((.*?)\)/);
    if (!imageMatch) {
        console.error('无法从响应中提取图片URL');
        return;
    }

    const generatedImageUrl = imageMatch[1];
    console.log('\n提取的图片URL:', generatedImageUrl);

    // Step 2: 编辑图片
    console.log('\nStep 2: 编辑图片...');
    const editResponse = await fetch(`${API_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            "model": "qwen-max-latest-image-edit",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "把猫咪变成橙色"
                        },
                        {
                            "type": "image",
                            "image": generatedImageUrl
                        }
                    ]
                }
            ],
            "stream": false
        })
    });

    const editData = await editResponse.json();
    console.log('编辑结果:', JSON.stringify(editData, null, 2));
}

// 运行测试
async function main() {
    console.log('========================================');
    console.log('  图片编辑 (image-edit) 功能测试');
    console.log('========================================\n');

    // 选择要运行的测试
    // await testImageEditWithUrl();
    // await testImageEditMultiTurn();
    await testFullFlow(); // 推荐：完整流程测试
}

main().catch(console.error);
