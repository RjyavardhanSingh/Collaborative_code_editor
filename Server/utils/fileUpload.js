import multer from "multer";
import path from "path";


const storage = multer.diskStorage({
  destination: "./uploads/avatars",
  filename: function (req, file, cb) {
    cb(
      null,
      `user-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});


export const uploadAvatar = multer({
  storage: storage,
  limits: { fileSize: 1000000 }, // 1MB
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).single("avatar");


function checkFileType(file, cb) {

  const filetypes = /jpeg|jpg|png|gif/;
 
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
}
