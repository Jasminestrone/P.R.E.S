let audioContext;
let analyserNode;
let microphoneStream;
let volumeMeterEl = document.getElementById("volumeMeter");
let volumeLevelEl = document.getElementById("volumeLevel");

async function startVolumeDetection() {
    try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        // Create AudioContext and connect stream
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);

        // Create an analyser node
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 2048; 
        analyserNode.smoothingTimeConstant = 0.8;

        source.connect(analyserNode);

        // Begin monitoring volume
        monitorVolume();
    } catch (err) {
        console.error("Error accessing microphone: ", err);
        volumeLevelEl.textContent = "Microphone access denied or error.";
    }
}

function monitorVolume() {
    const bufferLength = analyserNode.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    function checkVolume() {
        analyserNode.getByteTimeDomainData(dataArray);
        
        // Calculate a rough volume measurement (RMS)
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            const val = (dataArray[i] - 128) / 128; // Center around zero
            sum += val * val;
        }
        let rms = Math.sqrt(sum / bufferLength);

        // Display the volume (0.0 - 1.0)
        volumeMeterEl.value = rms;
        volumeLevelEl.textContent = rms.toFixed(2);

        requestAnimationFrame(checkVolume);
    }

    checkVolume();
}

// If you want volume detection to start automatically when you start voice input,
// you can call startVolumeDetection() from within your voiceRecognition.js start handler.
// Otherwise, you can attach it to the Start Voice Input button:
document.getElementById("startButton").addEventListener("click", () => {
    startVolumeDetection();
});
