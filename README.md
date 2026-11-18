# AI QuickSolve

**AI-powered Windows desktop assistant for MCQ analysis**

AI QuickSolve runs in the background and helps you understand multiple-choice questions from any application on your screen. Press `ALT+F`, capture the screen, extract the question, and get an AI-powered answer with explanation — all in seconds.

---

## Features

- **Global hotkey** (`ALT+F`, configurable) triggers instant screen scan
- **OCR processing** extracts text via Tesseract OCR + OpenCV
- **AI analysis** sends questions to OpenAI and receives structured answers
- **Floating panel** stays on top without stealing keyboard focus
- **System tray** icon for background operation and quick access
- **Scan history** stored locally in SQLite (searchable, exportable)
- **Settings UI** with API key, model, shortcut, display, and privacy controls
- **Windows installer** bundles everything — no manual Python install required

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Windows Desktop                │
│                                             │
│  Electron (main.ts)                         │
│  ├── Global shortcut (shortcuts.ts)         │
│  ├── System tray (tray.ts)                  │
│  ├── Window manager (windowManager.ts)      │
│  │   ├── Main Dashboard (React)             │
│  │   └── Floating Panel (React)             │
│  └── Python backend (child process)         │
│      ├── FastAPI + uvicorn                  │
│      ├── OCR service (Tesseract + OpenCV)   │
│      ├── Question parser (regex/heuristic)  │
│      ├── AI service (OpenAI + abstraction)  │
│      └── SQLite history (SQLAlchemy)        │
└─────────────────────────────────────────────┘
```

---

## Prerequisites (Development)

- **Node.js** 18+
- **Python** 3.11+
- **Tesseract OCR** – [Download installer](https://github.com/UB-Mannheim/tesseract/wiki)
  - Install to default path: `C:\Program Files\Tesseract-OCR\`
- **Git**

---

## Development Setup

### 1. Clone and install Node dependencies

```bash
git clone https://github.com/yourorg/ai-quicksolve.git
cd ai-quicksolve
npm install
```

### 2. Set up Python backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 3. Configure environment

```bash
copy .env.example .env
# Edit .env and add your OpenAI API key
```

### 4. Start the development server

In one terminal, start the Python backend:
```bash
cd backend
python app/main.py
```

In another terminal, start Electron:
```bash
npm run dev
```

---

## API Key Setup

1. Get an API key at [platform.openai.com](https://platform.openai.com/api-keys)
2. Open **AI QuickSolve → Settings → AI Provider**
3. Enter your API key and click **Test connection**
4. Click **Save key**

Your API key is stored using OS-level encryption (`electron.safeStorage`) and is never logged or transmitted anywhere except to OpenAI's API.

---

## Usage

1. Launch AI QuickSolve (appears in system tray)
2. Open any application with MCQ content (PDF, browser, study app)
3. Press `ALT+F`
4. The floating panel shows the AI answer within seconds
5. Press `ALT+F` again to scan another question

---

## OCR Setup

Tesseract must be installed and accessible:

```bash
# Default path (auto-detected):
C:\Program Files\Tesseract-OCR\tesseract.exe

# Custom path: set in .env
TESSERACT_CMD=C:\custom\path\tesseract.exe
```

---

## Testing

### Backend tests (pytest)

```bash
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt pytest pytest-asyncio
python -m pytest ../tests/backend/ -v
```

### Desktop tests

```bash
npm test
```

---

## Production Build

```bash
# Build everything
npm run package
```

This produces `dist-build/AI-QuickSolve-Setup-1.0.0.exe`.

---

## Windows Installation (End Users)

1. Download `AI-QuickSolve-Setup-X.X.X.exe`
2. Run the installer
3. Launch from Desktop shortcut or Start Menu
4. Enter your OpenAI API key in Settings

No Python, Node.js, or Tesseract installation required for end users.

---

## Troubleshooting

### "Shortcut registration failed"
Another application is using `ALT+F`. Go to **Settings → Keyboard** and change the shortcut.

### "OCR confidence is low"
- Ensure the content is visible and not blurred/zoomed too much
- Try increasing the display zoom or font size in the source application

### "Backend not running"
- Check the system tray tooltip
- Restart the application
- Check `logs/backend.log` for errors

### "Invalid API key"
- Verify at [platform.openai.com](https://platform.openai.com/api-keys)
- Ensure billing is set up on your OpenAI account
- Use **Settings → AI Provider → Test connection**

---

## Privacy

- **Screenshots**: Captured only when you press the scan hotkey. Not stored on disk by default.
- **Question text**: Sent to your configured AI provider's API.
- **API key**: Stored using OS-level encryption. Never logged or transmitted to any third party.
- **Scan history**: Stored locally in SQLite. Can be disabled in Settings → Privacy.
- **No telemetry**: This application does not send any usage data to any third party.
- **Screen sharing**: This application does not attempt to hide from screen-sharing, recording, or monitoring software.

---

## Update Strategy

Updates are delivered as new `.exe` installer downloads. The `electron-builder.yml` includes a generic publish provider configuration. When a new version is available, users run the new installer over the existing installation (upgrades in place).

---

## License

MIT
