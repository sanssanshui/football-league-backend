from flask import Flask
#from app.config import config_dict
#from app.extensions import init_extensions, db
from config import config_dict
from extensions import init_extensions, db
from fastapi import FastAPI
from routes import user
import os


# ==============================================
#                 主程序入口
# ==============================================

app = FastAPI(title="江苏省城市足球联赛后端API", version="1.0.0")
app.include_router(user.router)

if __name__ == "__main__":
    #app = create_app(config_name=os.getenv("FLASK_ENV", "dev"))
    #app.run(host="0.0.0.0", port=5000, debug=app.config["DEBUG"])
    import uvicorn
    uvicorn.run(
        app="main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
