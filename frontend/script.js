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

// Function to render a Chart.js graph from JSON config
function renderChart(chartConfig) {
    const visualCanvas = document.getElementById('visualCanvas');
    const placeholderContent = document.querySelector('.placeholder-content');
    
    // Hide placeholder and show canvas area
    placeholderContent.style.display = 'none';
    visualCanvas.style.display = 'flex';
    visualCanvas.style.justifyContent = 'center';
    visualCanvas.style.alignItems = 'center';
    
    // Clear out any old images or old canvases
    visualCanvas.innerHTML = '<canvas id="myChart" style="max-width: 100%; max-height: 80vh;"></canvas>';
    
    const ctx = document.getElementById('myChart').getContext('2d');
    
    // Destroy the old chart if it exists so they don't overlap
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Draw the new chart
    currentChart = new Chart(ctx, chartConfig);
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
    const file = csvFileInput.files[0];
    const mode = analysisMode.value; 
    
    const formData = new FormData();
    formData.append("transcript", transcript);
    formData.append("file", file);
    formData.append("mode", mode); 

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

            // --- TRACK B: ZERO TO DASHBOARD LOGIC (CSV) ---
            if (data.chart_config) {
                renderChart(data.chart_config);
            }

            // --- THE FIX: MEMORY & SAVE BUTTON REVEAL ---
            // Now this is safely inside the block where 'data' exists!
            currentQueryText = transcript; 
            currentAiResponse = data.response;
            currentChartConfig = data.chart_config ? JSON.stringify(data.chart_config) : null;
            
            saveInsightBtn.style.display = 'inline-block';
            saveInsightBtn.innerText = 'Save to My Insights';
            saveInsightBtn.disabled = false;
            // ---------------------------------------------

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
                chart_config: currentChartConfig
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