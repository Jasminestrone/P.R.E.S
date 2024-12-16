let mediaRecorder;
let recordedChunks = [];

document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("codeRunner");
  const downloadButton = document.getElementById("downloadVideo");
  const canvas = document.getElementById("canvas");

  startButton.addEventListener("click", async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      // Stop recording
      mediaRecorder.stop();
      startButton.textContent = "Start Presentation";
      startButton.classList.remove("btn-danger");
      startButton.classList.add("btn-success");
    } else {
      try {
        recordedChunks = []; // Clear previous recording
        
        // Create a MediaStream from the canvas instead of getUserMedia
        const stream = canvas.captureStream(30); // 30 FPS

        // Get audio stream
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        // Combine canvas and audio streams
        const combinedStream = new MediaStream([
          ...stream.getVideoTracks(),
          ...audioStream.getAudioTracks()
        ]);

        // Specify MP4 container and codecs
        const options = {
          mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2' // Changed to MP4
        };

        mediaRecorder = new MediaRecorder(combinedStream, options);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.push(event.data);
            console.log("Chunk added, total chunks:", recordedChunks.length);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunks, { 
            type: 'video/mp4' // Changed to MP4
          });
          const video = document.getElementById("recordedVideo");
          video.src = URL.createObjectURL(blob);
        };

        // Request data every second instead of waiting until stop
        mediaRecorder.start(1000);
        startButton.textContent = "Stop Recording";
        startButton.classList.remove("btn-success");
        startButton.classList.add("btn-danger");
      } catch (err) {
        console.error("Error starting recording:", err);
      }
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!recordedChunks || recordedChunks.length === 0) {
      alert("No recording available to download");
      return;
    }

    try {
      const blob = new Blob(recordedChunks, { 
        type: 'video/mp4' // Changed to MP4
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      a.href = url;
      a.download = `PRES-Recording-${today}.mp4`; // Updated filename
      
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading recording:", err);
      alert("Error downloading recording. Please try again.");
    }
  });
});