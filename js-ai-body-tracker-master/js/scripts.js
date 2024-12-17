document.addEventListener("DOMContentLoaded", function () {
  // Check if user has visited before
  if (!getCookie("hasVisited")) {
    // First visit - show tutorial and set cookie
    setTimeout(() => {
      document.getElementById("tutorial-modal").classList.add("show");
      document.querySelector(".tutorial-overlay").classList.add("show");
      // Set cookie that expires in 365 days
      setCookie("hasVisited", "true", 365);
    }, 1000);
  }

  document
    .getElementById("closeTutorial")
    .addEventListener("click", function () {
      document.getElementById("tutorial-modal").classList.remove("show");
      document.querySelector(".tutorial-overlay").classList.remove("show");
    });
});

// Cookie helper functions
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 100000000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

document
  .getElementById("downloadAnalysis")
  .addEventListener("click", function () {
    const content =
      document.getElementById("bodyAnalysisContent").innerText +
      "\n" +
      document.getElementById("voiceAnalysisContent").innerText +
      "\n" +
      document.getElementById("volumeAnalysisContent").innerText;
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0];
    a.download = `PRES_analysis_${formattedDate}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  });

document.getElementById("copyAnalysis").addEventListener("click", function () {
  const content =
    document.getElementById("bodyAnalysisContent").innerText +
    "\n" +
    document.getElementById("voiceAnalysisContent").innerText +
    "\n" +
    document.getElementById("volumeAnalysisContent").innerText;
  navigator.clipboard.writeText(content).then(() => {
    // Optional: Show feedback that content was copied
    const originalText = this.innerHTML;
    this.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => {
      this.innerHTML = originalText;
    }, 2000);
  });
});
