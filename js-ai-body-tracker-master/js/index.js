document.addEventListener('DOMContentLoaded', function() {
    // Check if user has visited before
    if (!getCookie('hasVisited')) {
        // First visit - show tutorial and set cookie
        setTimeout(() => {
            document.getElementById('tutorial-modal').classList.add('show');
            document.querySelector('.tutorial-overlay').classList.add('show');
            // Set cookie that expires in 365 days
            setCookie('hasVisited', 'true', 365);
        }, 1000);
    }

    document.getElementById('closeTutorial').addEventListener('click', function() {
        document.getElementById('tutorial-modal').classList.remove('show');
        document.querySelector('.tutorial-overlay').classList.remove('show');
    });
});

// Cookie helper functions
function setCookie(name, value, days) {
    let expires = '';
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 100000000));
        expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/';
}

function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}