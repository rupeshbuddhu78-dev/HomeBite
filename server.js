require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2; // 👈 Cloudinary SDK
const multer = require('multer');             // 👈 File upload handler

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ==========================================
// CLOUDINARY CONFIGURATION (Aapke Credentials)
// ==========================================
cloudinary.config({
    cloud_name: 'dr8yguhui',
    api_key: '981929427569341',
    api_secret: process.env.CLOUDINARY_API_SECRET // 👈 Security ke liye ise .env file me CLOUDINARY_API_SECRET="aapki_secret_key" likh dena
});

// Multer in-memory storage setup (direct upload to cloudinary without saving on disk)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function: Image buffer ko Cloudinary par specific folder me upload karne ke liye
const uploadToCloudinary = (fileBuffer, folderName) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: folderName }, // 👈 Yahan folder name dynamic pass hoga
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(fileBuffer);
    });
};

// ==========================================
// SUPABASE DATABASE SETUP
// ==========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERROR: Supabase Keys missing! Ensure they are added in Render Env or .env file.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
        console.error("❌ Database Connection Error:", error.message);
    } else {
        console.log("✅ Successfully connected to Supabase Database!");
    }
}
testConnection();

// ==========================================
// 1. SIGNUP API (With Profile Pic Upload)
// ==========================================
// 'profile_pic' frontend se aane wali image file ka naam hoga
app.post('/api/signup', upload.single('profile_pic'), async (req, res) => {
    const { fullname, phone, email, address, password } = req.body;

    try {
        let profilePicUrl = null;

        // Agar frontend se image aayi hai toh use Cloudinary ke 'homebite_users' folder me bhejo
        if (req.file) {
            const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'homebite_users');
            profilePicUrl = cloudinaryResult.secure_url; // Cloudinary ka image URL mila
        }

        // Step 1: User ko Supabase Authentication table mein banayein
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) {
            return res.status(400).json({ success: false, message: authError.message });
        }

        const userId = authData.user.id;

        // Step 2: User details aur Cloudinary URL ko 'users' table mein insert karein
        const { error: dbError } = await supabase
            .from('users')
            .insert([{ 
                id: userId, 
                name: fullname, 
                email: email,      // Email fields synced
                phone: phone, 
                address: address,
                profile_pic_url: profilePicUrl // 👈 Saving Cloudinary URL in database
            }]);

        if (dbError) {
            console.error("DB Error:", dbError);
            return res.status(500).json({ success: false, message: "Authentication successful, but failed to save profile details." });
        }

        return res.status(201).json({ success: true, message: "Account Created Successfully!", profile_pic_url: profilePicUrl });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
    }
});

// ==========================================
// 2. FOOD ITEMS UPLOAD API (Alag Folder ke liye)
// ==========================================
app.post('/api/food-items', upload.single('food_image'), async (req, res) => {
    const { cook_id, name, price, type } = req.body;

    try {
        let foodImageUrl = null;

        if (req.file) {
            // Food items ko Cloudinary ke alag 'homebite_food_items' folder me upload karein
            const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'homebite_food_items');
            foodImageUrl = cloudinaryResult.secure_url;
        }

        const { data, error } = await supabase
            .from('food_items')
            .insert([{
                cook_id: cook_id,
                name: name,
                price: parseInt(price),
                type: type,
                image_url: foodImageUrl // Saving Food Image URL in DB
            }]);

        if (error) return res.status(400).json({ success: false, message: error.message });

        return res.status(201).json({ success: true, message: "Food Item added successfully!", url: foodImageUrl });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 3. LOGIN API
// ==========================================
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            return res.status(401).json({ success: false, message: error.message });
        }

        return res.status(200).json({ 
            success: true, 
            message: "Login Successful!", 
            token: data.session.access_token,
            user: data.user 
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
    }
});

// Wildcard Route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Server Start
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
