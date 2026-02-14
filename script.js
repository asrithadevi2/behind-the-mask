// Firebase Configuration
const firebaseConfig = {
    apiKey:  "AIzaSyBX1ARGiGOX-HheVHcV1GYnWJ0xUWGpTos",
    authDomain: "unfiltered-1b3e4.firebaseapp.com",
    databaseURL: "https://unfiltered-1b3e4-default-rtdb.firebaseio.com/",
    projectId: "unfiltered-1b3e4",
    storageBucket: "unfiltered-1b3e4.appspot.com",
    messagingSenderId: "329283548576",
    appId: "1:329283548576:web:5b0d6f02ccd96cfe0060c5"
};

// Initialize Firebase only if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// --- Logic for Index Page (Mask Selection) ---
function selectMask(maskName) {
    if (!maskName) return;
    localStorage.setItem('selectedMask', maskName);

    // Generate a session ID if one doesn't exist
    if (!localStorage.getItem('chatSessionId')) {
        localStorage.setItem('chatSessionId', Math.random().toString(36).substring(2, 15));
    }

    const container = document.querySelector('.container');
    if (container) {
        container.style.opacity = '0';
        container.style.transform = 'scale(0.98)';
        container.style.transition = 'all 0.3s ease';
    }

    setTimeout(() => {
        window.location.href = 'chat.html';
    }, 300);
}

function enterCustomMask() {
    const input = document.getElementById('custom-mask-input');
    const maskName = input.value.trim();
    if (maskName) {
        selectMask(maskName);
    } else {
        input.style.borderColor = '#ef4444';
        input.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-5px)' },
            { transform: 'translateX(5px)' },
            { transform: 'translateX(0)' }
        ], { duration: 300 });
    }
}

// --- Logic for Chat Page ---
document.addEventListener('DOMContentLoaded', () => {
    // Ensure session ID exists even if they went straight to chat.html
    if (!localStorage.getItem('chatSessionId')) {
        localStorage.setItem('chatSessionId', Math.random().toString(36).substring(2, 15));
    }

    // Check if we are on the chat page
    if (window.location.pathname.endsWith('chat.html')) {
        const maskTitle = document.getElementById('mask-title');
        const messageInput = document.getElementById('message-input');

        // Load selected mask
        const currentMask = localStorage.getItem('selectedMask') || 'Anonymous';
        if (maskTitle) maskTitle.textContent = currentMask;

        // Initialize Firebase Reference
        if (typeof firebase !== 'undefined') {
            console.log("Firebase SDK loaded.");
            const auth = firebase.auth();
            const db = firebase.database();

            // Sign in anonymously
            auth.signInAnonymously()
                .then(() => {
                    console.log('Signed in anonymously');

                    // Reference to messages
                    const messagesRef = db.ref('messages');

                    // Listen for new messages
                    messagesRef.on('child_added', (snapshot) => {
                        const data = snapshot.val();
                        if (data) {
                            displayMessage(data.text, data.mask, data.timestamp, data.senderId);
                        }
                    }, (error) => {
                        console.error("Error reading messages:", error);
                        // If permission still denied, it's likely the rules
                        if (error.code === 'PERMISSION_DENIED') {
                            alert("Database Permission Denied. Please update your Firebase Rules.");
                        }
                    });

                })
                .catch((error) => {
                    console.error("Error signing in anonymously:", error);
                    alert("Authentication Failed: " + error.message);
                });

            // Optional: Check connection
            const connectedRef = db.ref(".info/connected");
            connectedRef.on("value", (snap) => {
                if (snap.val() === true) {
                    console.log("Connected to Firebase Realtime Database.");
                } else {
                    console.log("Disconnected from Firebase.");
                }
            });

        } else {
            console.error("Firebase SDK NOT loaded. Check script tags in HTML.");
        }

        // Send Message on Enter Key
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }
    }
});

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const text = messageInput.value.trim();
    const currentMask = localStorage.getItem('selectedMask') || 'Anonymous';
    const sessionId = localStorage.getItem('chatSessionId');

    if (text !== "") {
        if (typeof firebase !== 'undefined') {
            try {
                const db = firebase.database();
                const newMessageRef = db.ref('messages').push();

                newMessageRef.set({
                    text: text,
                    mask: currentMask,
                    timestamp: Date.now(),
                    senderId: sessionId
                }).then(() => {
                    console.log("Message sent successfully.");
                }).catch((error) => {
                    console.error("Error sending message:", error);
                    alert("Failed to send message: " + error.message);
                });

            } catch (e) {
                console.error("Firebase method error:", e);
                // Fallback for visual testing
                displayMessage(text, currentMask, Date.now(), sessionId);
            }
        } else {
            console.error("Firebase not loaded");
            // Fallback for visual testing
            displayMessage(text, currentMask, Date.now(), sessionId);
        }
        messageInput.value = '';
    }
}

function displayMessage(text, senderMask, timestamp, senderId) {
    const chatMessages = document.getElementById('chat-messages');
    const mySessionId = localStorage.getItem('chatSessionId');

    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    const isMe = senderId === mySessionId;

    messageDiv.className = `message-bubble ${isMe ? 'sent' : 'received'}`;

    // Format Time (Apple style: just the time, simple)
    const timeString = new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    // Only show name for others
    const senderName = isMe ? '' : `<span style="font-weight:600">${senderMask}</span>`;

    // Construct HTML safely
    let contentHtml = text;
    if (!isMe) {
        contentHtml = `${senderName}<br>${text}`;
    }

    messageDiv.innerHTML = `
        ${contentHtml}
        <div class="message-info">${timeString}</div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto scroll to bottom
}
