const { selectPaymentTypes, insertPaymentType, updatePaymentTypeVisibility, updatePaymentTypeDescription,
  selectTaxTypes, insertTaxType, updateTaxTypeVisibility, updateTaxTypeDescription
 } = require('../models/settings');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Ensure tmp/uploads directory exists
const tempUploadDir = path.join(__dirname, '..', 'tmp', 'uploads');
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadDir); // Store temporarily
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  }
});

const imageFileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(png)$/i)) {
    return cb(new Error('Only image files (PNG) are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 }, // 1MB limit
  fileFilter: imageFileFilter
}).single('stampImage'); // 'stampImage' should be the name attribute of your file input

const uploadStampImage = (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      // A multer error occurred (e.g., file type, file size)
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const tempPath = req.file.path;

    try {
      const metadata = await sharp(tempPath).metadata();
      if (metadata.width < 150 || metadata.height < 150) {
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath); // Delete temp file
        }
        return res.status(400).json({ success: false, message: 'Image dimensions must be at least 150x150 pixels.' });
      }

      // If all checks pass, move the file to the final destination

      // Determine the target directory for stamp.png
      const customStampDir = process.env.STAMP_COMPONENTS_DIR;
      const defaultStampDir = path.join(__dirname, '..', 'components');
      const targetDir = customStampDir && customStampDir.trim() !== '' ? customStampDir : defaultStampDir;

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
          try {
              fs.mkdirSync(targetDir, { recursive: true });
          } catch (mkdirErr) {
              // Handle error creating directory: cleanup temp file, return error response
              if (fs.existsSync(tempPath)) {
                  fs.unlinkSync(tempPath);
              }
              console.error('Error creating stamp directory:', mkdirErr);
              return res.status(500).json({ success: false, message: 'Error creating stamp directory: ' + mkdirErr.message });
          }
      }

      const targetPath = path.join(targetDir, 'stamp.png');

      fs.rename(tempPath, targetPath, (renameErr) => {
        if (renameErr) {
          // Try to delete temp file if rename fails
          if (fs.existsSync(tempPath)) {
             fs.unlinkSync(tempPath);
          }
          console.error('Error renaming file:', renameErr);
          return res.status(500).json({ success: false, message: 'Error saving stamp image: ' + renameErr.message });
        }
        return res.status(200).json({ success: true, message: '印鑑更新されました。' });
      });

    } catch (sharpError) {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath); // Delete temp file on sharp error
      }
      console.error('Error processing image with sharp:', sharpError);
      return res.status(500).json({ success: false, message: 'Error processing image: ' + sharpError.message });
    }
  });
};

const getCompanyStampImage = (req, res) => {
  try {
    const customStampDir = process.env.STAMP_COMPONENTS_DIR;
    // This logic for determining targetDir MUST be consistent with uploadStampImage
    const defaultStampDir = path.join(__dirname, '..', 'components'); // Resolves to api/components/
    const targetDir = customStampDir && customStampDir.trim() !== '' ? customStampDir : defaultStampDir;
    
    const imagePath = path.join(targetDir, 'stamp.png');

    if (fs.existsSync(imagePath)) {
      // res.sendFile will set appropriate Content-Type headers based on file extension
      res.sendFile(path.resolve(imagePath)); // path.resolve ensures an absolute path
    } else {
      res.status(404).json({ success: false, message: 'Stamp image not found.' });
    }
  } catch (error) {
    console.error('Error retrieving stamp image:', error);
    res.status(500).json({ success: false, message: 'Error retrieving stamp image: ' + error.message });
  }
};

const getPaymentTypes = async (req, res) => {
  try {
    const data = await selectPaymentTypes(req.requestId);    
    if (!data) {
      return res.status(401).json({ error: 'Data not found' });
    }    
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const addPaymentType = async (req, res) => {
  const { newData } = req.body;
  const user_id = req.user.id;  
  
  try {
    const user = await insertPaymentType(req.requestId, newData, user_id);
    res.status(201).json({ 
      message: 'Payment type registered successfully',      
     });
  } catch (err) {    
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const changePaymentTypeVisibility = async (req, res) => {
  const { id } = req.params;
  const { visible } = req.body;
  const user_id = req.user.id;

  try {
    const data = await updatePaymentTypeVisibility(req.requestId, id, visible, user_id);
    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }        
    res.status(200).json({ message: 'Data updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const changePaymentTypeDescription = async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  const user_id = req.user.id;

  try {
    const data = await updatePaymentTypeDescription(req.requestId, id, description, user_id);
    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }        
    res.status(200).json({ message: 'Data updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTaxTypes = async (req, res) => {
  try {
    const data = await selectTaxTypes(req.requestId);    
    if (!data) {
      return res.status(401).json({ error: 'Data not found' });
    }    
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const addTaxType = async (req, res) => {
  const { newData } = req.body;
  const user_id = req.user.id;  
  
  try {
    const user = await insertTaxType(req.requestId, newData, user_id);
    res.status(201).json({ 
      message: 'Tax type registered successfully',      
     });
  } catch (err) {    
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const changeTaxTypeVisibility = async (req, res) => {
  const { id } = req.params;
  const { visible } = req.body;
  const user_id = req.user.id;

  try {
    const data = await updateTaxTypeVisibility(req.requestId, id, visible, user_id);
    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }        
    res.status(200).json({ message: 'Data updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const changeTaxTypeDescription = async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  const user_id = req.user.id;

  try {
    const data = await updateTaxTypeDescription(req.requestId, id, description, user_id);
    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }        
    res.status(200).json({ message: 'Data updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


module.exports = { 
  getPaymentTypes, 
  addPaymentType, 
  changePaymentTypeVisibility,
  changePaymentTypeDescription, 
  getTaxTypes, 
  addTaxType, 
  changeTaxTypeVisibility,
  changeTaxTypeDescription,
  getCompanyStampImage, 
  uploadStampImage,
};