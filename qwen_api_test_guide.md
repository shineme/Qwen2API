# Qwen-Proxy API 测试指南

基于你的服务地址：`https://qwen.aihack.top/`

## 1. 获取模型列表

### 免认证方式
```bash
curl -X GET "https://qwen.aihack.top/models"
```

### 带认证方式
```bash
curl -X GET "https://qwen.aihack.top/v1/models" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 2. 可用模型列表

根据API返回的数据，以下是主要可用模型：

### 基础对话模型
- `qwen3-max-2025-09-23` - 最新版本
- `qwen2.5-72b-instruct` - 72B大模型
- `qwen2.5-coder-32b-instruct` - 32B编程模型
- `qwen2.5-14b-instruct-1m` - 14B长上下文模型（1M tokens）

### 图片生成模型（-image 后缀）
- `qwen3-max-2025-09-23-image`
- `qwen2.5-72b-instruct-image`
- `qwen2.5-coder-32b-instruct-image`
- `qwen2.5-14b-instruct-1m-image`

### 图片编辑模型（-image-edit 后缀）
- `qwen3-max-2025-09-23-image-edit`
- `qwen2.5-72b-instruct-image-edit`
- `qwen2.5-coder-32b-instruct-image-edit`
- `qwen2.5-14b-instruct-1m-image-edit`

### 视频生成模型（-video 后缀）
- `qwen3-max-2025-09-23-video`
- `qwen2.5-72b-instruct-video`
- `qwen2.5-coder-32b-instruct-video`
- `qwen2.5-14b-instruct-1m-video`

### 搜索增强模型（-search 后缀）
- `qwen3-max-2025-09-23-search`
- `qwen2.5-72b-instruct-search`
- `qwen2.5-coder-32b-instruct-search`

## 3. 图片生成功能测试

### 3.1 基础图片生成
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

### 3.2 指定尺寸的图片生成
```bash
# 1:1 正方形
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-max-2025-09-23-image",
    "messages": [
      {
        "role": "user",
        "content": "画一个现代化的城市天际线，夜景，霓虹灯效果"
      }
    ],
    "size": "1:1"
  }'

# 16:9 宽屏
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-72b-instruct-image",
    "messages": [
      {
        "role": "user",
        "content": "画一个美丽的海滩日落景色，16:9"
      }
    ],
    "size": "16:9"
  }'

# 4:3 传统比例
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder-32b-instruct-image",
    "messages": [
      {
        "role": "user",
        "content": "画一个程序员在编程的场景，科技感"
      }
    ],
    "size": "4:3"
  }'
```

### 3.3 使用 T2I 模式生成图片
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
        "content": "画一只在花园里玩耍的小狗，水彩画风格"
      }
    ],
    "size": "1:1"
  }'
```

## 4. 图片编辑功能测试

### 4.1 基础图片编辑
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
            "text": "请把这张图片中的天空改成夕阳色彩"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
            }
          }
        ]
      }
    ],
    "stream": false
  }'
```

### 4.2 多模态图片编辑
```bash
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-max-2025-09-23-image-edit",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "请在这张图片中添加一些彩虹效果"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://example.com/your-image.jpg"
            }
          }
        ]
      }
    ]
  }'
```

## 5. 流式响应测试

### 5.1 流式图片生成
```bash
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-72b-instruct-image",
    "messages": [
      {
        "role": "user",
        "content": "画一个未来科技城市的概念图"
      }
    ],
    "size": "16:9",
    "stream": true
  }' \
  --no-buffer
```

## 6. 组合功能测试

### 6.1 搜索增强 + 图片生成
```bash
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-72b-instruct-search-image",
    "messages": [
      {
        "role": "user",
        "content": "根据最新的建筑设计趋势，画一个现代住宅的外观设计"
      }
    ],
    "size": "4:3"
  }'
```

## 7. 视频生成功能测试

### 7.1 基础视频生成
```bash
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-72b-instruct-video",
    "messages": [
      {
        "role": "user",
        "content": "生成一个小猫咪在草地上玩耍的短视频"
      }
    ],
    "stream": false
  }'
```

## 8. 错误处理和响应格式

### 成功响应示例
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

### 错误响应示例
```json
{
  "error": "Unauthorized"
}
```

## 9. 支持的图片尺寸

- `1:1` - 正方形
- `4:3` - 传统比例
- `3:4` - 竖版传统比例
- `16:9` - 宽屏比例
- `9:16` - 竖版宽屏比例

## 10. 注意事项

1. **API密钥**: 所有 `/v1/` 端点都需要有效的API密钥
2. **模型选择**: 
   - 使用 `-image` 后缀的模型进行图片生成
   - 使用 `-image-edit` 后缀的模型进行图片编辑
   - 使用 `-video` 后缀的模型进行视频生成
3. **尺寸控制**: 可以通过 `size` 参数或在提示词中包含尺寸关键词来控制输出尺寸
4. **流式响应**: 支持流式和非流式两种响应模式
5. **多模态**: 支持文本+图片的多模态输入进行图片编辑

## 11. PowerShell 测试命令

如果你在 Windows PowerShell 中测试，使用以下格式：

```powershell
# 获取模型列表
Invoke-WebRequest -Uri "https://qwen.aihack.top/models" -Method GET

# 图片生成测试
$headers = @{"Authorization" = "Bearer YOUR_API_KEY"; "Content-Type" = "application/json"}
$body = @{
    model = "qwen2.5-72b-instruct-image"
    messages = @(
        @{
            role = "user"
            content = "画一只可爱的小猫咪，卡通风格"
        }
    )
    size = "1:1"
    stream = $false
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri "https://qwen.aihack.top/v1/chat/completions" -Method POST -Headers $headers -Body $body
```

请将 `YOUR_API_KEY` 替换为你的实际API密钥进行测试。