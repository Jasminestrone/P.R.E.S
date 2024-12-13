// Variables for running volume detection
let audioContext;
let analyserNode;
let microphoneStream;
let volumeMeterEl = document.getElementById("volumeMeter");
let volumeLevelEl = document.getElementById("volumeLevel");
let soundLogs = []; // Stores volume data

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

        // Log the volume data
        soundLogs.push(rms);

        // Display the volume (0.0 - 1.0)
        volumeMeterEl.value = rms;
        volumeLevelEl.textContent = rms.toFixed(2);

        requestAnimationFrame(checkVolume);
    }

    checkVolume();
}

function calculateVolumeMetrics() {
    const totalEntries = soundLogs.length;
    if (totalEntries === 0) {
        return {
            averageVolume: 0,
            maxVolume: 0,
            minVolume: 0,
        };
    }

    const totalVolume = soundLogs.reduce((sum, volume) => sum + volume, 0);
    const maxVolume = Math.max(...soundLogs);
    const minVolume = Math.min(...soundLogs);

    return {
        averageVolume: (totalVolume / totalEntries).toFixed(2),
        maxVolume: maxVolume.toFixed(2),
        minVolume: minVolume.toFixed(2),
    };
}

function stopTrackingVolume() {
    isRunning = false; // Ensure tracking stops

    const postureMetrics = calculateMetrics();
    const volumeMetrics = calculateVolumeMetrics();

    if (postureMetrics.totalTime > 0) {
        const volCanvas = document.getElementById("volumeAnalysisContent");
        if (volCanvas) {
            volCanvas.innerHTML = `
                <p><strong>Average Volume:</strong> ${volumeMetrics.averageVolume}</p>
                <p><strong>Max Volume:</strong> ${volumeMetrics.maxVolume}</p>
                <p><strong>Min Volume:</strong> ${volumeMetrics.minVolume}</p>
            `;
        }

        // Reset logs
        soundLogs = [];
    }
}

// Wait for button input
document.getElementById("volStartButton").addEventListener("click", () => {
    startVolumeDetection();
});
