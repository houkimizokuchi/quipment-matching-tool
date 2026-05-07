from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

class EquipmentBase(BaseModel):
    equipment_number: str
    name: str
    acquisition_date: Optional[date] = None
    specification: Optional[str] = None
    storage_location: Optional[str] = None
    person_in_charge: Optional[str] = None
    is_active: bool = True

class EquipmentCreate(EquipmentBase):
    pass

class Equipment(EquipmentBase):
    id: int

    class Config:
        from_attributes = True

class EquipmentWithStatus(Equipment):
    last_audit_at: Optional[datetime] = None
    last_audit_status: Optional[str] = None

class AuditLogBase(BaseModel):
    equipment_number: str
    status: str = "正常"
    needs_replacement: bool = False

class AuditLogCreate(AuditLogBase):
    pass

class AuditLog(AuditLogBase):
    id: int
    checked_at: datetime
    image_path: Optional[str] = None

    class Config:
        from_attributes = True

class EquipmentDetail(Equipment):
    logs: List[AuditLog] = []
