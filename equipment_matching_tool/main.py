# pyright: ignore[reportMissingImports]
import sys
import pandas as pd
import re
import unicodedata
import difflib
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QLabel, QLineEdit, QPushButton, QFileDialog, QMessageBox
)
from PySide6.QtCore import Qt

# ドラッグ＆ドロップを受け付けるためのカスタムQLineEditクラス
class DropLineEdit(QLineEdit):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAcceptDrops(True)

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
        else:
            event.ignore()

    def dropEvent(self, event):
        if event.mimeData().hasUrls():
            # 複数のファイルがドロップされても最初の1つだけを取得
            url = event.mimeData().urls()[0]
            if url.isLocalFile():
                self.setText(url.toLocalFile())
            event.acceptProposedAction()
        else:
            event.ignore()

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("備品突合ツール")
        self.setGeometry(100, 100, 600, 200)

        # --- メインウィジェットとレイアウト ---
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)

        # --- 備品台帳ファイルの入力欄 ---
        layout1 = QHBoxLayout()
        label1 = QLabel("備品台帳ファイル:")
        self.entry1 = DropLineEdit()
        button1 = QPushButton("参照")
        button1.clicked.connect(lambda: self.browse_file(self.entry1))
        layout1.addWidget(label1)
        layout1.addWidget(self.entry1)
        layout1.addWidget(button1)
        main_layout.addLayout(layout1)

        # --- 補助金備品リストの入力欄 ---
        layout2 = QHBoxLayout()
        label2 = QLabel("補助金備品リスト:")
        self.entry2 = DropLineEdit()
        button2 = QPushButton("参照")
        button2.clicked.connect(lambda: self.browse_file(self.entry2))
        layout2.addWidget(label2)
        layout2.addWidget(self.entry2)
        layout2.addWidget(button2)
        main_layout.addLayout(layout2)

        # --- 実行ボタン ---
        self.submit_button = QPushButton("実行")
        self.submit_button.clicked.connect(self.execute)
        main_layout.addWidget(self.submit_button, alignment=Qt.AlignmentFlag.AlignCenter)

    def browse_file(self, line_edit):
        filepath, _ = QFileDialog.getOpenFileName(self, "ファイルを選択")
        if filepath:
            line_edit.setText(filepath)

    def execute(self):
        file1_path = self.entry1.text()
        file2_path = self.entry2.text()

        if not file1_path or not file2_path:
            QMessageBox.warning(self, "警告", "2つのファイルを指定してください。")
            return

        try:
            df1 = pd.read_excel(file1_path)
            df1['取得年月日'] = pd.to_datetime(df1['取得日'], errors='coerce')
            
            cleaned_df2 = self.clean_subsidy_df(file2_path)
            
            # 突合処理から2つのDataFrameを受け取る
            final_df, candidates_df = self.perform_matching(df1, cleaned_df2)

            save_path, _ = QFileDialog.getSaveFileName(self, "結果を保存", "突合結果.xlsx", "Excel ファイル (*.xlsx);;All Files (*)")
            if save_path:
                # Excelライターを使って複数シートに書き出す
                with pd.ExcelWriter(save_path, engine='openpyxl') as writer:
                    final_df.to_excel(writer, sheet_name='突合結果', index=False)
                    if not candidates_df.empty:
                        candidates_df.to_excel(writer, sheet_name='あいまい一致候補', index=False)
                
                QMessageBox.information(self, "成功", f"処理が完了しました。\n結果を {save_path} に保存しました。")
            else:
                QMessageBox.information(self, "情報", "保存がキャンセルされました。")

        except Exception as e:
            QMessageBox.critical(self, "エラー", f"処理中にエラーが発生しました。\n\nエラー内容: {e}")

    def clean_subsidy_df(self, filepath):
        all_cleaned_data = []
        xls = pd.ExcelFile(filepath)

        def convert_showa_to_ad(text_date):
            if not isinstance(text_date, str): return None
            parts = text_date.split('.')
            if len(parts) != 3: return None
            try:
                year, month, day = int(parts[0]) + 1925, int(parts[1]), int(parts[2])
                return pd.to_datetime(f"{year}-{month}-{day}")
            except (ValueError, TypeError): return None
        
        def get_qty(value):
            num = pd.to_numeric(value, errors='coerce')
            return 0 if pd.isna(num) else int(num)

        for sheet_name in xls.sheet_names:
            match = re.match(r'\d+', sheet_name)
            subject_group_number = match.group(0) if match else ''
            df = pd.read_excel(xls, sheet_name=sheet_name, header=None)

            for i in range(0, len(df), 27):
                page_number = (i // 27) + 1
                page_df = df.iloc[i : i + 27]
                data_rows = page_df.iloc[6:]
                item_sequence_in_page = 1
                for _, row in data_rows.iterrows():
                    product_name = row.iloc[3]
                    if pd.notna(product_name) and product_name != '':
                        initial_qty = get_qty(row.iloc[7])
                        disposal_qty1 = get_qty(row.iloc[12])
                        disposal_qty2 = get_qty(row.iloc[15])
                        disposal_qty3 = get_qty(row.iloc[18])
                        current_qty = initial_qty - (disposal_qty1 + disposal_qty2 + disposal_qty3)

                        if current_qty > 0:
                            cleaned_row = {
                                '科目群番号': subject_group_number,
                                'ページ番号': page_number,
                                '連番': item_sequence_in_page,
                                '品名': product_name,
                                '取得価格': row.iloc[8],
                                '取得年月日': convert_showa_to_ad(row.iloc[21]),
                                '現在数量': current_qty
                            }
                            all_cleaned_data.append(cleaned_row)
                        item_sequence_in_page += 1
        
        return pd.DataFrame(all_cleaned_data)

    def perform_matching(self, df1, cleaned_df2):
        final_results = []
        candidates = [] # あいまい一致候補を格納するリスト
        df1_pool = df1.copy().reset_index()
        df1_pool['used'] = False

        def normalize(s):
            if not isinstance(s, str): return ''
            return unicodedata.normalize('NFKC', s).lower().strip()

        for _, row2 in cleaned_df2.iterrows():
            target_qty = int(row2['現在数量'])
            found_matches = []
            match_status = ""

            # --- 1. 完全一致検索 ---
            perfect_matches_df = df1_pool[ (df1_pool['品名'] == row2['品名']) & (pd.to_datetime(df1_pool['取得年月日']) == pd.to_datetime(row2['取得年月日'])) & (df1_pool['取得価格'] == row2['取得価格']) & (df1_pool['used'] == False) ]
            if not perfect_matches_df.empty:
                found_matches = perfect_matches_df.to_dict('records')
                match_status = "完全一致"
            
            # --- 2. 部分一致検索 ---
            if not found_matches:
                probable_matches_df = df1_pool[ (df1_pool['品名'] == row2['品名']) & (pd.to_datetime(df1_pool['取得年月日']) == pd.to_datetime(row2['取得年月日'])) & (df1_pool['used'] == False) ]
                if not probable_matches_df.empty:
                    found_matches = probable_matches_df.to_dict('records')
                    match_status = "多分一致"

            # --- 3. あいまい一致検索 (候補の収集もここで行う) ---
            if not found_matches:
                fuzzy_matches_list = []
                normalized_name2 = normalize(row2['品名'])
                potential_matches_df = df1_pool[ (pd.to_datetime(df1_pool['取得年月日']) == pd.to_datetime(row2['取得年月日'])) & (df1_pool['used'] == False) ]
                for _, row1 in potential_matches_df.iterrows():
                    normalized_name1 = normalize(row1['品名'])
                    similarity = difflib.SequenceMatcher(None, normalized_name1, normalized_name2).ratio()
                    
                    if similarity > 0.85:
                        match_dict = row1.to_dict()
                        match_dict['similarity'] = similarity
                        fuzzy_matches_list.append(match_dict)
                    elif similarity >= 0.5:
                        candidates.append({
                            '補助金リスト_品名': row2['品名'],
                            '備品台帳_品名': row1['品名'],
                            '類似度': similarity,
                            '取得年月日': row2['取得年月日'],
                            '備品台帳_備品番号': row1['備品番号']
                        })
                
                if fuzzy_matches_list:
                    fuzzy_matches_list.sort(key=lambda x: x['similarity'], reverse=True)
                    found_matches = fuzzy_matches_list
                    match_status = "あいまい一致"

            # --- 結果を整形して割り当て ---
            if not found_matches:
                for _ in range(target_qty):
                    result_row = row2.to_dict(); result_row['備品番号'] = None; result_row['一致ステータス'] = "該当なし"; result_row['類似度'] = None; final_results.append(result_row)
            else:
                for i in range(target_qty):
                    result_row = row2.to_dict()
                    if i < len(found_matches):
                        match = found_matches[i]; result_row['備品番号'] = match['備品番号']; status = match_status
                        if target_qty < len(found_matches) and i == target_qty - 1: status += " (超過あり)"
                        result_row['一致ステータス'] = status; result_row['類似度'] = match.get('similarity'); df1_pool.loc[match['index'], 'used'] = True
                    else:
                        result_row['備品番号'] = None; result_row['一致ステータス'] = "一致不足"; result_row['類似度'] = None
                    final_results.append(result_row)

        final_df = pd.DataFrame(final_results)
        candidates_df = pd.DataFrame(candidates)
        
        final_columns = ['科目群番号', 'ページ番号', '連番', '品名', '取得価格', '取得年月日', '現在数量', '備品番号', '一致ステータス', '類似度']
        for col in final_columns: 
            if col not in final_df.columns: final_df[col] = None
        
        candidate_columns = ['補助金リスト_品名', '備品台帳_品名', '類似度', '取得年月日', '備品台帳_備品番号']
        for col in candidate_columns:
            if col not in candidates_df.columns:
                candidates_df[col] = None

        return final_df[final_columns], candidates_df[candidate_columns]

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
