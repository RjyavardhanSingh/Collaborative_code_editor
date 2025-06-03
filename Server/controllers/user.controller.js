import User from '../models/user.model.js'
import Document from '../models/document.model.js'

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash')
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Not authorized to update this profile' })
    }
    
    user.username = req.body.username || user.username
    user.email = req.body.email || user.email
    user.avatar = req.body.avatar || user.avatar
    
    if (req.body.password) {
      user.passwordHash = req.body.password
    }
    
    const updatedUser = await user.save()
    
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getUserDocuments = async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Not authorized to view these documents' })
    }
    
    const documents = await Document.find({ owner: req.params.id })
      .select('title language updatedAt isPublic')
      .sort({ updatedAt: -1 })
    
    const sharedDocuments = await Document.find({ 'collaborators.user': req.params.id })
      .select('title language updatedAt isPublic owner')
      .populate('owner', 'username avatar')
      .sort({ updatedAt: -1 })
    
    res.json({
      owned: documents,
      shared: sharedDocuments
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}