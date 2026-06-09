# Yui Assistant 🤖

🌐 **Languages:** [English](README.md) | [Русский](README_RU.md)

---

**Yui Assistant** is an AI-powered Telegram bot built on top of the Google Gemini API. Developed using Node.js and TypeScript, the project features a modular architecture and is ready for deployment both locally and in cloud environments.

## ✨ Features

* **Gemini API Integration**: Uses Google's advanced language models for natural conversation and response generation.
* **100% TypeScript**: Strong typing for better code reliability, predictability, and maintainability.
* **Flexible Configuration**: Supports loading credentials via a local `.env` file or directly from system environment variables.
* **Yarn Package Manager**: Fast, secure, and deterministic dependency management.
* **Environment Separation**: Clean project structure separating source code (`src/`) from the final build (`dist/`).

## ⚙️ Environment Variables

To run the bot, you need to provide authorization keys. The application can read them in two ways:
1. From a `.env` file in the root directory (recommended for local development).
2. From system environment variables (ideal for Docker, Heroku, Cloud Run, Render, etc.).

Create a `.env` file in the project root and add the following parameters:

```env
# Your Telegram Bot token obtained from @BotFather
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Your Google AI Studio API key to access Gemini models
GEMINI_API_KEY=AIzaSyYourActualGeminiApiKeyHere
```

> ⚠️ **Important:** Never commit your `.env` file to version control. It is already included in `.gitignore`.

## 🚀 Execution Commands

Manage the application life cycle using the following standard CLI scripts:

```bash
# Run the project in development mode (with hot-reload)
yarn dev

# Compile TypeScript code into JavaScript (outputs to dist/ folder)
yarn build

# Run the compiled production version of the project
yarn start
```

## 🛠 Step-by-Step Deployment Guide

Follow these steps to deploy and run the bot locally or on a server:

### Step 1: Prepare the Environment
Make sure you have the following installed on your system:
* **Node.js** (LTS version recommended)
* **Yarn** (latest version)

### Step 2: Clone the Repository
Clone this repository and navigate into the project directory:
```bash
git clone https://github.com
cd yui_assistant
```

### Step 3: Install Dependencies
Install all required Node.js packages specified in `package.json`:
```bash
yarn install
```

### Step 4: Configure the Application
Create a `.env` file as described in the "Environment Variables" section and paste your real keys. If you are deploying to a cloud hosting provider, simply set these variables in your hosting provider's dashboard.

### Step 5: Build the Project
Compile the TypeScript source code into JavaScript before launching:
```bash
yarn build
```

### Step 6: Launch the Assistant
Run the compiled application in production mode:
```bash
yarn start
```
