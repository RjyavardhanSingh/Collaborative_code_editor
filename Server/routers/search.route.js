import express from 'express'
import { searchDocuments, searchWithinDocument } from '../controllers/search.controller.js'
import { protect } from '../middlewares/auth.js'

const router = express.Router()

router.get('/', protect, searchDocuments)
router.get('/documents/:id', protect, searchWithinDocument)

export default router