# AI-VA | Spatial BI & Generative Voice Assistant

AI-VA is a cloud-hosted, multimodal web application that solves the enterprise data literacy gap. By bridging state-of-the-art vision models with spatial UI engineering and dynamic frontend generation, AI-VA allows users to upload complex business dashboards—or raw datasets—and have a seamless, continuous voice conversation with their data. 

**Live Demo:** [AI-VA on Render](https://ai-va-7zyw.onrender.com) *(Note: May take 50 seconds to spin up on the free tier)*

## The Product Vision (The Problem & Solution)
* **The Problem:** A VP is handed a comprehensive BI dashboard (or a massive CSV file) by their data team. The data is accurate, but the VP lacks the time or technical context to decipher the complex visual charts or build their own.
* **The Solution:** AI-VA acts as an interactive, generative data translator. The user uploads the dashboard image or raw data, starts a continuous voice session, and asks questions naturally. AI-VA not only speaks the strategic insights aloud but can dynamically highlight exact charts on an image, or generate an interactive dashboard from scratch if given raw data.

## Key Features
* **Generative BI Dashboards (Zero-to-Dashboard):** Upload a raw `.csv` file and ask a question. AI-VA acts as a data analyst and frontend developer, dynamically writing and rendering interactive `Chart.js` graphs directly in the browser.
* **Spatial Highlighting Engine:** Upload a static dashboard (`.png`, `.jpg`). AI-VA utilizes Gemini's spatial prompting to return strict bounding-box coordinates `[ymin, xmin, ymax, xmax]`, drawing glowing, real-time CSS highlights over the exact data points being discussed.
* **Continuous Conversational Loop:** Engineered with a custom Web Speech API integration that auto-mutes the microphone during AI TTS playback and automatically resumes listening, creating a frictionless, hands-free experience.
* **Mobile-Responsive Workspace:** Engineered with CSS Flexbox media queries to seamlessly transition from a split-pane desktop workspace to a vertically stacked, touch-friendly mobile interface.
* **Dual-Layer Analytics Toggle:** Empowers the user to switch between "Version A" (strict factual data retrieval) and "Version B" (strategic business insights and trend analysis).
* **Dynamic Voice Control:** Hardware-agnostic Text-to-Speech (TTS) voice selector, allowing users to seamlessly toggle between native device voices for an optimal, customized acoustic experience.
* **Persistent Dark Mode UI:** Accessible, aesthetic dark theme toggle engineered with local browser storage to remember user preferences across active sessions.
* **Secure Authentication Pipeline:** A full-stack security gatekeeper featuring a premium glass-morphic frontend UI wired to a FastAPI backend endpoint, utilizing Pydantic for secure credential validation.

## System Architecture & Tech Stack
* **Frontend:** HTML5, CSS3 Flexbox, Vanilla JavaScript, **Chart.js** (for dynamic rendering).
* **Voice Integration:** Native Browser **Web Speech API** (Speech-to-Text & Text-to-Speech) with continuous state management.
* **Backend:** **Python 3.12** & **FastAPI** for high-performance API routing and cloud environment management.
* **Vision & AI Processing:** **Pillow** for image byte-stream handling, integrated with the **Google Gemini 2.5 Flash** model via the `google-genai` SDK.
* **Deployment:** CI/CD pipeline integrated directly with **Render**.
  
## Quick Start Guide (Local Development)

1. Clone the Repository
   ```bash
   git clone [https://github.com/mananp-2730/AI-VA.git](https://github.com/mananp-2730/AI-VA.git)
   cd AI-VA

2. Set Up the Backend Engine
   Ensure you are using Python 3.12 for optimal dependency compatibility. Create a virtual environment and install the required libraries:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   pip install -r requirements.txt

3. Configure the Environment
   Create a .env file in the backend directory and add your Google AI Studio key:
   ```Plaintext
   GEMINI_API_KEY=your_actual_api_key_here

4. Launch the Application
   Start the FastAPI server:
   ```bash
   python app.py
  Open a modern web browser (Chrome/Edge recommended) and navigate to server (eg. http://127.0.0.1:8000). Upload a screenshot of a dashboard, click "Start Session", and speak to your data!

## Future Roadmap (Epic 6 & Beyond)
* **Enterprise Integrations:** Connect directly to live SQL databases or Tableau/PowerBI APIs to bypass static image uploads.
* **Predictive Analytics:** Upgrade the backend logic to not just display current data, but forecast future trends (e.g., ARIMA models).
* **Persistent User Database (Auth Phase 3):** Migrate the backend authentication pipeline to a live SQLite/PostgreSQL database to save user chat histories and personalized dashboard galleries.

___
Built by Manan.
