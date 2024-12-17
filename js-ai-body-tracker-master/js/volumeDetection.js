// Variables for running volume detection
let audioContext;
let analyserNode;
let microphoneStream;
let volumeMeterEl = document.getElementById("volumeMeter");
let volumeLevelEl = document.getElementById("volumeLevel");
let soundLogs = []; // Stores volume data
let secondLogs = [];

async function startVolumeDetection() {
  if (!isRunning) return;
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

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

    // Log the time
    const now = new Date();
    const seconds = now.getSeconds();
    secondLogs.push(seconds);

    // Display the volume (0.0 - 1.0)
    volumeMeterEl.value = rms;
    volumeLevelEl.textContent = rms.toFixed(2);
    
    setTimeout(checkVolume, 1000); // Has it check every 1 second

    console.log(soundLogs);
    console.log(secondLogs);
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
    minVolume: minVolume.toFixed(2), // Min volume always outputs to 0 so ignore it
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
            `;
    }

    console.log('graphgoing');

    graph();

    // Reset logs
    soundLogs = [];
    secondLogs = [];
  }

}

function graph() {
  // Clear any previous chart content in the div
  const volAnalysisDiv = document.getElementById("volumeAnalysisContent");
  volAnalysisDiv.innerHTML = ""; // Clear the content

  // Dynamically create a canvas element
  const canvas = document.createElement("canvas");
  canvas.id = "volumeChart";
  canvas.width = 400; // Optional: Set width
  canvas.height = 200; // Optional: Set height

  // Append the canvas to the div
  volAnalysisDiv.appendChild(canvas);

  // Map soundLogs and secondLogs into coordinate pairs
  const coords = soundLogs.map((v, i) => ({ x: secondLogs[i], y: v }));

  // Render the Chart
  const ctx = canvas.getContext("2d");
  new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Volume over Time",
          data: coords,
          backgroundColor: "rgba(75, 192, 192, 0.6)", // Optional styling
          borderColor: "rgba(75, 192, 192, 1)",
          pointRadius: 5
        }
      ]
    },
    options: {
      scales: {
        x: {
          title: { display: true, text: "Time (Seconds)" },
          type: "linear"
        },
        y: {
          title: { display: true, text: "Volume (RMS)" },
          beginAtZero: true
        }
      }
    }
  });
}
  
// Wait for button input
document.getElementById("volStartButton").addEventListener("click", () => {
  startVolumeDetection();
});
