from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend.models import Base, Equipment
from datetime import date

def seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # 既存データの確認
    if db.query(Equipment).first():
        print("Database already seeded.")
        return

    dummy_equipments = [
        Equipment(equipment_number="41902665", name="ノートPC (Lenovo ThinkPad)", acquisition_date=date(2023, 4, 1), storage_location="第一会議室", person_in_charge="山田太郎", is_active=True),
        Equipment(equipment_number="52813776", name="ノートPC (MacBook Pro)", acquisition_date=date(2024, 5, 10), storage_location="開発部エリア", person_in_charge="佐藤花子", is_active=True),
        Equipment(equipment_number="63724887", name="オフィスチェア (オカムラ)", acquisition_date=date(2022, 11, 15), storage_location="総務部エリア", person_in_charge="鈴木一郎", is_active=True),
        Equipment(equipment_number="74635998", name="プロジェクター (EPSON)", acquisition_date=date(2021, 8, 20), storage_location="第一会議室", person_in_charge="山田太郎", is_active=True),
        Equipment(equipment_number="85546009", name="書庫キャビネット", acquisition_date=date(2020, 2, 5), storage_location="総務部エリア", person_in_charge="鈴木一郎", is_active=True),
        Equipment(equipment_number="96457110", name="ホワイトボード", acquisition_date=date(2023, 1, 10), storage_location="第一会議室", person_in_charge="山田太郎", is_active=True),
    ]

    db.add_all(dummy_equipments)
    db.commit()
    print("Seeded database with dummy equipments.")
    
    db.close()

if __name__ == "__main__":
    seed_db()
