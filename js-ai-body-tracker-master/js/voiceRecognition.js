// Grab elements from html
const startButton = document.getElementById('vocStartButton');
const outputDiv = document.getElementById('voiceOutput');

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US'; // Sets language to better English

recognition.onstart = () => {
    startButton.textContent = 'Listening...';
};

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    outputDiv.textContent = `You said: ${transcript}`;
};

recognition.onend = () => {
    startButton.textContent = 'Start Voice Input';
};

startButton.addEventListener('click', () => {
    if (!isRunning) return;
    recognition.start();
});