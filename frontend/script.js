const recordButton = document.getElementById('recordButton');
const statusText = document.getElementById('statusText');
const transcriptBox = document.getElementById('transcriptBox');
const responseBox = document.getElementById('responseBox');
const csvFileInput = document.getElementById('csvFileInput');
const analysisMode = document.getElementById('analysisMode');
// Initialize Web Speech API for Speech-to-Text
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
const fileDisplay = document.getElementById('file-display');
const visualCanvas = document.getElementById('visualCanvas');
const placeholderContent = document.querySelector('.placeholder-content');

// Listen for file uploads and validate/display
csvFileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const isImage = file.type.startsWith('image/');
        const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv';

        if (isImage || isCsv) {
            fileDisplay.innerText = "Loaded: " + file.name;
            fileDisplay.style.color = "#34a853"; // Green
            
            // Render the Visual Canvas
            if (isImage) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // We wrapped the image in a relative div so our highlight box knows where to stick!
                    visualCanvas.innerHTML = `
                        <div id="imageContainer" style="position: relative; display: inline-block;">
                            <img src="${e.target.result}" id="uploadedImage" style="max-width: 100%; max-height: 80vh; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: block;">
                        </div>`;
                    visualCanvas.style.display = 'flex';
                    visualCanvas.style.justifyContent = 'center';
                    placeholderContent.style.display = 'none';
                }
                reader.readAsDataURL(file);
            } else { // It's a CSV
                visualCanvas.innerHTML = `<div style="text-align: center; color: #1a73e8;"><h1 style="font-size: 80px; margin: 0;"></h1><h2>Raw Data Loaded</h2><p>Ready for voice queries.</p></div>`;
                visualCanvas.style.display = 'flex';
                visualCanvas.style.flexDirection = 'column';
                visualCanvas.style.justifyContent = 'center';
                placeholderContent.style.display = 'none';
            }
        } else {
            fileDisplay.innerText = "Error: Please upload a valid CSV, PNG, or JPG";
            fileDisplay.style.color = "#ea4335"; // Red
            this.value = ""; // Clear the invalid file
        }
    }
});

recognition.onstart = function() {
    statusText.innerText = "Listening... Speak now";
    statusText.className = "status-listening";
    recordButton.innerText = "Listening...";
};

recognition.onresult = async function(event) {
    const transcript = event.results[0][0].transcript;
    transcriptBox.innerText = transcript;
    statusText.innerText = "Processing request...";
    statusText.className = "status-processing";
    recordButton.innerText = "Tap to Speak";

    await sendDataToBackend(transcript);
};

// Also update the success status in sendDataToBackend:
// statusText.innerText = "Done!";
// statusText.className = "status-done";

recognition.onerror = function(event) {
    statusText.innerText = "Status: Error listening. Try again.";
    recordButton.innerText = "Start Recording";
};

// Start listening when button is clicked
recordButton.addEventListener('click', () => {
    if (!csvFileInput.files[0]) {
        alert("Please upload a CSV file first!");
        return;
    }
    
    // --- NEW FIX: Prime the mobile audio engine ---
    // Speak a silent utterance immediately on user tap to unlock mobile audio
    const primeUtterance = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(primeUtterance);
    // ----------------------------------------------

    recognition.start();
});

// Send data to the FastAPI Backend
async function sendDataToBackend(transcript) {
    const file = csvFileInput.files[0];
    const mode = analysisMode.value; // Capture the selected mode
    
    const formData = new FormData();
    formData.append("transcript", transcript);
    formData.append("file", file);
    formData.append("mode", mode); // Send the mode to Python

    try {
        const response = await fetch("/api/analyze", {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        
        if (data.status === "success") {
            responseBox.innerText = data.response;
            speakResponse(data.response); 
            statusText.innerText = "Status: Done!";
            statusText.className = "status-done";

            // --- NEW: SPATIAL HIGHLIGHTING LOGIC ---
            // 1. Remove the old highlight box if it exists
            const oldHighlight = document.getElementById('highlight-box');
            if (oldHighlight) oldHighlight.remove();

            // 2. Check if the AI returned coordinates
            if (data.box && data.box.length === 4) {
                const [ymin, xmin, ymax, xmax] = data.box;
                
                // Convert Gemini's 0-1000 scale to standard CSS percentages (0% to 100%)
                const top = ymin / 10;
                const left = xmin / 10;
                const height = (ymax - ymin) / 10;
                const width = (xmax - xmin) / 10;

                // 3. Create the glowing CSS box
                const imageContainer = document.getElementById('imageContainer');
                if (imageContainer) {
                    const highlight = document.createElement('div');
                    highlight.id = 'highlight-box';
                    highlight.style.position = 'absolute';
                    highlight.style.top = `${top}%`;
                    highlight.style.left = `${left}%`;
                    highlight.style.width = `${width}%`;
                    highlight.style.height = `${height}%`;
                    highlight.style.border = '4px solid #ea4335'; // Google Red
                    highlight.style.backgroundColor = 'rgba(234, 67, 53, 0.2)'; // Transparent Red
                    highlight.style.boxShadow = '0 0 20px rgba(234, 67, 53, 0.6)';
                    highlight.style.borderRadius = '8px';
                    highlight.style.transition = 'all 0.4s ease-in-out';
                    highlight.style.pointerEvents = 'none'; // Ensure clicks pass through it
                    
                    // Attach it to the image container
                    imageContainer.appendChild(highlight);
                }
            }
        } else {
            responseBox.innerText = "Error from server: " + data.detail;
            statusText.innerText = "Status: Error!";
        }
    } catch (error) {
        responseBox.innerText = "Failed to connect to backend.";
        statusText.innerText = "Status: Connection Error!";
    }
}

// Initialize Web Speech API for Text-to-Speech
function speakResponse(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
}
// --- New UI Reset Logic ---
const clearButton = document.getElementById('clearButton');

clearButton.addEventListener('click', () => {
    // 1. Reset the text boxes
    transcriptBox.innerText = "Your words will appear here...";
    responseBox.innerText = "Gemini's answer will appear here...";
    statusText.innerText = "Status: Waiting...";
    
    // 2. Stop the Text-to-Speech immediately if it is currently talking
    window.speechSynthesis.cancel();
    
    // 3. Reset the record button in case it got stuck
    recordButton.innerText = "Start Recording";
});