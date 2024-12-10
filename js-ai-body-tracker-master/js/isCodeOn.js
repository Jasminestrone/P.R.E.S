let isRunning = false;

function startCode() {
    if (!isRunning) {
        isRunning = true;
        console.log("Code started");
    }
}

function stopCode() {
    if (isRunning) {
        isRunning = false;
        console.log("Code stopped");
    }
}

document.getElementById("startCode").addEventListener("click", startCode);
document.getElementById("stopCode").addEventListener("click", stopCode);