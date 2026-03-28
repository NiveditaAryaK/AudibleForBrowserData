@echo off
py -3.13 -m uvicorn local_tts_app:app --host 127.0.0.1 --port 8000
