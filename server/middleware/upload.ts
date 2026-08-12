import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { fileTypeFromFile } from 'file-type';

// File filter for different types
const createFileFilter = (allowedTypes: string[], maxSize: number) => {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check file type
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      return cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
    
    // Check file size (Note: this is checked again by multer, but good to have here)
    if (file.size && file.size > maxSize) {
      return cb(new Error(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`));
    }
    
    cb(null, true);
  };
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'video') {
      uploadPath += 'videos/';
    } else if (file.fieldname === 'thumbnail' || file.fieldname === 'image') {
      uploadPath += 'images/';
    } else if (file.fieldname === 'document') {
      uploadPath += 'documents/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '');
    
    cb(null, `${sanitizedBaseName}-${uniqueSuffix}${fileExtension}`);
  }
});

// Memory storage for temporary processing
const memoryStorage = multer.memoryStorage();

// File upload configurations
export const imageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: createFileFilter(['.jpg', '.jpeg', '.png', '.gif', '.webp'], 5 * 1024 * 1024),
});

export const videoUpload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    files: 1,
  },
  fileFilter: createFileFilter(['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'], 500 * 1024 * 1024),
});

export const documentUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: createFileFilter(['.pdf', '.doc', '.docx', '.txt', '.rtf'], 10 * 1024 * 1024),
});

// Multiple file upload for course materials
export const courseContentUpload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    files: 10, // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', // Images
      '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', // Videos
      '.pdf', '.doc', '.docx', '.txt', '.rtf', // Documents
    ];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      return cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
    
    cb(null, true);
  },
});

// Profile image upload (smaller size limit)
export const profileImageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
  fileFilter: createFileFilter(['.jpg', '.jpeg', '.png', '.webp'], 2 * 1024 * 1024),
});

// Memory-based upload for processing before saving
export const memoryUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
});

// Magic-byte types that are never acceptable regardless of claimed extension —
// catches the classic "renamed executable/script" upload bypass.
const DANGEROUS_DETECTED_TYPES = new Set([
  'exe', 'dll', 'msi', 'sh', 'bat', 'cmd', 'com', 'jar',
  'html', 'htm', 'xml', 'svg', 'js', 'php', 'py', 'apk', 'deb', 'rpm',
]);

// Extensions we can reliably verify via magic bytes, mapped to the
// file-type `ext` value(s) that legitimately match. Extensions not listed
// here (e.g. .txt, .rtf, .doc) don't have a reliable binary signature, so
// they're only checked against the dangerous-type blocklist above, not
// required to match a specific detected type.
const VERIFIABLE_EXTENSIONS: Record<string, string[]> = {
  '.jpg': ['jpg'],
  '.jpeg': ['jpg'],
  '.png': ['png'],
  '.gif': ['gif'],
  '.webp': ['webp'],
  '.mp4': ['mp4'],
  '.mov': ['mov'],
  '.webm': ['webm'],
  '.avi': ['avi'],
  '.pdf': ['pdf'],
  '.docx': ['docx'],
};

/**
 * Post-multer middleware: verifies the uploaded file's actual content
 * (magic bytes) is consistent with its extension, rejecting files whose
 * true type is a dangerous format (executable/script/html) regardless of
 * the claimed extension, or whose detected type contradicts a verifiable
 * extension's expected type. Extensions without a reliable signature (.txt,
 * .rtf, .doc) are only checked against the dangerous-type blocklist.
 */
export const verifyFileContent = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const files: Express.Multer.File[] = req.file
      ? [req.file]
      : Array.isArray(req.files)
        ? req.files
        : [];

    for (const file of files) {
      try {
        const detected = await fileTypeFromFile(file.path);
        const ext = path.extname(file.originalname).toLowerCase();

        if (detected && DANGEROUS_DETECTED_TYPES.has(detected.ext)) {
          cleanupFile(file.path);
          return res.status(400).json({
            error: 'File Upload Error',
            message: 'File content does not match an allowed file type',
          });
        }

        const expected = VERIFIABLE_EXTENSIONS[ext];
        if (expected && detected && !expected.includes(detected.ext)) {
          cleanupFile(file.path);
          return res.status(400).json({
            error: 'File Upload Error',
            message: 'File content does not match its extension',
          });
        }
      } catch (error) {
        console.error('File content verification error:', error);
        // Don't block the upload on a verification-tooling failure —
        // extension/size checks already ran via multer's fileFilter.
      }
    }

    next();
  };
};

// Upload error handler
export const handleUploadError = (err: any, req: Request, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File Upload Error',
        message: 'File too large',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'File Upload Error',
        message: 'Too many files',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'File Upload Error',
        message: 'Unexpected field name',
      });
    }
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: 'File Upload Error',
      message: err.message,
    });
  }
  
  next(err);
};

// Utility function to get file URL
export const getFileUrl = (req: Request, filename: string, type: 'image' | 'video' | 'document' = 'image') => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${type}s/${filename}`;
};

// Clean up old files (utility function)
export const cleanupFile = (filePath: string) => {
  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
};