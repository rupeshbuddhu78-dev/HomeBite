require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Frontend files (HTML, CSS, JS) ko host karne ke liye
app.use(express.static(__dirname));

// Supabase Database Setup
// Render par jo keys daali hain, wo yahan automatic aayengi
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERROR: Supabase Keys missing! Ensure they are added in Render Env or .env file.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Check if database is connected
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
// 1. SIGNUP API (Create Account)
// ==========================================
app.post('/api/signup', async (req, res) => {
    const { fullname, phone, email, address, password } = req.body;

    try {
        // Step 1: User ko Authentication table mein banayein
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) {
            return res.status(400).json({ success: false, message: authError.message });
        }

        const userId = authData.user.id;

        // Step 2: User details ko 'users' table mein insert karein
        const { error: dbError } = await supabase
            .from('users')
            .insert([{ 
                id: userId, 
                name: fullname, 
                phone: phone, 
                address: address 
            }]);

        if (dbError) {
            console.error("DB Error:", dbError);
            return res.status(500).json({ success: false, message: "Authentication successful, but failed to save profile details." });
        }

        return res.status(201).json({ success: true, message: "Account Created Successfully!" });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
    }
});

// ==========================================
// 2. LOGIN API
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

// Agar URL galat type hua toh seedha index.html (Home Page) dikhao
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Server Start karo
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
