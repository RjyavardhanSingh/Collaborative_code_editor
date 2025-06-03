import express from 'express'
import { getUserProfile, updateUserProfile, getUserDocuments } from '../controllers/user.controller.js'
import { protect } from '../middlewares/auth.js'

const router = express.Router()

router.get('/:id', protect, getUserProfile)
router.put('/:id', protect, updateUserProfile)
router.get('/:id/documents', protect, getUserDocuments)

export default router