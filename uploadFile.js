const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'drhtiugpd',
  api_key: '632628739133256',
  api_secret: 'whGivd0AhoRJFX-S0mbbE_q1JM8',
});


const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();

    // Validate file extension
    if (!['.mp3', '.wav', '.aac'].includes(fileExtension)) {
      throw new Error('Invalid file type. Only .mp3, .wav, and .aac files are allowed.');
    }

    return {
      folder: 'train-audio',
      resource_type: 'raw',
      public_id: `${path.parse(file.originalname).name}-${Date.now()}`,
      format: fileExtension.replace('.', ''), // Remove dot from extension
    };
  },
});

// Multer Middleware with File Filter
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5 MB
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.mp3', '.wav', '.aac'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error('Invalid file type. Only .mp3, .wav, and .aac files are allowed.'));
    }

    cb(null, true); // Accept the file
  },
});

module.exports = upload;
