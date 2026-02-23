# AI-VA 🎙️ | Local AI Voice Assistant for Data Analysis

AI-VA is a localized web application that bridges the gap between raw CSV data and actionable insights using voice commands. It allows users to input speech, transcribes it, queries the dataset using the Google Gemini API, and returns a spoken, factual response.

## Product Vision
Designed as a Minimum Viable Product (MVP), AI-VA explores user intention through voice interfaces. It empowers non-technical users to query complex datasets naturally, mitigating the need for advanced SQL or spreadsheet skills.

## Tech Stack & Architecture
* **Frontend:** HTML/CSS/JavaScript, utilizing the native **Web Speech API** for browser-side Speech-to-Text (STT) and Text-to-Speech (TTS).
* **Backend:** **Python** and **FastAPI** for high-performance API orchestration and CORS management.
* **Data Processing:** **Pandas** for efficient local CSV parsing to optimize context windows.
* **LLM Engine:** **Google Gemini 2.5 Flash** (via `google-genai` SDK) guarded by strict prompt engineering for factual data retrieval.

## Quick Start Guide

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/mananp-2730/AI-VA.git
cd AI-VA
\`\`\`

### 2. Set Up the Backend
Create a virtual environment and install the dependencies:
\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
\`\`\`

Add your Gemini API Key:
Create a `.env` file in the `backend` directory and add:
\`\`\`text
GEMINI_API_KEY=your_actual_api_key_here
\`\`\`

Start the FastAPI server:
\`\`\`bash
python app.py
\`\`\`

### 3. Launch the Frontend
Simply open the `frontend/index.html` file in any modern web browser (Google Chrome or Microsoft Edge recommended for optimal Web Speech API support). Upload your CSV, click the microphone, and ask your data a question!

## Future Roadmap (Phase 2)
* Toggle for 'Version B: Analytical and strategic insight responses'.
* Secure, scalable database integration to replace static CSV uploads.
* UI/UX overhaul with real-time transcription feedback.
