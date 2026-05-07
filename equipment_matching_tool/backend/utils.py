from datetime import datetime, date

def get_fiscal_year(d: date = None) -> int:
    """
    指定された日付の年度を返す（4月〜翌3月を1つの年度とする）
    """
    if d is None:
        d = date.today()
    
    # 1月〜3月の場合は、前年の年を年度とする
    if 1 <= d.month <= 3:
        return d.year - 1
    else:
        return d.year

def get_fiscal_year_range(year: int):
    """
    指定された年度の開始日と終了日を返す
    """
    start_date = datetime(year, 4, 1, 0, 0, 0)
    end_date = datetime(year + 1, 3, 31, 23, 59, 59)
    return start_date, end_date
