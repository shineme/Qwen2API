# Qwen-Proxy API PowerShell 测试脚本
# 使用前请设置你的API密钥

$API_KEY = "YOUR_API_KEY_HERE"
$BASE_URL = "https://qwen.aihack.top"

Write-Host "=== Qwen-Proxy API 测试 ===" -ForegroundColor Green
Write-Host "基础URL: $BASE_URL" -ForegroundColor Yellow
Write-Host "请确保已设置正确的API密钥" -ForegroundColor Yellow
Write-Host ""

# 1. 获取模型列表（免认证）
Write-Host "1. 获取模型列表（免认证）" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/models" -Method GET
    Write-Host "状态码: $($response.StatusCode)" -ForegroundColor Green
    $models = ($response.Content | ConvertFrom-Json).data
    Write-Host "可用模型数量: $($models.Count)" -ForegroundColor Green
    Write-Host "前5个模型:"
    $models[0..4] | ForEach-Object { Write-Host "  - $($_.id)" }
} catch {
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 2. 测试基础图片生成
Write-Host "2. 测试基础图片生成" -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $API_KEY"
    "Content-Type" = "application/json"
}

$imageGenBody = @{
    model = "qwen2.5-72b-instruct-image"
    messages = @(
        @{
            role = "user"
            content = "画一只可爱的小猫咪，卡通风格，坐在彩虹上"
        }
    )
    size = "1:1"
    stream = $false
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/v1/chat/completions" -Method POST -Headers $headers -Body $imageGenBody
    Write-Host "状态码: $($response.StatusCode)" -ForegroundColor Green
    $result = $response.Content | ConvertFrom-Json
    Write-Host "模型: $($result.model)" -ForegroundColor Green
    Write-Host "响应内容: $($result.choices[0].message.content)" -ForegroundColor Green
} catch {
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorContent = $reader.ReadToEnd()
        Write-Host "错误详情: $errorContent" -ForegroundColor Red
    }
}
Write-Host ""

# 3. 测试风景图片生成（16:9）
Write-Host "3. 测试风景图片生成（16:9）" -ForegroundColor Cyan
$landscapeBody = @{
    model = "qwen3-max-2025-09-23-image"
    messages = @(
        @{
            role = "user"
            content = "画一个美丽的山水风景，中国水墨画风格，16:9"
        }
    )
    size = "16:9"
    stream = $false
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/v1/chat/completions" -Method POST -Headers $headers -Body $landscapeBody
    Write-Host "状态码: $($response.StatusCode)" -ForegroundColor Green
    $result = $response.Content | ConvertFrom-Json
    Write-Host "模型: $($result.model)" -ForegroundColor Green
    Write-Host "响应内容: $($result.choices[0].message.content)" -ForegroundColor Green
} catch {
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 4. 测试T2I模式
Write-Host "4. 测试T2I模式" -ForegroundColor Cyan
$t2iBody = @{
    model = "qwen3-max-2025-09-23"
    chat_type = "t2i"
    messages = @(
        @{
            role = "user"
            content = "画一个未来科技城市的概念图，有飞行汽车和高楼大厦"
        }
    )
    size = "16:9"
    stream = $false
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/v1/chat/completions" -Method POST -Headers $headers -Body $t2iBody
    Write-Host "状态码: $($response.StatusCode)" -ForegroundColor Green
    $result = $response.Content | ConvertFrom-Json
    Write-Host "模型: $($result.model)" -ForegroundColor Green
    Write-Host "响应内容: $($result.choices[0].message.content)" -ForegroundColor Green
} catch {
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 5. 测试不同尺寸
Write-Host "5. 测试不同尺寸的图片生成" -ForegroundColor Cyan
$sizes = @("1:1", "4:3", "3:4", "16:9", "9:16")

foreach ($size in $sizes) {
    Write-Host "  测试尺寸: $size" -ForegroundColor Yellow
    $sizeTestBody = @{
        model = "qwen2.5-72b-instruct-image"
        messages = @(
            @{
                role = "user"
                content = "画一个简单的几何图形，$size 比例"
            }
        )
        size = $size
        stream = $false
    } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-WebRequest -Uri "$BASE_URL/v1/chat/completions" -Method POST -Headers $headers -Body $sizeTestBody
        Write-Host "    ✓ 成功 - 状态码: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "    ✗ 失败 - $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "测试完成！" -ForegroundColor Green
Write-Host "请检查上述结果，确保API正常工作。" -ForegroundColor Yellow