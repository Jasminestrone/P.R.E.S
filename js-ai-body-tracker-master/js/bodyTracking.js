// Array to store gaze data
let gazePoints = [];

function update3DHeatmap() {
    const heatmap = document.getElementById('heatmap');

    // Extract X, Y, and Z coordinates from gazePoints
    const x = gazePoints.map(point => point.x);
    const y = gazePoints.map(point => point.y);
    const z = gazePoints.map(point => point.z);

    // Generate the 3D scatter plot
    const data = [{
        x: x,
        y: y,
        z: z,
        mode: 'markers',
        marker: {
            size: 5,
            color: z,
            colorscale: 'Viridis',
            opacity: 0.8
        },
        type: 'scatter3d'
    }];

    const layout = {
        scene: {
            xaxis: { title: 'X' },
            yaxis: { title: 'Y' },
            zaxis: { title: 'Z' }
        },
        margin: { l: 0, r: 0, b: 0, t: 0 }
    };

    Plotly.newPlot(heatmap, data, layout);
}

async function initializeBlazePose() {
    const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
    });

    pose.onResults(onPoseResults);

    const video = await setupCamera();
    video.play();

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    async function processVideo() {
        await pose.send({ image: video });
        requestAnimationFrame(processVideo);
    }

    processVideo();
}

async function setupCamera() {
    const video = document.createElement('video');
    video.width = 640;
    video.height = 480;
    video.style.display = 'none';
    document.body.appendChild(video);

    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
    });

    video.srcObject = stream;
    await new Promise((resolve) => (video.onloadedmetadata = resolve));
    return video;
}

function onPoseResults(results) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
        const landmarks = results.poseLandmarks;

        // Extract landmarks
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftEar = landmarks[7];
        const rightEar = landmarks[8];

        // Check visibility
        if (
            leftShoulder.visibility < 0.5 ||
            rightShoulder.visibility < 0.5 ||
            leftHip.visibility < 0.5 ||
            rightHip.visibility < 0.5 ||
            leftEar.visibility < 0.5 ||
            rightEar.visibility < 0.5
        ) {
            ctx.font = '16px Arial';
            ctx.fillStyle = 'red';
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

        /*** Upper Back Vector ***/
        const backVector = {
            x: midShoulder.x - midHip.x,
            y: midShoulder.y - midHip.y,
            z: midShoulder.z - midHip.z,
        };

        /*** Neck Vector ***/
        const neckVector = {
            x: midEar.x - midShoulder.x,
            y: midEar.y - midShoulder.y,
            z: midEar.z - midShoulder.z,
        };

        /*** Vertical Vector ***/
        const verticalVector = { x: 0, y: -1, z: 0 };

        /*** Angle between Upper Back Vector and Vertical ***/
        const backAngleRadians = Math.acos(
            (backVector.x * verticalVector.x +
                backVector.y * verticalVector.y +
                backVector.z * verticalVector.z) /
                (Math.sqrt(backVector.x ** 2 + backVector.y ** 2 + backVector.z ** 2) * 1)
        );
        const backAngleDegrees = (backAngleRadians * 180) / Math.PI;

        /*** Angle between Neck Vector and Vertical ***/
        const neckAngleRadians = Math.acos(
            (neckVector.x * verticalVector.x +
                neckVector.y * verticalVector.y +
                neckVector.z * verticalVector.z) /
                (Math.sqrt(neckVector.x ** 2 + neckVector.y ** 2 + neckVector.z ** 2) * 1)
        );
        const neckAngleDegrees = (neckAngleRadians * 180) / Math.PI;

        /*** Posture Assessment ***/
        const backAngleThreshold = 10; // Adjust based on testing
        const neckAngleThreshold = 15; // Adjust based on testing

        const isBackStraight = backAngleDegrees < backAngleThreshold;
        const isNeckStraight = neckAngleDegrees < neckAngleThreshold;

        const postureStatus = isBackStraight && isNeckStraight ? 'Good Posture' : 'Bad Posture';

        // Display posture status
        ctx.font = '16px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText(`Posture: ${postureStatus}`, 10, 30);

        // Log angles for debugging
        console.log('Back Angle:', backAngleDegrees.toFixed(2));
        console.log('Neck Angle:', neckAngleDegrees.toFixed(2));
        console.log('Posture Status:', postureStatus);

        /*** Visualization ***/
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        function toPixelCoords(point) {
            return {
                x: point.x * canvasWidth,
                y: point.y * canvasHeight,
            };
        }

        // Draw back vector
        const pixelMidHip = toPixelCoords(midHip);
        const pixelMidShoulder = toPixelCoords(midShoulder);

        ctx.beginPath();
        ctx.moveTo(pixelMidHip.x, pixelMidHip.y);
        ctx.lineTo(pixelMidShoulder.x, pixelMidShoulder.y);
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw neck vector
        const pixelMidEar = toPixelCoords(midEar);

        ctx.beginPath();
        ctx.moveTo(pixelMidShoulder.x, pixelMidShoulder.y);
        ctx.lineTo(pixelMidEar.x, pixelMidEar.y);
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw vertical lines for reference
        ctx.beginPath();
        ctx.moveTo(pixelMidHip.x, pixelMidHip.y);
        ctx.lineTo(pixelMidHip.x, 0);
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pixelMidShoulder.x, pixelMidShoulder.y);
        ctx.lineTo(pixelMidShoulder.x, 0);
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Extract key landmarks for eye
        const leftEye = landmarks[2];
        const rightEye = landmarks[5];
        const nose = landmarks[0];

        // Calculate vectors for head orientation
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

        // Estimate gaze direction
        const gazeX = (leftEye.x + rightEye.x) / 2;
        const gazeY = (leftEye.y + rightEye.y) / 2;
        const gazeZ = (leftEye.z + rightEye.z) / 2;

        // Add the gaze point to the array
        gazePoints.push({ x: gazeX, y: gazeY, z: gazeZ });

        // Update the heatmap every 30 frames
        if (gazePoints.length % 30 === 0) {
            update3DHeatmap();
        }

        // Calculate Yaw (rotation around vertical axis)
        const yaw = Math.atan2(eyeVector.z, eyeVector.x) * (180 / Math.PI);

        // Calculate Pitch (rotation around horizontal axis)
        const pitch = Math.atan2(noseVector.z, noseVector.y) * (180 / Math.PI);

        // Calculate Roll (tilt)
        const roll = Math.atan2(eyeVector.y, eyeVector.x) * (180 / Math.PI);

        // Normalize angles to 0–360 degrees
        const normalizeAngle = (angle) => (angle < 0 ? angle + 360 : angle);
        const yaw360 = normalizeAngle(yaw);
        const pitch360 = normalizeAngle(pitch);
        const roll360 = normalizeAngle(roll);

        // Log angles
        console.log(`Yaw: ${yaw360.toFixed(2)}°`);
        console.log(`Pitch: ${pitch360.toFixed(2)}°`);
        console.log(`Roll: ${roll360.toFixed(2)}°`);

        // Display coords and angles on the webpage
        document.getElementById('leftEyeCoords').textContent = `x: ${leftEye.x.toFixed(2)}, y: ${leftEye.y.toFixed(2)}, z: ${leftEye.z.toFixed(2)}`;
        document.getElementById('rightEyeCoords').textContent = `x: ${rightEye.x.toFixed(2)}, y: ${rightEye.y.toFixed(2)}, z: ${rightEye.z.toFixed(2)}`;
        document.getElementById('headAngleInfo').textContent = `Yaw: ${yaw360.toFixed(2)}°, Pitch: ${pitch360.toFixed(2)}°, Roll: ${roll360.toFixed(2)}°`;

        // Draw skeleton connections and keypoints
        const keypointConnections = [
            // Face connections
            [0, 1], [1, 2], [2, 3], // Left Eye connections
            [0, 4], [4, 5], [5, 6], // Right Eye connections
            [1, 7], [4, 8],         // Nose to ears
            [9, 10],                // Mouth connections
            // Body connections
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
            [11, 23], [12, 24], [23, 24], // Torso
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
            ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, 2 * Math.PI);

            if (index === 2 || index === 5) {
                ctx.fillStyle = "yellow"; // Eyes
            } else {
                ctx.fillStyle = "red"; // Other keypoints
            }

            ctx.fill();
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initializeBlazePose();
});
