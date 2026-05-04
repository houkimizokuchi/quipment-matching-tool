from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models
from .database import engine
from .routers import equipment, audit

# テーブルを作成 (開発環境用)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="備品現物確認システム API")

# フロントエンド(React)からのアクセスを許可するCORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 開発時は全て許可。本番環境ではフロントエンドのURLに制限する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# アップロード画像を提供する静的ファイルマウント
import os
DATA_DIR = os.getenv("DATA_DIR", ".")
UPLOAD_DIR = os.path.join(DATA_DIR, "backend/uploads") if DATA_DIR == "." else os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

from fastapi.responses import FileResponse
from pathlib import Path

app.include_router(equipment.router, prefix="/api")
app.include_router(audit.router, prefix="/api")

@app.get("/api/")
def read_root():
    return {"message": "Welcome to Equipment Matching Tool API"}

# フロントエンドのビルドファイルを配信
FRONTEND_DIST = Path("frontend/dist")
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # APIやアップロードへのリクエストは除外
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            raise HTTPException(status_code=404, detail="Not found")
            
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        
        # React Routerのためのフォールバック
        return FileResponse(FRONTEND_DIST / "index.html")
