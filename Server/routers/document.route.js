import express from 'express'
import { 
  createDocument, 
  getDocuments, 
  getDocumentById, 
  updateDocument, 
  deleteDocument,
  addCollaborator,
  removeCollaborator,
  exportDocument,
  importDocument
} from '../controllers/document.controller.js'
import { protect, checkDocumentPermission } from '../middlewares/auth.js'
import versionRoutes from './version.route.js'
import messageRoutes from './message.route.js'

const router = express.Router()

router.post('/', protect, createDocument)
router.get('/', protect, getDocuments)
router.get('/:id', protect, getDocumentById)
router.put('/:id', protect, checkDocumentPermission('write'), updateDocument)
router.delete('/:id', protect, deleteDocument)
router.post('/:id/collaborators', protect, addCollaborator)
router.delete('/:id/collaborators/:userId', protect, removeCollaborator)
router.get('/:id/export/:format?', protect, checkDocumentPermission('read'), exportDocument)
router.post('/import', protect, importDocument)

router.use('/:id/versions', versionRoutes)
router.use('/:id/messages', messageRoutes)

export default router