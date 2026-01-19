const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { logger } = require('../utils/logger.js')
const { setResponseHeaders } = require('./chat.js')
const accountManager = require('../utils/account.js')
const { sleep, generateUUID } = require('../utils/tools.js')
const { generateChatID } = require('../utils/request.js')
const { getSsxmodItna, getSsxmodItna2 } = require('../utils/ssxmod-manager')
const { getProxyAgent, getChatBaseUrl, applyProxyToAxiosConfig } = require('../utils/proxy-helper')
const { uploadFileToQwenOss } = require('../utils/upload.js')
const { CACHE_DIR } = require('./proxy.js')

/**
 * 主要的聊天完成处理函数
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 */
const handleImageVideoCompletion = async (req, res) => {
    const { model, messages, size, chat_type } = req.body
    // console.log(JSON.stringify(req.body.messages.filter(item => item.role == "user" || item.role == "assistant")))
    const token = accountManager.getAccountToken()

    try {
        // Handle model mapping for T2I/T2V/Image Edit mode - force specific model that works
        // The official web interface uses 'qwen3-max-2025-09-23' for image generation
        const T2I_WORKING_MODEL = 'qwen3-max-2025-09-23';
        let targetModel = model;
        if (chat_type === 't2i' || chat_type === 't2v' || chat_type === 'image_edit') {
            // Always use the specific model that works for image/video generation
            targetModel = T2I_WORKING_MODEL;
            logger.info(`模型映射: ${model} -> ${targetModel}`, 'CHAT');
        }

        // 请求体模板
        const reqBody = {
            "stream": true, // Always stream from upstream
            "version": "2.1",
            "incremental_output": true,
            "chat_id": null,
            "chat_mode": "normal",
            "model": targetModel, // Use mapped model
            "parent_id": null,
            "messages": [
                {
                    "fid": require('crypto').randomUUID(),
                    "parentId": null,
                    "childrenIds": [],
                    "role": "user",
                    "content": "",
                    "user_action": "chat",
                    "files": [],
                    "timestamp": new Date().getTime(),
                    "models": [targetModel], // Use mapped model
                    "chat_type": chat_type,
                    "sub_chat_type": chat_type,
                    "feature_config": {
                        "output_schema": "phase",
                        "thinking_enabled": false,
                        "research_mode": "normal"
                    },
                    "extra": {
                        "meta": {
                            "subChatType": chat_type
                        }
                    },
                    "parent_id": null
                }
            ],
            "timestamp": new Date().getTime()
        }

        const chat_id = await generateChatID(token, targetModel)

        if (!chat_id) {
            // 如果生成chat_id失败，则返回错误
            throw new Error()
        } else {
            reqBody.chat_id = chat_id
        }

        // 拿到用户最后一句消息
        const _userPrompt = messages[messages.length - 1].content
        if (!_userPrompt) {
            throw new Error()
        }

        // 提取历史消息
        const messagesHistory = messages.filter(item => item.role == "user" || item.role == "assistant")
        // 聊天消息中所有图片url
        const select_image_list = []

        // 遍历模型回复消息，拿到所有图片
        if (chat_type == "image_edit") {
            for (const item of messagesHistory) {
                if (item.role == "assistant") {
                    // 使用matchAll提取所有图片链接
                    const matches = [...item.content.matchAll(/!\[image\]\((.*?)\)/g)]
                    // 将所有匹配到的图片url添加到图片列表
                    for (const match of matches) {
                        select_image_list.push(match[1])
                    }
                } else {
                    if (Array.isArray(item.content) && item.content.length > 0) {
                        for (const content of item.content) {
                            if (content.type == "image") {
                                select_image_list.push(content.image)
                            }
                        }
                    }
                }
            }
        }

        //分情况处理
        if (chat_type == 't2i' || chat_type == 't2v') {
            if (Array.isArray(_userPrompt)) {
                reqBody.messages[0].content = _userPrompt.map(item => item.type == "text" ? item.text : "").join("\n\n")
            } else {
                reqBody.messages[0].content = _userPrompt
            }
        } else if (chat_type == 'image_edit') {
            if (!Array.isArray(_userPrompt)) {

                if (messagesHistory.length === 1) {
                    reqBody.messages[0].chat_type = "t2i"
                } else if (select_image_list.length >= 1) {
                    reqBody.messages[0].files.push({
                        "type": "image",
                        "url": select_image_list[select_image_list.length - 1]
                    })
                }
                reqBody.messages[0].content += _userPrompt
            } else {
                const texts = _userPrompt.filter(item => item.type == "text")
                if (texts.length === 0) {
                    throw new Error()
                }
                // 拼接提示词
                for (const item of texts) {
                    reqBody.messages[0].content += item.text
                }

                const files = _userPrompt.filter(item => item.type == "image" || item.type == "image_url")
                // 如果图片为空，则设置为t2i
                if (files.length === 0) {
                    reqBody.messages[0].chat_type = "t2i"
                }
                // 遍历图片，处理不同格式
                for (const item of files) {
                    let imageUrl = null;

                    // Get image source (support both 'image' type and 'image_url' type)
                    let imageSource = item.image || item.image_url?.url || item.url;

                    if (!imageSource) {
                        logger.warn('图片源为空，跳过', 'CHAT');
                        continue;
                    }

                    // Case 1: Base64 encoded image
                    if (imageSource.startsWith('data:')) {
                        logger.info('检测到Base64图片，上传到OSS', 'CHAT');
                        try {
                            const regex = /data:(.+);base64,/;
                            const fileType = imageSource.match(regex);
                            const fileExtension = fileType && fileType[1] ? fileType[1].split('/')[1] || 'png' : 'png';
                            const filename = `${generateUUID()}.${fileExtension}`;
                            const base64Data = imageSource.replace(regex, '');
                            const buffer = Buffer.from(base64Data, 'base64');

                            const uploadResult = await uploadFileToQwenOss(buffer, filename, token);
                            if (uploadResult && uploadResult.file_url) {
                                imageUrl = uploadResult.file_url;
                                logger.info(`Base64图片上传成功: ${imageUrl}`, 'CHAT');
                            }
                        } catch (uploadError) {
                            logger.error(`Base64图片上传失败: ${uploadError.message}`, 'CHAT');
                        }
                    }
                    // Case 2: Local cached image URL (from our server)
                    else if (imageSource.includes('/images/') && (imageSource.includes('127.0.0.1') || imageSource.includes('localhost'))) {
                        const filename = imageSource.split('/images/').pop();
                        const localPath = path.join(CACHE_DIR, filename);

                        logger.info(`检测到本地图片，上传到OSS: ${filename}`, 'CHAT');

                        if (fs.existsSync(localPath)) {
                            try {
                                const fileBuffer = fs.readFileSync(localPath);
                                const uploadResult = await uploadFileToQwenOss(fileBuffer, filename, token);
                                if (uploadResult && uploadResult.file_url) {
                                    imageUrl = uploadResult.file_url;
                                    logger.info(`本地图片上传成功: ${imageUrl}`, 'CHAT');
                                }
                            } catch (uploadError) {
                                logger.error(`本地图片上传失败: ${uploadError.message}`, 'CHAT');
                            }
                        } else {
                            logger.warn(`本地图片不存在: ${localPath}`, 'CHAT');
                        }
                    }
                    // Case 3: External URL (already accessible)
                    else if (imageSource.startsWith('http')) {
                        imageUrl = imageSource;
                        logger.info(`使用外部图片URL: ${imageUrl}`, 'CHAT');
                    }

                    if (imageUrl) {
                        reqBody.messages[0].files.push({
                            "type": "image",
                            "url": imageUrl
                        })
                    }
                }

            }
        }


        // 处理图片视频尺寸
        if (chat_type == 't2i' || chat_type == 't2v') {
            // 获取图片尺寸，优先级 参数 > 提示词 > 默认
            if (size != undefined && size != null) {
                reqBody.size = size // Use the actual size parameter
            } else if (typeof _userPrompt === 'string' && _userPrompt.indexOf("@4:3") != -1) {
                reqBody.size = "4:3"
            } else if (typeof _userPrompt === 'string' && _userPrompt.indexOf("@3:4") != -1) {
                reqBody.size = "3:4"
            } else if (typeof _userPrompt === 'string' && _userPrompt.indexOf("@16:9") != -1) {
                reqBody.size = "16:9"
            } else if (typeof _userPrompt === 'string' && _userPrompt.indexOf("@9:16") != -1) {
                reqBody.size = "9:16"
            } else {
                reqBody.size = "1:1" // Default size
            }
            logger.info(`图片尺寸: ${reqBody.size}`, 'CHAT')
        }

        const chatBaseUrl = getChatBaseUrl()
        const proxyAgent = getProxyAgent()

        logger.info('发送图片视频请求', 'CHAT')
        logger.info(`选择图片: ${select_image_list[select_image_list.length - 1] || "未选择图片，切换生成图/视频模式"}`, 'CHAT')
        logger.info(`使用提示: ${reqBody.messages[0].content}`, 'CHAT')
        console.log('DEBUG reqBody:', JSON.stringify(reqBody, null, 2))
        const newChatType = reqBody.messages[0].chat_type

        const requestConfig = {
            headers: {
                'Authorization': `Bearer ${token}`,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
                "Connection": "keep-alive",
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Content-Type": "application/json",
                "Timezone": "Mon Dec 08 2025 17:28:55 GMT+0800",
                "sec-ch-ua": "\"Microsoft Edge\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
                "source": "web",
                "Version": "0.1.34",
                "bx-v": "2.5.31",
                "Origin": chatBaseUrl,
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Dest": "empty",
                "Referer": `${chatBaseUrl}/c/guest`,
                "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "Cookie": `ssxmod_itna=${getSsxmodItna()};ssxmod_itna2=${getSsxmodItna2()}`,
            },
            responseType: newChatType == 't2i' ? 'stream' : 'json',
            timeout: 1000 * 60 * 5
        }

        // 添加代理配置
        if (proxyAgent) {
            requestConfig.httpsAgent = proxyAgent
            requestConfig.proxy = false
        }

        const response_data = await axios.post(`${chatBaseUrl}/api/v2/chat/completions?chat_id=${chat_id}`, reqBody, requestConfig)

        try {
            let contentUrl = null
            if (newChatType == 't2i') {
                const decoder = new TextDecoder('utf-8')
                response_data.data.on('data', async (chunk) => {
                    const data = decoder.decode(chunk, { stream: true }).split('\n').filter(item => item.trim() != "")
                    console.log(data)
                    for (const item of data) {
                        try {
                            if (!item.startsWith('data:')) continue;
                            const jsonStr = item.replace("data:", '').trim();
                            if (jsonStr === '[DONE]') continue;

                            const jsonObj = JSON.parse(jsonStr);
                            console.log('Stream chunk:', JSON.stringify(jsonObj)); // Debug log

                            if (jsonObj?.choices?.[0]?.delta?.content && contentUrl == null) {
                                const content = jsonObj.choices[0].delta.content;
                                // Check if it's a markdown image or just url
                                const match = content.match(/!\[image\]\((.*?)\)/);
                                if (match) {
                                    contentUrl = match[1];
                                } else if (content.startsWith('http')) {
                                    contentUrl = content;
                                } else {
                                    // It might be text accumulator? For now assume it might be the url or part of it
                                    // But for T2I usually it's a single chunk with the image
                                    if (content.includes('http')) {
                                        // Try to fuzzy match url
                                        const urlMatch = content.match(/(https?:\/\/[^\s)]+)/);
                                        if (urlMatch) contentUrl = urlMatch[1];
                                    }
                                }
                                console.log('Extracted contentUrl:', contentUrl);
                            }
                        } catch (e) {
                            console.error('Error parsing chunk:', e);
                        }
                    }
                })

                response_data.data.on('end', () => {
                    return returnResponse(req, res, model, contentUrl, req.body.stream)
                })
            } else if (newChatType == 'image_edit') {
                console.log('DEBUG image_edit response:', JSON.stringify(response_data.data, null, 2))

                // Parse response - it may be a SSE stream string or JSON object
                let contentUrl = null;
                const resData = response_data.data;

                // Handle SSE stream format (string with multiple "data:" lines)
                if (typeof resData === 'string') {
                    // Parse SSE stream to extract image URL
                    const lines = resData.split('\n').filter(line => line.startsWith('data:'));
                    for (const line of lines) {
                        try {
                            const jsonStr = line.replace('data:', '').trim();
                            if (jsonStr === '[DONE]') continue;
                            const jsonObj = JSON.parse(jsonStr);

                            // Extract URL from choices[0].delta.content
                            const content = jsonObj?.choices?.[0]?.delta?.content;
                            if (content && content.startsWith('http') && !contentUrl) {
                                contentUrl = content;
                                console.log('Found image URL in SSE stream:', contentUrl);
                                break;
                            }
                        } catch (e) {
                            // Skip malformed lines
                        }
                    }
                }
                // Handle JSON object format
                else if (typeof resData === 'object') {
                    // Format 1: data.data.choices[0].message.content[0].image
                    if (resData?.data?.choices?.[0]?.message?.content?.[0]?.image) {
                        contentUrl = resData.data.choices[0].message.content[0].image;
                    }
                    // Format 2: choices[0].delta.content
                    else if (resData?.choices?.[0]?.delta?.content) {
                        const content = resData.choices[0].delta.content;
                        if (content.startsWith('http')) {
                            contentUrl = content;
                        }
                    }
                }

                console.log('Extracted image_edit contentUrl:', contentUrl);
                return returnResponse(req, res, model, contentUrl, req.body.stream)
            } else if (newChatType == 't2v') {
                return handleVideoCompletion(req, res, response_data.data, token)
            }

        } catch (error) {
            logger.error('图片处理错误', 'CHAT', error)
            res.status(500).json({ error: "服务错误!!!" })
        }

    } catch (error) {
        res.status(500).json({
            error: "服务错误，请稍后再试"
        })
    }
}

/**
 * 返回响应
 * @param {*} res 
 * @param {*} model 
 * @param {*} contentUrl 
 */
const returnResponse = async (req, res, model, contentUrl, stream) => {
    setResponseHeaders(res, stream)
    logger.info(`返回响应: ${contentUrl}`, 'CHAT')

    let finalUrl = contentUrl;

    // If contentUrl exists, download and cache the image
    if (contentUrl && contentUrl.startsWith('http')) {
        try {
            const { getHashedFilename, CACHE_DIR } = require('./proxy.js')
            const axios = require('axios')
            const fs = require('fs')
            const path = require('path')

            const filename = getHashedFilename(contentUrl)
            const cachePath = path.join(CACHE_DIR, filename)

            // Check if already cached
            if (!fs.existsSync(cachePath)) {
                logger.info(`预缓存图片: ${contentUrl}`, 'CHAT')
                const response = await axios({
                    method: 'get',
                    url: contentUrl,
                    responseType: 'arraybuffer',
                    headers: {
                        'Referer': 'https://chat.qwen.ai/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 60000
                })
                fs.writeFileSync(cachePath, response.data)
                logger.info(`图片已缓存: ${filename}`, 'CHAT')
            }

            // Use direct cached URL
            finalUrl = `${req.protocol}://${req.get('host')}/images/${filename}`
        } catch (error) {
            logger.error(`缓存图片失败，使用代理URL: ${error.message}`, 'CHAT')
            // Fallback to proxy URL
            finalUrl = `${req.protocol}://${req.get('host')}/proxy/image?url=${encodeURIComponent(contentUrl)}`
        }
    } else {
        // No valid URL, use proxy as fallback
        finalUrl = `${req.protocol}://${req.get('host')}/proxy/image?url=${encodeURIComponent(contentUrl || '')}`
    }

    const returnBody = {
        "created": new Date().getTime(),
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": `![image](${finalUrl})`
                }
            }
        ]
    }

    if (stream) {
        res.write(`data: ${JSON.stringify(returnBody)}\n\n`)
        res.write(`data: [DONE]\n\n`)
        res.end()
    } else {
        res.json(returnBody)
    }
}

const handleVideoCompletion = async (req, res, response_data, token) => {
    try {
        const videoTaskID = response_data?.data?.messages[0]?.extra?.wanx?.task_id
        if (!response_data || !response_data.success || !videoTaskID) {
            throw new Error()
        }

        logger.info(`视频任务ID: ${videoTaskID}`, 'CHAT')
        const returnBody = {
            "id": `chatcmpl-${new Date().getTime()}`,
            "object": "chat.completion.chunk",
            "created": new Date().getTime(),
            "model": response_data.data.model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": ""
                    },
                    "finish_reason": null
                }
            ]
        }

        // 设置尝试次数
        const maxAttempts = 60
        // 设置每次请求的间隔时间
        const delay = 20 * 1000
        // 循环尝试获取任务状态
        for (let i = 0; i < maxAttempts; i++) {
            const content = await getVideoTaskStatus(videoTaskID, token)
            if (content) {
                returnBody.choices[0].message.content = `
<video controls = "controls">
${content}
</video>

[Download Video](${content})
`
                // 设置响应头
                setResponseHeaders(res, req.body.stream)

                if (req.body.stream) {
                    res.write(`data: ${JSON.stringify(returnBody)}\n\n`)
                    res.write(`data: [DONE]\n\n`)
                    res.end()
                } else {
                    res.json(returnBody)
                }
                return
            } else if (content == null && req.body.stream) {
                // 发送空数据保活
                res.write(`data: ${JSON.stringify(returnBody)}\n\n`)
            }

            await sleep(delay)
        }
    } catch (error) {
        logger.error('获取视频任务状态失败', 'CHAT', error)
        res.status(500).json({ error: error.response_data?.data?.code || "可能该帐号今日生成次数已用完" })
    }
}

const getVideoTaskStatus = async (videoTaskID, token) => {
    try {
        const chatBaseUrl = getChatBaseUrl()
        const proxyAgent = getProxyAgent()

        const requestConfig = {
            headers: {
                "Authorization": `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...(getSsxmodItna() && { 'Cookie': `ssxmod_itna=${getSsxmodItna()};ssxmod_itna2=${getSsxmodItna2()}` })
            }
        }

        // 添加代理配置
        if (proxyAgent) {
            requestConfig.httpsAgent = proxyAgent
            requestConfig.proxy = false
        }

        const response_data = await axios.get(`${chatBaseUrl}/api/v1/tasks/status/${videoTaskID}`, requestConfig)

        if (response_data.data?.task_status == "success") {
            logger.info('获取视频任务状态成功', 'CHAT', response_data.data?.content)
            return response_data.data?.content
        }
        logger.info(`获取视频任务 ${videoTaskID} 状态: ${response_data.data?.task_status}`, 'CHAT')
        return null
    } catch (error) {
        console.log(error.response.data)
        return null
    }
}

module.exports = {
    handleImageVideoCompletion
}