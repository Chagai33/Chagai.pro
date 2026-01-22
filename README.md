# 📸 Chagai.pro - Photography Portfolio Platform

![Framework](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white)
![Styling](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)
![Backend](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)
![Type](https://img.shields.io/badge/Type-Portfolio_%26_CMS-green)

> **"A photographer's portfolio shouldn't be slowed down by heavy frameworks."**

**Chagai.pro** is a custom-built photography portfolio designed for speed and ease of management.
Instead of relying on rigid website builders or complex third-party CMS integrations, I engineered a bespoke solution using **Astro** for frontend performance and **Firebase** for backend management.

This architecture allows me to manage my gallery via a secure Admin Dashboard without touching a single line of code, while delivering a blazing-fast browsing experience to visitors.

---

## 🔗 Live Site
[https://chagai.pro](https://chagai.pro)

---

## 💡 The Architecture (Hybrid Approach)

This project utilizes **Astro's Island Architecture** to mix static HTML with dynamic interactivity:

1.  **Static Shell (Astro):** The layout, SEO metadata, and initial paint are statically generated for maximum performance.
2.  **Dynamic Islands (React):** The Gallery grid and Admin Dashboard are hydrated as React components only when needed.
3.  **Serverless Backend (Firebase):**
    * **Firestore:** Stores metadata (titles, categories, dates).
    * **Storage:** Hosting for high-resolution images.
    * **Auth:** Secure authentication for the Admin portal.

---

## 🚀 Key Features

### 🎨 User Experience
* **Masonry Gallery Layout:** A responsive, auto-adjusting grid that respects the aspect ratio of each photograph.
* **Performance First:** Optimized asset loading and minimal JavaScript for the end-user.
* **Dark/Light Mode:** Full theming support with system preference detection.
* **Immersive Lightbox:** Full-screen image viewing experience.

### ⚙️ Custom Admin CMS
* **Secure Dashboard:** Protected route (`/admin`) for content management.
* **Drag & Drop Upload:** Seamless interface to upload new photos directly to Firebase Storage.
* **Metadata Editing:** Edit titles, descriptions, and visibility status in real-time.
* **Toast Notifications:** Real-time feedback for all CRUD operations.

---

## 🛠️ Tech Stack

* **Core Framework:** [Astro](https://astro.build/) (v5)
* **UI Components:** React (TypeScript)
* **Styling:** Tailwind CSS
* **Backend Services:** Google Firebase (Auth, Firestore, Storage)
* **State Management:** React Hooks & Context API
* **Error Handling:** Custom Error Boundaries

---

## 💻 Running Locally

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Chagai33/chagai.pro.git](https://github.com/Chagai33/chagai.pro.git)
    cd chagai.pro
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory with your Firebase config:
    ```env
    PUBLIC_FIREBASE_API_KEY=your_api_key
    PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
    PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```

---

## 👤 Author

**Chagai Yechiel**
* **Website:** [Chagai.pro](https://chagai.pro)
* **GitHub:** [@Chagai33](https://github.com/Chagai33)
* **LinkedIn:** [Chagai Yechiel](https://www.linkedin.com/in/chagai-yechiel/)
