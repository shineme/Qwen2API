#!/bin/bash

# Qwen-Proxy API 测试脚本
# 使用前请设置你的API密钥
API_KEY="YOUR_API_KEY_HERE"
BASE_URL="https://qwen.aihack.top"

echo "=== Qwen-Proxy API 测试 ==="
echo "基础URL: $BASE_URL"
echo "请确保已设置正确的API密钥"
echo ""

# 1. 获取模型列表（免认证）
echo "1. 获取模型列表（免认证）"
curl -X GET "$BASE_URL/models" | jq '.' 2>/dev/null || curl -X GET "$BASE_URL/models"
echo -e "\n"

# 2. 获取模型列表（带认证）
echo "2. 获取模型列表（带认证）"
curl -X GET "$BASE_URL/v1/models" \
  -H "Authorization: Bearer $API_KEY" | jq '.' 2>/dev/null || curl -X GET "$BASE_URL/v1/models" -H "Authorization: Bearer $API_KEY"
echo -e "\n"

# 3. 测试基础图片生成
echo "3. 测试基础图片生成"
curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d @test_image_gen_basic.json | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/v1/chat/completions" -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" -d @test_image_gen_basic.json
echo -e "\n"

# 4. 测试风景图片生成
echo "4. 测试风景图片生成（16:9）"
curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d @test_image_gen_landscape.json | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/v1/chat/completions" -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" -d @test_image_gen_landscape.json
echo -e "\n"

# 5. 测试T2I模式
echo "5. 测试T2I模式"
curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d @test_t2i_mode.json | jq '.' 2>/dev/null || curl -X POST "$BASE_URL/v1/chat/completions" -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" -d @test_t2i_mode.json
echo -e "\n"

# 6. 测试流式响应
echo "6. 测试流式图片生成"
curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-72b-instruct-image",
    "messages": [
      {
        "role": "user",
        "content": "画一个程序员在咖啡厅编程的场景"
      }
    ],
    "size": "4:3",
    "stream": true
  }' \
  --no-buffer
echo -e "\n"

echo "测试完成！"