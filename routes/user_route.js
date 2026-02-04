const express = require("express");
const { updateUserDetails } = require("../controllers/user_controller");
const upload = require("../middleware/upload");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.put("/:id", protect, upload.single("image"), updateUserDetails);

module.exports = router;
