from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import pandas as pd
import io
import os

from .. import models, schemas, utils
from ..database import get_db

router = APIRouter(
    prefix="/equipments",
    tags=["equipments"]
)

@router.get("/summary")
def get_summary(fiscal_year: Optional[int] = None, db: Session = Depends(get_db)):
    if fiscal_year is None:
        fiscal_year = utils.get_fiscal_year()
    
    start_date, end_date = utils.get_fiscal_year_range(fiscal_year)
    
    total_count = db.query(models.Equipment).filter(models.Equipment.is_active == True).count()
    
    checked_count = db.query(models.AuditLog.equipment_number).filter(
        models.AuditLog.checked_at.between(start_date, end_date)
    ).distinct().count()
    
    return {
        "fiscal_year": fiscal_year,
        "total": total_count,
        "checked": checked_count,
        "percentage": (checked_count / total_count * 100) if total_count > 0 else 0
    }

@router.post("/", response_model=schemas.Equipment)
def create_equipment(equipment: schemas.EquipmentCreate, db: Session = Depends(get_db)):
    db_equipment = db.query(models.Equipment).filter(models.Equipment.equipment_number == equipment.equipment_number).first()
    if db_equipment:
        raise HTTPException(status_code=400, detail="Equipment already registered")
    
    new_equipment = models.Equipment(**equipment.model_dump())
    db.add(new_equipment)
    db.commit()
    db.refresh(new_equipment)
    return new_equipment

@router.post("/import")
async def import_equipments(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file format. Only Excel files are supported.")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # 必要なカラムが存在するか簡易チェック
        # 想定カラム: 備品番号, 品名, 取得日, 銘柄・規格等, 異動後所在場所, 担当者
        required_cols = ['備品番号', '品名']
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Excel must contain '{col}' column.")
        
        imported_count = 0
        updated_count = 0
        
        for _, row in df.iterrows():
            eq_number = str(row['備品番号']).strip()
            name = str(row['品名']).strip()
            if pd.isna(eq_number) or not eq_number or eq_number == 'nan':
                continue
                
            # 日付のパース処理 (取得日)
            acq_date = None
            date_col = '取得日' if '取得日' in df.columns else '取得年月日'
            if date_col in df.columns and pd.notna(row[date_col]):
                try:
                    acq_date = pd.to_datetime(row[date_col]).date()
                except:
                    pass
            
            # 銘柄・規格等
            spec = str(row['銘柄・規格等']).strip() if '銘柄・規格等' in df.columns and pd.notna(row['銘柄・規格等']) else None
            if spec == 'nan': spec = None

            # 異動後所在場所
            loc_col = '異動後所在場所' if '異動後所在場所' in df.columns else '保管場所'
            storage_loc = str(row[loc_col]).strip() if loc_col in df.columns and pd.notna(row[loc_col]) else None
            if storage_loc == 'nan': storage_loc = None
            
            # 担当者
            pic_col = '担当者' if '担当者' in df.columns else '責任者'
            pic = str(row[pic_col]).strip() if pic_col in df.columns and pd.notna(row[pic_col]) else None
            if pic == 'nan': pic = None

            # 既存の備品をチェックして更新するか新規作成するか
            existing = db.query(models.Equipment).filter(models.Equipment.equipment_number == eq_number).first()
            if existing:
                existing.name = name
                if acq_date:
                    existing.acquisition_date = acq_date
                existing.specification = spec
                existing.storage_location = storage_loc
                existing.person_in_charge = pic
                existing.is_active = True
                updated_count += 1
            else:
                new_eq = models.Equipment(
                    equipment_number=eq_number,
                    name=name,
                    acquisition_date=acq_date,
                    specification=spec,
                    storage_location=storage_loc,
                    person_in_charge=pic,
                    is_active=True
                )
                db.add(new_eq)
                imported_count += 1
                
        db.commit()
        return {
            "message": "Import successful", 
            "imported_count": imported_count, 
            "updated_count": updated_count
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@router.get("/progress")
def get_progress(db: Session = Depends(get_db)):
    equipments = db.query(models.Equipment).all()
    
    progress_data = {}
    for eq in equipments:
        pic = eq.person_in_charge or "未設定"
        loc = eq.storage_location or "未設定"
        key = (pic, loc)
        
        if key not in progress_data:
            progress_data[key] = {
                "person_in_charge": pic,
                "storage_location": loc,
                "total": 0,
                "checked": 0
            }
            
        progress_data[key]["total"] += 1
        if len(eq.logs) > 0:
            progress_data[key]["checked"] += 1
            
    result = list(progress_data.values())
    # Sort by person_in_charge, then storage_location
    result.sort(key=lambda x: (x["person_in_charge"], x["storage_location"]))
    return result

@router.get("/count")
def count_equipments(
    search: str = None, 
    fiscal_year: Optional[int] = None,
    only_unchecked: bool = False,
    db: Session = Depends(get_db)
):
    if fiscal_year is None:
        fiscal_year = utils.get_fiscal_year()
    
    start_date, end_date = utils.get_fiscal_year_range(fiscal_year)
    
    # サブクエリ: 指定年度の点検記録があるかどうか
    subquery = db.query(models.AuditLog.equipment_number).filter(
        models.AuditLog.checked_at.between(start_date, end_date)
    ).distinct().subquery()
    
    query = db.query(models.Equipment)
    
    if search:
        query = query.filter(
            (models.Equipment.equipment_number.contains(search)) | 
            (models.Equipment.name.contains(search)) |
            (models.Equipment.specification.contains(search)) |
            (models.Equipment.storage_location.contains(search)) |
            (models.Equipment.person_in_charge.contains(search))
        )
    
    if only_unchecked:
        query = query.filter(~models.Equipment.equipment_number.in_(subquery))
        
    return {"count": query.count()}

@router.get("/{equipment_number}", response_model=schemas.EquipmentDetail)
def read_equipment(equipment_number: str, db: Session = Depends(get_db)):
    db_equipment = db.query(models.Equipment).filter(models.Equipment.equipment_number == equipment_number).first()
    if db_equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return db_equipment


@router.get("/", response_model=List[schemas.EquipmentWithStatus])
def read_equipments(
    search: str = None, 
    skip: int = 0, 
    limit: int = 100, 
    fiscal_year: Optional[int] = None,
    only_unchecked: bool = False,
    db: Session = Depends(get_db)
):
    if fiscal_year is None:
        fiscal_year = utils.get_fiscal_year()
    
    start_date, end_date = utils.get_fiscal_year_range(fiscal_year)
    
    # 最新の点検記録を取得するサブクエリ（指定年度内）
    subquery = db.query(
        models.AuditLog.equipment_number,
        func.max(models.AuditLog.checked_at).label('last_audit_at')
    ).filter(
        models.AuditLog.checked_at.between(start_date, end_date)
    ).group_by(models.AuditLog.equipment_number).subquery()

    # メインクエリ: 備品とサブクエリを外部結合
    query = db.query(
        models.Equipment,
        subquery.c.last_audit_at
    ).outerjoin(
        subquery, models.Equipment.equipment_number == subquery.c.equipment_number
    )
    
    if search:
        query = query.filter(
            (models.Equipment.equipment_number.contains(search)) | 
            (models.Equipment.name.contains(search)) |
            (models.Equipment.specification.contains(search)) |
            (models.Equipment.storage_location.contains(search)) |
            (models.Equipment.person_in_charge.contains(search))
        )
    
    if only_unchecked:
        query = query.filter(subquery.c.last_audit_at == None)
        
    results = query.offset(skip).limit(limit).all()
    
    # データを整形して返す
    equipments = []
    for eq, last_audit_at in results:
        # Pydanticモデルに変換
        eq_data = schemas.EquipmentWithStatus.from_orm(eq)
        eq_data.last_audit_at = last_audit_at
        # ここでは簡易的に時刻があれば「済」とするロジックに。必要ならステータス名も取得可。
        if last_audit_at:
            eq_data.last_audit_status = "完了"
        equipments.append(eq_data)
        
    return equipments

@router.delete("/")
def delete_all_equipments(delete_equipments: bool = True, delete_logs: bool = False, x_admin_password: str = Header(None), db: Session = Depends(get_db)):
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    if x_admin_password != admin_password:
        raise HTTPException(status_code=401, detail="Invalid admin password")

    try:
        if delete_logs:
            db.query(models.AuditLog).delete()
        if delete_equipments:
            db.query(models.Equipment).delete()
        db.commit()
        return {"message": "Data deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{equipment_id}")
def delete_equipment(equipment_id: int, delete_logs: bool = False, x_admin_password: str = Header(None), db: Session = Depends(get_db)):
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    if x_admin_password != admin_password:
        raise HTTPException(status_code=401, detail="Invalid admin password")

    db_equipment = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
    if not db_equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    try:
        if delete_logs:
            db.query(models.AuditLog).filter(models.AuditLog.equipment_number == db_equipment.equipment_number).delete()
        
        db.delete(db_equipment)
        db.commit()
        return {"message": "Equipment deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
