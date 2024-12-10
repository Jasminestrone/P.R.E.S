let isRunning = false;
let observationComplete = false;

function startCode() {
    if (!observationComplete) {
        if (!isRunning) {
            isRunning = true;
            console.log("Code started");
        }
    }
}

function stopCode() {
    if (!observationComplete) {
        if (isRunning) {
            isRunning = false;
            observationComplete = true;
            console.log("Code stopped");
        }
    }
}

document.getElementById("startCode").addEventListener("click", startCode);
document.getElementById("stopCode").addEventListener("click", stopCode);