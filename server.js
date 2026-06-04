require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // JSON data read karne ke liye

// Supabase Database Connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Connection Check (Aapki request ke anusar)
async function checkDatabaseConnection() {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
        console.error("❌ Database Connection Failed:", error.message);
    } else {
        console.log("✅ Successfully connected to Supabase Database!");
    }
}
checkDatabaseConnection();

// ==========================================
// 1. SIGNUP API (Create Account)
// ==========================================
app.post('/api/signup', async (req, res) => {
    const { fullname, phone, email, address, password } = req.body;

    try {
        // Step 1: Supabase Auth mein user banayein
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) {
            return res.status(400).json({ success: false, message: authError.message });
        }

        const userId = authData.user.id;

        // Step 2: Aapki 'users' table mein data insert karein
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
            return res.status(500).json({ success: false, message: "Auth successful but failed to save user details." });
        }

        res.status(201).json({ success: true, message: "Account Created Successfully!" });

    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error", error: err.message });
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

        res.status(200).json({ 
            success: true, 
            message: "Login Successful", 
            token: data.session.access_token,
            user: data.user 
        });

    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error", error: err.message });
    }
});

// Default Route
app.get('/', (req, res) => {
    res.send("HomeBite API is running...");
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});