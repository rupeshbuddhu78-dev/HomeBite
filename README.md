<div align="center">

# 🍽️ HomeBite

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=24&pause=1000&color=FF7A18&center=true&vCenter=true&width=720&lines=Fresh+Meals;+Smart+Ordering;+Home+Chef+Delivery;+Built+with+Node.js+%26+Supabase" alt="HomeBite intro animation" />

A smart food delivery and home-cooking platform that connects customers with home chefs, enabling menu browsing, ordering, profile management, payments, and food routines in one seamless experience.

[✨ Features](#-features) · [📁 Project Structure](#-project-structure) · [🧰 Tech Stack](#-tech-stack) · [⚙️ Setup](#-setup) · [📦 API Overview](#-api-overview)

</div>

---

## ✨ Features

- User registration and login flow
- Food item listing and menu browsing
- Cook / kitchen profile discovery
- Cart and order placement support
- Online payment integration with Razorpay
- COD order support
- Order history and status tracking
- Weekly meal routine management
- Leave application workflow for meal schedules
- User profile and address management
- Cloudinary-based media uploads for food and profile images
- Supabase-backed cloud database integration

---

## 🧰 Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Database | Supabase |
| Media Storage | Cloudinary |
| Payments | Razorpay |
| Environment Config | dotenv |

---

## 📁 Project Structure

```text
HomeBite/
├── index.html
├── login.html
├── signup.html
├── menu.html
├── live-menu.html
├── cart.html
├── orderhistory.html
├── profile.html
├── manage-addresses.html
├── routine.html
├── leave.html
├── server.js
├── package.json
├── .env.example (if configured locally)
├── README.md
└── public assets / static frontend files
```

---

## ⚙️ Setup

### Prerequisites

- Node.js
- npm
- Supabase project
- Cloudinary account
- Razorpay account

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the root directory:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
PORT=5000
```

### 3. Run the server

```bash
node server.js
```

The app runs on:

```bash
http://localhost:5000
```

---

## 📦 API Overview

The backend exposes multiple endpoints for customer, cook, order, and profile features, including:

- `POST /api/signup` — user registration
- `POST /api/login` — customer login
- `POST /api/update-profile` — update profile
- `GET /api/food-items` — fetch food items
- `POST /api/food-items` — add new food item
- `DELETE /api/food-items/:id` — remove food item
- `POST /api/addresses` — add address
- `GET /api/addresses/:userId` — fetch addresses
- `POST /api/create-razorpay-order` — create payment order
- `POST /api/verify-payment` — validate payment
- `POST /api/orders` — create COD order
- `GET /api/orders/:userId` — fetch order history
- `POST /api/cook/register` — register a cook
- `POST /api/cook/login` — cook login
- `GET /api/cook/orders/:cookId` — get cook orders
- `POST /api/cook/routine` — save weekly meal routine

---

## 🧠 Project Highlights

This project is built around a food-ordering ecosystem with a strong home-chef model. The server logic handles:

- User authentication and account creation
- Cloud-based storage for images and media
- Payment verification and order creation
- Cook management and food menu updates
- Customer order tracking and delivery routines

---

## ⚠️ Notes

- Sensitive secret keys should be stored in environment variables, not directly in source code.
- Payment and database flows depend on valid Supabase and Razorpay credentials.
- The repository is suitable for a food-tech MVP or demo project.

---

## 📝 License

No explicit license is currently provided in the project files. Please check the repository owner before using or redistributing the code.

---

<div align="center">

Made with ❤️ for a smarter food experience

</div>
