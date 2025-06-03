import express from 'express'
import { getUserActivityStats, getDocumentStats } from '../controllers/analytics.controller.js'
import { protect } from '../middlewares/auth.js'

const router = express.Router()

router.get('/usage', protect, getUserActivityStats)
router.get('/documents/:id', protect, getDocumentStats)

export default router