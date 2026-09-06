# Local Setup Guide

Follow these instructions to set up your local development environment for the AI Teaching Assistant monorepo.

## Prerequisites

- **Node.js**: v18.x or v20.x+ (`node -v`)
- **npm**: v9.x or v10.x+ (`npm -v`)
- **Python**: v3.10 or v3.11+ (`python --version`)
- **Git**: Installed and configured

## Step-by-Step Installation

### 1. Install Node Dependencies

From the repository root:

```bash
npm install
npm --prefix frontend install
npm --prefix backend/node-service install
```

### 2. Install Python Dependencies (Optional / ML Service)

```bash
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

pip install -r backend/python-service/requirements.txt
```

### 3. Environment Variables

Create `backend/node-service/.env`:

```env
PORT=5000
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
```

### 4. Running the Development Servers

```bash
# Run Next.js frontend only:
npm run dev

# Run frontend + backend concurrently:
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
