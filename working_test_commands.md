# 经过测试的可用命令

**API地址**: https://qwen.aihack.top/  
**API密钥**: sk-admin123  

## ✅ 确认可用的命令

### 1. 获取模型列表（免认证）
```bash
curl -X GET "https://qwen.aihack.top/models"
```

### 2. 获取模型列表（带认证）
```bash
curl -X GET "https://qwen.aihack.top/v1/models" \
  -H "Authorization: Bearer sk-admin123"
```

### 3. 基础英文对话（已测试 ✅）
```bash
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer sk-admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-max-2025-09-23",
    "messages": [
      {
        "role": "user",
        "content": "Hello, please introduce yourself"
      }
    ],
    "stream": false
  }'
```

### 4. 英文流式对话
```bash
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer sk-admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-max-2025-09-23",
    "messages": [
      {
        "role": "user",
        "content": "Tell me a short story about a cat"
      }
    ],
    "stream": true
  }' \
  --no-buffer
```

### 5. 编程相关对话
```bash
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer sk-admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder-32b-instruct",
    "messages": [
      {
        "role": "user",
        "content": "Write a simple Python function to calculate fibonacci numbers"
      }
    ],
    "stream": false
  }'
```

### 6. 长上下文模型测试
```bash
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer sk-admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-14b-instruct-1m",
    "messages": [
      {
        "role": "user",
        "content": "Explain the concept of machine learning in detail"
      }
    ],
    "stream": false
  }'
```

## ⚠️ 已知问题的命令（需要修复）

### 中文对话（编码问题）
```bash
# 这个命令会返回乱码错误
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer sk-admin123" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "model": "qwen3-max-2025-09-23",
    "messages": [
      {
        "role": "user",
        "content": "你好，请介绍一下自己"
      }
    ],
    "stream": false
  }'
```

### 图片生成（返回null）
```bash
# 这个命令会返回 ![image](null)
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer sk-admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-72b-instruct-image",
    "messages": [
      {
        "role": "user",
        "content": "draw a cute cat"
      }
    ],
    "size": "1:1",
    "stream": false
  }'
```

### T2I模式（返回文本描述）
```bash
# 这个命令会返回绘画教程而不是图片
curl -X POST "https://qwen.aihack.top/v1/chat/completions" \
  -H "Authorization: Bearer sk-admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-max-2025-09-23",
    "chat_type": "t2i",
    "messages": [
      {
        "role": "user",
        "content": "draw a cute cartoon cat"
      }
    ],
    "size": "1:1",
    "stream": false
  }'
```

## 🔧 PowerShell 版本（Windows）

### 基础对话测试
```powershell
$headers = @{"Authorization" = "Bearer sk-admin123"; "Content-Type" = "application/json"}
$body = '{
  "model": "qwen3-max-2025-09-23",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how can you help me today?"
    }
  ],
  "stream": false
}'

$response = Invoke-WebRequest -Uri "https://qwen.aihack.top/v1/chat/completions" -Method POST -Headers $headers -Body $body
$result = $response.Content | ConvertFrom-Json
Write-Host "Response: $($result.choices[0].message.content)"
```

### 获取模型列表
```powershell
$response = Invoke-WebRequest -Uri "https://qwen.aihack.top/models" -Method GET
$models = ($response.Content | ConvertFrom-Json).data
Write-Host "Available models: $($models.Count)"
$models | Select-Object -First 10 | ForEach-Object { Write-Host "- $($_.id)" }
```

## 📊 测试结果总结

| 功能 | 状态 | 备注 |
|------|------|------|
| 模型列表获取 | ✅ 正常 | 免认证和带认证都可用 |
| 英文对话 | ✅ 正常 | 响应快速准确 |
| 流式响应 | ✅ 正常 | 支持实时流式输出 |
| 编程模型 | ✅ 正常 | Coder模型可用 |
| 长上下文模型 | ✅ 正常 | 1M token模型可用 |
| 中文对话 | ❌ 编码问题 | 需要修复字符编码 |
| 图片生成 | ❌ 返回null | 需要配置图片服务 |
| 图片编辑 | ❌ 未测试 | 依赖图片生成功能 |
| T2I模式 | ❌ 返回文本 | 功能未正确实现 |

## 🎯 建议

1. **立即可用**: 英文对话功能完全正常，可以用于英文场景
2. **需要修复**: 中文编码和图片生成功能需要服务端配置
3. **测试建议**: 先使用英文测试所有基础功能，再解决中文和图片问题