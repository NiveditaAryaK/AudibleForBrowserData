# Quick Browser Reader

This is a browser text-to-speech project with two ways to run it:

- Local mode: a FastAPI server turns text into speech with the Hugging Face model `facebook/mms-tts-eng`
- Public mode: a Vercel API calls Hugging Face hosted inference so other people can use it too
- A lightweight Chrome extension reads either your selected text or the current page

## Quick start for local use

1. Install Python dependencies:

```powershell
py -3.13 -m pip install -r requirements-local.txt
```

2. Start the local server:

```powershell
py -3.13 -m uvicorn local_tts_app:app --host 127.0.0.1 --port 8000
```

The first run downloads the Hugging Face model, so it can take a little while.

3. Load the extension in Chrome or Edge:

- Open `chrome://extensions` or `edge://extensions`
- Turn on `Developer mode`
- Click `Load unpacked`
- Select the `extension` folder inside this project

4. Use it:

- Highlight text on a page and click `Read selection`
- Or click `Read page` to read the visible page body
- Click `Stop` to stop playback

## Public deployment with Vercel

1. Install Node dependencies:

```powershell
npm.cmd install
```

2. Create a Hugging Face access token and add it to Vercel as `HF_TOKEN`

3. Optional: set `HF_TTS_MODEL` in Vercel if you want a different Hugging Face TTS model

4. Deploy to Vercel:

```powershell
npx vercel
```

If Vercel reports a Lambda storage or dependency-size error, make sure it is only deploying the Node API.
This repo includes a local Python backend for desktop use, but Vercel should ignore it through `.vercelignore`.

5. In the extension, open `API settings` and set the base URL to:

```text
https://your-project-name.vercel.app/api
```

6. Reload the extension and test `Read selection`

## Notes

- This is built for speed, not perfect article extraction
- Page reading is capped at 6000 characters in the extension and 4000 characters in the hosted API to keep requests responsive
- Vercel is a good fit for the public API layer, but the heavy speech generation is delegated to Hugging Face hosted inference
- If a page blocks content scripts aggressively, selection reading is usually the most reliable fallback
