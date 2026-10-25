# 🌸 HerHealth AI — Women's Menstrual Healthcare Web Application
> **Tagline:** *Your Symptoms. Your Story. Your Health.*

HerHealth AI is an integrated, privacy-conscious women's menstrual health companion designed to support cycle tracking, general health education, guided relaxation and breathwork, nutritional information, conservative safety alerts, and preparation of doctor-ready summaries for healthcare consultations.

---

## 🌟 Key Application Modules

1. **User Authentication & Privacy Profiles:** Secure session-based authentication with bcrypt password hashing, HTTP-only cookies, baseline cycle length settings, and one-click permanent account and data purge.
2. **Interactive Menstrual Period Tracker:** Monthly visual calendar mapping period flow, spotting, and estimated upcoming dates with historical cycle duration calculations and cycle phase tracking.
3. **Daily Symptom & Pain Analytics:** Record daily symptoms (cramps, headache, fatigue, bloating, flow, mood) with 0-10 pain intensity tracking and Chart.js trend visualizations.
4. **Conversational AI Health Assistant:** General menstrual health educational guidance with a prompt-injection safe system prompt, emergency symptom triage, and an honest **Educational Demo Mode** fallback when no external API key is provided.
5. **Conservative Menstrual Health Alerts:** Rule-based checks for reported heavy bleeding, severe pain, or dizziness with next-step guidance; these checks are not a diagnosis and require professional clinical review before deployment.
6. **Mindful Wellness, Yoga & Breathwork:** Interactive 4-7-8 parasympathetic breathwork circle with sound cues, synthesized Web Audio ambient soundscapes (432Hz theta waves, pink noise rain), and guided restorative yoga routines.
7. **Nutritional Guidance & Daily Hydration:** Educational food pillars (Iron, Magnesium, Omega-3s) with vegetarian and non-vegetarian meal plans, plus a daily water tracker with bottle fill progress.
8. **Structured Health Questionnaire:** Six-step, resumable questionnaire with an authenticated MongoDB history, immediate server-evaluated safety previews, and non-diagnostic results.
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

Questionnaire answers and assessments are stored only in the authenticated Express/MongoDB application; the questionnaire page does not mirror sensitive responses to Firestore or send them to the AI assistant.

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
│   │   ├── questionnaireAssessmentService.js # Input validation and four-level safety rules
│   │   └── reportService.js         # PDFKit medical PDF builder
│   └── tests/
│       ├── api.test.js              # Backend integration tests
│       └── questionnaireAssessment.test.js # Questionnaire safety-rule unit tests
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
EMERGENCY_NUMBER=112
```
*(Leave `AI_API_KEY` empty to use the transparent educational Demo Mode).*

`EMERGENCY_NUMBER` controls the emergency contact shown in questionnaire Level 4 guidance. The default is `112`; configure it for the user's deployment location.

### 3. Run Automated Tests
Run the backend integration and questionnaire assessment tests:
```bash
npm test
```
The tests cover authentication, user data isolation, cycle metrics, period validation, symptom alerts, AI fallback, PDF download, input validation, and assessment escalation.

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
- **Questionnaire Privacy:** Questionnaire submissions are available only to the authenticated account owner, are recalculated by the server, and are included in the account data purge. The questionnaire workflow does not send responses to an external AI provider or Firestore.
- **Emergency Triage:** If red-flag symptoms (severe sudden pain, fainting, dizziness with heavy bleeding) are detected in symptom logs or AI chat queries, the platform immediately presents emergency medical advisory notices.
- **Complete Data Ownership:** Users can download their raw data via doctor reports or delete their entire account and all associated health history permanently at any time.

## 🩺 Questionnaire Safety Assessment Rules

The assessment engine is deterministic and runs on the backend. It prioritizes the highest matching level and never accepts an urgency level supplied by the browser.

1. **General wellness:** No evaluated warning sign is reported. This is not a finding that a person is healthy and cannot rule out a medical problem. Missing or uncertain answers are surfaced as assessment limitations.
2. **Medical consultation:** Examples include pain that repeatedly affects daily activities or is rated 6/10 or higher, prolonged or between-period bleeding, and heavy bleeding with significant fatigue.
3. **Urgent assessment:** Examples include severe pain (8/10 or selected severe pelvic pain), worsening pain rated at least 5/10, heavy bleeding with dizziness or weakness, possible pregnancy with significant/new pain, pain with fever, or changing products hourly for two consecutive hours.
4. **Emergency warning:** Examples include hourly product changes for two consecutive hours with dizziness or marked weakness, fainting/collapse with heavy bleeding or severe pain, possible pregnancy with severe/shoulder-tip pain plus fainting or significant bleeding, or severe breathing difficulty with collapse/extreme pain. The configured emergency number is shown alongside local emergency services.

“Not sure” and “Prefer not to answer” are retained as uncertainty and are not converted to “No.” Users may leave answers blank. Concerning reported symptoms still trigger guidance without requiring the remaining questions. The rule set is an educational safety aid, not a diagnostic tool; a qualified healthcare professional must review the questionnaire and escalation rules before real-world clinical deployment.

Authenticated questionnaire endpoints are mounted at `/api/questionnaires` (the existing `/api/assessments` route remains as a compatibility alias):

- `POST /api/questionnaires/preview` evaluates current answers without saving a submission, allowing urgent guidance before completion.
- `POST /api/questionnaires` validates, recalculates, and stores a completed submission.
- `POST /api/questionnaires/draft` saves the authenticated user's in-progress draft.
- `GET /api/questionnaires/latest` and `GET /api/questionnaires/history` retrieve that user's latest record and completed history.
- `GET /api/questionnaires/:id` and `GET /api/questionnaires/:id/assessment` retrieve that user's record and server-generated assessment.
- `DELETE /api/questionnaires/:id` deletes a record owned by the authenticated user.

---

## 📄 License
ISC License — Created with care for women's reproductive health and wellness.
