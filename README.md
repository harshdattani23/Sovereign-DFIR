# 🛡️ Sovereign Cyber AI Initiative

Welcome to the **Sovereign Cyber AI** repository! This project is a dual-purpose computational platform integrating a proprietary, production-ready **Digital Forensics and Incident Response (DFIR) Malware Analyzer**, alongside a comprehensive 5-module educational course on AI-driven cybersecurity.

---

## 🕵️ Part 1: Sovereign DFIR Engine (Mobile Malware Analyzer)
The crown jewel of the repository. A hyper-advanced, automated static malware analysis engine heavily powered by **Gemini 3.1 Flash Preview**.

Built with a dedicated Node.js Cloud Run backend and a Premium Glassmorphism UI frontend, the architecture seamlessly decompiles Android applications, maps and extracts their internal Java/Dalvik Smali codebase, and streams it to Google AI Studio for elite Threat Intelligence extraction.

### ⚙️ How the Analysis Payload Works
The DFIR Analyzer utilizes a multi-stage static analysis pipeline to structurally break down and inspect compiled binaries safely:

1. **Secure File Isolation:** The user uploads a compiled Android `.apk` via the frontend dashboard securely to the backend isolation chamber.
2. **Native Asset Decompilation:** The backend dynamically spawns `apktool` in a subprocess, ripping the core `AndroidManifest.xml` and reverse-engineering the compiled Dalvik bytecode into readable `.smali` Java classes.
3. **Smart Boilerplate Evasion Filter:** Our proprietary Node.js filter actively crawls the extracted directory tree and strips massive 3rd-party generic frameworks (`androidx`, `com/google`, `kotlin/`) to preserve the 1M token AI context boundary strictly for the malware's unique operational logic.
4. **Anti-Analysis Sandbox Detector:** Hardened backend structures natively intercept malformed ZIP Central Directory headers (e.g., invalid `8314` compression methods) deployed by highly-sophisticated malware to freeze defensive decompilers. By anticipating this attack vector, the backend automatically shunts past the AI to deliver an instant **100% Confidence Forensic Alert**.
5. **Heuristic AI Threat Extraction:** The massively-minified core codebase is streamlined into the Gemini 3.1 Flash engine under a highly-constrained DFIR Persona constraint prompt. The LLM audits the code securely for:
   - Malicious intents & abnormal, hidden stealth permissions.
   - Hardcoded AWS/GCP API Keys, hidden endpoints, and C2 Server Command arrays.
   - Cryptographic padding weaknesses and insecure webview executions.
6. **Live Intelligence Rendering:** The raw forensic output is dynamically intercepted by the frontend and parsed into a beautiful GitHub Dark-Theme VSCode style UI, featuring native zero-latency syntax-highlighted `smali` and `xml` evidence blocks.

---

## 📚 Part 2: The Cyber AI Course Engine
Interactive, localized, and dynamic educational modules built to train the next generation of cybersecurity analysts.
The course engine runs natively on an Express.js server and dynamically parses Markdown content into a beautiful reading experience using `marked`.

**Core Modules:**
1. Introduction to AI in Cybersecurity
2. The Evolving Threat Landscape
3. Specialized AI Tools (SIEM, SOAR, EDR)
4. Mobile APK Analysis & Reverse Engineering
5. Sovereign Custom Deployed Solutions (IndiaAI Mission & Sarvam AI)

*Features deep multi-lingual layout switching (English, Hindi, Kannada) for expanded technical outreach.*

---

## 🚀 Local Development Setup

### 1. Requirements
* Node.js (v18+)
* Java Runtime Environment (JRE)

### 2. Installation
Clone the repository and install both frontend and backend dependencies:
```bash
git clone https://github.com/harshdattani23/Sovereign-DFIR.git
cd Sovereign-DFIR

# Install Course Frontend dependencies
npm install

# Install DFIR Backend dependencies
cd analyzer && npm install
```

### 3. API Key Configuration
Create a `.env` file strictly inside the `analyzer/` directory to authenticate the Gemini AI model constraint engine:
```env
# analyzer/.env
GEMINI_API_KEY=your_google_ai_studio_api_key_here
```

### 4. Running the Project Locally
You will need two separate terminal windows to run both microservices concurrently:
```bash
# Terminal 1: Spin up the Course UI and DFIR Upload Portal
npm run dev

# Terminal 2: Spin up the Local DFIR Extraction Service
cd analyzer
node index.js
```
Navigate to [http://localhost:3000](http://localhost:3000) to view the course, or hit up [http://localhost:3000/analyzer](http://localhost:3000/analyzer) to test the live Malware Scanner!

---

## ☁️ Cloud Run Production Deployment (CI/CD)
This project is configured for fully automated Continuous Deployment utilizing GitHub Actions (`.github/workflows/deploy.yml`). 

Pushing to the `main` branch authenticates with your Google Cloud IAM service account tokens natively via GitHub secrets, injects your remote API keys into the master backend image, and seamlessly clusters both instances across Google Cloud Run environments.
