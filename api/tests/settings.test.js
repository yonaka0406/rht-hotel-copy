const request = require('supertest');
const app = require('../index'); // Adjust if your app is exported differently
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Mock the authMiddleware to allow all requests for these tests
jest.mock('../middleware/authMiddleware');

const stampDir = path.join(__dirname, '..', 'components');
const stampPath = path.join(stampDir, 'stamp.png');
const tempStampBackupPath = path.join(stampDir, 'stamp.png.backup');

const testAssetsDir = path.join(__dirname, 'temp_assets');
const validImagePath = path.join(testAssetsDir, 'valid.png');
const smallImagePath = path.join(testAssetsDir, 'small.png');
const largeImagePath = path.join(testAssetsDir, 'large.png'); // For file size test
const nonImagePath = path.join(testAssetsDir, 'invalid.txt');

const multerTempUploadDir = path.join(__dirname, '..', 'tmp', 'uploads');

beforeAll(async () => {
    // Ensure components directory exists
    if (!fs.existsSync(stampDir)) {
        fs.mkdirSync(stampDir, { recursive: true });
    }
    // Backup existing stamp.png if it exists
    if (fs.existsSync(stampPath)) {
        fs.copyFileSync(stampPath, tempStampBackupPath);
    }

    // Create test assets directory if it doesn't exist
    if (!fs.existsSync(testAssetsDir)) {
        fs.mkdirSync(testAssetsDir, { recursive: true });
    }

    // Create a valid image (200x200, PNG)
    await sharp({
        create: {
            width: 200,
            height: 200,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
    }).png().toFile(validImagePath);

    // Create a small image (100x100, PNG)
    await sharp({
        create: {
            width: 100,
            height: 100,
            channels: 4,
            background: { r: 0, g: 0, b: 255, alpha: 1 }
        }
    }).png().toFile(smallImagePath);

    // Create a "large" file (e.g., > 1MB of data, named as png for multer to pick it up)
    // Multer checks size before sharp processes it for dimensions.
    const largeBuffer = Buffer.alloc(1024 * 1024 * 1.5, 'a'); // 1.5MB
    fs.writeFileSync(largeImagePath, largeBuffer);


    // Create a non-image file
    fs.writeFileSync(nonImagePath, 'This is not an image.');

    // Ensure multer's temp upload directory exists (controller creates it, but good for cleanup)
    if (!fs.existsSync(multerTempUploadDir)) {
        fs.mkdirSync(multerTempUploadDir, { recursive: true });
    }
});

afterAll(() => {
    // Restore original stamp.png if it was backed up
    if (fs.existsSync(tempStampBackupPath)) {
        fs.renameSync(tempStampBackupPath, stampPath);
    } else if (fs.existsSync(stampPath)) {
        // If no backup existed but stamp.png was created by tests, remove it
        fs.unlinkSync(stampPath);
    }

    // Clean up test assets
    if (fs.existsSync(testAssetsDir)) {
        fs.rmSync(testAssetsDir, { recursive: true, force: true });
    }

    // Clean up multer's temporary upload directory
    if (fs.existsSync(multerTempUploadDir)) {
        fs.rmSync(multerTempUploadDir, { recursive: true, force: true });
    }
});


describe('POST /api/settings/stamp/upload', () => {
    it('should upload stamp successfully with a valid image', async () => {
        const response = await request(app)
            .post('/api/settings/stamp/upload')
            .attach('stampImage', validImagePath);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Stamp updated successfully.');
        expect(fs.existsSync(stampPath)).toBe(true);

        // Verify the content (optional, simple check by size or a hash if needed)
        const uploadedStampStat = fs.statSync(stampPath);
        const testImageStat = fs.statSync(validImagePath);
        //This check is not reliable as sharp might re-encode the image
        //expect(uploadedStampStat.size).toBe(testImageStat.size); 
    });

    it('should fail if no file is uploaded', async () => {
        const response = await request(app)
            .post('/api/settings/stamp/upload');
            // No .attach()

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('No file uploaded.');
    });

    it('should fail with invalid file type (e.g., .txt)', async () => {
        const response = await request(app)
            .post('/api/settings/stamp/upload')
            .attach('stampImage', nonImagePath);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        // Message comes from multer fileFilter
        expect(response.body.message).toMatch(/Only image files \(JPG, JPEG, PNG, GIF\) are allowed!/i);
    });

    it('should fail if image dimensions are too small (<150x150)', async () => {
        const response = await request(app)
            .post('/api/settings/stamp/upload')
            .attach('stampImage', smallImagePath);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Image dimensions must be at least 150x150 pixels.');
    });

    it('should fail if file size is too large (>1MB)', async () => {
        const response = await request(app)
            .post('/api/settings/stamp/upload')
            .attach('stampImage', largeImagePath); // This file is >1MB

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        // This message comes from multer's limits
        expect(response.body.message).toBe('File too large');
    });
});

// Basic test to ensure the server starts (can be in a separate health.test.js)
describe('Server Health Check', () => {
    it('should respond to a simple GET request to a known route (e.g., /api)', async () => {
        // Temporarily add a known route to app if none exists for a simple health check
        // This is just to ensure the app loads for testing.
        // In a real app, you'd have a health check endpoint or use an existing one.
        if (!app._router.stack.find(layer => layer.route && layer.route.path === '/api/health-check-test')) {
            app.get('/api/health-check-test', (req, res) => res.status(200).json({ok: true}));
        }
        
        const response = await request(app).get('/api/health-check-test');
        expect(response.status).toBe(200);
    });
});
