document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        document.getElementById('tutorial-modal').classList.add('show');
        document.querySelector('.tutorial-overlay').classList.add('show');
    }, 1000);

    document.getElementById('closeTutorial').addEventListener('click', function() {
        document.getElementById('tutorial-modal').classList.remove('show');
        document.querySelector('.tutorial-overlay').classList.remove('show');
    });
});