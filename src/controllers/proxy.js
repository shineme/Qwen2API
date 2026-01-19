const axios = require('axios')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { logger } = require('../utils/logger')

// Cache directory for images
const CACHE_DIR = path.join(__dirname, '../../caches/images')

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
}

/**
 * Generate a hash-based filename from URL
 */
const getHashedFilename = (url) => {
    const hash = crypto.createHash('md5').update(url).digest('hex')
    // Extract extension from URL if possible
    const urlPath = new URL(url).pathname
    const ext = path.extname(urlPath) || '.png'
    return `${hash}${ext}`
}

/**
 * Handle image proxy with local caching
 */
const handleImageProxy = async (req, res) => {
    const { url } = req.query
    if (!url) {
        return res.status(400).send('Missing url parameter')
    }

    try {
        const filename = getHashedFilename(url)
        const cachePath = path.join(CACHE_DIR, filename)

        // Check if file exists in cache
        if (fs.existsSync(cachePath)) {
            logger.info(`从缓存提供图片: ${filename}`, 'PROXY')
            const ext = path.extname(filename).toLowerCase()
            const mimeTypes = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            }
            res.set('Content-Type', mimeTypes[ext] || 'image/png')
            res.set('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
            return fs.createReadStream(cachePath).pipe(res)
        }

        // Download and cache
        logger.info(`下载并缓存图片: ${url}`, 'PROXY')
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
            headers: {
                'Referer': 'https://chat.qwen.ai/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0'
            },
            timeout: 60000
        })

        // Save to cache
        fs.writeFileSync(cachePath, response.data)
        logger.info(`图片已缓存: ${filename}`, 'PROXY')

        // Serve the image
        res.set('Content-Type', response.headers['content-type'] || 'image/png')
        res.set('Cache-Control', 'public, max-age=31536000')
        res.send(response.data)

    } catch (error) {
        logger.error('代理图片失败', 'PROXY', error.message)
        res.status(500).send('Error fetching image')
    }
}

/**
 * Serve cached image directly by filename
 */
const handleCachedImage = async (req, res) => {
    const { filename } = req.params
    if (!filename) {
        return res.status(400).send('Missing filename')
    }

    const cachePath = path.join(CACHE_DIR, filename)
    if (!fs.existsSync(cachePath)) {
        return res.status(404).send('Image not found')
    }

    const ext = path.extname(filename).toLowerCase()
    const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    res.set('Content-Type', mimeTypes[ext] || 'image/png')
    res.set('Cache-Control', 'public, max-age=31536000')
    fs.createReadStream(cachePath).pipe(res)
}

module.exports = {
    handleImageProxy,
    handleCachedImage,
    getHashedFilename,
    CACHE_DIR
}
