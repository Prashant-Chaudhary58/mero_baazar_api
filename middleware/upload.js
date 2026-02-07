const multer = require("multer");
const path = require("path");

const fs = require("fs");

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {

    let folder = "./public/uploads/";
    
    // Check if it's a profile update (req.user exists because of protect middleware)
    const role = req.user ? req.user.role : req.body.role;

    // Check if it's a product upload based on the route
    if (req.originalUrl.includes('products')) {
       folder += "products/";
    } else if (role) {
      if (role === 'seller') { 
         folder += "farmer/";
      } else {
         folder += "buyer/";
      }
    } else {
       // Fallback if role is missing
       folder += "others/";
    }

    // Create folder if not exists
    if (!fs.existsSync(folder)){
        fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Check file type
function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif|webp/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
}

// Init upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // 10MB
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

module.exports = upload;
