// Array to store gaze data
let gazePoints = [];

// Variables to store posture data and observation start time
let postureLogs = [];
let isTracking = false;
let observationStartTime = null;
let lastLogTime = 0;

let lastTime = performance.now(); // Track the last time `onPoseResults` was called
let elapsedTime = 0; // Accumulate elapsed time

// Variables for video recording
let mediaRecorder;
let recordedChunks = [];

// Arrays and variables for smoothing and hysteresis
let spineAngleHistory = [];
const SMOOTHING_WINDOW = 10;

function getSmoothedAngle(newAngle) {
  spineAngleHistory.push(newAngle);
  if (spineAngleHistory.length > SMOOTHING_WINDOW) {
    spineAngleHistory.shift();
  }
  const sum = spineAngleHistory.reduce((a, b) => a + b, 0);
  return sum / spineAngleHistory.length;
}

// Variables for consecutive frame confirmation
let badFrames = 0;
let goodFrames = 0;
let displayedPosture = "Good Posture";

function updatePostureStatus(currentAssessment) {
  if (currentAssessment === "Bad Posture") {
    badFrames++;
    goodFrames = 0;
    if (badFrames >= 3) {
      // Requires 3 consecutive "Bad" frames to switch
      displayedPosture = "Bad Posture";
    }
  } else {
    goodFrames++;
    badFrames = 0;
    if (goodFrames >= 3) {
      // Requires 3 consecutive "Good" frames to switch
      displayedPosture = "Good Posture";
    }
  }
  return displayedPosture;
}

function update3DHeatmap() {
  const heatmap = document.getElementById("heatmap");

  // Extract X, Y, and Z coordinates from gazePoints
  const x = gazePoints.map((point) => point.x);
  const y = gazePoints.map((point) => point.y);
  const z = gazePoints.map((point) => point.z);

  // Generate the 3D scatter plot
  const data = [
    {
      x: x,
      y: y,
      z: z,
      mode: "markers",
      marker: {
        size: 5,
        color: z,
        colorscale: "Viridis",
        opacity: 0.8,
      },
      type: "scatter3d",
    },
  ];

  const layout = {
    scene: {
      xaxis: { title: "X" },
      yaxis: { title: "Y" },
      zaxis: { title: "Z" },
    },
    margin: { l: 0, r: 0, b: 0, t: 0 },
  };

  Plotly.newPlot(heatmap, data, layout);
}

async function initializeBlazePose() {
  const pose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  pose.onResults(onPoseResults);

  const { video, stream } = await setupCamera();
  video.play();

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  startRecording(stream);

  async function processVideo() {
    await pose.send({ image: video });
    requestAnimationFrame(processVideo);
  }

  processVideo();
}

async function setupCamera() {
  const video = document.createElement("video");
  video.width = 640;
  video.height = 480;
  video.style.display = "none";
  document.body.appendChild(video);

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
    audio: false, // Set to true if we want the recording to have sound
  });

  video.srcObject = stream;
  await new Promise((resolve) => (video.onloadedmetadata = resolve));
  return { video, stream }; // Return both the video and the stream
}

function startRecording(stream) {
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.start();
}

function stopRecording() {
  return new Promise((resolve, reject) => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.onstop = () => {
        try {
          const blob = new Blob(recordedChunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          console.log("Url Created: " + url);
          resolve(url); // Resolve the Promise with the URL
        } catch (error) {
          reject(error); // Reject the Promise if an error occurs
        }
      };
    } else {
      reject(new Error("No mediaRecorder available"));
    }
  });
}

function onPoseResults(results) {
  if (!isRunning || !results.poseLandmarks) return;

  const currentTime = performance.now(); // Get the current time
  const deltaTime = currentTime - lastTime; // Calculate time since the last frame
  lastTime = currentTime; // Update the lastTime for the next frame

  elapsedTime += deltaTime; // Accumulate elapsed time

  // Log posture data only once per second (1000 ms)
  if (elapsedTime >= 1000) {
    elapsedTime = 0; // Reset elapsed time
    postureLogs.push({
      timestamp: new Date().toISOString(),
      posture: displayedPosture, // Use the current posture
      
    });
    
    // Update metrics and pie chart
    updateMetricsAndChart();
  }

  // Existing posture detection logic
  const placeholder = document.querySelector(".camera-placeholder");
  if (!isRunning) {
    if (placeholder) placeholder.style.display = "flex";
    return;
  }
  if (placeholder) placeholder.style.display = "none";

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  if (results.poseLandmarks) {
    const landmarks = results.poseLandmarks;

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];

    // Check visibility
    if (
      leftShoulder.visibility < 0.5 ||
      rightShoulder.visibility < 0.5 ||
      leftHip.visibility < 0.5 ||
      rightHip.visibility < 0.5 ||
      leftEar.visibility < 0.5 ||
      rightEar.visibility < 0.5 ||
      leftKnee.visibility < 0.5 ||
      rightKnee.visibility < 0.5
    ) {
      ctx.font = "16px Arial";
      ctx.fillStyle = "red";
      ctx.fillText(`Pose not fully detected`, 10, 30);
      return;
    }

    // Calculate midpoints
    const midShoulder = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2,
    };

    const midHip = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2,
    };

    const midEar = {
      x: (leftEar.x + rightEar.x) / 2,
      y: (leftEar.y + rightEar.y) / 2,
      z: (leftEar.z + rightEar.z) / 2,
    };

    const midKnee = {
      x: (leftKnee.x + rightKnee.x) / 2,
      y: (leftKnee.y + rightKnee.y) / 2,
      z: (leftKnee.z + rightKnee.z) / 2,
    };

    // Compute spine curvature angle
    const upperSpineVec = {
      x: midShoulder.x - midHip.x,
      y: midShoulder.y - midHip.y,
      z: midShoulder.z - midHip.z,
    };

    const lowerSpineVec = {
      x: midHip.x - midKnee.x,
      y: midHip.y - midKnee.y,
      z: midHip.z - midKnee.z,
    };

    const dot =
      upperSpineVec.x * lowerSpineVec.x +
      upperSpineVec.y * lowerSpineVec.y +
      upperSpineVec.z * lowerSpineVec.z;
    const magU = Math.sqrt(
      upperSpineVec.x ** 2 + upperSpineVec.y ** 2 + upperSpineVec.z ** 2
    );
    const magL = Math.sqrt(
      lowerSpineVec.x ** 2 + lowerSpineVec.y ** 2 + lowerSpineVec.z ** 2
    );

    let spineAngleDegrees = 0;
    if (magU > 0 && magL > 0) {
      const spineAngleRadians = Math.acos(dot / (magU * magL));
      spineAngleDegrees = spineAngleRadians * (180 / Math.PI);
    }

    // Smooth the spine angle over multiple frames
    const smoothedSpineAngle = getSmoothedAngle(spineAngleDegrees);

    // Orientation check
    const shoulderXDiff = Math.abs(leftShoulder.x - rightShoulder.x);
    const shoulderZDiff = Math.abs(leftShoulder.z - rightShoulder.z);
    const isFacingFront = shoulderXDiff > shoulderZDiff;

    let postureStatus;

    if (!isFacingFront) {
      // Side-facing
      const verticalVector = { x: 0, y: -1, z: 0 };

      function angleWithVertical(vec) {
        const dotV =
          vec.x * verticalVector.x +
          vec.y * verticalVector.y +
          vec.z * verticalVector.z;
        const magVec = Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
        return magVec > 0 ? Math.acos(dotV / magVec) * (180 / Math.PI) : 0;
      }

      const backVector = {
        x: midShoulder.x - midHip.x,
        y: midShoulder.y - midHip.y,
        z: midShoulder.z - midHip.z,
      };

      const neckVector = {
        x: midEar.x - midShoulder.x,
        y: midEar.y - midShoulder.y,
        z: midEar.z - midShoulder.z,
      };

      const backAngleDegrees = angleWithVertical(backVector);
      const neckAngleDegrees = angleWithVertical(neckVector);

      const backAngleThreshold = 20;
      const neckAngleThreshold = 25;
      const spineSlouchThreshold = 15; // Adjust as needed

      const isNotSlouching = smoothedSpineAngle < spineSlouchThreshold;
      const isBackStraight = backAngleDegrees < backAngleThreshold;
      const isNeckStraight = neckAngleDegrees < neckAngleThreshold;

      // Determine posture before consecutive frame check
      const currentAssessment =
        isBackStraight && isNeckStraight && isNotSlouching
          ? "Good Posture"
          : "Bad Posture";

      postureStatus = updatePostureStatus(currentAssessment);
    } else {
      // Front-facing
      const earShoulderHorizDiff = Math.abs(midEar.x - midShoulder.x);
      const earForwardThreshold = 0.02;
      const spineSlouchThreshold = 15;

      const isNotSlouching = smoothedSpineAngle < spineSlouchThreshold;
      const isHeadNotForward = earShoulderHorizDiff < earForwardThreshold;

      const currentAssessment =
        isHeadNotForward && isNotSlouching ? "Good Posture" : "Bad Posture";

      postureStatus = updatePostureStatus(currentAssessment);
    }

    // Display posture status
    ctx.font = "16px Arial";
    ctx.fillStyle = "red";
    ctx.fillText(`Posture: ${postureStatus}`, 10, 30);

    // Visualization
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    function toPixelCoords(point) {
      return {
        x: point.x * canvasWidth,
        y: point.y * canvasHeight,
      };
    }

    const pixelMidHip = toPixelCoords(midHip);
    const pixelMidShoulder = toPixelCoords(midShoulder);
    const pixelMidEar = toPixelCoords(midEar);
    const pixelMidKnee = toPixelCoords(midKnee);

    // Draw lines for spine
    ctx.beginPath();
    ctx.moveTo(pixelMidHip.x, pixelMidHip.y);
    ctx.lineTo(pixelMidShoulder.x, pixelMidShoulder.y);
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pixelMidShoulder.x, pixelMidShoulder.y);
    ctx.lineTo(pixelMidEar.x, pixelMidEar.y);
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw lower spine line (hip to knee)
    ctx.beginPath();
    ctx.moveTo(pixelMidHip.x, pixelMidHip.y);
    ctx.lineTo(pixelMidKnee.x, pixelMidKnee.y);
    ctx.strokeStyle = "purple";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Vertical reference lines
    ctx.beginPath();
    ctx.moveTo(pixelMidHip.x, pixelMidHip.y);
    ctx.lineTo(pixelMidHip.x, 0);
    ctx.strokeStyle = "green";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pixelMidShoulder.x, pixelMidShoulder.y);
    ctx.lineTo(pixelMidShoulder.x, 0);
    ctx.strokeStyle = "green";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Extract eye and nose landmarks
    const leftEye = landmarks[2];
    const rightEye = landmarks[5];
    const nose = landmarks[0];

    const eyeVector = {
      x: rightEye.x - leftEye.x,
      y: rightEye.y - leftEye.y,
      z: rightEye.z - leftEye.z,
    };

    const noseVector = {
      x: nose.x - (leftEye.x + rightEye.x) / 2,
      y: nose.y - (leftEye.y + rightEye.y) / 2,
      z: nose.z - (leftEye.z + rightEye.z) / 2,
    };

    // Gaze calculation
    const gazeX = (leftEye.x + rightEye.x) / 2;
    const gazeY = (leftEye.y + rightEye.y) / 2;
    const gazeZ = (leftEye.z + rightEye.z) / 2;
    gazePoints.push({ x: gazeX, y: gazeY, z: gazeZ });

    if (gazePoints.length % 30 === 0) {
      update3DHeatmap();
    }

    // Head orientation angles
    const yaw = Math.atan2(eyeVector.z, eyeVector.x) * (180 / Math.PI);
    const pitch = Math.atan2(noseVector.z, noseVector.y) * (180 / Math.PI);
    const roll = Math.atan2(eyeVector.y, eyeVector.x) * (180 / Math.PI);

    const normalizeAngle = (angle) => (angle < 0 ? angle + 360 : angle);
    const yaw360 = normalizeAngle(yaw);
    const pitch360 = normalizeAngle(pitch);
    const roll360 = normalizeAngle(roll);

    document.getElementById(
      "leftEyeCoords"
    ).textContent = `x: ${leftEye.x.toFixed(2)}, y: ${leftEye.y.toFixed(
      2
    )}, z: ${leftEye.z.toFixed(2)}`;
    document.getElementById(
      "rightEyeCoords"
    ).textContent = `x: ${rightEye.x.toFixed(2)}, y: ${rightEye.y.toFixed(
      2
    )}, z: ${rightEye.z.toFixed(2)}`;
    document.getElementById(
      "headAngleInfo"
    ).textContent = `Yaw: ${yaw360.toFixed(2)}°, Pitch: ${pitch360.toFixed(
      2
    )}°, Roll: ${roll360.toFixed(2)}°`;

    // Skeleton drawing
    const keypointConnections = [
      // Face connections
      [0, 1],
      [1, 2],
      [2, 3],
      [0, 4],
      [4, 5],
      [5, 6],
      [1, 7],
      [4, 8],
      [9, 10],
      // Body connections
      [11, 12],
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],
      [11, 23],
      [12, 24],
      [23, 24],
    ];

    keypointConnections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      if (start.visibility > 0.5 && end.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    landmarks.forEach((landmark, index) => {
      ctx.beginPath();
      ctx.arc(
        landmark.x * canvas.width,
        landmark.y * canvas.height,
        5,
        0,
        2 * Math.PI
      );

      if (index === 2 || index === 5) {
        ctx.fillStyle = "yellow"; // Eyes
      } else {
        ctx.fillStyle = "red"; // Other keypoints
      }
      ctx.fill();
    });
  }
}

function calculateMetrics() {
  const totalEntries = postureLogs.length;
  const goodPostureCount = postureLogs.filter(
    (entry) => entry.posture === "Good Posture"
  ).length;
  const badPostureCount = postureLogs.filter(
    (entry) => entry.posture === "Bad Posture"
  ).length;

  // Prevent division by zero
  const goodPosturePercentage =
    totalEntries === 0 ? 0 : goodPostureCount / totalEntries;
  const badPosturePercentage =
    totalEntries === 0 ? 0 : badPostureCount / totalEntries;

  return {
    goodPosturePercentage: ((goodPostureCount / totalEntries) * 100).toFixed(2),
    badPosturePercentage: ((badPostureCount / totalEntries) * 100).toFixed(2),
    totalTime: totalEntries, // Assuming 1 entry per second
  };
}

function stopTrackingBody() {
  isRunning = false; // Ensure tracking stops
  const metrics = calculateMetrics(); // Calculate metrics from postureLogs

  if (metrics.totalTime > 0) {
    isRunning = false; // Ensure tracking stops

    // Get the analysis canvas and update its content
    const analysisCanvas = document.getElementById("bodyAnalysisContent");
    if (analysisCanvas) {
      analysisCanvas.innerHTML = `
            <p><strong>Total Time:</strong> ${metrics.totalTime} seconds</p>
            `;
    }

    metrics.totalTime = 0;
  }
}

function updateMetricsAndChart() {
  const metricsData = calculateMetrics();

  // Assign metrics as numbers
  window.metrics = {
    goodPosturePercentage: parseFloat(metricsData.goodPosturePercentage),
    badPosturePercentage: parseFloat(metricsData.badPosturePercentage),
    totalTime: metricsData.totalTime,
  };

  // Update the pie chart
  updatePieChart();
}

// Define the updatePieChart function
function updatePieChart() {
  // Check if 'metrics' object exists
  if (typeof window.metrics === "undefined") {
    console.error(
      "Metrics object not found. Ensure updateMetricsAndChart is called correctly."
    );
    return;
  }

  // Extract and sanitize percentages
  let goodPercentage = window.metrics.goodPosturePercentage; // 0 to 100
  let badPercentage = window.metrics.badPosturePercentage; // 0 to 100

  // Handle non-numeric or undefined values
  goodPercentage = isNaN(goodPercentage) ? 0 : goodPercentage;
  badPercentage = isNaN(badPercentage) ? 0 : badPercentage;

  // Clamp percentages between 0 and 100
  goodPercentage = Math.min(Math.max(goodPercentage, 0), 100);
  badPercentage = Math.min(Math.max(badPercentage, 0), 100);

  // Calculate remaining percentage for neutral
  let remainingPercentage = 100 - (goodPercentage + badPercentage);

  // If remainingPercentage is negative, scale down good and bad percentages proportionally
  if (remainingPercentage < 0) {
    const total = goodPercentage + badPercentage;
    goodPercentage = (goodPercentage / total) * 100;
    badPercentage = (badPercentage / total) * 100;
    remainingPercentage = 0;
  }

  // Convert percentages to degrees
  const goodDegrees = (goodPercentage / 100) * 360;
  const badDegrees = (badPercentage / 100) * 360;
  const neutralDegrees = (remainingPercentage / 100) * 360;

  // Update the conic-gradient background
  const pieChart = document.getElementById("piechart");
  if (!pieChart) {
    return;
  }
  pieChart.style.backgroundImage = `conic-gradient(
            lightblue 0deg ${goodDegrees}deg,
            pink ${goodDegrees}deg ${goodDegrees + badDegrees}deg,
            orange ${goodDegrees + badDegrees}deg 360deg
        )`;

  // Update the label with percentages
  const label = document.getElementById("piechart-label");
  if (!label) {
    console.error(
      "Pie chart label element with ID 'piechart-label' not found in the DOM."
    );
    return;
  }
  const displayGood = Math.round(goodPercentage);
  const displayBad = Math.round(badPercentage);
  const displayNeutral = Math.round(neutralDegrees);
  label.innerHTML = `Good: ${displayGood}%<br>Bad: ${displayBad}%<br>Neutral: ${displayNeutral}%`;

}

/**
 * Function to initialize the pie chart update.
 * This function assumes that bodyTracking.js will update metrics and calls updatePieChart accordingly.
 */
function initializePieChart() {
  // Initial update
  updatePieChart();

  // Polling every second to check for updates (optional)
  // If 'updateMetricsAndChart' is called whenever metrics change, polling may not be necessary
  setInterval(() => {
    updatePieChart();
  }, 1000);
}

// Initialize the pie chart once the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initializePieChart);

document.addEventListener("DOMContentLoaded", () => {
  initializeBlazePose();
});
