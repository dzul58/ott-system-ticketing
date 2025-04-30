const multer = require("multer");

// Allowed file extensions
const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".mp4",
  ".avi",
  ".mov",
  ".wmv",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
];

// Fungsi untuk validasi file type
const fileFilter = (req, file, cb) => {
  const isAllowedExtension = allowedExtensions.some((ext) =>
    file.originalname.toLowerCase().endsWith(ext)
  );

  if (isAllowedExtension) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Hanya file dengan ekstensi berikut yang diperbolehkan: ${allowedExtensions.join(
          ", "
        )}`
      ),
      false
    );
  }
};

// Konfigurasi multer dengan memoryStorage
const storage = multer.memoryStorage();

// Error handling untuk multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "error",
        message: "File terlalu besar. Maksimal ukuran file adalah 10MB",
      });
    }
    return res.status(400).json({
      status: "error",
      message: err.message,
    });
  }
  next(err);
};

// Initialize Multer middleware dengan file validation
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
    files: 5, // Maksimal 5 file sekaligus
  },
});

module.exports = {
  upload,
  handleMulterError,
};
