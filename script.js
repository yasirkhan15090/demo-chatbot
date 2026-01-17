const CONFIG = {
    RASA_API_URL: "http://localhost:5005/webhooks/rest/webhook",
    SENDER_ID: "gym_user_" + Math.random().toString(36).substring(7)
};

// Elements
const chatFab = document.getElementById('chatFab');
const chatWidget = document.getElementById('chatWidget');
const collapseBtn = document.getElementById('collapseBtn');
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const endChatBtn = document.getElementById('endChatBtn');

// Modals
const disclaimerModal = document.getElementById('disclaimerModal');
const feedbackModal = document.getElementById('feedbackModal');
const readMoreLink = document.getElementById('readMoreLink');
const closeDisclaimer = document.getElementById('closeDisclaimer');
const closeFeedback = document.getElementById('closeFeedback');
const noThanks = document.getElementById('noThanks');
const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
const feedbackText = document.getElementById('feedbackText');
const positiveFeedbackBtn = document.getElementById('positiveFeedbackBtn');
const negativeFeedbackBtn = document.getElementById('negativeFeedbackBtn');
const micBtn = document.getElementById('micBtn');

let selectedRating = null;
let isRecording = false;
let recognition = null;
let synthesisVoice = null;

// Initialize Speech
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    console.log("Speech Recognition API found.");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        console.log("Speech recognition started.");
        userInput.placeholder = "Listening...";
        userInput.value = "";
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            userInput.value = finalTranscript;
            handleSend();
        } else {
            userInput.value = interimTranscript;
        }
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
        micBtn.style.color = "";
        userInput.placeholder = "Type or speak here...";
    };

    recognition.onerror = (event) => {
        console.error("Critical Speech Error:", event.error);

        if (event.error === 'no-speech') {
            console.warn("No speech detected. Mic might be silent.");
            // Don't stop the session, just log it. Continuous mode will keep trying.
        } else if (event.error === 'not-allowed') {
            alert("Microphone access is blocked. Check your browser's address bar to allow permissions.");
            isRecording = false;
            recognition.stop();
        } else if (event.error === 'network') {
            console.error("Network error. Voice recognition requires an internet connection.");
        }
    };
} else {
    console.warn("Speech Recognition API not supported in this browser.");
}

// Load Voices
window.speechSynthesis.onvoiceschanged = () => {
    const voices = window.speechSynthesis.getVoices();
    synthesisVoice = voices.find(v => v.lang.includes('en')) || voices[0];
};

function init() {
    // Toggle Widget
    chatFab.addEventListener('click', () => {
        chatWidget.classList.add('active');
        chatFab.style.display = 'none';
        scrollToBottom();
    });

    collapseBtn.addEventListener('click', () => {
        chatWidget.classList.remove('active');
        chatFab.style.display = 'flex';
    });

    // Disclaimer Logic
    readMoreLink.addEventListener('click', (e) => {
        e.preventDefault();
        disclaimerModal.classList.add('active');
    });
    closeDisclaimer.addEventListener('click', () => disclaimerModal.classList.remove('active'));

    // Feedback Logic
    endChatBtn.addEventListener('click', () => feedbackModal.classList.add('active'));
    closeFeedback.addEventListener('click', () => feedbackModal.classList.remove('active'));
    noThanks.addEventListener('click', () => feedbackModal.classList.remove('active'));

    positiveFeedbackBtn.addEventListener('click', () => setRating('positive'));
    negativeFeedbackBtn.addEventListener('click', () => setRating('negative'));

    submitFeedbackBtn.addEventListener('click', () => {
        const comment = feedbackText.value.trim();
        console.log(`Feedback Submitted: ${selectedRating}, Comment: ${comment}`);
        alert("Thank you for your feedback!");
        feedbackModal.classList.remove('active');
        // Reset
        selectedRating = null;
        feedbackText.value = '';
        positiveFeedbackBtn.classList.remove('selected');
        negativeFeedbackBtn.classList.remove('selected');
    });

    // Input Handling
    userInput.addEventListener('input', () => {
        sendBtn.classList.toggle('active', userInput.value.trim().length > 0);
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    sendBtn.addEventListener('click', handleSend);

    if (micBtn) {
        micBtn.addEventListener('click', toggleSpeech);
    }
}

function toggleSpeech() {
    if (!recognition) {
        alert("Speech recognition is not supported in your browser.");
        return;
    }

    if (isRecording) {
        recognition.stop();
    } else {
        isRecording = true;
        micBtn.classList.add('recording');
        recognition.start();
    }
}

function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text);
    if (synthesisVoice) utterance.voice = synthesisVoice;
    utterance.pitch = 1;
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
}

function setRating(rating) {
    selectedRating = rating;
    positiveFeedbackBtn.classList.toggle('selected', rating === 'positive');
    negativeFeedbackBtn.classList.toggle('selected', rating === 'negative');
}

// Map the global functions used in HTML inline events
window.openFeedbackModal = function (rating) {
    feedbackModal.classList.add('active');
    setRating(rating);
};

window.toggleMessageFeedback = function (btn, rating) {
    const parent = btn.parentElement;
    const btns = parent.querySelectorAll('.fb-btn');
    btns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    console.log(`Message rated as ${rating}`);
};

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.classList.remove('active');

    appendMessage('user', text);

    // Show End Session button after first user message
    if (endChatBtn.style.display === 'none' || endChatBtn.style.display === '') {
        endChatBtn.style.display = 'block';
    }

    const loaderId = appendLoader();

    try {
        const responseData = await fetchRasa(text);
        removeLoader(loaderId);

        if (responseData && responseData.length > 0) {
            let fullText = "";
            for (const reply of responseData) {
                if (reply.text) {
                    fullText += reply.text + " ";
                    await simulateTyping('bot', reply.text);
                }
                if (reply.image) appendImage('bot', reply.image);
            }
            if (fullText) speakText(fullText.trim());
        } else {
            appendMessage('bot', "I'm not sure how to respond to that. Can you try rephrasing?");
        }
    } catch (err) {
        removeLoader(loaderId);
        appendMessage('bot', "Error: I couldn't connect to the server. Please check if Rasa is running.");
    }
}

async function fetchRasa(message) {
    const res = await fetch(CONFIG.RASA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: CONFIG.SENDER_ID, message: message })
    });
    return await res.json();
}

function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    let html = `<div class="bubble">${text.replace(/\n/g, '<br>')}</div>`;
    if (role === 'bot') {
        html += `
            <div class="feedback-btns">
                <button class="fb-btn" onclick="toggleMessageFeedback(this, 'positive')"><i class="far fa-thumbs-up"></i></button>
                <button class="fb-btn" onclick="toggleMessageFeedback(this, 'negative')"><i class="far fa-thumbs-down"></i></button>
            </div>`;
    }

    msgDiv.innerHTML = html;
    chatContainer.appendChild(msgDiv);
    scrollToBottom();
}

function appendImage(role, url) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.innerHTML = `<div class="bubble"><img src="${url}" style="max-width: 100%; border-radius: 8px;"></div>`;
    chatContainer.appendChild(msgDiv);
    scrollToBottom();
}

function appendLoader() {
    const id = 'loader-' + Date.now();
    const loader = document.createElement('div');
    loader.id = id;
    loader.className = 'message bot';
    loader.innerHTML = `<div class="bubble"><i class="fas fa-ellipsis-h fa-beat"></i></div>`;
    chatContainer.appendChild(loader);
    scrollToBottom();
    return id;
}

function removeLoader(id) { document.getElementById(id)?.remove(); }

async function simulateTyping(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    msgDiv.appendChild(bubble);
    chatContainer.appendChild(msgDiv);

    const words = text.split(' ');
    let current = '';
    for (const word of words) {
        current += (current ? ' ' : '') + word;
        bubble.innerHTML = current.replace(/\n/g, '<br>');
        scrollToBottom();
        await new Promise(r => setTimeout(r, 15 + Math.random() * 10));
    }

    const fb = document.createElement('div');
    fb.className = 'feedback-btns';
    fb.innerHTML = `
        <button class="fb-btn" onclick="toggleMessageFeedback(this, 'positive')"><i class="far fa-thumbs-up"></i></button>
        <button class="fb-btn" onclick="toggleMessageFeedback(this, 'negative')"><i class="far fa-thumbs-down"></i></button>`;
    msgDiv.appendChild(fb);
}

function scrollToBottom() { chatContainer.scrollTop = chatContainer.scrollHeight; }

init();
