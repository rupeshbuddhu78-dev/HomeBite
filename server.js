require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2; // Cloudinary SDK
const multer = require('multer');             // File upload handler

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

// ==========================================
// CLOUDINARY CONFIGURATION 
// ==========================================
cloudinary.config({
    cloud_name: 'dr8yguhui',
    api_key: '981929427569341',
    api_secret: '5GPy1IaiebH5TPTH9jnn7uHElk8' 
});

// Multer Setup (Form Data aur Image Upload ke liye)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function for Cloudinary
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
    console.error("❌ ERROR: Supabase Keys missing! Ensure they are added in Render Env.");
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
app.post('/api/signup', async (req, res) => {
    const { fullname, phone, email, address, password, profileImage } = req.body;

    try {
        let profilePicUrl = null;

        if (profileImage && profileImage.trim() !== "") {
            const cloudinaryResult = await cloudinary.uploader.upload(profileImage, {
                folder: 'homebite_users'
            });
            profilePicUrl = cloudinaryResult.secure_url; 
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) return res.status(400).json({ success: false, message: authError.message });

        const userId = authData.user.id;

        const { error: dbError } = await supabase
            .from('users')
            .insert([{ 
                id: userId, 
                name: fullname, 
                email: email,      
                phone: phone, 
                address: address,
                profile_pic_url: profilePicUrl,
                password: password
            }]);

        if (dbError) return res.status(500).json({ success: false, message: "Auth successful, but failed to save profile details: " + dbError.message });

        return res.status(201).json({ success: true, message: "Account Created Successfully!", profile_pic_url: profilePicUrl });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
    }
});

// ==========================================
// 2. FOOD ITEMS UPLOAD API 
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
            .insert([{ cook_id, name, price: parseInt(price), type, image_url: foodImageUrl }]);

        if (error) return res.status(400).json({ success: false, message: error.message });

        return res.status(201).json({ success: true, message: "Food Item added successfully!", url: foodImageUrl });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 3. LOGIN API (FULL PROFILE DATA)
// ==========================================
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email, password
        });

        if (authError) return res.status(401).json({ success: false, message: authError.message });

        const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        const finalUser = { ...authData.user, ...userData };

        return res.status(200).json({ 
            success: true, 
            message: "Login Successful!", 
            token: authData.session.access_token,
            user: finalUser 
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
    }
});

// ==========================================
// 4. MISSING FIX: UPDATE PROFILE API
// ==========================================
app.post('/api/update-profile', upload.single('profile_pic'), async (req, res) => {
    const { userId, fullname, phone, address } = req.body;

    try {
        let updateData = {};
        if (fullname) updateData.name = fullname;
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;

        // Agar user ne nayi photo upload ki hai
        if (req.file) {
            const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'homebite_users');
            updateData.profile_pic_url = cloudinaryResult.secure_url;
        }

        // Database ko update karo
        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);

        if (error) return res.status(400).json({ success: false, message: error.message });

        return res.status(200).json({ 
            success: true, 
            message: "Profile updated successfully!",
            profile_pic_url: updateData.profile_pic_url // Nayi photo ka URL frontend ko wapas bhej do
        });

    } catch (err) {
        console.error("Update Profile Error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 5. MISSING FIX: CHANGE PASSWORD API
// ==========================================
app.post('/api/change-password', async (req, res) => {
    const { userId, password } = req.body;

    try {
        // Apni database table mein password update karo
        const { error } = await supabase
            .from('users')
            .update({ password: password })
            .eq('id', userId);

        if (error) return res.status(400).json({ success: false, message: error.message });

        return res.status(200).json({ success: true, message: "Password updated successfully!" });
    } catch (err) {
        console.error("Change Password Error:", err);
        return res.status(500).json({ success: false, error: err.message });
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
