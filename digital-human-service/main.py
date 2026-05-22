"""
Fay AI Digital Human Microservice for Football League Platform.
FastAPI-based headless service providing LLM streaming chat and TTS endpoints.

Usage:
    python main.py
    uvicorn main:app --host 0.0.0.0 --port 5100
"""
import os
import sys
import time
import json
import uuid
import asyncio
import threading
import base64
from pathlib import Path

# Ensure the service directory is the working directory
SERVICE_DIR = Path(__file__).parent
os.chdir(str(SERVICE_DIR))
sys.path.insert(0, str(SERVICE_DIR))

from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel

# ---------- init Fay subsystems ----------
from utils import config_util, util
from core import wsa_server
from core import content_db
from core.interact import Interact
from core.stream_manager import new_instance as get_stream_manager
from scheduler.thread_manager import MyThread

# Load config
config_util.load_config()
cfg = config_util

# Ensure required directories
for d in ["samples", "logs", "memory"]:
    (SERVICE_DIR / d).mkdir(exist_ok=True)

# ---------- FastAPI app ----------
app = FastAPI(title="Digital Human Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================== Pydantic Models =====================

class ChatRequest(BaseModel):
    text: str
    username: str = "User"
    observation: str = ""

class TTSRequest(BaseModel):
    text: str

class PersonaUpdate(BaseModel):
    name: str = None
    gender: str = None
    age: str = None
    job: str = None
    hobby: str = None
    voice: str = None
    goal: str = None
    additional: str = None

class TransparentRequest(BaseModel):
    user: str = "User"
    text: str = None
    audio: str = None


# ===================== Init Fay Core =====================

feiFei = None  # will be set after FeiFei class is imported


def init_fay_core():
    """Initialize the Fay core engine (FeiFei)."""
    global feiFei
    from core import fay_core as fc
    feiFei = fc.FeiFei()
    feiFei.start()
    # Register with fay_booter so stream_manager can access it
    import fay_booter
    fay_booter.feiFei = feiFei
    util.log(1, "Fay core engine (FeiFei) initialized and started")
    return feiFei


# ===================== WebSocket Servers =====================

def start_ws_servers():
    """Try to start the WebSocket servers (optional in headless mode)."""
    import asyncio
    try:
        ws = wsa_server.new_instance(port=10002)
        loop = asyncio.new_event_loop()
        # Run WS server in a dedicated thread with its own event loop
        def _run():
            asyncio.set_event_loop(loop)
            loop.run_forever()
        MyThread(target=_run).start()
        util.log(1, "Digital human WS server started on port 10002")
    except Exception as e:
        util.log(1, f"Digital human WS server skipped (headless mode): {e}")

    try:
        web_ws = wsa_server.new_web_instance(port=10003)
        util.log(1, "Panel WS server started on port 10003")
    except Exception as e:
        util.log(1, f"Panel WS server skipped (headless mode): {e}")


# ===================== SSE Helpers =====================

async def stream_chat_response(username: str, conversation_id: str = ""):
    """Read from the Fay stream manager and yield SSE events.
    conversation_id captured BEFORE on_interact to prevent CID race conditions."""
    sm = get_stream_manager()
    _, nlp_stream = sm.get_Stream(username)
    if not conversation_id:
        conversation_id = sm.get_conversation_id(username)
    full_text = ""
    start_time = time.time()
    import re

    while True:
        sentence = nlp_stream.read()
        if sentence is None:
            await asyncio.sleep(0.01)
            if time.time() - start_time > 60:
                if not full_text:
                    full_text = "抱歉，我暂时无法回答。"
                yield f"data: {json.dumps({'type': 'DONE', 'fullText': full_text})}\n\n"
                break
            continue
        start_time = time.time()

        m = re.search(r"__<cid=([^>]+)>__", sentence)
        if m:
            if m.group(1) != conversation_id:
                continue
            sentence = sentence.replace(m.group(0), "")

        is_end = "_<isend>" in sentence
        content = sentence.replace("_<isfirst>", "").replace("_<isend>", "").replace("_<isqa>", "")
        content = re.sub(r'<prestart[^>]*>[\s\S]*?</prestart>', '', content, flags=re.IGNORECASE)
        content_no_think = re.sub(r'<think>[\s\S]*?</think>', '', content, flags=re.IGNORECASE)

        if content_no_think.strip():
            full_text += content_no_think
            yield f"data: {json.dumps({'type': 'TEXT', 'content': content_no_think})}\n\n"

        if is_end:
            if not full_text:
                full_text = "抱歉，我暂时无法回答。"
            yield f"data: {json.dumps({'type': 'DONE', 'fullText': full_text})}\n\n"
            break

        await asyncio.sleep(0.01)


# ===================== API Endpoints =====================

# Upload directory for multimodal files
UPLOAD_DIR = SERVICE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


@app.get("/api/dh/health")
async def health():
    """Health check."""
    return {"status": "ok", "fay_running": feiFei is not None}


@app.post("/api/dh/chat")
async def chat(req: ChatRequest):
    """
    Send a text message to the AI digital human.
    Returns SSE stream with events: TEXT, THINK, DONE, ERROR.
    """
    if feiFei is None:
        raise HTTPException(status_code=503, detail="Digital human core not initialized")

    username = req.username or "User"
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    util.printInfo(1, username, f'[HTTP Chat] {text}', time.time())


    config_util.config["interact"]["playSound"] = False

    interact = Interact("text", 1, {
        'user': username,
        'msg': text,
        'observation': req.observation or '',
        'stream': True
    })
    feiFei.on_interact(interact)
    cid = get_stream_manager().get_conversation_id(username)

    return StreamingResponse(
        stream_chat_response(username, cid),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/api/dh/chat/multimodal")
async def chat_multimodal(
    text: str = Form(""),
    images: list[UploadFile] | None = File(None),
    files: list[UploadFile] | None = File(None),
):
    images = images or []
    files = files or []
    """
    Multimodal chat: accepts text, images, and files.
    Images are base64-encoded and passed to the LLM as part of the prompt.
    Files are parsed and their content included in the prompt.
    Returns SSE stream.
    """
    if feiFei is None:
        raise HTTPException(status_code=503, detail="Digital human core not initialized")

    username = "User"
    text = text.strip()

    util.printInfo(1, username, f'[HTTP Chat Multimodal] text={text[:80]}, images={len(images)}, files={len(files)}', time.time())

    # Process uploaded files and build observation context
    observation_parts = []

    for img_file in images:
        try:
            content = await img_file.read()
            if content:
                b64 = base64.b64encode(content).decode("utf-8")
                mime = img_file.content_type or "image/png"
                data_uri = f"data:{mime};base64,{b64}"
                observation_parts.append(
                    f"[用户上传了图片: {img_file.filename}]\n"
                    f"图片内容(base64): {data_uri[:200]}... (共{len(content)}字节)\n"
                    f"请根据图片内容(如果base64解码后可见)来回答用户的问题。"
                )
        except Exception as e:
            util.log(1, f"Error reading image {img_file.filename}: {e}")

    for f in files:
        try:
            content = await f.read()
            fname = (f.filename or "unknown").lower()
            text_content = ""
            if fname.endswith(('.txt', '.md', '.csv', '.json')):
                text_content = content.decode("utf-8", errors="replace")
            elif fname.endswith(('.pdf', '.doc', '.docx', '.pptx')):
                text_content = f"[二进制文件: {f.filename}, 共{len(content)}字节, 无法直接解析文本内容]"
            else:
                text_content = content.decode("utf-8", errors="replace")[:4000]

            if text_content:
                observation_parts.append(
                    f"[用户上传了文件: {f.filename}]\n内容:\n{text_content[:8000]}"
                )
        except Exception as e:
            util.log(1, f"Error reading file {f.filename}: {e}")

    observation = "\n\n".join(observation_parts) if observation_parts else ""

    # Build augmented message: combine text with file/image context
    augmented_text = text
    if observation:
        augmented_text = f"{text}\n\n[附带文件/图片信息]\n{observation}"

    # Temporarily disable server-side audio — frontend handles TTS + lip-sync
    original_play_sound = config_util.config["interact"].get("playSound", True)
    config_util.config["interact"]["playSound"] = False
    try:
        interact = Interact("text", 1, {
            'user': username,
            'msg': augmented_text,
            'observation': observation,
            'stream': True
        })
        feiFei.on_interact(interact)
        cid = get_stream_manager().get_conversation_id(username)
    finally:
        config_util.config["interact"]["playSound"] = original_play_sound

    return StreamingResponse(
        stream_chat_response(username, cid),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/api/dh/chat/sync")
async def chat_sync(req: ChatRequest):
    """
    Non-streaming chat: waits for the complete LLM response and returns JSON.
    Used as a simple request-response fallback.
    """
    if feiFei is None:
        raise HTTPException(status_code=503, detail="Digital human core not initialized")

    username = req.username or "User"
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    util.printInfo(1, username, f'[HTTP Chat Sync] {text}', time.time())

    original_play_sound = config_util.config["interact"].get("playSound", True)
    config_util.config["interact"]["playSound"] = False
    try:
        interact = Interact("text", 1, {
            'user': username,
            'msg': text,
            'observation': req.observation or '',
            'stream': False
        })
        feiFei.on_interact(interact)
        cid = get_stream_manager().get_conversation_id(username)
    finally:
        config_util.config["interact"]["playSound"] = original_play_sound

    # Consume SSE stream internally to get full text
    full_text = ""
    async for chunk in stream_chat_response(username, cid):
        if chunk.startswith("data: "):
            try:
                event = json.loads(chunk[6:])
                if event.get("type") == "DONE":
                    full_text = event.get("fullText", full_text)
            except Exception:
                pass

    return {"answer": full_text, "username": username}


@app.post("/api/dh/tts")
async def tts(req: TTSRequest):
    """
    Synthesize text to speech. Returns audio/mpeg binary.
    Uses the configured TTS module (default: Alibaba NLS).
    """
    if feiFei is None:
        raise HTTPException(status_code=503, detail="Digital human core not initialized")

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    util.printInfo(1, "System", f'[HTTP TTS] {text[:50]}...', time.time())

    try:
        # 快速情感分析以选择语音风格
        try:
            tts_sentiment = feiFei._FeiFei__analyze_sentiment_by_keywords(text)
        except Exception:
            tts_sentiment = 0
        result = feiFei.sp.to_sample(text, feiFei._FeiFei__get_mood_voice(tts_sentiment))
        if result is None:
            raise HTTPException(status_code=500, detail="TTS synthesis failed")

        # Read the audio file
        audio_path = result
        if os.path.exists(audio_path):
            with open(audio_path, "rb") as f:
                audio_data = f.read()
            content_type = "audio/wav" if audio_path.endswith(".wav") else "audio/mpeg"
            return Response(content=audio_data, media_type=content_type)
        else:
            raise HTTPException(status_code=500, detail=f"Audio file not found: {audio_path}")
    except Exception as e:
        util.log(1, f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dh/persona")
async def get_persona():
    """Get current persona configuration."""
    config_util.load_config()
    return {
        "attribute": config_util.config.get("attribute", {}),
        "interact": {
            "playSound": config_util.config.get("interact", {}).get("playSound", True),
            "maxInteractTime": config_util.config.get("interact", {}).get("maxInteractTime", 30),
        },
        "memory": config_util.config.get("memory", {}),
    }


@app.put("/api/dh/persona")
async def update_persona(update: PersonaUpdate):
    """Update persona configuration."""
    config_util.load_config()
    attr = config_util.config.setdefault("attribute", {})
    update_data = update.dict(exclude_none=True)
    attr.update(update_data)
    config_util.save_config(config_util.config)
    config_util.load_config()
    util.log(1, f"Persona updated: {update_data}")
    return {"status": "ok", "attribute": attr}


@app.post("/api/dh/stop")
async def stop_generation(request: Request):
    """Stop/interrupt current generation for a user."""
    data = await request.json()
    username = data.get("username", "User")
    sm = get_stream_manager()
    sm.clear_Stream_with_audio(username)
    util.printInfo(1, username, "[API Stop] Generation interrupted")
    return {"status": "ok", "message": f"Stopped generation for {username}"}


@app.post("/api/dh/transparent")
async def transparent_pass(req: TransparentRequest):
    """
    Transparent pass-through: play audio directly or speak text.
    Used for auto-broadcast scenarios.
    """
    if feiFei is None:
        raise HTTPException(status_code=503, detail="Digital human core not initialized")

    username = req.user or "User"
    interact = Interact('transparent_pass', 2, {
        'user': username,
        'text': req.text,
        'audio': req.audio,
        'isend': True,
        'isfirst': True
    })
    util.printInfo(1, username, f'[Transparent] text={req.text}, audio={req.audio}', time.time())
    feiFei.on_interact(interact)
    return {"status": "ok", "message": "Transparent pass-through triggered"}


# ===================== Boot =====================

def boot():
    """Initialize all Fay subsystems."""
    util.log(1, "=== Football Digital Human Service ===")
    util.log(1, f"Working directory: {SERVICE_DIR}")

    # Init database
    util.log(1, "Initializing database...")
    contentdb = content_db.new_instance()
    contentdb.init_db()

    # Init core engine
    util.log(1, "Starting Fay core engine...")
    init_fay_core()

    # Start WebSocket servers for real-time digital human interaction
    # Port 10002: Live2D commands (lip-sync, emotions, motions)
    # Port 10003: Web panel updates
    util.log(1, "Starting WebSocket servers...")
    try:
        ws_human = wsa_server.new_instance(port=10002)
        ws_human.start_server()
        util.log(1, "WSA Human server started on port 10002 (lip-sync, emotions, motions)")
    except Exception as e:
        util.log(1, f"WSA Human server failed: {e}")
    try:
        ws_web = wsa_server.new_web_instance(port=10003)
        ws_web.start_server()
        util.log(1, "WSA Web server started on port 10003 (panel updates)")
    except Exception as e:
        util.log(1, f"WSA Web server failed: {e}")

    # Clean up old samples and logs
    for pattern, dirname in [("sample-*", "samples"), ("*.log", "logs")]:
        import glob as _glob
        for f in _glob.glob(str(SERVICE_DIR / dirname / pattern)):
            try:
                os.remove(f)
            except Exception:
                pass

    util.log(1, "Service boot complete. Ready to accept connections.")


# Boot on import
boot()

# Cleanup registration
import atexit
import signal


def cleanup():
    """Clean shutdown."""
    global feiFei
    try:
        if feiFei:
            feiFei.stop()
    except Exception:
        pass
    util.log(1, "Digital human service stopped.")


atexit.register(cleanup)
try:
    signal.signal(signal.SIGINT, lambda s, f: (cleanup(), os._exit(0)))
    signal.signal(signal.SIGTERM, lambda s, f: (cleanup(), os._exit(0)))
except Exception:
    pass

# ===================== Uvicorn Entry =====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5100, log_level="info")
