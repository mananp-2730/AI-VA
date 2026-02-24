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
async def analyze_data(
    transcript: str = Form(...), 
    file: UploadFile = File(...),
    mode: str = Form(...) # New parameter received from frontend
):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    try:
        df = pd.read_csv(file.file)
        csv_text = df.to_csv(index=False) 
        
        # --- DYNAMIC PROMPT ENGINEERING ---
        if mode == "version_a":
            prompt = (
                "You are a highly efficient voice assistant. Your output will be read directly to the user via Text-to-Speech. "
                "Answer the user's question purely based on the factual data provided in the CSV below. "
                "CRITICAL RULES: "
                "1. Do NOT use introductory filler phrases like 'Based on the CSV'. "
                "2. Do NOT use markdown, bolding, or bullet points. "
                "3. Speak naturally, directly, and concisely. Provide ONLY the factual answer.\n\n"
            )
        else: # version_b
            prompt = (
                "You are a senior business analyst and strategist. Your output will be read directly to the user via Text-to-Speech. "
                "The user is asking a question about the provided CSV data. "
                "CRITICAL RULES: "
                "1. Go beyond simple facts. Identify trends, behavioral patterns, or strategic marketing insights related to the query. "
                "2. Keep the response conversational but highly insightful. "
                "3. Do NOT use markdown, bolding, or bullet points (no asterisks). "
                "4. Keep it under 4 sentences so it sounds natural when spoken aloud.\n\n"
            )
            
        prompt += f"User Voice Command: {transcript}\n\nCSV Data:\n{csv_text}"
        # ----------------------------------

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
    # Cloud providers assign a dynamic PORT environment variable. 
    # We default to 8000 for local testing if the cloud variable isn't found.
    port = int(os.environ.get("PORT", 8000))
    # Host "0.0.0.0" tells the server to listen on all available public IP addresses
    uvicorn.run("app:app", host="0.0.0.0", port=port)