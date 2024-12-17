// Create this new file
async function fetchGitHubInfo() {
  const owner = "Jasminestrone";
  const repo = "P.R.E.S";

  try {
    // Fetch repo data for stars
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`
    );
    const repoData = await repoResponse.json();

    // Fetch commits from multiple pages
    let totalCommits = 0;
    for (let page = 1; page <= 10; page++) {
      const commitsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?page=${page}&per_page=100`
      );
      const commitsData = await commitsResponse.json();

      // Break if no more commits are found
      if (!commitsData || commitsData.length === 0) break;

      const commitsText = JSON.stringify(commitsData);
      const committerCount = (commitsText.match(/committer/g) || []).length;
      totalCommits += committerCount;
    }

    totalCommits = totalCommits / 2 + -1;

    document.getElementById(
      "commitCount"
    ).textContent = `${repoData.stargazers_count} Stars | ${totalCommits} Commits`;
  } catch (error) {
    console.error("Error fetching GitHub info:", error);
    document.getElementById("commitCount").textContent = "Unable to load stats";
  }
}

document.addEventListener("DOMContentLoaded", fetchGitHubInfo);
