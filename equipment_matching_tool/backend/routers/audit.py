from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
import uuid
import pandas as pd
import io
from datetime import datetime
from .. import models, schemas, utils
from ..database import get_db

router = APIRouter(
    prefix="/audits",
    tags=["audits"]
)

DATA_DIR = os.getenv("DATA_DIR", ".")
UPLOAD_DIR = os.path.join(DATA_DIR, "backend/uploads") if DATA_DIR == "." else os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=schemas.AuditLog)
async def create_audit_log(
    equipment_number: str = Form(...),
    status: str = Form("正常"),
    needs_replacement: bool = Form(False),
    image: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    # 備品の存在確認
    equipment = db.query(models.Equipment).filter(models.Equipment.equipment_number == equipment_number).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    image_path = None
    if image:
        # 画像サイズの確認 (5MB上限)
        image.file.seek(0, 2)
        file_size = image.file.tell()
        image.file.seek(0)
        
        if file_size > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")

        # 画像保存処理
        file_extension = image.filename.split(".")[-1]
        file_name = f"{equipment_number}_{uuid.uuid4().hex}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_path = file_path

    # 履歴作成
    db_log = models.AuditLog(
        equipment_number=equipment_number,
        status=status,
        needs_replacement=needs_replacement,
        image_path=image_path,
        checked_at=datetime.utcnow()
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    return db_log

@router.get("/", response_model=List[schemas.AuditLog])
def read_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.checked_at.desc()).offset(skip).limit(limit).all()
    return logs

@router.get("/export")
def export_audit_logs(fiscal_year: Optional[int] = None, db: Session = Depends(get_db)):
    # 履歴データと備品データを結合して取得
    query = db.query(models.AuditLog).join(models.Equipment)
    
    if fiscal_year:
        from .. import utils
        start_date, end_date = utils.get_fiscal_year_range(fiscal_year)
        query = query.filter(models.AuditLog.checked_at.between(start_date, end_date))
        filename = f"audit_results_{fiscal_year}.xlsx"
    else:
        filename = "audit_results_all.xlsx"
        
    logs = query.all()
    
    data = []
    for log in logs:
        # datetime の timezone-naive 対応など
        checked_at_str = log.checked_at.strftime("%Y/%m/%d %H:%M:%S") if log.checked_at else ""
        
        data.append({
            "備品番号": log.equipment.equipment_number,
            "品名": log.equipment.name,
            "取得年月日": log.equipment.acquisition_date.strftime("%Y/%m/%d") if log.equipment.acquisition_date else "",
            "確認日時": checked_at_str,
            "状態": log.status,
            "シール再発行": "必要" if log.needs_replacement else "不要",
            "写真有無": "あり" if log.image_path else "なし"
        })
    
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='突合履歴')
    
    output.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
