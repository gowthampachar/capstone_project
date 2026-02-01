const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 4000;

const BACKEND_TOKEN = process.env.BACKEND_GITHUB_TOKEN;    // PAT for template repo (read only)
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;            // OAuth app client ID
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;    // OAuth app client secret
const REDIRECT_URI = `http://localhost:${PORT}/github/callback`;

const TEMPLATE_REPO_OWNER = 'gowthamapachar';
const TEMPLATE_REPO_NAME = process.env.TEMPLATE_REPO_NAME || 'prototype-testing'; // central repo containing all templates (can be overridden by selected template)

app.use(express.json());

//Redirect user to GitHub OAuth login
app.get('/github/login', (req, res) => {
  const selectedTemplate = req.query.template; // e.g. testng, playwright
  const projectName = req.query.projectName;
  const state = encodeURIComponent(`${selectedTemplate}|${projectName}`);
  const authUrl = `https://github.com/login/oauth/authorize` +
                  `?client_id=${CLIENT_ID}` +
                  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                  `&scope=repo` +
                  `&state=${state}`;
  res.redirect(authUrl);
});

// Util: Get all files recursively from template repo folder
async function fetchFilesRecursive(repo = TEMPLATE_REPO_NAME, path = '') {
  const url = `https://api.github.com/repos/${TEMPLATE_REPO_OWNER}/${repo}/contents/${path}`;
  const res = await axios.get(url, { headers: { Authorization: `token ${BACKEND_TOKEN}` } });
  let files = [];
  for (const item of res.data) {
    if (item.type === 'file') {
      const fileRes = await axios.get(item.download_url);
      files.push({ path: item.path, content: Buffer.from(fileRes.data).toString('base64') });
    } else if (item.type === 'dir') {
      const innerFiles = await fetchFilesRecursive(repo, item.path);
      files = files.concat(innerFiles);
    }
  }
  console.log('fetched all the templates content');
  return files;
} 

// Step 2: Handle GitHub OAuth callback and copy templates to user’s repo
app.get('/github/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const [selectedTemplate, projectName] = decodeURIComponent(req.query.state).split('|');

    // If user selected a template, use that as the template repo name; otherwise fall back to default
    const templateRepo = selectedTemplate || TEMPLATE_REPO_NAME;

    // Exchange code for user access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI
    }, { headers: { Accept: 'application/json' } });
    const userAccessToken = tokenResponse.data.access_token;

    // Get authenticated user's GitHub username
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${userAccessToken}` }
    });
    const username = userRes.data.login;

    // Create new repo in user's account
    const repoName = projectName;

    /* await axios.post(`https://api.github.com/user/repos`, {
      name: repoName,
      private: false,
      description: `Cloned template ${selectedTemplate} from ${TEMPLATE_REPO_OWNER}/${templateRepo}`
    }, {
      headers: { Authorization: `token ${userAccessToken}` }
    }); */
    const generateResp = await axios.post(
        `https://api.github.com/repos/${TEMPLATE_REPO_OWNER}/${templateRepo}/generate`,
        {
          owner: username,
          name: repoName,
          description: `Cloned template ${selectedTemplate} from ${TEMPLATE_REPO_OWNER}/${templateRepo}`,
          private: false
        },
        {
          headers: { Authorization: `token ${userAccessToken}` }
        }
      );

    // GitHub's generate endpoint returns information about the created repository.
    // Prefer `html_url` if provided; otherwise construct a fallback URL.
    const createdRepoUrl = (generateResp && generateResp.data && (generateResp.data.html_url || generateResp.data.htmlUrl))
      ? (generateResp.data.html_url || generateResp.data.htmlUrl)
      : `https://github.com/${username}/${repoName}`;
    console.log('Generated repo URL:', createdRepoUrl);

    res.send(`<div id="clone-success" style="--brand:#4285f4; --bg:#f4fffe9a; font-family:Inter, system-ui, -apple-system, \'Segoe UI\', Roboto, Arial; box-sizing:border-box;">`
  + `<style>` 
  +  `#clone-success .card {`
  +   `max-width:720px;`
  +    `margin:20px auto;`
  +    `background:var(--bg);`
  +    `border-radius:12px;`
  +    `padding:18px 20px;`
  +    `display:flex;`
  +    `gap:16px;`
  +    `align-items:center;`
  +    `box-shadow:0 8px 28px rgba(11,37,79,0.06);`
  +    `border:1px solid rgba(66,133,244,0.06);`
  +  `}`
  +  `#clone-success .logo {`
  +    `width:56px;`
  +    `height:56px;`
  +    `min-width:56px;`
  +    `border-radius:10px;`
  +    `background: #e0ece9;`
  +    `display:flex;`
  +    `align-items:center;`
  +    `justify-content:center;`
  +    `color:#fff;`
  +    `font-weight:700;`
  +    `font-size:20px;`
  +    `box-shadow:0 8px 20px rgba(66,133,244,0.12);`
  +  `}`
  +  `#clone-success .content {`
  +    `flex:1;`
  +  `}`
  +  `#clone-success h2 {`
  +    `margin:0 0 6px 0;`
  +    `font-size:16px;`
  +    `color:var(--brand);`
  +  `}`
  +  `#clone-success p {`
  +    `margin:0 0 10px 0;`
  +    `color:#0b254f;`
  +    `font-size:14px;`
  +    `line-height:1.3;`
  +  `}`
  +  `#clone-success .url {`
  +    `display:inline-flex;`
  +    `gap:10px;`
  +    `align-items:center;`
   +    `padding:8px 12px;`
   +    `background:#fff;`
  +    `border-radius:10px;`
  +    `border:1px solid rgba(66,133,244,0.08);`
  +    `box-shadow:0 6px 18px rgba(66,133,244,0.06);`
  +    `font-size:13px;`
  +    `color:#0b254f;`
  +    `text-decoration:none;`
  +  `}`
  +  `#clone-success .actions { margin-top:10px; display:flex; gap:8px; align-items:center; }`
  +  `#clone-success .btn {`
  +    `background:var(--brand);`
  +    `color:#fff;`
  +    `padding:8px 12px;`
  +    `border-radius:8px;`
  +    `border:none;`
  +    `cursor:pointer;`
  +    `font-weight:600;`
  +    `font-size:13px;`
  +    `text-decoration:none;`
  +  `}`
  +  `#clone-success .btn.secondary {`
  +    `background:transparent;`
  +    `color:var(--brand);`
  +    `border:1px solid rgba(66,133,244,0.12);`
  +  `}`
  + `</style>`

  + `<div class="card" role="status" aria-live="polite">`
  + `    <div class="logo" aria-hidden="true">`
  + `        <!-- You can place a small logo or initials here -->`
  + `        <img src="https://gowthampachar.github.io/capstone_project/tool%20logo.png" alt="Tool logo" style="width: 65px; height: 65px; object-fit:contain; border-radius: 8px;" />`
  + `    </div>`
  + `    <div class="content">`
  + `      <h2 id="success-title">Repository created successfully</h2>`
  + `      <p id="success-desc">Your selected Prototype <strong id="success-template">${selectedTemplate}</strong> was cloned successfully into your repository!!..</p>`
  + `      <div class="actions">`
  + `        <a id="open-repo-btn" class="btn" href="${createdRepoUrl}" target="_blank" rel="noopener noreferrer">Open the Prototype</a>`
  + `        <button class="btn secondary" onclick="location.href=\`https://gowthampachar.github.io/capstone_project/\`">Back to Dashboard</button>`
  + `      </div>`
  + `    </div>`
  + `  </div>`
  + `</div>`);

  } catch (error) {
    console.error('Error during cloning:', error.response?.data || error.message);
    res.status(500).send('Cloning failed: ' + (error.response?.data?.message || error.message));
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
