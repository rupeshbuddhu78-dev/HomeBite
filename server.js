require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2; // Cloudinary SDK
const multer = require('multer');             // File upload handler (Food items ke liye)

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 👈 ZAROORI: Base64 image badi hoti hai, isliye limit 10mb badha di
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// ==========================================
// CLOUDINARY CONFIGURATION
// ==========================================
cloudinary.config({
    cloud_name: 'dr8yguhui',
    api_key: '981929427569341',
    api_secret: process.env.CLOUDINARY_API_SECRET // Ensure this is in your .env file
});

// Multer Setup (Sirf Food Items API ke liye use hoga)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function: Image buffer ko Cloudinary par upload karne ke liye (Sirf Food items ke liye)
const uploadToCloudinary = (fileBuffer, folderName) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: folderName },
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
    console.error("❌ ERROR: Supabase Keys missing! Ensure they are added in .env file.");
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
// 1. SIGNUP API (With Base64 Profile Pic Upload)
// ==========================================
// Note: Yahan se multer hata diya hai kyunki frontend se Base64 JSON data aa raha hai
app.post('/api/signup', async (req, res) => {
    // profileImage frontend wale JSON se aa raha hai
    const { fullname, phone, email, address, password, profileImage } = req.body;

    try {
        let profilePicUrl = null;

        // 👈 FIX 2: Agar frontend se Base64 string aayi hai, toh use direct Cloudinary par bhejo
        if (profileImage && profileImage.trim() !== "") {
            const cloudinaryResult = await cloudinary.uploader.upload(profileImage, {
                folder: 'homebite_users'
            });
            profilePicUrl = cloudinaryResult.secure_url; // Cloudinary ka live URL mil gaya
        }

        // Step 1: User ko Supabase Authentication mein register karein
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
                email: email,      
                phone: phone, 
                address: address,
                profile_pic_url: profilePicUrl,
                password: password // 👈 FIX 1: Database constraint ke liye password field add kar diya
            }]);

        if (dbError) {
            console.error("DB Error:", dbError);
            return res.status(500).json({ success: false, message: "Auth successful, but failed to save profile details: " + dbError.message });
        }

        return res.status(201).json({ success: true, message: "Account Created Successfully!", profile_pic_url: profilePicUrl });

    } catch (err) {
        console.error("Signup Catch Error:", err);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
    }
});

// ==========================================
// 2. FOOD ITEMS UPLOAD API (Multipart Form-data)
// ==========================================
app.post('/api/food-items', upload.single('food_image'), async (req, res) => {
    const { cook_id, name, price, type } = req.body;

    try {
        let foodImageUrl = null;

        if (req.file) {
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
                image_url: foodImageUrl
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
