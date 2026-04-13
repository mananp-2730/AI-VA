let globalUtterance = null; // iOS Safari Garbage Collection Fix
let currentChart = null; // Keeps track of the active Chart.js instance
const recordButton = document.getElementById('recordButton');
const statusText = document.getElementById('statusText');
const transcriptBox = document.getElementById('transcriptBox');
const responseBox = document.getElementById('responseBox');
const csvFileInput = document.getElementById('csvFileInput');
const analysisMode = document.getElementById('analysisMode');
// Initialize Web Speech API for Speech-to-Text
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true; // Keep listening until we tell it to stop
recognition.interimResults = false;
const fileDisplay = document.getElementById('file-display');
const visualCanvas = document.getElementById('visualCanvas');
const placeholderContent = document.querySelector('.placeholder-content');
const pauseButton = document.getElementById('pauseButton');
let isSessionActive = false; // Tracks if the continuous loop is running
let isMicPaused = false;     // Tracks if the VP manually paused it

// Memory Trackers
let currentQueryText = "";
let currentAiResponse = "";
// --- EPIC 9: THE CONTEXT ENGINE (Conversational Memory) ---
let conversationHistory = []; // Stores the last 5 interactions
let currentChartConfig = null;
let currentFilePath = null; // NEW: Tracks where the file is on the server!
const saveInsightBtn = document.getElementById('saveInsightBtn');
const galleryContent = document.getElementById('galleryContent');

// --- AUTHENTICATION UI MOCK LOGIC ---
const authOverlay = document.getElementById('authOverlay');
const authForm = document.getElementById('authForm');
const authSwitchLink = document.getElementById('authSwitchLink');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authSubmitBtn = document.querySelector('.auth-submit');
const authSwitchText = document.getElementById('authSwitchText');

let isLoginMode = true;

// =====================================================================
// ENTERPRISE SECURITY: COOKIE GATEKEEPER
// =====================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Helper function to read browser cookies
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    // 2. Check if the user has the "VIP Pass" from our Python backend
    const userName = getCookie("ai_va_user");
    
    if (userName) {
        // 3. User is verified! Hide the login screen!
        const authOverlay = document.getElementById("authOverlay");
        if (authOverlay) {
            authOverlay.style.display = "none";
        }
        
        // 4. Update the UI to greet them personally
        const decodedName = decodeURIComponent(userName);
        console.log(`Authentication Passed! Welcome, ${decodedName}`);
        
        const statusText = document.getElementById("statusText");
        if (statusText) {
            statusText.innerText = `Status: Logged in as ${decodedName}`;
            statusText.style.color = "#10b981"; // Success Green
        }

        // 5. Reveal and activate the Log Out Button
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.style.display = "inline-block";
            logoutBtn.addEventListener("click", () => {
                // Destroy the cookie by setting its expiration date to the past
                document.cookie = "ai_va_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                // Refresh the page to bring the security gate back down
                window.location.reload();
            });
        }
    }
});

// Toggle between Login and Sign Up UI
authSwitchLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        authTitle.innerText = "Welcome to AI-VA";
        authSubtitle.innerText = "Log in to access your spatial dashboard.";
        authSubmitBtn.innerText = "Log In";
        authSwitchText.innerText = "Don't have an account?";
        authSwitchLink.innerText = "Sign up here";
    } else {
        authTitle.innerText = "Create an Account";
        authSubtitle.innerText = "Join AI-VA to save your insights.";
        authSubmitBtn.innerText = "Sign Up";
        authSwitchText.innerText = "Already have an account?";
        authSwitchLink.innerText = "Log in here";
    }
});

// --- SECURE LOGIN/SIGNUP WIRE-UP (PHASE 3) ---
authForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const originalText = authSubmitBtn.innerText;
    
    authSubmitBtn.innerText = isLoginMode ? "Authenticating..." : "Creating Account...";
    authSubmitBtn.disabled = true; 
    
    // CRITICAL FIX: Dynamically change the endpoint based on the UI!
    const endpoint = isLoginMode ? '/api/login' : '/api/signup';
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });

        const data = await response.json();

        if (response.ok && data.status === "success") {
            // SUCCESS! 
            // CRITICAL NEW LINE: Save the email to the browser's memory!
            localStorage.setItem('aiva_user_email', email);
            authSubmitBtn.innerText = isLoginMode ? "Success! Entering workspace..." : "Account Created! Entering...";
            authSubmitBtn.style.backgroundColor = "#34a853"; 
            
            setTimeout(() => {
                authOverlay.style.opacity = '0';
                setTimeout(() => {
                    authOverlay.style.display = 'none';
                }, 300);
            }, 800);
            
        } else {
            // FAILURE! We dynamically print the exact error the Python backend sends us
            authSubmitBtn.innerText = data.detail || "Access Denied: Try Again";
            authSubmitBtn.style.backgroundColor = "#ea4335"; 
            authSubmitBtn.disabled = false;
            
            setTimeout(() => {
                authSubmitBtn.innerText = originalText;
                authSubmitBtn.style.backgroundColor = ""; 
            }, 2500);
        }
        
    } catch (error) {
        console.error("Backend connection failed:", error);
        authSubmitBtn.innerText = "Server Error. Is Python running?";
        authSubmitBtn.style.backgroundColor = "#ea4335";
        authSubmitBtn.disabled = false;
    }
});

// --- VOICE SELECTOR LOGIC ---
const voiceSelect = document.getElementById('voiceSelect');
let availableVoices = [];

function populateVoiceList() {
    // Get all the voices from the device
    availableVoices = window.speechSynthesis.getVoices();
    
    // Clear the "Loading..." placeholder
    voiceSelect.innerHTML = ''; 
    
    // Create an option in the dropdown for every voice found
    availableVoices.forEach((voice) => {
        const option = document.createElement('option');
        // Show the name and the language (e.g., "Google US English (en-US)")
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        voiceSelect.appendChild(option);
    });
}

// Browsers load voices asynchronously, so we have to wait for them to change/load
window.speechSynthesis.onvoiceschanged = populateVoiceList;

// Run it once just in case the browser loaded them instantly
populateVoiceList();

// --- DARK MODE LOGIC ---
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

// 1. Check if the VP already chose Dark Mode in a previous session
if (localStorage.getItem('ai-va-theme') === 'dark') {
    body.classList.add('dark-theme');
    darkModeToggle.innerText = '☀️';
    darkModeToggle.style.backgroundColor = '#ffffff';
    darkModeToggle.style.color = '#202124';
}

// 2. Listen for the toggle click
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
        darkModeToggle.innerText = '☀️'; // Icon only!
    } else {
        localStorage.setItem('theme', 'light');
        darkModeToggle.innerText = '🌙'; // Icon only!
    }
});

// --- EPIC 8: DYNAMIC DRILL-DOWN CHART RENDERING (FIXED) ---
function renderChart(config) {
    // 1. Bulletproof Canvas Selection (Finds the true canvas inside the div)
    const container = document.getElementById('visualCanvas');
    let canvas = container.tagName === 'CANVAS' ? container : container.querySelector('canvas');
    
    // If there is no canvas inside the container yet, create one dynamically!
    if (!canvas && container.tagName !== 'CANVAS') {
        canvas = document.createElement('canvas');
        container.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    
    // Destroy the old chart if it exists so we don't overlap
    if (window.currentChart) {
        window.currentChart.destroy();
    }

    // THE UPGRADE: Inject an onClick listener into the AI's config
    if (!config.options) config.options = {};
    
    config.options.onClick = function(event, elements) {
        if (elements.length > 0) {
            // 1. Figure out EXACTLY what the user clicked on
            const clickedElementIndex = elements[0].index;
            const datasetIndex = elements[0].datasetIndex;
            
            // 2. Extract the label (e.g., "North America") and the value
            const clickedLabel = this.data.labels[clickedElementIndex];
            const clickedValue = this.data.datasets[datasetIndex].data[clickedElementIndex];
            
            console.log(`🎯 User clicked on: ${clickedLabel} (Value: ${clickedValue})`);
            
            // 3. Construct a silent follow-up prompt for the AI
            const drillDownQuery = `Break down the data specifically for '${clickedLabel}'. Show me the details that make up this number.`;
            
            // 4. Send this new query right back to the backend!
            document.getElementById('statusText').innerText = `Drilling down into ${clickedLabel}...`;
            document.getElementById('statusText').className = "status-recording";
            
            sendDataToBackend(drillDownQuery);
        }
    };

    // Ensure it stays responsive and dark-mode friendly
    config.options.responsive = true;
    config.options.maintainAspectRatio = false;
    
    // Render the new interactive chart!
    window.currentChart = new Chart(ctx, config);
    container.style.display = 'block'; // Ensure the container is visible
}
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

// --- BUTTON CONTROLS ---

// Start/Stop the entire session
recordButton.addEventListener('click', () => {
    if (!isSessionActive) {
        // Start Session
        isSessionActive = true;
        isMicPaused = false;
        // --- NEW: THE iOS AUDIO UNLOCK TRICK (UPGRADED) ---
        // Apple ignores empty strings. We make it say "Listening" but at volume 0.
        window.speechSynthesis.cancel();
        const unlockAudio = new SpeechSynthesisUtterance('Listening');
        unlockAudio.volume = 0; 
        window.speechSynthesis.speak(unlockAudio);
        // ----------------------------------------
        recognition.start();
        recordButton.innerText = "End Session";
        recordButton.className = "btn-danger";
        pauseButton.style.display = "block";
        pauseButton.innerText = "Pause Mic";
    } else {
        // End Session
        isSessionActive = false;
        recognition.stop();
        recordButton.innerText = "Start Session";
        recordButton.className = "btn-primary";
        pauseButton.style.display = "none";
        statusText.innerText = "Status: Session Ended";
        statusText.className = "status-waiting";
    }
});

// Manual Pause by the VP
pauseButton.addEventListener('click', () => {
    if (isMicPaused) {
        // Resume Listening
        isMicPaused = false;
        pauseButton.innerText = "Pause Mic";
        recognition.start();
    } else {
        // Pause Listening
        isMicPaused = true;
        pauseButton.innerText = "Resume Mic";
        recognition.stop();
        statusText.innerText = "Status: Mic Paused (Thinking...)";
        statusText.className = "status-waiting";
    }
});

// --- RECOGNITION EVENTS ---

recognition.onstart = function() {
    if (!isMicPaused) {
        statusText.innerText = "Listening... Speak now";
        statusText.className = "status-listening";
    }
};

// If the browser forces the mic to stop, restart it automatically if the session is still active
recognition.onend = function() {
    if (isSessionActive && !isMicPaused && !window.speechSynthesis.speaking) {
        recognition.start(); 
    }
};

recognition.onresult = async function(event) {
    // Only process speech if the mic isn't paused
    if (isMicPaused) return; 

    // Get the most recent speech transcript
    const currentResultIndex = event.results.length - 1;
    const transcript = event.results[currentResultIndex][0].transcript.trim();
    
    // Ignore empty transcripts or background noise blips
    if (!transcript) return;

    transcriptBox.innerText = transcript;
    statusText.innerText = "Processing request...";
    statusText.className = "status-processing";
    
    // Stop listening temporarily while we fetch data so we don't pick up garbage
    recognition.stop(); 
    await sendDataToBackend(transcript);
};

// Send data to the FastAPI Backend
async function sendDataToBackend(transcript) {
    statusText.innerText = "Status: AI is analyzing...";
    statusText.className = "status-recording";

    // EPIC 7: Check which mode we are in!
    // (If the dropdown doesn't exist yet, it defaults to 'upload')
    const dataSourceElement = document.getElementById('dataSource');
    const dataSource = dataSourceElement ? dataSourceElement.value : 'upload';
    
    // --- THE CONTEXT ENGINE UPGRADE ---
            // Format the history array into a readable string for the AI
            let historyString = conversationHistory.map(item => `User asked: "${item.user}"\nAI answered: "${item.ai}"`).join('\n\n');
            if (historyString === "") historyString = "No previous history.";

            const formData = new FormData();
            formData.append('transcript', transcript);
            formData.append('history', historyString); // Sending memory to the Master Orchestrator!

    let apiUrl = '/api/analyze'; // Default to the local file route

    if (dataSource === 'enterprise') {
        console.log("Routing to Enterprise SQL Database...");
        apiUrl = '/api/enterprise_query'; 
        // We DO NOT need to attach files for the enterprise route!
        
    } else {
        console.log("Routing to Local File Analysis...");
        
        // --- YOUR EXISTING SMART FILE ROUTER ---
        const file = csvFileInput.files[0];
        const mode = analysisMode.value; 
        formData.append("mode", mode); 

        console.log("1. Is there a new file upload?", file ? "YES" : "NO");
        console.log("2. Is there a Time Machine file path?", currentFilePath ? currentFilePath : "NO (null)");

        if (file) {
            console.log("-> Routing as a BRAND NEW upload.");
            formData.append("file", file);
        } else if (currentFilePath) {
            console.log("-> Routing as a TIME MACHINE follow-up.");
            formData.append("saved_file_path", currentFilePath);
        } else {
            console.log("❌ ERROR: Both file slots are empty. Aborting!");
            statusText.innerText = "Error: Please upload a file first.";
            statusText.className = "status-waiting";
            
            // UN-FREEZE THE UI: Turn the mic back on so it doesn't stay stuck!
            if (isSessionActive) {
                isMicPaused = false;
                try { recognition.start(); } catch(e){}
            }
            return; // Stop the request
        }
    }

    // --- THE FETCH REQUEST ---
    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        
        // --- ADD THIS SAFETY NET RIGHT HERE ---
        if (!response.ok) {
            responseBox.innerText = "System Error: " + (data.detail || "Unknown server crash.");
            statusText.innerText = "Status: Error handling file.";
            statusText.className = "status-waiting";
            console.error("Backend Error:", data);
            
            // Turn the mic back on so it doesn't stay stuck!
            if (isSessionActive) {
                isMicPaused = false;
                try { recognition.start(); } catch(e){}
            }
            return; // Stop the function so it doesn't freeze!
        }

        if (data.status === "success") {
            responseBox.innerText = data.response;
            speakResponse(data.response); 
            statusText.innerText = "Status: Done!";
            statusText.className = "status-done";

            // --- TRACK A: SPATIAL HIGHLIGHTING LOGIC (Images) ---
            const oldHighlight = document.getElementById('highlight-box');
            if (oldHighlight) oldHighlight.remove();

            if (data.box && data.box.length === 4) {
                const [ymin, xmin, ymax, xmax] = data.box;
                const top = ymin / 10;
                const left = xmin / 10;
                const height = (ymax - ymin) / 10;
                const width = (xmax - xmin) / 10;

                const imageContainer = document.getElementById('imageContainer');
                if (imageContainer) {
                    const highlight = document.createElement('div');
                    highlight.id = 'highlight-box';
                    highlight.style.position = 'absolute';
                    highlight.style.top = `${top}%`;
                    highlight.style.left = `${left}%`;
                    highlight.style.width = `${width}%`;
                    highlight.style.height = `${height}%`;
                    highlight.style.border = '4px solid #ea4335'; 
                    highlight.style.backgroundColor = 'rgba(234, 67, 53, 0.2)'; 
                    highlight.style.boxShadow = '0 0 20px rgba(234, 67, 53, 0.6)';
                    highlight.style.borderRadius = '8px';
                    highlight.style.transition = 'all 0.4s ease-in-out';
                    highlight.style.pointerEvents = 'none'; 
                    
                    imageContainer.appendChild(highlight);
                }
            }

            // --- TRACK B & ENTERPRISE: ZERO TO DASHBOARD LOGIC (CSV / SQL) ---
            if (data.chart_config) {
                // If it's an enterprise query, we might want to wipe the placeholder image first
                const visualCanvas = document.getElementById('visualCanvas');
                const placeholderContent = document.querySelector('.placeholder-content');
                if (dataSource === 'enterprise') {
                    placeholderContent.style.display = 'none';
                    visualCanvas.style.display = 'block';
                }
                
                renderChart(data.chart_config);
            }

            // --- THE FIX: MEMORY & SAVE BUTTON REVEAL ---
            currentQueryText = transcript; 
            currentAiResponse = data.response;
            currentChartConfig = data.chart_config ? JSON.stringify(data.chart_config) : null;
            
            // --- RECORDING THE MEMORY ---
            // Push the current conversation into our history array
            conversationHistory.push({
                user: transcript,
                ai: data.response
            });

            // The "Rolling Window": Keep only the last 5 interactions to keep it fast and cheap!
            if (conversationHistory.length > 5) {
                conversationHistory.shift(); 
            }
            
            // NEW: Remember the file path the server just gave us!
            if (data.file_path) {
                currentFilePath = data.file_path;
            }

            saveInsightBtn.style.display = 'inline-block';
            saveInsightBtn.innerText = 'Save to My Insights';
            saveInsightBtn.disabled = false;

            // EPIC 8: Reveal the PDF Download Button!
            document.getElementById('downloadPdfBtn').style.display = 'inline-block';
            // ---------------------------------------------

        } else {
            responseBox.innerText = "Error from server: " + data.detail;
            statusText.innerText = "Status: Error!";
        }
    } catch (error) {
        responseBox.innerText = "Failed to connect to backend.";
        statusText.innerText = "Status: Connection Error!";
        console.error(error);
    }
}

// Initialize Web Speech API for Text-to-Speech
// Text-to-Speech Function
// Text-to-Speech Function (with iOS Safari Overrides)
function speakResponse(text) {
    // 1. APPLE BUG FIX: Clear the stuck speech queue before talking
    window.speechSynthesis.cancel(); 

    const utterance = new SpeechSynthesisUtterance(text);
    
    // 2. APPLE BUG FIX: Lock the utterance into global memory so iOS doesn't delete it
    globalUtterance = utterance;

    // Apply the selected voice
    const selectedVoiceName = document.getElementById('voiceSelect').value;
    const selectedVoice = availableVoices.find(voice => voice.name === selectedVoiceName);
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
        // 3. APPLE BUG FIX: Force the language to match the voice, or iOS ignores it
        utterance.lang = selectedVoice.lang; 
    }

    // Ensure the mic stays OFF while the AI is talking
    recognition.stop(); 

    // When the AI finishes talking, wake the mic back up automatically
    utterance.onend = function() {
        if (isSessionActive && !isMicPaused) {
            recognition.start();
        }
    };

    // Debugging tool: If iOS blocks it, it will tell us why in the console
    utterance.onerror = function(event) {
        console.error("Apple blocked the speech. Reason: ", event.error);
    };
    
    // Force the browser to speak
    window.speechSynthesis.speak(utterance);
}
// --- New UI Reset Logic ---
// --- UPGRADED UI RESET LOGIC (The "New Workspace" Button) ---
const clearButton = document.getElementById('clearButton');

clearButton.addEventListener('click', () => {
    // 1. Reset the text and status boxes
    transcriptBox.innerText = "Your words will appear here...";
    responseBox.innerText = "Insights will appear here...";
    statusText.innerText = "Status: Ready";
    statusText.className = "status-waiting";
    currentFilePath = null;
    
    // 2. Stop the Text-to-Speech immediately if it is currently talking
    window.speechSynthesis.cancel();
    
    // 3. Reset the microphone and buttons in case they got stuck
    if (isSessionActive) {
        recognition.stop();
        isSessionActive = false;
        isMicPaused = false;
    }
    recordButton.innerText = "Start Session";
    recordButton.className = "btn-primary";
    pauseButton.style.display = "none";
    
    // --- NEW: PHASE 5.2 WORKSPACE RESET ---
    
    // 4. Destroy the active Chart.js graph so it doesn't ghost over new data
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
    
    // 5. Remove any spatial bounding boxes on images
    const oldHighlight = document.getElementById('highlight-box');
    if (oldHighlight) oldHighlight.remove();

    // 6. Flip the UI back to the "Upload" state
    const visualCanvas = document.getElementById('visualCanvas');
    const placeholderContent = document.querySelector('.placeholder-content');
    
    visualCanvas.style.display = 'none';
    visualCanvas.innerHTML = ''; // Wipe out old images or raw data text
    
    // FIX: Remove the inline style entirely so your style.css takes over!
    placeholderContent.style.display = '';
    
    // 7. Clear the actual file input so the browser knows it is completely empty
    csvFileInput.value = '';
    const fileDisplay = document.getElementById('file-display');
    fileDisplay.innerText = "No file selected";
    fileDisplay.style.color = ""; // Reset the text color
    
    // 8. Wipe the memory trackers and hide the "Save" button
    currentQueryText = "";
    currentAiResponse = "";
    currentChartConfig = null;
    const saveInsightBtn = document.getElementById('saveInsightBtn');
    saveInsightBtn.style.display = 'none';
});

// --- GALLERY UI LOGIC (PHASE 4) ---
const galleryToggleBtn = document.getElementById('galleryToggleBtn');
const gallerySidebar = document.getElementById('gallerySidebar');
const closeGalleryBtn = document.getElementById('closeGalleryBtn');

galleryToggleBtn.addEventListener('click', () => {
    gallerySidebar.classList.add('open');
});

closeGalleryBtn.addEventListener('click', () => {
    gallerySidebar.classList.remove('open');
});

// --- DATABASE API CALLS (PHASE 4) ---

// 1. Save the current insight to SQLite
saveInsightBtn.addEventListener('click', async () => {
    const userEmail = localStorage.getItem('aiva_user_email');
    if (!userEmail) {
        alert("Authentication error. Please log in again.");
        return;
    }

    saveInsightBtn.innerText = 'Saving...';
    saveInsightBtn.disabled = true;

    try {
        const response = await fetch('/api/save_session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userEmail,
                query_text: currentQueryText,
                ai_response: currentAiResponse,
                chart_config: currentChartConfig,
                file_path: currentFilePath // NEW: Save this permanently to SQLite!
            })
        });

        const result = await response.json();
        
        if (response.ok) {
            saveInsightBtn.innerText = '✅ Saved!';
            loadGallery(); // Refresh the sidebar instantly
        } else {
            saveInsightBtn.innerText = '❌ Error Saving';
        }
    } catch (error) {
        console.error("Save failed:", error);
        saveInsightBtn.innerText = '❌ Network Error';
    }
    
    setTimeout(() => { saveInsightBtn.disabled = false; }, 2000);
});

// 2. Fetch and render the user's history
async function loadGallery() {
    const userEmail = localStorage.getItem('aiva_user_email');
    if (!userEmail) return;

    try {
        const response = await fetch('/api/my_sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
        });

        const data = await response.json();

        if (response.ok && data.sessions.length > 0) {
            galleryContent.innerHTML = ''; // Clear the "No insights" message
            
            data.sessions.forEach(session => {
                const dateObj = new Date(session.created_at);
                const dateString = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                // Build the UI card for the sidebar
                const itemDiv = document.createElement('div');
                itemDiv.className = 'gallery-item';
                itemDiv.style.cursor = 'pointer'; 
                // Add position relative here just in case!
                itemDiv.style.position = 'relative'; 
                
                itemDiv.innerHTML = `
                    <button class="delete-btn" title="Delete Insight">🗑️</button>
                    <div class="gallery-date">${dateString}</div>
                    <div class="gallery-query">" ${session.query_text} "</div>
                    <div class="gallery-response">${session.ai_response}</div>
                `;
                
                // --- PHASE 5.1: THE DELETE LOGIC ---
                const deleteBtn = itemDiv.querySelector('.delete-btn');
                
                deleteBtn.addEventListener('click', async (e) => {
                    // CRITICAL: Stop the click from bubbling up to the card!
                    // This prevents the Time Machine from loading a deleted chart.
                    e.stopPropagation(); 
                    
                    // Add a safety check so users don't accidentally click it
                    if (!confirm("Are you sure you want to permanently delete this insight?")) return;
                    
                    deleteBtn.innerText = '⏳';
                    
                    try {
                        const delRes = await fetch('/api/delete_session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: userEmail, session_id: session.id })
                        });
                        
                        if (delRes.ok) {
                            // Smoothly fade the card out before removing it
                            itemDiv.style.opacity = '0';
                            itemDiv.style.transform = 'scale(0.9)';
                            itemDiv.style.transition = 'all 0.3s ease';
                            
                            setTimeout(() => {
                                itemDiv.remove();
                                // If the gallery is empty, reload to show the empty state message
                                if (galleryContent.children.length === 0) {
                                    loadGallery();
                                }
                            }, 300);
                        } else {
                            alert("Failed to delete from database.");
                            deleteBtn.innerText = '🗑️';
                        }
                    } catch (err) {
                        console.error("Delete failed:", err);
                        deleteBtn.innerText = '🗑️';
                    }
                });
                
                // --- PHASE 5: THE TIME MACHINE LOGIC ---
                itemDiv.addEventListener('click', async () => {
                    // 1. Give the user visual feedback that it is loading
                    const originalHTML = itemDiv.innerHTML;
                    itemDiv.innerHTML = `<div style="text-align: center; color: #1a73e8; font-weight: bold;">Loading insight... ⏳</div>`;
                    
                    try {
                        // 2. Fetch the specific memory from the new backend route
                        const singleRes = await fetch('/api/get_session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                email: userEmail,
                                session_id: session.id 
                            })
                        });
                        
                        const singleData = await singleRes.json();
                        
                        if (singleRes.ok) {
                            // 3. Restore the Chat UI
                            transcriptBox.innerText = singleData.query_text;
                            responseBox.innerText = singleData.ai_response;
                            statusText.innerText = "Status: Insight Restored from Memory";
                            statusText.className = "status-done";
                            
                            // 4. Restore the Chart (if one exists)
                            if (singleData.chart_config) {
                                // The database saves it as a string, so we turn it back into a JSON object
                                const parsedConfig = JSON.parse(singleData.chart_config);
                                renderChart(parsedConfig);
                            } else {
                                // If it was just a text answer without a chart, clear the canvas
                                const visualCanvas = document.getElementById('visualCanvas');
                                const placeholderContent = document.querySelector('.placeholder-content');
                                if (currentChart) currentChart.destroy();
                                visualCanvas.style.display = 'none';
                                placeholderContent.style.display = 'flex';
                            }
                            
                            // NEW: 4.5 Remember the file so we can ask follow-ups!
                            currentFilePath = singleData.file_path;

                            // 5. Automatically close the sidebar so the VP can see the dashboard!
                            document.getElementById('gallerySidebar').classList.remove('open');
                        } else {
                            alert("Failed to load session: " + singleData.detail);
                        }
                    } catch (err) {
                        console.error("Time machine failed:", err);
                        alert("Network error while loading insight.");
                    } finally {
                        // Restore the card's original look in the sidebar
                        itemDiv.innerHTML = originalHTML;
                    }
                });

                galleryContent.appendChild(itemDiv);
            });
        }
    } catch (error) {
        console.error("Failed to load gallery:", error);
    }
}

// 3. Auto-load the gallery when the sidebar opens
galleryToggleBtn.addEventListener('click', () => {
    loadGallery();
});

// --- EPIC 8: BULLETPROOF PDF GENERATOR ---
document.getElementById('downloadPdfBtn').addEventListener('click', function() {
    try {
        console.log("📄 PDF Button Clicked! Starting generation...");
        
        // 1. Safety Check: Did the jsPDF library actually load?
        if (!window.jspdf) {
            console.error("❌ ERROR: jsPDF library is missing. The CDN link might be blocked or incorrect.");
            alert("PDF Engine failed to load. Please check your internet or adblocker.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        console.log("✅ PDF Engine initialized successfully.");

        // 2. Paint the Dark Theme Background
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 297, 'F'); 

        // 3. Add the Header
        doc.setTextColor(16, 185, 129); 
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("AI-VA Executive Summary", 20, 30);
        console.log("✅ Header painted.");

        // 4. Add the AI's Strategic Insight
        doc.setTextColor(255, 255, 255); 
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        
        const responseBox = document.getElementById('responseBox');
        if (!responseBox) throw new Error("Could not find the responseBox element!");
        
        const insightText = responseBox.innerText;
        const splitText = doc.splitTextToSize("Strategic Insight: " + insightText, 170);
        doc.text(splitText, 20, 50);
        console.log("✅ Text insight added to PDF.");

        // 5. Capture the Chart.js Graph
        const chartContainer = document.getElementById('visualCanvas');
        
        // SMART FIX: If visualCanvas is a div, find the actual canvas hiding inside it!
        const canvas = chartContainer.tagName === 'CANVAS' ? chartContainer : chartContainer.querySelector('canvas');
        
        let textHeight = splitText.length * 6; 

        if (canvas) {
            console.log("📊 Found actual canvas element, converting to image...");
            // Force a solid background for the chart image capture
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.fillStyle = '#0f172a'; // Match dark theme
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(canvas, 0, 0);

            const chartImage = tempCanvas.toDataURL("image/png", 1.0);
            doc.addImage(chartImage, 'PNG', 20, 50 + textHeight + 10, 170, 85); 
            console.log("✅ Chart successfully embedded.");
        } else {
            console.warn("⚠️ No active chart canvas found to embed.");
        }

        // 6. Add Footer & Trigger Download
        doc.setTextColor(100, 116, 139); 
        doc.setFontSize(10);
        const date = new Date().toLocaleDateString();
        doc.text("Generated securely by AI-VA on " + date, 20, 280);

        doc.save("AIVA_Executive_Summary.pdf");
        console.log("🎉 SUCCESS: PDF Download Triggered!");

    } catch (error) {
        // If ANYTHING fails, it gets caught right here!
        console.error("❌ CRITICAL PDF ERROR:", error);
        alert("Failed to generate PDF. Check the Developer Console (F12) for details.");
    }
});

// =====================================================================
// EPIC 10: THE DISTRIBUTION PLAY (Slack Webhooks)
// =====================================================================
const slackPushBtn = document.getElementById('slackPushBtn');

if (slackPushBtn) {
    slackPushBtn.addEventListener('click', async () => {
        // 1. Ensure the user has actually generated an insight first!
        if (!currentAiResponse) {
            alert("Please ask AI-VA a question to generate an insight before pushing to Slack!");
            return;
        }

        // 2. Visual feedback: Change button state so the user knows it's working
        const originalText = slackPushBtn.innerText;
        slackPushBtn.innerText = "Pushing...";
        slackPushBtn.disabled = true;

        try {
            // 3. Package the current AI insight to send to our backend
            const formData = new FormData();
            formData.append('insight', currentAiResponse); 
            // Note: Ensure your main AI response is saved to a global 'currentAiResponse' variable during generation!

            // 4. Fire it to the FastAPI Master Orchestrator
            const response = await fetch('/api/slack_push', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            // 5. Success! Reset the button after 3 seconds
            if (data.status === 'success') {
                slackPushBtn.innerText = "Pushed! ✅";
                setTimeout(() => {
                    slackPushBtn.innerText = originalText;
                    slackPushBtn.disabled = false;
                }, 3000);
            } else {
                throw new Error("Slack API failed.");
            }

        } catch (error) {
            console.error("Slack Error:", error);
            slackPushBtn.innerText = "Error ❌";
            setTimeout(() => {
                slackPushBtn.innerText = originalText;
                slackPushBtn.disabled = false;
            }, 3000);
        }
    });
}