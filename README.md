# 🌸 HerHealth AI — Women's Menstrual Healthcare Web Application
> **Tagline:** *Your Symptoms. Your Story. Your Health.*

HerHealth AI is an integrated, privacy-conscious women's menstrual healthcare companion designed to empower individuals to track their menstrual cycles, understand recurring symptoms with evidence-informed intelligence, explore guided relaxation and breathwork, discover nutritional guidance, receive conservative health alerts, and prepare doctor-ready clinical summaries for healthcare consultations.

---

## 🌟 Key Application Modules

1. **User Authentication & Privacy Profiles:** Secure session-based authentication with bcrypt password hashing, HTTP-only cookies, baseline cycle length settings, and one-click permanent account and data purge.
2. **Interactive Menstrual Period Tracker:** Monthly visual calendar mapping period flow, spotting, and estimated upcoming dates with historical cycle duration calculations and cycle phase tracking.
3. **Daily Symptom & Pain Analytics:** Record daily symptoms (cramps, headache, fatigue, bloating, flow, mood) with 0-10 pain intensity tracking and Chart.js trend visualizations.
4. **Conversational AI Health Assistant:** General menstrual health educational guidance with a prompt-injection safe system prompt, emergency symptom triage, and an honest **Educational Demo Mode** fallback when no external API key is provided.
5. **Conservative Menstrual Health Alerts:** Evidence-based clinical red-flag rules detecting unusually heavy bleeding, severe debilitating pain, or dizziness during bleeding with next-step clinical guidance.
6. **Mindful Wellness, Yoga & Breathwork:** Interactive 4-7-8 parasympathetic breathwork circle with sound cues, synthesized Web Audio ambient soundscapes (432Hz theta waves, pink noise rain), and guided restorative yoga routines.
7. **Nutritional Guidance & Daily Hydration:** Educational food pillars (Iron, Magnesium, Omega-3s) with vegetarian and non-vegetarian meal plans, plus a daily water tracker with bottle fill progress.
8. **Structured Health Questionnaire:** Multi-step clinical assessment organizing self-reported symptom history and cycle regularity into non-diagnostic personal health summaries.
9. **Doctor-Ready Clinical Health Reports:** Generate structured medical consultation summaries and download authentic, formatted PDF reports generated server-side using PDFKit.
10. **In-App Notifications & Reminders:** Configurable reminders for upcoming periods, daily logging check-ins, and health alert notices.

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, Modern CSS3 (Vanilla CSS with Soft Lavender & Blush Pink design system), Vanilla JavaScript (ES6+), Fetch API, Chart.js.
- **Authentication & Database:** Firebase Authentication (Email/Password, Google Sign-in) & Cloud Firestore (`herhealth-b2950`), alongside Express REST API and MongoDB.
- **Backend:** Node.js, Express.js (REST API architecture), Helmet, CORS, Express-Rate-Limit, Express-Session with Connect-Mongo.
- **PDF Generation:** PDFKit server-side generator.
- **Testing:** Node.js built-in test runner (`node:test`, `node:assert`) and Supertest.

---

## 🔥 Firebase Integration Details (`herhealth-b2950`)

HerHealth AI is connected to your Firebase project:
- **Project ID:** `herhealth-b2950`
- **Auth Domain:** `herhealth-b2950.firebaseapp.com`
- **Firebase Web SDK:** Modular v10 loaded via CDN ESM.
- **Enabled Services:**
  1. **Firebase Authentication:**
     - Email & Password registration and login
     - One-click Google Sign-In with popup
     - Integrated into [login.html](file:///d:/HerHealth/frontend/pages/login.html) and [register.html](file:///d:/HerHealth/frontend/pages/register.html)
  2. **Cloud Firestore Database Collections:**
     - `users`: User profiles, baseline cycle defaults, and notification preferences
     - `periods`: Menstrual cycle start/end dates, flow intensity, and notes
     - `symptoms`: Daily symptom logs, 0-10 pain ratings, and moods
     - `hydration`: Daily water consumption logs
     - `wellness`: Completed breathwork and yoga sessions
     - `assessments`: Comprehensive health questionnaire responses

### Firebase Console Setup Checklist
In your [Firebase Console](https://console.firebase.google.com/u/0/project/herhealth-b2950/overview):
1. **Authentication:** Go to **Build > Authentication > Sign-in method** and enable **Email/Password** and **Google**.
2. **Cloud Firestore:** Go to **Build > Firestore Database**, click **Create database**, and under the **Rules** tab, ensure authorized users can read and write their documents:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

---

## 📁 Project Structure

```text
HerHealth-AI/
├── frontend/
│   ├── index.html                   # Landing page
│   ├── pages/
│   │   ├── login.html               # User sign in (+ demo quick-seed)
│   │   ├── register.html            # User registration with privacy consent
│   │   ├── dashboard.html           # Main health dashboard & charts
│   │   ├── period-tracker.html      # Interactive calendar & cycle stats
│   │   ├── ai-assistant.html        # Conversational AI assistant
│   │   ├── health-alerts.html       # Symptom review & clinical notices
│   │   ├── wellness.html            # 4-7-8 breathing, soundscapes & yoga
│   │   ├── nutrition.html           # Food pillars & daily hydration
│   │   ├── health-assessment.html   # Multi-step health questionnaire
│   │   ├── health-report.html       # Doctor-ready preview & PDF generator
│   │   ├── notifications.html       # In-app notification inbox & preferences
│   │   └── profile.html             # Profile & account deletion
│   ├── css/
│   │   ├── style.css                # Core design system & theme tokens
│   │   ├── auth.css                 # Login & register styles
│   │   ├── dashboard.css            # Metric cards & chart grids
│   │   ├── tracker.css              # Calendar & cycle stat styling
│   │   ├── assistant.css            # Chat speech bubbles & typing indicator
│   │   ├── wellness.css             # Animated breathing orb & sound cards
│   │   ├── nutrition.css            # Bottle hydration & food cards
│   │   ├── assessment.css           # Multi-step progress bar styling
│   │   ├── report.css               # Clinical print and sheet styles
│   │   └── responsive.css           # Mobile & tablet layout breakpoints
│   └── js/
│       ├── api.js                   # Unified fetch client, session check & toasts
│       ├── auth.js                  # Login/registration logic & demo seeder
│       ├── dashboard.js             # Dashboard charts & modal dialogs
│       ├── period-tracker.js        # Calendar rendering & period CRUD
│       ├── ai-assistant.js          # Chatbot logic & markdown formatting
│       ├── health-alerts.js         # Alert evaluation & mark-as-read
│       ├── wellness.js              # Breathing engine & Web Audio synthesizer
│       ├── nutrition.js             # Hydration persistence & meal filters
│       ├── health-assessment.js     # Questionnaire stepper & draft persistence
│       ├── health-report.js         # Live report compilation & PDF download
│       ├── notifications.js         # Notification inbox & preferences
│       └── profile.js               # Profile update & data deletion
│
├── backend/
│   ├── server.js                    # Server startup & DB connection
│   ├── app.js                       # Express configuration & middleware
│   ├── config/
│   │   └── db.js                    # Mongoose database connection
│   ├── models/
│   │   ├── User.js                  # User schema & password hashing
│   │   ├── PeriodRecord.js          # Menstrual period records
│   │   ├── SymptomLog.js            # Daily symptoms & pain scores
│   │   ├── QuestionnaireResponse.js # Questionnaire answers & steps
│   │   ├── WellnessActivity.js      # Completed wellness sessions
│   │   ├── Notification.js          # In-app notifications
│   │   ├── ChatConversation.js      # Chat history with consent
│   │   ├── HealthAlert.js           # Triggered health alerts
│   │   └── HydrationLog.js          # Daily water consumption
│   ├── controllers/                 # Modular business logic controllers
│   ├── routes/                      # REST API routes
│   ├── middleware/
│   │   ├── auth.js                  # Session authentication guard
│   │   ├── rateLimiter.js           # Rate limiting for auth & AI
│   │   └── errorHandler.js          # Centralized error handler
│   ├── services/
│   │   ├── aiService.js             # AI provider communication & demo fallback
│   │   ├── cycleService.js          # Cycle intervals & phase calculations
│   │   ├── healthAlertService.js    # Rule evaluation for red-flag symptoms
│   │   └── reportService.js         # PDFKit medical PDF builder
│   └── tests/
│       └── api.test.js              # Automated backend test suite (14 specs)
│
├── .env.example                     # Environment template
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
1. **Node.js** (v18+ recommended, tested on Node v24).
2. **MongoDB** installed and running locally on port `27017` (or a remote MongoDB Atlas URI).

### 1. Installation
In the project root directory, install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` settings:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/herhealth_db
SESSION_SECRET=herhealth_super_secret_local_development_key_2026
FRONTEND_URL=http://localhost:5000
AI_PROVIDER=demo
AI_API_KEY=
AI_MODEL=educational-demo
```
*(Leave `AI_API_KEY` empty to use the transparent, medically-reviewed educational Demo Mode).*

### 3. Run Automated Tests
Run the comprehensive backend verification suite:
```bash
npm test
```
All 14 integration test specifications will execute and verify authentication, user data isolation, cycle metrics, period validation, symptom alerts, AI fallback, and PDF download.

### 4. Start the Application
Start the unified full-stack server:
```bash
npm start
```
Open your browser and navigate to:
```
http://localhost:5000
```

---

## ⚡ Instant Demonstration (For Hackathons & Judges)
1. On the landing page, click **Sign In to Dashboard**.
2. Click the button: **⚡ Demo: Load Pre-populated Account**.
3. The system automatically creates a demo account preloaded with:
   - 2 past menstrual periods showing duration and flow.
   - Sample daily symptom logs.
   - Interactive pain and symptom frequency charts.
   - Calculated cycle metrics (average cycle length, phase, next period estimate).
   - Pre-populated doctor-ready report ready for PDF export!

---

## 🔒 Privacy & Healthcare Safeguards

- **No Medical Diagnoses:** HerHealth AI clearly notes across all pages that it is an educational self-tracking tool and never substitutes for clinical medical evaluation.
- **Emergency Triage:** If red-flag symptoms (severe sudden pain, fainting, dizziness with heavy bleeding) are detected in symptom logs or AI chat queries, the platform immediately presents emergency medical advisory notices.
- **Complete Data Ownership:** Users can download their raw data via doctor reports or delete their entire account and all associated health history permanently at any time.

---

## 📄 License
ISC License — Created with care for women's reproductive health and wellness.
