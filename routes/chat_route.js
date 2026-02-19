const express = require("express");
const {
  getChats,
  createChat,
  getMessages,
  sendMessage,
} = require("../controllers/chat_controller");

const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect); // All chat routes need protection

router.route("/")
    .get(getChats)
    .post(createChat);

router.route("/:chatId/messages")
    .get(getMessages)
    .post(sendMessage);

module.exports = router;
