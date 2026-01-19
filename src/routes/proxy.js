const express = require('express')
const router = express.Router()
const { handleImageProxy, handleCachedImage } = require('../controllers/proxy.js')

router.get('/proxy/image', handleImageProxy)
router.get('/images/:filename', handleCachedImage)

module.exports = router
