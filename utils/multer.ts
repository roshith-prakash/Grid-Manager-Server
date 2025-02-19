import multer from "multer";

// Configuring storage for multer
const storage = multer.diskStorage({
  filename: function (_, file, cb) {
    cb(null, file.originalname);
  },
});

// Initializing multer
const upload = multer({ storage: storage });

export default upload;
