import express from 'express'
import { getMessages, createMessage } from '../controllers/message.controller.js'
import { protect, checkDocumentPermission } from '../middlewares/auth.js'

const router = express.Router({ mergeParams: true })

router.get('/', protect, checkDocumentPermission('read'), getMessages)
router.post('/', protect, checkDocumentPermission('read'), createMessage)

export default router