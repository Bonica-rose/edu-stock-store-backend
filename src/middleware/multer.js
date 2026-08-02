const multer = require('multer');

const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/svg+xml",
    ];

    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed."));
    }
};

// Initialize middleware with storage options
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: fileFilter
});

module.exports = upload;