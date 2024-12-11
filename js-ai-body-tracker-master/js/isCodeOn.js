let isRunning = false;
let observationComplete = false;
const codeRunner = document.getElementById("codeRunner");

function buttonSwap() {
    if (isRunning) {
        // Swap to red button
        codeRunner.removeEventListener("click",startCode);
        codeRunner.addEventListener("click", stopCode);
        codeRunner.setAttribute("class", "btn btn-danger");
        codeRunner.textContent = 'Stop Presentation';
    } else if (!isRunning) {
        // Swap to green button
        codeRunner.removeEventListener("click",stopCode);
        codeRunner.addEventListener("click", startCode);
        codeRunner.setAttribute("class", "btn btn-success");
        codeRunner.textContent = 'Start Presentation';
    }
}

function startCode() {
    if (!observationComplete) {
        if (!isRunning) {
            isRunning = true;
            console.log("Code started");
            buttonSwap()
        }
    }
}

function stopCode() {
    if (!observationComplete) {
        if (isRunning) {
            isRunning = false;
            observationComplete = true;
            console.log("Code stopped");
            buttonSwap()
        }
    }
}

codeRunner.addEventListener("click", startCode);