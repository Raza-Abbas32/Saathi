# 🌾 Saathi (ساتھی) — Farm Decision Intelligence for Pakistan

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-blue.svg)](https://www.typescriptlang.org/)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61DAFB.svg)](https://react.dev/)
[![Express 5](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%205-green.svg)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini%20Flash-orange.svg)](https://ai.google.dev/)
[![AMIS Punjab](https://img.shields.io/badge/Data-AMIS%20Punjab%20Official-darkgreen.svg)](http://www.amis.pk/)
[![Tests Passing](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)](#14-testing--verification)

**AI-powered, farmer-first agricultural decision support system designed specifically for Pakistani smallholders and agri-traders.**

[Core Decision Loop](#2-the-core-saathi-decision-loop) • [System Architecture](#3-how-the-system-works) • [Features](#4-core-features) • [Why Saathi](#5-what-makes-saathi-different) • [Tech Stack](#6-technology-stack) • [Setup Guide](#13-installation--local-development)

</div>

---

> **🌟 The Saathi Philosophy:**  
> **"Saathi turns scattered farm information into the next best action — and helps the farmer understand why."**  
>
> Instead of being just an isolated chatbot, disease detector, weather widget, mandi price table, or marketplace, Saathi links:  
> **Farm Context → Weather → Crop Stage → Disease Intelligence → Market Intelligence → Economics → Actions → Outcomes → Farm Memory**

---

## 📑 Table of Contents

1. [Project Overview](#1-project-overview)
2. [The Core Saathi Decision Loop](#2-the-core-saathi-decision-loop)
3. [How the System Works](#3-how-the-system-works)
4. [Core Features](#4-core-features)
   - [A. Crop Disease Detection](#a-crop-disease-detection)
   - [B. Crop Recommendation & Advisory](#b-crop-recommendation)
   - [C. Saathi AI Assistant (Bilingual)](#c-saathi-ai-assistant)
   - [D. Agricultural Weather Intelligence](#d-agricultural-weather-intelligence)
   - [E. Farm Context & Local Farm Memory](#e-farm-context--farm-memory)
   - [F. Farm Decision Engine](#f-farm-decision-engine)
   - [G. Disease + Weather Intelligence](#g-disease--weather-intelligence)
   - [H. Crop Lifecycle Intelligence](#h-crop-lifecycle-intelligence)
   - [I. Government Market Price Intelligence (AMIS Punjab)](#i-government-market-price-intelligence)
   - [J. Economic Impact Intelligence](#j-economic-impact-intelligence)
   - [K. Farm Action Planner](#k-farm-action-planner)
   - [L. Farm Action Outcome & Learning Loop](#l-farm-action-outcome--learning-loop)
   - [M. Farm Decision Simulator](#m-farm-decision-simulator)
   - [N. Decision Evidence Engine](#n-decision-evidence-engine)
   - [O. Saathi Farm Watch](#o-saathi-farm-watch)
   - [P. Deal Intelligence & Peer-to-Peer Marketplace](#p-saathi-deal-intelligence--marketplace)
   - [Q. Authentication & Profile Navigation](#q-authentication--farmer-profile)
5. [What Makes Saathi Different](#5-what-makes-saathi-different)
6. [Technology Stack](#6-technology-stack)
7. [Data Sources & Provenance](#7-data-sources--provenance)
8. [Privacy & Local-First Architecture](#8-privacy--local-first-architecture)
9. [Architecture Diagram](#9-architecture)
10. [Project Structure](#10-project-structure)
11. [API Endpoints Reference](#11-api-endpoints)
12. [Environment Variables](#12-environment-variables)
13. [Installation & Local Development](#13-installation--local-development)
14. [Testing & Verification](#14-testing--verification)
15. [Data Integrity & Safety Rules](#15-data-integrity--safety-rules)
16. [Limitations & Honest Uncertainty](#16-limitations--honest-uncertainty)
17. [Hackathon Demo Flow](#17-hackathon-demo-flow)
18. [Future Production Considerations](#18-future-production-considerations)
19. [Built for Pakistan](#19-built-for-pakistan)

---

## 1. Project Overview

Pakistani farmers frequently make critical livelihood decisions with data scattered across separate weather apps, mandi contacts, social media advice, and memory:

* 🚨 **Delayed Disease Identification:** Leaf rust or blight goes undetected until yield is lost.
* 🌧️ **Disconnected Weather Forecasts:** A rain alert says "80% chance of rain", but doesn't calculate if today's chemical spray will wash off.
* ⏳ **Spraying & Irrigation Uncertainty:** Risk of wasting expensive Urea/DAP or spraying in high winds.
* 📉 **Mandi Price Asymmetry:** Intermediaries (Aarhtis) exploit lack of official price reference visibility.
* 🧠 **No Persistent Farm Memory:** No structured way to record whether last week's spray worked when rain arrived early.
* 🤖 **Opaque AI Advice:** LLMs often give generic recommendations without explaining the evidence or data sources.

### 💡 The Saathi Solution
Saathi brings all these disconnected workflows into one coherent, farmer-first system:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          SAATHI IS NOT JUST:                           │
│  ❌ A generic AI chatbot                                               │
│  ❌ A standalone leaf classifier                                       │
│  ❌ An isolated weather dashboard                                      │
│  ❌ A plain mandi price table                                          │
│  ❌ An unverified marketplace                                          │
├────────────────────────────────────────────────────────────────────────┤
│                               SAATHI IS:                               │
│  ✅ A Farm Decision Intelligence System that connects observations,   │
│     environmental context, official data, auditable evidence,          │
│     proactive monitoring, and local farm memory.                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Core Saathi Decision Loop

Saathi operates around a continuous, closed-loop decision framework:

```
  ┌───────────────┐
  │  1. OBSERVE   │ ──► Leaf photos, GPS/location, sowing date, weather signals, AMIS prices
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │ 2. UNDERSTAND │ ──► Deterministic Farm Decision, Disease-Weather, Crop Lifecycle Engines
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │  3. COMPARE   │ ──► Decision Simulator compares options (e.g., Spray Now vs. Wait vs. Scout)
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │  4. EXPLAIN   │ ──► Decision Evidence Engine surfaces auditable trail (Observe ➔ Decide)
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │   5. DECIDE   │ ──► Farm Action Planner generates prioritized, time-bound daily actions
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │    6. ACT     │ ──► Farmer executes, postpones, scouts, or contacts verified buyers
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │   7. WATCH    │ ──► Farm Watch detects meaningful environmental shifts & triggers alerts
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │  8. MEASURE   │ ──► Proactive follow-ups: "Did yesterday's rain affect your field work?"
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │ 9. REMEMBER   │ ──► Records farmer-reported observations in private, local Farm Memory
  └───────┬───────┘
          │
          ▼
  ┌───────────────┐
  │ 10. RE-EVAL   │ ──► Contextual history informs future planning without false causality
  └───────────────┘
```

---

## 3. How the System Works

Saathi utilizes a hybrid full-stack architecture combining a high-performance React frontend with an Express backend, and a completely independent, deterministic local decision intelligence layer:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FARMER DEVICE                             │
│                         Mobile / Desktop Browser                       │
│             Camera • GPS • Forms • Marketplace • Farm Memory           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                            REACT 18 FRONTEND                           │
│  Home • Disease Detection • Crop Advisor • Market Prices • Marketplace │
│      Saathi AI Assistant • Farm Profile • Farm Intelligence Suite      │
└─────────────────┬────────────────────────────────────┬─────────────────┘
                  │                                    │
                  │ /api/* Proxy                       │ Pure Local Deterministic
                  ▼                                    ▼
┌───────────────────────────────────┐    ┌───────────────────────────────┐
│          EXPRESS BACKEND          │    │    LOCAL DECISION SERVICES    │
│                                   │    │                               │
│  • Gemini Multimodal Proxy        │    │  • Farm Context               │
│  • Marketplace In-Memory / CRUD   │    │  • Farm Decision Engine       │
│  • Chat History Management        │    │  • Disease + Weather Engine   │
│  • Auth Callback Processing       │    │  • Crop Lifecycle Engine      │
└─────────────────┬─────────────────┘    │  • Economic Impact Engine     │
                  │                      │  • Farm Action Planner        │
                  ▼                      │  • Farm Decision Simulator    │
┌───────────────────────────────────┐    │  • Decision Evidence Engine   │
│         EXTERNAL SERVICES         │    │  • Saathi Farm Watch          │
│                                   │    │  • Local Farm Memory Store    │
│  • Google Gemini (Vision & Text)  │    └───────────────────────────────┘
│  • Open-Meteo REST API            │
│  • AMIS Punjab Wholesale Data     │
│  • Supabase (Auth & Persistence)  │
└───────────────────────────────────┘
```

> **🛡️ Deterministic Independence Principle:**  
> The core agronomic and economic calculations do **not** rely on LLMs. This guarantees that spraying thresholds, weather calculations, and economic formulas remain 100% predictable, testable, verifiable, and fast.

---

## 4. Core Features

### A. Crop Disease Detection
* **Path:** `/disease-detection`
* **Inputs:** Leaf photo (camera snapshot or file upload).
* **Intelligence:** Gemini Vision analyzes crop type, symptoms, fungal/bacterial/viral disease classification, confidence score, and severity level.
* **Output:** Structured diagnosis card with commercial Pakistani sprays (e.g., Mancozeb, Imidacloprid, Chlorothalonil), dilution ratios, water volumes, safety precautions, and long-term organic practices.
* **Connected Handoff:** One tap transfers the complete diagnosis into the **Disease + Weather Engine** or **Saathi AI Chat**.

### B. Crop Recommendation & Advisory
* **Path:** `/crop-recommendation`
* **Inputs:** Soil Type (Clay, Loam, Sandy, Silt), Province/Region, Season (Kharif, Rabi, Zaid), and Water Source (Canal, Tubewell, Rainfed, Drip).
* **Output:** High-yield, regionally adapted crop suggestions with expected harvest durations, water needs, and profitability ratings.

### C. Saathi AI Assistant (Bilingual English & Urdu)
* **Path:** `/assistant`
* **Modes:**
  1. 🩺 **Crop Doctor Mode:** Photo attachment support for in-stream diagnosis and chemical advisory.
  2. 🌾 **Crop Advisory Mode:** Parameter selection for interactive cropping simulations.
  3. 💬 **General Agri Q&A:** Fertilizer balancing (Urea, DAP, SOP), pest management, and agronomy advice.
  4. 🏪 **Marketplace Mode:** Pricing guidance and buyer negotiation assistance.

### D. Agricultural Weather Intelligence
* **Component:** `WeatherDropdown.tsx` (accessible in global header across all views).
* **Provider:** Open-Meteo REST API (free, reliable, no rate-limiting keys).
* **Metrics:** Current temperature, apparent temperature, humidity, precipitation probability, wind speed/direction, soil temperature/moisture, and 7-day extended forecasts.
* **Data-Saving:** Cached locally with a 30-minute TTL to reduce mobile data usage in rural areas.

---

### E. Farm Context & Local Farm Memory

```
┌─────────────────────────┐          ┌─────────────────────────┐
│       FARM CONTEXT      │          │       FARM MEMORY       │
├─────────────────────────┤          ├─────────────────────────┤
│ • Farm Name & Location  │          │ • Historical Spray Logs │
│ • Province & District   │          │ • Observed Rain Outcomes│
│ • Soil & Water Source   │          │ • Irrigation Outcomes   │
│ • Current Crop & Variety│          │ • Farmer Field Notes    │
│ • Sowing Date & Stage   │          │ • Private & Local       │
└─────────────────────────┘          └─────────────────────────┘
```

* **Local-First Storage:** Stored securely in `localStorage` on the farmer's device.
* **Farmer-Reported Integrity:** All entries are explicitly labeled as *"Farmer-reported observation"* to prevent confusing human field notes with laboratory scientific data.

---

### F. Farm Decision Engine
A local deterministic service combining Farm Context and Weather signals:
* Evaluates **Spraying Suitability** (calculates rain wash-off risk within 6h/24h and wind drift >18 km/h).
* Evaluates **Irrigation Needs** (advises holding irrigation if heavy rain is imminent to save tubewell fuel).
* Evaluates **Heat Stress & Crop Protection**.
* Compares **Today vs. Tomorrow** windows to identify the safest application times.

---

### G. Disease + Weather Intelligence
Pairs diagnosed plant diseases with environmental risk factors:
* Checks whether upcoming rain will wash away protective fungicide applications.
* Evaluates high relative humidity (>80%) that accelerates fungal spore germination (e.g., Late Blight, Rice Blast).
* Emphasizes safety boundaries: environmental risk never invents an unverified disease without visual confirmation.

---

### H. Crop Lifecycle Intelligence
* **Inputs:** Sowing Date and Current Stage (Land prep, Sowing, Germination, Vegetative, Flowering, Fruiting, Maturity, Harvest).
* **Calculations:** Days since sowing, lifecycle phase (Early, Developing, Reproductive, Late-season), and consistency validation between stage and date.

---

### I. Government Market Price Intelligence (AMIS Punjab)
* **Coverage:** Official wholesale prices from the Agriculture Marketing Information Service (AMIS Punjab) for Wheat, Basmati Rice, Cotton, Maize, Sugarcane, Potato, Tomato, Onion, etc.
* **Unit Normalization:** Converts official Rs/100kg or Rs/100kg quintal rates into standard Pakistani maunds (Rs/40kg) with full source attribution.

---

### J. Economic Impact Intelligence
Calculates transparent monetary valuations **only** when legitimate inputs are available:

$$\text{Gross Market Reference} = \text{Harvest Quantity (maunds)} \times \text{Official AMIS Reference Price (Rs/maund)}$$

* 🚫 **Anti-Fabrication:** Never invents fake yield multipliers, unsupported pesticide costs, or guaranteed ROI percentages.

---

### K. Farm Action Planner
Synthesizes all intelligence layers into an organized, time-sensitive daily farm agenda:
* Prioritizes tasks (🔴 High, 🟡 Medium, 🟢 Low) across Disease, Spraying, Irrigation, Lifecycle, and Market categories.
* Includes exact action steps, weather execution windows, auditable evidence, and known limitations.

---

### L. Farm Action Outcome & Learning Loop
Allows farmers to log what happened after following (or postponing) an action:
* **Status:** Followed • Partially Followed • Postponed • Skipped
* **Observed Outcome:** Improved • No Change • Worse • Too Early to Tell
* Integrates directly into **Farm Memory** to inform future suggestions.

---

### M. Farm Decision Simulator
Enables farmers to compare realistic alternatives with side-by-side trade-offs:

| Scenario | Option A | Option B | Option C |
| :--- | :--- | :--- | :--- |
| **Pest / Disease** | ⚡ **Spray Now** (Take advantage of low wind) | ⏳ **Wait / Postpone** (Rain expected in 4h) | 🔍 **Scout First** (Verify threshold severity) |
| **Irrigation** | 💧 **Irrigate Now** (Soil moisture depleted) | 🛑 **Hold for Rain** (Rain forecasted tonight) | 🌾 **Check Root Zone** |
| **Harvest Sale** | 🤝 **Sell Immediate** (Secure current mandi rate) | 📦 **Stage / Store** (Hold for price recovery) | 📋 **Split Batch** |

---

### N. Decision Evidence Engine
Provides an auditable 4-stage reasoning chain for every recommendation:

```
  [OBSERVE]     Open-Meteo measured 22 km/h wind speed; AMIS reports Wheat at Rs 4,700/maund
      ↓
 [UNDERSTAND]   Wind speed exceeds the safe spraying threshold (18 km/h); spray drift risk is high
      ↓
 [INTERPRET]    Chemical droplets will drift to neighboring fields or fail to coat target foliage
      ↓
   [DECIDE]     Postpone pesticide application until tomorrow morning (forecast: 6 km/h wind)
```

---

### O. Saathi Farm Watch
A proactive in-app farm monitor that generates a **Daily Farm Brief** and evaluates critical event triggers:
* 🌧️ **Rain & Forecast Shift Alerts**
* 💨 **High Wind & Spray Drift Warnings**
* 🌡️ **Extreme Heat Alerts**
* 🦠 **Disease Weather Acceleration**
* ❓ **Interactive Follow-Up:** Asks *"Did yesterday's weather affect your field work?"* and stores the response in Farm Memory.

---

### P. Saathi Deal Intelligence & Marketplace
* **Path:** `/marketplace`
* **Peer-to-Peer Produce Listings:** Farmers list harvest lots with photos, quantity, asking price, and location.
* **Direct Buyer Access:** Connect via direct phone call or WhatsApp without middleman fees.
* **Deal Intelligence:** Compares farmer's asking price against the latest official AMIS reference:
  * 🟢 *Below official reference* (High buyer attractiveness)
  * 🔵 *Within official range* (Fair market value)
  * 🟠 *Above official reference* (Premium quality)
* **Separation of Listing Lifecycles:**
  * **Real Farmer Listings:** `listingOrigin: 'farmer'`, `isPersistent: true`, `expiresAt: null` (Permanent until deleted by user).
  * **Curated Demo Listings:** `listingOrigin: 'demo'`, `isPersistent: false`, `expiresAt: null` (Indefinite hackathon availability, distinct from real listings).

---

### Q. Authentication & Profile Navigation
* **Path:** `/profile`, `/farm-profile`, `/farm-watch`, `/farm-plan`, `/farm-memory`, `/farm-intelligence`
* **Authentication:** Google OAuth powered by Supabase.
* **Profile Dropdown:** Dedicated navigation section linking directly to the full suite of Farm Intelligence tools with persistent layout headers and footers.

---

## 5. What Makes Saathi Different

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COMPETITOR VS. SAATHI                           │
├──────────────────────────────────┬─────────────────────────────────────┤
│ TYPICAL AGRI APPS                │ SAATHI (FARM DECISION INTELLIGENCE) │
├──────────────────────────────────┼─────────────────────────────────────┤
│ Isolated chatbots                │ Connected 10-step decision loop     │
│ Standalone leaf classifiers      │ Disease linked to weather & drift   │
│ Generic weather forecasts        │ Actionable spraying/watering windows│
│ Static mandi price tables        │ Deal intelligence & price comparison│
│ Opaque "black box" AI answers    │ 4-stage transparent evidence chain  │
│ Forgetful / stateless sessions   │ Private, local Farm Memory          │
│ Middlemen / Aarhti dependency    │ Direct farmer-to-buyer marketplace  │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 6. Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18**, **TypeScript 5** | Responsive, type-safe single-page application |
| **Styling & Icons** | **Tailwind CSS**, **Lucide React** | Modern agricultural design system, accessible UI |
| **Visual Charts** | **Recharts** | Interactive Mandi price trend analytics |
| **AI Integration** | **@google/genai** (Gemini 3.1 Flash / 3.8 Flash) | Multimodal leaf vision diagnosis and bilingual chat |
| **Weather Service** | **Open-Meteo REST API** | High-resolution forecasts and agricultural parameters |
| **Market Data** | **AMIS Punjab** | Official wholesale agricultural commodity references |
| **Backend Server** | **Node.js**, **Express 5**, **tsx**, **esbuild** | Secure API proxy, CJS production bundle |
| **Authentication** | **Supabase Auth** | Google OAuth popup workflow |
| **Test Suite** | **tsx**, **Node Test Runners** | 100% deterministic test coverage across all engines |

---

## 7. Data Sources & Provenance

Every piece of data inside Saathi maintains clear provenance:

```
[Open-Meteo API] ────────► WeatherData ──────────► Farm Decision Engine
[AMIS Punjab]    ────────► MarketPriceRecord ────► Deal Intelligence & Economics
[Leaf Upload]    ────────► Gemini Multimodal ────► Disease Diagnostic Output
[Farmer Input]   ────────► Farm Profile/Notes ───► Local Farm Memory
```

* **No Hallucinated Data:** Official market prices always retain their source URL, retrieval timestamp, and market district.
* **Clear Categorization:** Observed data, calculated estimates, farmer-reported notes, and unknown/missing states are strictly differentiated.

---

## 8. Privacy & Local-First Architecture

* 🔒 **Local Farm Context:** Farm coordinates, crop stages, and field sizes reside in client-side storage.
* 🔒 **Zero Continuous GPS Tracking:** GPS is queried once upon user request and cached; no background location tracking.
* 🔒 **Private Farm Memory:** Observations and spray logs are never silently uploaded to retrain external AI models.
* 🔒 **API Key Protection:** `GEMINI_API_KEY` remains on the server and is never exposed to the client.

---

## 9. Architecture

```
                                 ┌──────────────────┐
                                 │  React Frontend  │
                                 └────────┬─────────┘
                                          │
                       ┌──────────────────┼──────────────────┐
                       │                  │                  │
                       ▼                  ▼                  ▼
                Local Intelligence      /api/*          Local Storage
                       │                  │                  │
                       ▼                  ▼                  ▼
              ┌────────────────┐   ┌─────────────┐   ┌─────────────────┐
              │ Decision Layer │   │ Express API │   │ Farm Context    │
              │                │   │             │   │ Farm Memory     │
              │ Farm Decision  │   │ Gemini      │   │ Farm Watch      │
              │ Disease/Weather│   │ Marketplace │   │ Weather Cache   │
              │ Lifecycle      │   │ Chat        │   └─────────────────┘
              │ Economic       │   └──────┬──────┘
              │ Action Planner │          │
              │ Simulator      │          ▼
              │ Evidence       │   ┌───────────────────────┐
              │ Farm Watch     │   │ External Services     │
              └────────────────┘   │ Gemini / Open-Meteo   │
                                   │ AMIS / Supabase       │
                                   └───────────────────────┘
```

---

## 10. Project Structure

```
├── server.ts                       # Express backend server with Gemini & API routes
├── vite.config.ts                  # Vite build configuration with path aliases
├── tailwind.config.js              # Custom agricultural theme palette
├── package.json                    # Dependencies and npm test scripts
├── metadata.json                   # Application metadata
│
├── src/
│   ├── main.tsx                    # React application entry point
│   ├── App.tsx                     # Route configuration with Layout wrapper
│   ├── index.css                   # Tailwind styles and custom design utilities
│   │
│   ├── components/                 # UI Components
│   │   ├── Navbar.tsx              # Navigation bar with Weather & Profile Dropdown
│   │   ├── Footer.tsx              # Page footer with quick links
│   │   ├── Layout.tsx              # Common shell component
│   │   ├── WeatherDropdown.tsx     # Live agricultural weather forecast popover
│   │   ├── FarmWatch.tsx           # Proactive Daily Farm Brief & alert monitor
│   │   ├── FarmActionPlanner.tsx   # Prioritized daily farm action scheduler
│   │   ├── FarmOutcomeHistory.tsx  # Interactive Farm Memory log viewer
│   │   ├── FarmDecisionCard.tsx    # Farm Decision Engine summary component
│   │   ├── FarmDecisionSimulator.tsx # What-If scenario simulation drawer
│   │   ├── DecisionEvidenceDrawer.tsx # Auditable 4-stage evidence inspector
│   │   ├── DiseaseWeatherAssessment.tsx # Spraying wash-off & drift risk card
│   │   ├── CropLifecycleCard.tsx   # Dynamic growth stage & timeline tracker
│   │   ├── EconomicImpactCard.tsx  # Transparent market valuation card
│   │   ├── DealIntelligenceDrawer.tsx # Marketplace price vs. AMIS comparator
│   │   └── AuthModal.tsx           # Google Sign-in modal dialog
│   │
│   ├── pages/                      # Application Page Views
│   │   ├── HomePage.tsx            # Clean discovery dashboard
│   │   ├── FarmWatchPage.tsx       # Dedicated Saathi Farm Watch view
│   │   ├── FarmPlanPage.tsx        # Dedicated Today's Farm Plan view
│   │   ├── FarmMemoryPage.tsx      # Dedicated Farm Memory view
│   │   ├── FarmIntelligencePage.tsx# Dedicated Decision & Lifecycle view
│   │   ├── DiseaseDetectionPage.tsx# Multimodal leaf disease scanner
│   │   ├── CropRecommendationPage.tsx # Regional soil & climate crop advisor
│   │   ├── AssistantPage.tsx       # Bilingual Saathi AI conversational assistant
│   │   ├── MarketPricesPage.tsx    # AMIS Mandi prices & trends
│   │   ├── MarketplacePage.tsx     # Direct farmer-to-buyer trade board
│   │   ├── FarmProfilePage.tsx     # Farm configuration editor
│   │   └── ProfilePage.tsx         # User profile & intelligence hub
│   │
│   ├── services/                   # Deterministic & API Services
│   │   ├── farmDecisionEngine.ts   # Spraying, watering & weather logic
│   │   ├── diseaseWeatherEngine.ts # Disease-weather correlation engine
│   │   ├── cropLifecycle.ts        # Growth stage and days-to-sow engine
│   │   ├── marketPriceService.ts   # AMIS market price ingestion & cache
│   │   ├── economicImpactEngine.ts # Transparent gross value calculation
│   │   ├── farmActionPlanner.ts    # Prioritized action scheduling engine
│   │   ├── farmDecisionSimulator.ts# Trade-off analysis engine
│   │   ├── decisionEvidence.ts     # Auditable evidence chain generator
│   │   ├── farmWatch.ts            # Daily brief & hazard detector
│   │   ├── dealIntelligence.ts     # Marketplace AMIS price comparison
│   │   ├── farmContext.ts          # Local storage farm context manager
│   │   ├── weather.ts              # Open-Meteo client with 30-min cache
│   │   └── api.ts                  # Backend API client bridge
│   │
│   └── types/                      # TypeScript Domain Types
│       ├── farm.ts, decision.ts, diseaseWeather.ts, cropLifecycle.ts,
│       ├── economicImpact.ts, farmActionPlanner.ts, farmWatch.ts,
│       └── dealIntelligence.ts
│
└── scripts/                        # Verification Test Suites
    ├── testFarmDecisionEngine.ts   # 20 tests: spraying & watering rules
    ├── testDiseaseWeatherEngine.ts # 28 tests: rain wash-off & drift
    ├── testCropLifecycle.ts        # 26 tests: stages & calendar math
    ├── testGovernmentMarketPrices.ts # 32 tests: AMIS normalization
    ├── testDecisionEvidence.ts     # 27 tests: 4-stage evidence chain
    ├── testFarmDecisionSimulator.ts # 48 tests: trade-off simulations
    ├── testFarmWatch.ts            # 70 tests: daily briefs & follow-ups
    └── testMarketplaceLifecycle.ts # 12 tests: farmer vs. demo listing rules
```

---

## 11. API Endpoints

All backend routes run via `server.ts` on port `3000`:

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/health` | `GET` | Health check and server status |
| `/api/disease-detection` | `POST` | Vision leaf disease diagnosis via Gemini |
| `/api/crop-recommendation` | `POST` | Climate/soil crop recommendations via Gemini |
| `/api/farming-assistant` | `POST` | Bilingual agronomy conversation proxy |
| `/api/marketplace-assistant` | `POST` | AI assistant for produce trade & negotiation |
| `/api/marketplace/listings` | `GET` | Fetch active farmer & demo marketplace listings |
| `/api/marketplace/listings` | `POST` | Create a persistent farmer produce listing |
| `/api/marketplace/listings/:id` | `DELETE` | Delete listing by ID |
| `/api/marketplace/reset-demo` | `POST` | Reset demo listings while preserving farmer listings |
| `/api/chat-history` | `GET`/`POST`/`DELETE`| Manage persistent chat histories |
| `/auth/callback` | `GET` | Handle Supabase OAuth popup postMessage |

---

## 12. Environment Variables

Create a `.env` file in the project root:

```env
# Required for Gemini AI vision and chat features
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Supabase Auth & PostgreSQL
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 13. Installation & Local Development

### Prerequisites
* **Node.js** (v18+ or v20+)
* **npm** or **bun**

```bash
# 1. Clone repository
git clone <repository-url>
cd saathi

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Open .env and add your GEMINI_API_KEY

# 4. Start development server
npm run dev
```

App will be available at `http://localhost:3000`.

### Production Build
```bash
# Compile frontend and bundle Express server into dist/server.cjs
npm run build

# Launch production server
npm start
```

---

## 14. Testing & Verification

Saathi includes comprehensive deterministic test suites verifying all decision models:

```bash
npm test
```

### Test Coverage Summary

```
================================================================================
✅ ALL INTELLIGENCE TEST SUITES PASSING (263+ Deterministic Tests)
================================================================================
 • Farm Decision Engine Tests:         20 / 20 PASSED
 • Disease + Weather Engine Tests:     28 / 28 PASSED
 • Crop Lifecycle Tests:               26 / 26 PASSED
 • Government Market Prices (AMIS):    32 / 32 PASSED
 • Decision Evidence Chain Tests:      27 / 27 PASSED
 • Farm Decision Simulator Tests:      48 / 48 PASSED
 • Saathi Farm Watch Tests:            70 / 70 PASSED
 • Marketplace Lifecycle Tests:        12 / 12 PASSED
================================================================================
```

---

## 15. Data Integrity & Safety Rules

* 🚫 **Zero Fabrication:** Never fabricates fake prices, fake yields, or guaranteed profit percentages.
* 🏷️ **Explicit Provenance:** Differentiates `Observed`, `Calculated`, `Farmer-reported`, and `Unknown` values.
* 🌧️ **Event $\neq$ Damage:** A rain event is reported as weather observation; actual crop impact is confirmed only by the farmer.
* 🔒 **Farmer Listing Protection:** Automated scripts and demo resets **never** delete real farmer-created listings.

---

## 16. Limitations & Honest Uncertainty

Saathi practices transparent scientific honesty:
* If sowing date is missing ➔ Lifecycle calculations explicitly display *"Timing unavailable"*.
* If official market data is missing for a commodity ➔ System states *"Official AMIS reference unavailable"*.
* If weather signals are contradictory ➔ Simulator intentionally states *"No dominant recommendation — verify field conditions"*.

---

## 17. Hackathon Demo Flow

1. **🌾 Farm Setup:** Open Farm Profile, configure crop (e.g. Cotton), district (Multan), and stage (Flowering).
2. **⛅ Weather & Brief:** Check global Weather dropdown and open **Saathi Farm Watch** (`/farm-watch`) to view the proactive Daily Brief.
3. **📸 Leaf Diagnosis:** Go to Disease Detection, upload a diseased leaf photo, and view the structured diagnosis.
4. **🧠 Farm Intelligence:** Open `/farm-intelligence` to view Disease + Weather risk assessment and Crop Lifecycle.
5. **⚖️ Decision Simulator:** Test "Spray Now" vs. "Wait for Rain" and open the **Evidence Drawer**.
6. **📋 Action Plan & Follow-Up:** Execute an action in Today's Farm Plan (`/farm-plan`), log the outcome in **Farm Memory** (`/farm-memory`).
7. **💰 Mandi Prices & Marketplace:** Check official AMIS prices on `/market-prices`, then open `/marketplace` to inspect **Deal Intelligence** on active listings.

---

## 18. Future Production Considerations

* Extension of official market data feeds to Sindh, KPK, and Balochistan agriculture portals.
* Offline-first Progressive Web App (PWA) synchronization with background Service Workers.
* Native Urdu/Punjabi voice recognition and speech synthesis for low-literacy farmers.
* SMS / WhatsApp automated Farm Watch brief delivery via Twilio.

---

## 19. Built for Pakistan

Saathi is designed with deep empathy for Pakistani farming realities:
* 🇵🇰 **Regional Agronomy:** Tailored for Punjab, Sindh, KPK, Balochistan, Gilgit-Baltistan, and AJK.
* 🌾 **Local Terminology:** Native support for Kharif/Rabi seasons, Maunds (من / 40kg), Gandum, Basmati, Phutti, and Kisaan workflows.
* 🌐 **Bilingual Interface:** English and Urdu support for accessible communication.
* 📶 **Low-Bandwidth Resilient:** Lightweight payloads and 30-minute weather caching designed for rural 3G/4G connectivity.

---

<div align="center">

### 🌱 Saathi (ساتھی) — Kisaan Ka Digital Humqadam
*Better Information Before the Next Farm Decision.*

Made with 💚 for the Farmers of Pakistan.

</div>
