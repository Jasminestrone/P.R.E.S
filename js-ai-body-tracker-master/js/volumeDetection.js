let audioContext;
let analyserNode;
let microphoneStream;
let volumeMeterEl = document.getElementById("volumeMeter");
let volumeLevelEl = document.getElementById("volumeLevel");

async function startVolumeDetection() {
    if (!isRunning) return;
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
        if (!isRunning) return;
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

// Wait for button input
document.getElementById("volStartButton").addEventListener("click", () => {
    startVolumeDetection();
});
