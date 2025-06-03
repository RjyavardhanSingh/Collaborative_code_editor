import express from 'express'
import {
  getVersions,
  getVersionById,
  createVersion,
  restoreVersion
} from '../controllers/version.controller.js'
import { protect, checkDocumentPermission } from '../middlewares/auth.js'

const router = express.Router({ mergeParams: true })

router.get('/', protect, checkDocumentPermission('read'), getVersions)
router.get('/:versionId', protect, checkDocumentPermission('read'), getVersionById)
router.post('/', protect, checkDocumentPermission('write'), createVersion)
router.post('/restore/:versionId', protect, checkDocumentPermission('write'), restoreVersion)

export default router