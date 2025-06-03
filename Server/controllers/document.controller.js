import Document from '../models/document.model.js'
import Version from '../models/version.model.js'
import Activity from '../models/activity.model.js'
import User from '../models/user.model.js'
import Invitation from '../models/invitation.model.js'

export const createDocument = async (req, res) => {
  try {
    const { title, content, language, isPublic, folderId } = req.body
    
    const document = await Document.create({
      title,
      content: content || '',
      language,
      owner: req.user._id,
      isPublic: isPublic || false,
      lastEditedBy: req.user._id,
      folderId
    })
    
    await Version.create({
      documentId: document._id,
      content: content || '',
      createdBy: req.user._id,
      message: 'Initial version'
    })
    
    await Activity.create({
      documentId: document._id,
      user: req.user._id,
      action: 'created',
      metadata: { title }
    })
    
    res.status(201).json(document)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id },
        { isPublic: true }
      ]
    })
      .select('-content')
      .populate('owner', 'username avatar')
      .populate('lastEditedBy', 'username avatar')
      .sort({ updatedAt: -1 })
    
    res.json(documents)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('owner', 'username avatar')
      .populate('collaborators.user', 'username avatar')
      .populate('lastEditedBy', 'username avatar')
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    
    const isOwner = document.owner._id.toString() === req.user._id.toString()
    const isCollaborator = document.collaborators.some(c => 
      c.user._id.toString() === req.user._id.toString()
    )
    
    if (!isOwner && !isCollaborator && !document.isPublic) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    res.json(document)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateDocument = async (req, res) => {
  try {
    const { title, content, language, isPublic } = req.body
    
    const document = await Document.findById(req.params.id)
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    
    const isOwner = document.owner.toString() === req.user._id.toString()
    const collaborator = document.collaborators.find(c => 
      c.user.toString() === req.user._id.toString()
    )
    
    if (!isOwner && (!collaborator || collaborator.permission === 'read')) {
      return res.status(403).json({ message: 'Not authorized to update this document' })
    }
    
    const contentChanged = content !== undefined && content !== document.content
    
    document.title = title || document.title
    if (content !== undefined) document.content = content
    document.language = language || document.language
    
    if (isOwner && isPublic !== undefined) {
      document.isPublic = isPublic
    }
    
    document.lastEditedBy = req.user._id
    
    const updatedDocument = await document.save()
    
    if (contentChanged) {
      await Version.create({
        documentId: document._id,
        content: document.content,
        createdBy: req.user._id,
        message: req.body.message || 'Updated document'
      })
      
      await Activity.create({
        documentId: document._id,
        user: req.user._id,
        action: 'edited',
        metadata: { title: document.title }
      })
    }
    
    res.json(updatedDocument)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    
    if (document.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this document' })
    }
    
    await Document.findByIdAndDelete(req.params.id)
    await Version.deleteMany({ documentId: req.params.id })
    await Activity.deleteMany({ documentId: req.params.id })
    await Invitation.deleteMany({ documentId: req.params.id })
    
    res.json({ message: 'Document deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const addCollaborator = async (req, res) => {
  try {
    const { email, permission } = req.body
    
    if (!email || !permission) {
      return res.status(400).json({ message: 'Email and permission are required' })
    }
    
    const document = await Document.findById(req.params.id)
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    
    if (document.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can add collaborators' })
    }
    
    const user = await User.findOne({ email })
    
    if (!user) {
      const invitation = await Invitation.create({
        documentId: document._id,
        senderId: req.user._id,
        recipientEmail: email,
        permission,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })
      
      return res.status(201).json({ message: 'Invitation sent', invitation })
    }
    
    const existingCollaborator = document.collaborators.find(
      c => c.user.toString() === user._id.toString()
    )
    
    if (existingCollaborator) {
      existingCollaborator.permission = permission
    } else {
      document.collaborators.push({
        user: user._id,
        permission
      })
    }
    
    await document.save()
    
    await Activity.create({
      documentId: document._id,
      user: req.user._id,
      action: 'shared',
      metadata: { collaboratorId: user._id, permission }
    })
    
    res.json(document)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const removeCollaborator = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    
    if (document.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can remove collaborators' })
    }
    
    document.collaborators = document.collaborators.filter(
      c => c.user.toString() !== req.params.userId
    )
    
    await document.save()
    
    await Activity.create({
      documentId: document._id,
      user: req.user._id,
      action: 'unshared',
      metadata: { collaboratorId: req.params.userId }
    })
    
    res.json(document)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const exportDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('owner', 'username')
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    
    const format = req.params.format || 'json'
    
    if (format === 'json') {
      return res.json({
        title: document.title,
        content: document.content,
        language: document.language,
        owner: document.owner.username,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      })
    } else if (format === 'text') {
      res.setHeader('Content-Type', 'text/plain')
      res.setHeader('Content-Disposition', `attachment; filename=${document.title.replace(/\s+/g, '_')}.txt`)
      return res.send(document.content)
    } else if (format === 'html') {
      const html = `<!DOCTYPE html>
      <html>
      <head>
        <title>${document.title}</title>
        <style>
          body { font-family: monospace; }
          pre { background: #f4f4f4; padding: 10px; }
        </style>
      </head>
      <body>
        <h1>${document.title}</h1>
        <p>Language: ${document.language}</p>
        <pre>${document.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </body>
      </html>`
      
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Disposition', `attachment; filename=${document.title.replace(/\s+/g, '_')}.html`)
      return res.send(html)
    } else {
      return res.status(400).json({ message: 'Unsupported export format' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const importDocument = async (req, res) => {
  try {
    const { title, content, language } = req.body
    
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' })
    }
    
    const document = await Document.create({
      title,
      content,
      language: language || 'javascript',
      owner: req.user._id,
      lastEditedBy: req.user._id
    })
    
    await Version.create({
      documentId: document._id,
      content,
      createdBy: req.user._id,
      message: 'Imported document'
    })
    
    await Activity.create({
      documentId: document._id,
      user: req.user._id,
      action: 'created',
      metadata: { title, imported: true }
    })
    
    res.status(201).json(document)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}