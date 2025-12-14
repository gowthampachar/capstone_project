const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 4000;

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/github/callback`;

app.get('/github/login', (req, res) => {
  const repo = req.query.templateRepo;
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}` +
                  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                  `&scope=repo&state=${encodeURIComponent(repo)}`;
  res.redirect(authUrl);
});

app.get('/github/callback', async (req, res) => {
  try {
    console.log('Received GitHub callback', req.query);
    const code = req.query.code;
    const templateRepo = decodeURIComponent(req.query.state);

    // Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI
    }, { headers: { Accept: 'application/json' } });

    const accessToken = tokenResponse.data.access_token;

    // Get logged in user info
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` }
    });

    const username = userResponse.data.login;

    // Generate repo from template
    const generateResponse = await axios.post(
      `https://api.github.com/repos/${templateRepo}/generate`,
      {
        owner: username,
        name: 'cloned-framework-repo',
        private: false
      },
      {
        headers: { Authorization: `token ${accessToken}` }
      }
    );

    if (generateResponse.status === 201) {
      res.send('Repository cloned successfully to your GitHub account!');
    } else {
      res.send('Failed to clone repository.');
    }
  } catch (error) {
    res.send('Error: ' + error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
