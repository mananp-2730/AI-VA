from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # NEW IMPORT
import uvicorn
import pandas as pd
import os
from dotenv import load_dotenv
from google import genai
import io
from PIL import Image
import json

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
    mode: str = Form(...)
):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    try:
        file_ext = file.filename.split('.')[-1].lower()

        # --- TRACK B: CSV RAW DATA ---
        if file_ext == 'csv':
            df = pd.read_csv(file.file)
            csv_text = df.to_csv(index=False) 
            
            if mode == "version_a":
                prompt = "You are a spatial voice assistant. Read this output directly to the user. Answer purely based on the CSV data. Keep it concise. No markdown.\n\n"
            else:
                prompt = "You are a business strategist. Read this output directly. Analyze the CSV data for trends. Keep it conversational. No markdown.\n\n"
                
            prompt += f"User Voice Command: {transcript}\n\nCSV Data:\n{csv_text}"
            response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)

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
            parsed_data = json.loads(gemini_response.text)
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