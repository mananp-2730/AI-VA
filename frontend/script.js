const recordButton = document.getElementById('recordButton');
const statusText = document.getElementById('statusText');
const transcriptBox = document.getElementById('transcriptBox');
const responseBox = document.getElementById('responseBox');
const csvFileInput = document.getElementById('csvFileInput');
const analysisMode = document.getElementById('analysisMode');
// Initialize Web Speech API for Speech-to-Text
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.onstart = function() {
    statusText.innerText = "Status: Listening... Speak now!";
    recordButton.innerText = "Listening...";
};

recognition.onresult = async function(event) {
    const transcript = event.results[0][0].transcript;
    transcriptBox.innerText = transcript;
    statusText.innerText = "Status: Processing request...";
    recordButton.innerText = "Start Recording";

    await sendDataToBackend(transcript);
};

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
            speakResponse(data.response); // Trigger Text-to-Speech
            statusText.innerText = "Status: Done!";
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