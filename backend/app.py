from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # NEW IMPORT
import uvicorn
import pandas as pd
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

app = FastAPI(title="AI-VA Backend", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Your existing API route
@app.post("/api/analyze")
async def analyze_data(transcript: str = Form(...), file: UploadFile = File(...)):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    try:
        df = pd.read_csv(file.file)
        csv_text = df.to_csv(index=False) 
        prompt = (
            "You are a highly efficient voice assistant. Your output will be read directly to the user via Text-to-Speech. "
            "Answer the user's question purely based on the factual data provided in the CSV below. "
            "CRITICAL RULES: "
            "1. Do NOT use introductory filler phrases like 'Based on the CSV', 'According to the data', or 'Here is the answer'. "
            "2. Do NOT use markdown, bolding, or bullet points. "
            "3. Speak naturally, directly, and concisely. Provide ONLY the factual answer.\n\n"
            f"User Voice Command: {transcript}\n\n"
            f"CSV Data:\n{csv_text}"
        )
        response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        return {"status": "success", "response": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW CONSOLIDATION CODE ---
# This tells FastAPI to host your HTML/CSS/JS files directly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)