let isRunning = false;
let observationComplete = false;
const codeRunner = document.getElementById("codeRunner")

function startCode() {
    if (!observationComplete) {
        if (!isRunning) {
            isRunning = true;
            console.log("Code started");
            codeRunner.removeEventListener("click",startCode);
            codeRunner.addEventListener("click", stopCode);
            codeRunner.setAttribute("class", "btn btn-danger");
            codeRunner.textContent = 'Stop Presentation';
        }
    }
}

function stopCode() {
    if (!observationComplete) {
        if (isRunning) {
            isRunning = false;
            observationComplete = true;
            console.log("Code stopped");
            codeRunner.removeEventListener("click",stopCode);
            codeRunner.addEventListener("click", startCode);
            codeRunner.setAttribute("class", "btn btn-success");
            codeRunner.textContent = 'Start Presentation';
        }
    }
}

codeRunner.addEventListener("click", startCode);