from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # NEW IMPORT
from pydantic import BaseModel
import uvicorn
import pandas as pd
import os
from dotenv import load_dotenv
from google import genai
import io
from PIL import Image
import json

# NEW: Database & Security Imports
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker, Session
import bcrypt


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

# --- AUTHENTICATION SYSTEM (PHASE 2) ---

# Define what a login request should look like
class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/login")
async def login_user(request: LoginRequest):
    # Hardcoded VIP Admin Credentials (For Phase 2 Testing)
    ADMIN_EMAIL = "admin@ai-va.com"
    ADMIN_PASSWORD = "password123"

    print(f"Login attempt for: {request.email}") # Prints to your terminal for debugging

    # The Gatekeeper Logic
    if request.email == ADMIN_EMAIL and request.password == ADMIN_PASSWORD:
        return {"status": "success", "message": "Authentication successful. Welcome VP."}
    else:
        # If it fails, we throw a strict HTTP 401 Unauthorized error
        raise HTTPException(status_code=401, detail="Invalid email or password. Access denied.")
    
# Your existing API route
@app.post("/api/analyze")
async def analyze_data(
    transcript: str = Form(...), 
    file: UploadFile = File(...),
    mode: str = Form(...)
):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    try:
        file_ext = file.filename.split('.')[-1].lower()

        # --- TRACK B: RAW CSV TO DASHBOARD ---
        if file_ext == 'csv':
            df = pd.read_csv(file.file)
            # Take just the first 50 rows to keep the context window fast and cheap
            csv_text = df.head(50).to_csv(index=False) 
            
            prompt = (
                "You are an expert Data Analyst and Frontend Developer. Analyze the provided CSV data and the User Voice Command. "
                "CRITICAL INSTRUCTION: You must return your response as a valid JSON object with EXACTLY two keys:\n"
                "1. 'response': Your spoken answer to the user's query (keep it conversational, no markdown).\n"
                "2. 'chart_config': A complete, valid JSON configuration object for Chart.js (version 3+) that visualizes the data relevant to the user's query. "
                "Choose the appropriate chart type ('bar', 'line', 'pie', 'doughnut'). Include 'type', 'data' (with 'labels' and 'datasets'), and 'options'. "
                "Make the chart visually appealing using modern hex colors. If the user query does not require a chart, return null for 'chart_config'.\n\n"
                f"User Voice Command: {transcript}\n\nCSV Data Sample:\n{csv_text}"
            )
            
            # Force the model to output strict JSON
            gemini_response = client.models.generate_content(
                model='gemini-2.5-flash', 
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            
            # Parse the AI's JSON output
            # --- Bulletproof JSON Parsing ---
            raw_text = gemini_response.text.strip()
            # If Gemini accidentally wraps the output in markdown, strip it off!
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "", 1)
            if raw_text.endswith("```"):
                raw_text = raw_text.rsplit("```", 1)[0]
            
            try:
                parsed_data = json.loads(raw_text.strip())
            except json.JSONDecodeError:
                # Fallback if Gemini completely hallucinates the formatting
                parsed_data = {"response": "I processed the data, but encountered an formatting error.", "chart_config": None, "box": []}
            final_text = parsed_data.get("response", "I have analyzed the data.")
            chart_config = parsed_data.get("chart_config", None)
            
            return {"status": "success", "response": final_text, "chart_config": chart_config}

        # --- TRACK A: DASHBOARD IMAGE VISION ---
        elif file_ext in ['png', 'jpg', 'jpeg']:
            image_bytes = await file.read()
            image = Image.open(io.BytesIO(image_bytes))
            
            prompt = (
                "You are a spatial business strategist. Analyze the provided dashboard image and answer the user's question. "
                "CRITICAL INSTRUCTION: You must return your response as a valid JSON object with EXACTLY two keys: "
                "1. 'response': Your conversational answer to the user (no markdown). "
                "2. 'box': An array of four numbers [ymin, xmin, ymax, xmax] representing the bounding box of the specific chart, graph, or data point you are talking about. Scale the numbers from 0 to 1000. If the question is about the whole dashboard, return an empty array [].\n\n"
                f"User Voice Command: {transcript}"
            )
            
            # We force the model to output strict JSON
            gemini_response = client.models.generate_content(
                model='gemini-2.5-flash', 
                contents=[image, prompt],
                config={"response_mime_type": "application/json"}
            )
            
            # Parse the AI's JSON output
            # --- Bulletproof JSON Parsing ---
            raw_text = gemini_response.text.strip()
            # If Gemini accidentally wraps the output in markdown, strip it off!
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "", 1)
            if raw_text.endswith("```"):
                raw_text = raw_text.rsplit("```", 1)[0]
            
            try:
                parsed_data = json.loads(raw_text.strip())
            except json.JSONDecodeError:
                # Fallback if Gemini completely hallucinates the formatting
                parsed_data = {"response": "I processed the data, but encountered an formatting error.", "chart_config": None, "box": []}
            final_text = parsed_data.get("response", "I could not analyze the image.")
            box_coords = parsed_data.get("box", [])
            
            return {"status": "success", "response": final_text, "box": box_coords}
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