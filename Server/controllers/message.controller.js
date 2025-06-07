import Message from '../models/message.model.js'
import Document from '../models/document.model.js'

export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ documentId: req.params.id })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 })
      .limit(100)
    
    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const createMessage = async (req, res) => {
  try {
    const { content } = req.body
    
    if (!content) {
      return res.status(400).json({ message: 'Message content is required' })
    }
    
    const message = await Message.create({
      documentId: req.params.id,
      sender: req.user._id,
      content
    })
    
    await message.populate('sender', 'username avatar')
    
    if (req.io) {
      req.io.to(`document:${req.params.id}`).emit('new-message', message)
    }
    
    res.status(201).json(message)
  } catch (error) {
    console.error("Message creation error:", error);
    res.status(500).json({ message: error.message })
  }
}