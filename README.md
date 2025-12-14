# Test Framework Template Cloner

This project allows users to easily clone test framework templates (such as Playwright, Karate, etc.) from a central GitHub repository into their own GitHub account using OAuth authentication.

## Features

- Select a test framework template from a web UI.
- Authenticate with your GitHub account via OAuth.
- Automatically create a new repository in your GitHub account, cloned from the selected template.
- Supports multiple templates managed in a central repository.

## How It Works

1. **Select Template:**  
   Open [index.html](index.html) in your browser and select the desired test framework template.

2. **GitHub OAuth Login:**  
   Click "Clone To My GitHub" to start the OAuth flow. You will be redirected to GitHub to authorize the app.

3. **Repository Creation:**  
   After authorization, a new repository will be created in your GitHub account, containing the selected template.

## Setup

1. **Install Dependencies:**
   ```sh
   npm install