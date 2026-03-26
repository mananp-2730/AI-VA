## **AI-VA | Multimodal AI Business Intelligence & Text-to-SQL Agent**

AI-VA is a cloud-hosted, stateful, multimodal web application that bridges the enterprise data literacy gap. By combining state-of-the-art vision models, Agentic Text-to-SQL pipelines, and dynamic UI engineering, AI-VA allows users to bypass complex SQL queries and BI tools. Users can upload raw datasets, share visual dashboards, or connect directly to a live database, and have a seamless, continuous voice conversation with their data.

**Live Demo:** [AI-VA on Render](https://ai-va-7zyw.onrender.com) *(Note: May take 50 seconds to spin up on the free tier)*

## The Product Vision (The Problem & Solution)
* **The Problem:** Enterprise data is locked behind complex SQL queries, static CSVs, or dense visual dashboards. Executives and non-technical stakeholders lack the time to write queries or decipher complex charts to extract actionable insights.
* **The Solution:** AI-VA acts as an interactive, generative data translator. Users simply speak their questions. AI-VA dynamically queries the database, forecasts trends, generates interactive Chart.js dashboards in the browser, and speaks the strategic insights aloud.
  
## Core Architecture & Enterprise Features
* **Enterprise Text-to-SQL Agent:** Users can bypass file uploads entirely. AI-VA translates natural language voice commands into secure, raw SELECT queries, executes them against a live relational database (SQLite), and feeds the data back into the LLM to generate UI components.
* **Zero-Shot Predictive Analytics:** Engineered with advanced prompt constraints allowing the AI to mathematically analyze historical sales/revenue trends, extend the timeline, and automatically render dashed predictive forecasting lines on the frontend UI.
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
* **Database & Security:** **SQLite** (serverless database engine), **SQLAlchemy** (Python ORM for relational models), and **bcrypt** (cryptographic password hashing).
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

## Future Roadmap (Epic 5 & Beyond)
* **State Restoration (Phase 5):** Wiring up the 'My Insights' gallery so users can click a historical session and dynamically reload the exact Chart.js configuration and conversation state back onto the main canvas.
* **Enterprise Integrations:** Connect directly to live SQL databases or Tableau/PowerBI APIs to bypass static image uploads.
* **Predictive Analytics:** Upgrade the backend logic to not just display current data, but forecast future trends.
* **Persistent User Database (Auth Phase 3):** Migrate the backend authentication pipeline to a live SQLite/PostgreSQL database to save user chat histories and personalized dashboard galleries.



~ Manan
