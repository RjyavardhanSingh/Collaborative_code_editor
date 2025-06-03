import Version from '../models/version.model.js'
import Document from '../models/document.model.js'
import Activity from '../models/activity.model.js'

export const getVersions = async (req, res) => {
  try {
    const versions = await Version.find({ documentId: req.params.id })
      .populate('createdBy', 'username avatar')
      .sort({ createdAt: -1 })
    
    res.json(versions)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getVersionById = async (req, res) => {
  try {
    const version = await Version.findOne({
      _id: req.params.versionId,
      documentId: req.params.id
    }).populate('createdBy', 'username avatar')
    
    if (!version) {
      return res.status(404).json({ message: 'Version not found' })
    }
    
    res.json(version)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const createVersion = async (req, res) => {
  try {
    const { message } = req.body
    
    const document = await Document.findById(req.params.id)
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    
    const version = await Version.create({
      documentId: document._id,
      content: document.content,
      createdBy: req.user._id,
      message: message || `Version created on ${new Date().toLocaleString()}`
    })
    
    await version.populate('createdBy', 'username avatar')
    
    res.status(201).json(version)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const restoreVersion = async (req, res) => {
  try {
    const version = await Version.findOne({
      _id: req.params.versionId,
      documentId: req.params.id
    })
    
    if (!version) {
      return res.status(404).json({ message: 'Version not found' })
    }
    
    const document = await Document.findById(req.params.id)
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    
    document.content = version.content
    document.lastEditedBy = req.user._id
    
    await document.save()
    
    const newVersion = await Version.create({
      documentId: document._id,
      content: version.content,
      createdBy: req.user._id,
      message: `Restored from version created at ${version.createdAt.toLocaleString()}`
    })
    
    await Activity.create({
      documentId: document._id,
      user: req.user._id,
      action: 'edited',
      metadata: { title: document.title, restored: true, versionId: version._id }
    })
    
    await newVersion.populate('createdBy', 'username avatar')
    
    res.json(newVersion)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}