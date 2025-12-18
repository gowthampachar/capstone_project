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
const TEMPLATE_REPO_NAME = 'prototype-testing'; // central repo containing all templates

app.use(express.json());

//Redirect user to GitHub OAuth login
app.get('/github/login', (req, res) => {
  const selectedTemplate = req.query.template; // e.g. testng, playwright as folders in your repo
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
async function fetchFilesRecursive(path = '') {
  const url = `https://api.github.com/repos/${TEMPLATE_REPO_OWNER}/${TEMPLATE_REPO_NAME}/contents/${path}`;
  const res = await axios.get(url, { headers: { Authorization: `token ${BACKEND_TOKEN}` } });
  let files = [];
  for (const item of res.data) {
    if (item.type === 'file') {
      const fileRes = await axios.get(item.download_url);
      files.push({ path: item.path, content: Buffer.from(fileRes.data).toString('base64') });
    } else if (item.type === 'dir') {
      const innerFiles = await fetchFilesRecursive(item.path);
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
      description: `Cloned template ${selectedTemplate} from prototype-testing`
    }, {
      headers: { Authorization: `token ${userAccessToken}` }
    }); */
    await axios.post(
        'https://api.github.com/repos/gowthamapachar/prototype-testing/generate',
        {
          owner: username,
          name: repoName,
          description: "Cloned from prototype-testing template repo",
          private: false
        },
        {
          headers: { Authorization: `token ${userAccessToken}` }
        }
      );
      

    // Fetch all template files from selected folder inside template repo
    //const files = await fetchFilesRecursive(selectedTemplate);

    // Push template files to new user repo
    /* for (const file of files) {
      await axios.put(`https://api.github.com/repos/${username}/${repoName}/contents/${file.path}`, {
        message: `Add template file ${file.path}`,
        content: file.content,
      }, {
        headers: { Authorization: `token ${userAccessToken}` }
      });
    } */
    console.log('pushed all the contents');

    res.send(`<p>Template '${selectedTemplate}' cloned successfully! <br> Visit <a href="https://github.com/${username}/${repoName}" target="_blank">https://github.com/${username}/${repoName}</a></p>`);

  } catch (error) {
    console.error('Error during cloning:', error.response?.data || error.message);
    res.status(500).send('Cloning failed: ' + (error.response?.data?.message || error.message));
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
