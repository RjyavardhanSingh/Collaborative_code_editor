import Document from '../models/document.model.js'

export const searchDocuments = async (req, res) => {
  try {
    const { q } = req.query
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' })
    }
    
    const documents = await Document.find({
      $and: [
        {
          $or: [
            { owner: req.user._id },
            { 'collaborators.user': req.user._id },
            { isPublic: true }
          ]
        },
        {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { content: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
      .select('title language updatedAt owner')
      .populate('owner', 'username avatar')
      .sort({ updatedAt: -1 })
    
    res.json(documents)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const searchWithinDocument = async (req, res) => {
  try {
    const { q } = req.query
    const documentId = req.params.id
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' })
    }
    
    const document = await Document.findById(documentId)
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }
    
    const isOwner = document.owner.toString() === req.user._id.toString()
    const isCollaborator = document.collaborators.some(c => 
      c.user.toString() === req.user._id.toString()
    )
    
    if (!isOwner && !isCollaborator && !document.isPublic) {
      return res.status(403).json({ message: 'Access denied' })
    }
    
    const lines = document.content.split('\n')
    const matches = []
    
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(q.toLowerCase())) {
        matches.push({
          line: index + 1,
          content: line,
          match: q
        })
      }
    })
    
    res.json({ matches })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}