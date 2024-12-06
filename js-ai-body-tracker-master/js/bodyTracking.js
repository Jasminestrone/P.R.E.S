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

        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftEar = landmarks[7];
        const rightEar = landmarks[8];

        // **NEW**: Incorporate knees
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

        // **NEW**: Mid-knee point for lower spine reference
        const midKnee = {
            x: (leftKnee.x + rightKnee.x) / 2,
            y: (leftKnee.y + rightKnee.y) / 2,
            z: (leftKnee.z + rightKnee.z) / 2,
        };

        /*** Vectors for spine curvature ***/
        const upperSpineVec = {
            x: midShoulder.x - midHip.x,
            y: midShoulder.y - midHip.y,
            z: midShoulder.z - midHip.z
        };

        const lowerSpineVec = {
            x: midHip.x - midKnee.x,
            y: midHip.y - midKnee.y,
            z: midHip.z - midKnee.z
        };

        // Calculate angle between upperSpineVec and lowerSpineVec
        const dot = upperSpineVec.x * lowerSpineVec.x + upperSpineVec.y * lowerSpineVec.y + upperSpineVec.z * lowerSpineVec.z;
        const magU = Math.sqrt(upperSpineVec.x**2 + upperSpineVec.y**2 + upperSpineVec.z**2);
        const magL = Math.sqrt(lowerSpineVec.x**2 + lowerSpineVec.y**2 + lowerSpineVec.z**2);

        let spineAngleDegrees = 0;
        if (magU > 0 && magL > 0) {
            const spineAngleRadians = Math.acos(dot / (magU * magL));
            spineAngleDegrees = spineAngleRadians * (180 / Math.PI);
        }

        // Orientation check
        const shoulderXDiff = Math.abs(leftShoulder.x - rightShoulder.x);
        const shoulderZDiff = Math.abs(leftShoulder.z - rightShoulder.z);
        const isFacingFront = shoulderXDiff > shoulderZDiff;

        // Existing posture detection (front vs side)
        // We'll integrate spine angle checks for slouching
        let postureStatus;

        if (!isFacingFront) {
            // Side-facing
            // Keep your previous angle calculations for side posture:
            const verticalVector = { x: 0, y: -1, z: 0 };

            // Back angle relative to vertical
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

            function angleWithVertical(vec) {
                const dotV = vec.x * verticalVector.x + vec.y * verticalVector.y + vec.z * verticalVector.z;
                const magVec = Math.sqrt(vec.x**2 + vec.y**2 + vec.z**2);
                return magVec > 0 ? Math.acos(dotV / magVec) * (180 / Math.PI) : 0;
            }

            const backAngleDegrees = angleWithVertical(backVector);
            const neckAngleDegrees = angleWithVertical(neckVector);

            const backAngleThreshold = 20; 
            const neckAngleThreshold = 25;

            // **NEW**: Integrate spine angle to detect slouch
            // If spine curvature angle (spineAngleDegrees) is large, it suggests slouching
            const spineSlouchThreshold = 15; // Adjust as needed
            const isNotSlouching = spineAngleDegrees < spineSlouchThreshold;

            const isBackStraight = backAngleDegrees < backAngleThreshold;
            const isNeckStraight = neckAngleDegrees < neckAngleThreshold;

            // All conditions must be met for good posture:
            // upright back, straight neck, and low spine curvature angle
            postureStatus = (isBackStraight && isNeckStraight && isNotSlouching) ? 'Good Posture' : 'Bad Posture';

        } else {
            // Front-facing
            const earShoulderHorizDiff = Math.abs(midEar.x - midShoulder.x);
            const earForwardThreshold = 0.02;
            
            // **NEW**: Consider slouching as increased spine curvature here as well
            // If the person is facing front and slouching, the spineAngleDegrees should catch that
            const spineSlouchThreshold = 15; // Adjust based on how sensitive you want it
            const isNotSlouching = spineAngleDegrees < spineSlouchThreshold;
            const isHeadNotForward = earShoulderHorizDiff < earForwardThreshold;

            postureStatus = (isHeadNotForward && isNotSlouching) ? 'Good Posture' : 'Bad Posture';
        }

        // Display posture status
        ctx.font = '16px Arial';
        ctx.fillStyle = 'red';
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

        // Draw lines for reference
        ctx.beginPath();
        ctx.moveTo(pixelMidHip.x, pixelMidHip.y);
        ctx.lineTo(pixelMidShoulder.x, pixelMidShoulder.y);
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pixelMidShoulder.x, pixelMidShoulder.y);
        ctx.lineTo(pixelMidEar.x, pixelMidEar.y);
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw lower spine line (hip to knee)
        ctx.beginPath();
        ctx.moveTo(pixelMidHip.x, pixelMidHip.y);
        ctx.lineTo(pixelMidKnee.x, pixelMidKnee.y);
        ctx.strokeStyle = 'purple';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Vertical reference lines
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

        document.getElementById('leftEyeCoords').textContent = `x: ${leftEye.x.toFixed(2)}, y: ${leftEye.y.toFixed(2)}, z: ${leftEye.z.toFixed(2)}`;
        document.getElementById('rightEyeCoords').textContent = `x: ${rightEye.x.toFixed(2)}, y: ${rightEye.y.toFixed(2)}, z: ${rightEye.z.toFixed(2)}`;
        document.getElementById('headAngleInfo').textContent = `Yaw: ${yaw360.toFixed(2)}°, Pitch: ${pitch360.toFixed(2)}°, Roll: ${roll360.toFixed(2)}°`;

        // Skeleton drawing
        const keypointConnections = [
            // Face connections
            [0, 1], [1, 2], [2, 3],
            [0, 4], [4, 5], [5, 6],
            [1, 7], [4, 8],
            [9, 10],
            // Body connections
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
            [11, 23], [12, 24], [23, 24]
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
