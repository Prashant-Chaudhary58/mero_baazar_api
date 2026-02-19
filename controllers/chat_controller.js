const Chat = require("../models/chat_model");
const Message = require("../models/message_model");
const User = require("../models/user_model");

// @desc    Get all chats for user
// @route   GET /api/v1/chats
// @access  Private
exports.getChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
      .populate({
        path: "participants",
        select: "fullName image role",
      })
      .populate({
        path: "lastMessage",
        select: "text createdAt read sender",
      })
      .sort({ updatedAt: -1 });

    // Filter out the current user from participants list for frontend convenience
    const formattedChats = chats.map((chat) => {
      const otherParticipant = chat.participants.find(
        (p) => p._id.toString() !== req.user.id
      );
      return {
        _id: chat._id,
        otherParticipant,
        lastMessage: chat.lastMessage,
        updatedAt: chat.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      count: chats.length,
      data: formattedChats,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get messages for a chat
// @route   GET /api/v1/chats/:chatId/messages
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "fullName image")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Create or get existing chat
// @route   POST /api/v1/chats
// @access  Private
exports.createChat = async (req, res, next) => {
  try {
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, error: "Receiver ID is required" });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, receiverId] },
    }).populate("participants", "fullName image role");

    if (chat) {
       const otherParticipant = chat.participants.find(
        (p) => p._id.toString() !== req.user.id
      );
      return res.status(200).json({
        success: true,
        data: {
             _id: chat._id,
            otherParticipant,
            lastMessage: chat.lastMessage,
            updatedAt: chat.updatedAt,
        },
      });
    }

    // Create new chat
    const newChat = await Chat.create({
      participants: [req.user.id, receiverId],
    });

    chat = await Chat.findById(newChat._id).populate("participants", "fullName image role");
     const otherParticipant = chat.participants.find(
        (p) => p._id.toString() !== req.user.id
      );

    res.status(201).json({
      success: true,
      data: {
             _id: chat._id,
            otherParticipant,
            lastMessage: chat.lastMessage,
            updatedAt: chat.updatedAt,
        },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Send message
// @route   POST /api/v1/chats/:chatId/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    const { chatId } = req.params;

    const message = await Message.create({
      chat: chatId,
      sender: req.user.id,
      text,
    });

    // Update chat's last message
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      updatedAt: Date.now(),
    });

    const populatedMessage = await Message.findById(message._id).populate("sender", "fullName image");

    res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
