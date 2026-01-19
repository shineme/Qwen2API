# 快速测试命令集合

## 使用API密钥: sk-admin123

### 1. 获取模型列表（免认证）
```bash
curl -X GET "https://qwen.aihack.top/models"
```

### 2. 基础图片生成测试
```bash
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-72b-instruct-image",
    "messages": [
      {
        "role": "user",
        "content": "画一只可爱的小猫咪，卡通风格"
      }
    ],
    "size": "1:1",
    "stream": false
  }'
```

### 3. 图片编辑测试（需要提供图片URL）
```bash
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-72b-instruct-image-edit",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "请把这张图片的背景改成蓝天白云"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://example.com/your-image.jpg"
            }
          }
        ]
      }
    ],
    "stream": false
  }'
```

### 4. T2I模式测试
```bash
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-max-2025-09-23",
    "chat_type": "t2i",
    "messages": [
      {
        "role": "user",
        "content": "画一个未来科技城市"
      }
    ],
    "size": "16:9"
  }'
```

### 5. 不同尺寸测试
```bash
# 正方形 1:1
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-72b-instruct-image",
    "messages": [{"role": "user", "content": "画一个圆形图案"}],
    "size": "1:1"
  }'

# 宽屏 16:9
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-72b-instruct-image",
    "messages": [{"role": "user", "content": "画一个风景画"}],
    "size": "16:9"
  }'

# 竖版 9:16
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-72b-instruct-image",
    "messages": [{"role": "user", "content": "画一个高塔"}],
    "size": "9:16"
  }'
```

### 6. 流式响应测试
```bash
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-72b-instruct-image",
    "messages": [
      {
        "role": "user",
        "content": "画一个程序员在编程"
      }
    ],
    "size": "4:3",
    "stream": true
  }' \
  --no-buffer
```

## PowerShell 版本（Windows）

### 1. 获取模型列表
```powershell
Invoke-WebRequest -Uri "https://qwen.aihack.top/models" -Method GET
```

### 2. 基础图片生成
```powershell
$headers = @{"Authorization" = "Bearer YOUR_API_KEY"; "Content-Type" = "application/json"}
$body = '{
  "model": "qwen2.5-72b-instruct-image",
  "messages": [
    {
      "role": "user",
      "content": "画一只可爱的小猫咪，卡通风格"
    }
  ],
  "size": "1:1",
  "stream": false
}'

Invoke-WebRequest -Uri "https://qwen.aihack.top/v1/chat/completions" -Method POST -Headers $headers -Body $body
```

## 预期响应格式

### 成功响应
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "qwen2.5-72b-instruct-image",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "![image](https://generated-image-url.jpg)"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 50,
    "total_tokens": 70
  }
}
```

### 错误响应
```json
{
  "error": "Unauthorized"
}
```

## 测试步骤

1. 首先测试模型列表获取（免认证）
2. 设置你的API密钥
3. 测试基础图片生成功能
4. 测试不同尺寸的图片生成
5. 如果有图片URL，测试图片编辑功能
6. 测试流式响应

## 注意事项

- 所有 `/v1/` 端点都需要API密钥认证
- 图片生成使用 `-image` 后缀的模型
- 图片编辑使用 `-image-edit` 后缀的模型
- 支持的尺寸：1:1, 4:3, 3:4, 16:9, 9:16
- 可以通过 `size` 参数或在提示词中指定尺寸