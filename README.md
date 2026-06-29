# 🏥 MedNova-AI — Intelligent Medical Triage Platform
 
> AI-powered symptom assessment, real-time hospital discovery, and emergency response — built for modern India.

---
 
## 📌 Table of Contents
 
1. Project Overview
2. The Problem
3. The Solution
4. How the AI Works
5. Key Features
6. Architecture Diagrams
7. Tech Stack
8. Project Structure
9. Medical Disclaimer
---

## 🌐 Project Overview
 
**MedNova-AI** is a full-stack, production-ready medical information platform that uses
Google Gemini AI to guide users through a structured clinical symptom assessment.
 
Rather than dumping generic health content at a user, it holds a real conversation —
asking the right follow-up questions, building a clinical picture, and then either
providing structured lifestyle guidance or escalating to emergency mode with live
hospital data and one-tap emergency calling.
 
```
Problem ──► User feels sick, doesn't know what to do
Solution ──► MedNova-AI guides them intelligently and safely
             from symptom → triage → guidance or emergency response
```
 
---

## ❗ The Problem
 
Healthcare access in India faces three critical real-world gaps:
 
### Gap 1 — Panic and Misinformation
When someone feels unwell, their first instinct is to Google symptoms.
This leads to misinformation, unnecessary panic, or the opposite —
ignoring a real emergency because a forum said it's nothing.
 
### Gap 2 — No Intelligent Home Triage
There is no structured, accessible way for a normal person to answer:
- How serious is this right now?
- Should I go to the ER tonight or wait for a GP appointment tomorrow?
- What can I safely do at home in the meantime?

### Gap 3 — Emergency Response Friction
In a real emergency, people lose critical minutes:
- Searching outdated hospital listings
- Not knowing which hospital has ICU capacity or active emergency
- Forgetting national emergency numbers under stress
---

## ✅ The Solution
 
MedNova-AI addresses all three gaps in one platform:
 
```
┌──────────────────────────────────────────────────────────────────────┐
│                          MedNova-AI                                  │
│                                                                      │
│   "I have a headache"                                                │
│         │                                                            │
│         ▼                                                            │
│   AI asks follow-up questions                                        │
│   (onset, severity, history, associated symptoms...)                 │
│         │                                                            │
│         ├──► Red flag detected? ──► 🚨 EMERGENCY ALERT              │
│         │                              + Live Hospital Finder        │
│         │                              + One-tap 112 Call           │
│         │                                                            │
│         ├──► Data sufficient? ──► ✅ ADVISORY GUIDANCE              │
│         │                             + Rest / hydration advice      │
│         │                             + Warning signs to watch       │
│         │                             + When to see a doctor         │
│         │                                                            │
│         └──► Data unclear? ──► ⚠ INCONCLUSIVE                      │
│                                    "Please consult a doctor"         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```
 
---

## 🤖 How the AI Works
 
### The 6-Phase Triage State Machine
 
The core innovation is that MedNova-AI never jumps to conclusions.
It follows a strict clinical workflow before offering any guidance:
 
```
  ┌─────────┐
  │ INTAKE  │  User describes their main symptom
  └────┬────┘
       │
       ▼
  ┌─────────┐  AI asks 1-2 focused questions per turn:
  │ HISTORY │  • Onset and duration
  │         │  • Severity score (1-10)
  │         │  • Character (throbbing, sharp, dull...)
  │         │  • Aggravating / relieving factors
  │         │  • Associated symptoms
  │         │  • Age, sex, medical history
  └────┬────┘
       │
       │  Data Quality Score calculated (0-100)
       │
       ├── Score ≥ 70 ──────────────────────────────────────────┐
       │                                                         ▼
       │                                                  ┌────────────┐
       │                                                  │  ADVISORY  │
       │                                                  │            │
       │                                                  │ Complete   │
       │                                                  │ structured │
       │                                                  │ guidance   │
       │                                                  └────────────┘
       │
       ├── Score < 70 after 8+ questions ──────────────────────┐
       │                                                         ▼
       │                                                  ┌──────────────┐
       │                                                  │ INCONCLUSIVE │
       │                                                  │              │
       │                                                  │ "Insufficient│
       │                                                  │  data—see a  │
       │                                                  │  doctor"     │
       │                                                  └──────────────┘
       │
       └── RED FLAG at ANY phase ───────────────────────────────┐
                                                                 ▼
                                                          ┌───────────┐
                                                          │ EMERGENCY │
                                                          │           │
                                                          │ Halt all. │
                                                          │ Call 112. │
                                                          └───────────┘
```

### AI Safety Guardrails
 
The AI is constrained by a strict system prompt on every request:
 
| Constraint | What it enforces |
|---|---|
| 🚫 Zero Diagnosis | Never names, implies, or suggests any medical condition |
| 🚫 Zero Medication | Never recommends any drug, supplement, or OTC medicine |
| ✅ Phased Protocol | Must collect full history before any guidance is given |
| 🚨 Emergency Override | Any red-flag keyword → immediate escalation, no exceptions |
| ⚠ Inconclusive Guard | Won't guess with insufficient data — says so clearly |
| 👶 Scope Limits | Paediatric / pregnant / mental health → professional referral only |
 
### 4-Layer Safety Architecture
 
```
  Layer 1 ── Client Pre-Check
             Scans every message for 40+ emergency keywords
             BEFORE calling the AI. If found → EMERGENCY
             instantly, no API call needed.
 
  Layer 2 ── System Prompt Constraints
             Every AI call is wrapped in a strict clinical
             boundary prompt. The AI cannot respond outside
             these rules by design.
 
  Layer 3 ── Server Response Validation
             Every AI response is validated after it returns.
             Rule violations → overridden with safe fallback.
 
  Layer 4 ── Truncation Guard
             If AI cuts off mid-sentence in ADVISORY mode,
             server appends complete fallback guidance.
             User always receives a full answer.
```
 
---

## ✨ Key Features
 
### 🗣 AI Clinical Assessment
- Dynamic conversation that gathers a complete clinical picture
- Data quality scoring (0–100) before any advice is given
- Complete structured advisory: rest, hydration, activity, warning signs, when to seek care
- Session history stored locally
### 🚨 Emergency System
- 40+ red-flag keywords detected instantly (chest pain, stroke signs, overdose, etc.)
- Full-screen emergency alert with elapsed timer
- One-tap call to 112
- India emergency contacts: 112, 108, 102, Poison Control (1800-116-117), Mental Health (14416)
### 🏥 Live Hospital Finder
- Auto-detects city via GPS + reverse geocoding
- Search any Indian city by name
- Quick-select buttons: Bhopal, Delhi, Mumbai, Bangalore, Hyderabad + more
- Real hospital data from OpenStreetMap (free, no API key needed)
- 15 km search radius
- Smart recommendation scoring: distance + ICU + beds + emergency + trauma + brand
- Top 3 hospitals ranked: #1 Best Match, #2 Highly Recommended, #3 Recommended
- Per-hospital data: beds, ICU, 24×7 emergency, trauma centre, open/closed, phone, navigation
**12 Speciality Filters:**
```
Best Rated    Nearest       Emergency/Trauma   Heart/Cardiac
Eye Care      Bone & Ortho  Neuro/Brain        Cancer/Oncology
Paediatric    Maternity     Routine Check-up   Multi-Speciality
```
 
### 📊 Dashboard
- 3-tab layout: AI Assessment, Emergency Hub, Records
- Vital signs monitor (Heart Rate, O₂ Sat, BP, Temperature, Respiratory Rate, Pain Score)
- System status bar with live clock
- Fully responsive — desktop sidebar + mobile bottom nav
---

## 🏗 Architecture Diagrams
 
### System Architecture
 
```
┌───────────────────────────────────────────────────────────────────┐
│                        Browser / Client                           │
│                                                                   │
│  ┌─────────────────────┐      ┌──────────────────────────────┐   │
│  │  AssessmentWizard   │      │       EmergencyPanel         │   │
│  │                     │      │                              │   │
│  │  • Chat UI          │      │  • GPS location detection    │   │
│  │  • State machine    │      │  • OSM hospital query        │   │
│  │  • Form validation  │      │  • 12 filter categories      │   │
│  │  • Red-flag check   │      │  • Scoring + ranking         │   │
│  │  • Session history  │      │  • Vitals monitor            │   │
│  └──────────┬──────────┘      └──────────────┬───────────────┘   │
│             │                                │                   │
└─────────────┼────────────────────────────────┼───────────────────┘
              │                                │
              │ POST /api/triage               │ Free External APIs
              ▼                                ▼
┌─────────────────────────┐   ┌─────────────────────────────────┐
│   Next.js Edge API      │   │  OpenStreetMap Overpass API     │
│                         │   │  (hospital data, no key needed) │
│  • Rate limiting        │   │                                 │
│  • Zod validation       │   │  Nominatim OSM                  │
│  • Safety pre-check     │   │  (geocoding, no key needed)     │
│  • Prompt builder       │   │                                 │
│  • Response validator   │   │  Google Maps                    │
│  • Truncation guard     │   │  (navigation links only)        │
└────────────┬────────────┘   └─────────────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│    Google Gemini AI     │
│    gemini-2.5-flash     │
│                         │
│  • JSON response mode   │
│  • Temperature: 0.1     │
│  • Max tokens: 2048     │
│  • Safety filters ON    │
└─────────────────────────┘
```
 
### Data Flow
 
```
  User types message
          │
          ▼
  [CLIENT] detectRedFlagsInText()
          │
          ├─ Red flag found? ──► Return EMERGENCY (no API call made)
          │
          ▼
  POST /api/triage
          │
          ├─ Rate limit check  (20 req / min / IP)
          ├─ Zod schema validation
          ├─ Server-side red flag check (second pass)
          │
          ▼
  buildSystemPrompt(triageLevel, questionsAsked, caseHistory)
          │
          ▼
  callGeminiAPI(systemPrompt, conversationHistory)
          │
          ▼
  parseAndValidateAIResponse()
          │
          ├─ Validate JSON structure
          ├─ Enforce EMERGENCY if any red flag found
          ├─ Truncation guard for incomplete advisory
          │
          ▼
  Return AITriageResponse → Client renders message + updates state
```
 
---

## 🛠 Tech Stack
 
| Category | Technology | Purpose |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack React, Edge API routes |
| Language | TypeScript (Strict Mode) | End-to-end type safety |
| Styling | Tailwind CSS | Utility-first dark-theme UI |
| Icons | Lucide React | Consistent icon set |
| AI | Google Gemini 2.5 Flash | Core clinical reasoning engine |
| Forms | React Hook Form + Zod | Validated, type-safe form handling |
| Hospital Data | OpenStreetMap Overpass API | Free real-time hospital data |
| Geocoding | Nominatim OSM | Free city → coordinates lookup |
| Runtime | Vercel Edge Runtime | Low-latency API globally |

---
 
## 📂 Project Structure
 
```
mednova-ai/
│
├── src/
│   ├── app/
│   │   ├── api/triage/
│   │   │   └── route.ts          ← AI triage API (Edge Runtime)
│   │   │                            Rate limiting, Gemini call,
│   │   │                            safety validation layers
│   │   │
│   │   └── dashboard/
│   │       └── page.tsx          ← Main 3-tab dashboard
│   │                                Sidebar, mobile nav, stats,
│   │                                emergency banner
│   │
│   ├── components/dashboard/
│   │   ├── AssessmentWizard.tsx  ← AI chat component
│   │   │                            Conversation state machine,
│   │   │                            message bubbles, form input
│   │   │
│   │   └── EmergencyPanel.tsx    ← Emergency hub
│   │                                OSM hospital finder,
│   │                                12 filters, scoring engine,
│   │                                vitals, emergency contacts
│   │
│   ├── lib/
│   │   └── medicalPrompt.ts      ← AI system prompt engine
│   │                                Phase-aware prompt builder,
│   │                                red-flag detection,
│   │                                fallback responses
│   │
│   └── types/
│       └── medical.ts            ← All TypeScript interfaces
│                                    CaseHistory, NearbyFacility,
│                                    AITriageResponse, Zod schemas,
│                                    RED_FLAG_KEYWORDS registry
│
├── .env.local                    ← API keys (never commit)
├── .env.example                  ← Template (commit this)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```
 
---

## ⚠️ Medical Disclaimer
 
> MedNova-AI is a **health information tool only** — not a diagnostic tool, not a medical device, and not a replacement for professional medical care.
 
- Does **not** diagnose medical conditions
- Does **not** recommend medications or treatments
- Hospital data from OpenStreetMap may be incomplete or outdated
- In any medical emergency, **call 112 immediately**
---


<div align="center">
Built with Google Gemini AI · Next.js · OpenStreetMap · TypeScript
 
*Making healthcare guidance safer, smarter, and more accessible.*
 
</div>
