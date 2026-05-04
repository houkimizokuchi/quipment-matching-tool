from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    equipment_number = Column(String, unique=True, index=True)
    name = Column(String)
    acquisition_date = Column(Date, nullable=True)
    specification = Column(String, nullable=True)
    storage_location = Column(String, nullable=True)
    person_in_charge = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    logs = relationship("AuditLog", back_populates="equipment")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    equipment_number = Column(String, ForeignKey("equipment.equipment_number"))
    checked_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="正常") # 正常, 破損している（修理希望）, 破損している（廃棄希望）
    needs_replacement = Column(Boolean, default=False)
    image_path = Column(String, nullable=True)

    equipment = relationship("Equipment", back_populates="logs")
