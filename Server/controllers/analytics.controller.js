import Document from '../models/document.model.js'
import Version from '../models/version.model.js'
import Activity from '../models/activity.model.js'

export const getUserActivityStats = async (req, res) => {
  try {
    const userId = req.user._id
    
    const documentsCreated = await Document.countDocuments({ owner: userId })
    
    const documentsEdited = await Document.countDocuments({
      lastEditedBy: userId,
      owner: { $ne: userId }
    })
    
    const lastMonthDate = new Date()
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
    
    const recentActivity = await Activity.countDocuments({
      user: userId,
      createdAt: { $gte: lastMonthDate }
    })
    
    const activityByType = await Activity.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ])
    
    res.json({
      documentsCreated,
      documentsEdited,
      recentActivity,
      activityByType: activityByType.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {})
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getDocumentStats = async (req, res) => {
  try {
    const documentId = req.params.id
    
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
    
    const versionsCount = await Version.countDocuments({ documentId })
    
    const editorsCount = await Version.distinct('createdBy', { documentId }).then(arr => arr.length)
    
    const lastMonthDate = new Date()
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
    
    const recentVersions = await Version.countDocuments({
      documentId,
      createdAt: { $gte: lastMonthDate }
    })
    
    const activityLog = await Activity.find({ documentId })
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(20)
    
    res.json({
      versionsCount,
      editorsCount,
      recentVersions,
      activityLog
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}