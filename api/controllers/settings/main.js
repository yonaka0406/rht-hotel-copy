const settingsModel = require('../../models/settings');
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
    const data = await settingsModel.selectPaymentTypes(req.requestId);    
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
    const user = await settingsModel.insertPaymentType(req.requestId, newData, user_id);
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
    const data = await settingsModel.updatePaymentTypeVisibility(req.requestId, id, visible, user_id);
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
    const data = await settingsModel.updatePaymentTypeDescription(req.requestId, id, description, user_id);
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
    const data = await settingsModel.selectTaxTypes(req.requestId);    
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
    const user = await settingsModel.insertTaxType(req.requestId, newData, user_id);
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
    const data = await settingsModel.updateTaxTypeVisibility(req.requestId, id, visible, user_id);
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
    const data = await settingsModel.updateTaxTypeDescription(req.requestId, id, description, user_id);
    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }        
    res.status(200).json({ message: 'Data updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Loyalty Tier Controller Functions
const handleGetLoyaltyTiers = async (req, res) => {
  try {
    const data = await settingsModel.getLoyaltyTiers(req.requestId);
    res.status(200).json(data);
  } catch (err) {
    console.error('Error in handleGetLoyaltyTiers:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

const handleUpsertLoyaltyTiers = async (req, res) => {
  const tierData = req.body;
  const userId = req.user.id;

  // Convert tier_name to lowercase for consistent processing
  const lowerTierName = tierData.tier_name ? tierData.tier_name.toLowerCase() : null;

  // Basic Validation
  if (!lowerTierName || !tierData.time_period_months) { // Changed from time_period_value, removed time_period_unit
    return res.status(400).json({ message: 'tier_name and time_period_months are required.' });
  }
  // Assign the lowercased tier_name back to tierData for saving
  tierData.tier_name = lowerTierName;

  if (lowerTierName === 'hotel_loyal' && (tierData.hotel_id === null || tierData.hotel_id === undefined)) {
    return res.status(400).json({ message: 'hotel_id is required for hotel_loyal tier.' });
  }
  // No specific validation for hotel_id on repeater/brand_loyal here, as model handles setting it to NULL.

  // Removed validation block for time_period_unit

  if (tierData.logic_operator && !['AND', 'OR'].includes(tierData.logic_operator.toUpperCase())) {
    return res.status(400).json({ message: "logic_operator must be 'AND' or 'OR'." });
  }
  // Ensure logic_operator is stored in uppercase
  if (tierData.logic_operator) {
    tierData.logic_operator = tierData.logic_operator.toUpperCase();
  }


  if ((lowerTierName === 'hotel_loyal' || lowerTierName === 'brand_loyal') && (tierData.min_bookings === null || tierData.min_bookings === undefined) && (tierData.min_spending === null || tierData.min_spending === undefined) ) {
    return res.status(400).json({ message: 'Either min_bookings or min_spending must be provided for hotel_loyal or brand_loyal tiers.' });
  }
  if (lowerTierName === 'repeater' && (tierData.min_bookings === null || tierData.min_bookings === undefined)) {
    return res.status(400).json({ message: 'min_bookings must be provided for repeater tier.' });
  }

  // Ensure numeric values are numbers or null
  tierData.min_bookings = tierData.min_bookings !== undefined && tierData.min_bookings !== null ? Number(tierData.min_bookings) : null;
  tierData.min_spending = tierData.min_spending !== undefined && tierData.min_spending !== null ? Number(tierData.min_spending) : null;
  tierData.time_period_months = Number(tierData.time_period_months); // Changed from time_period_value

  const cleanTierData = {
    tier_name: tierData.tier_name, // already lowercased
    hotel_id: tierData.hotel_id,
    min_bookings: tierData.min_bookings, // already Number or null
    min_spending: tierData.min_spending, // already Number or null
    time_period_months: tierData.time_period_months, // already Number
    logic_operator: tierData.logic_operator, // already uppercased or null
  };

  try {
    const result = await settingsModel.upsertLoyaltyTier(req.requestId, cleanTierData, userId);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error in handleUpsertLoyaltyTiers:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
// End of Loyalty Tier Controller Functions

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
  handleGetLoyaltyTiers,
  handleUpsertLoyaltyTiers,
};