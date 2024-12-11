// Create this new file
async function fetchGitHubInfo() {
    const owner = 'Jasminestrone';
    const repo = 'P.R.E.S';
    
    try {
        // Fetch repo data for stars
        const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        const repoData = await repoResponse.json();
        
        // Fetch all commits and count 'committer' occurrences
        const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits`);
        const commitsData = await commitsResponse.json();
        const commitsText = JSON.stringify(commitsData);
        const committerCount = (commitsText.match(/committer/g) || []).length;
        const totalCount = committerCount + 2;
        
        document.getElementById('commitCount').textContent = 
            `${repoData.stargazers_count} Stars | ${totalCount} Commits`;
    } catch (error) {
        console.error('Error fetching GitHub info:', error);
        document.getElementById('commitCount').textContent = 'Unable to load stats';
    }
}

document.addEventListener('DOMContentLoaded', fetchGitHubInfo);