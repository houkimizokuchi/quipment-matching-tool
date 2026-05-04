import React from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'

export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "削除の確認", 
  message = "このデータを削除しますか？",
  showOptions = true,
  initialDeleteLogs = false
}) {
  const [deleteLogs, setDeleteLogs] = React.useState(initialDeleteLogs)
  const [deleteEquipments, setDeleteEquipments] = React.useState(true)

  // モーダルが開くたびに状態を初期化
  React.useEffect(() => {
    if (isOpen) {
      setDeleteLogs(initialDeleteLogs)
      setDeleteEquipments(true)
    }
  }, [isOpen, initialDeleteLogs])

  if (!isOpen) return null

  // Portalを使用してbody直下にレンダリングする
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-red-600">
              <AlertTriangle className="w-6 h-6 mr-2" />
              <h3 className="text-xl font-bold">{title}</h3>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>

          {showOptions && (
            <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="flex items-center cursor-pointer group">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    checked={deleteEquipments} 
                    onChange={(e) => setDeleteEquipments(e.target.checked)}
                    className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 transition-all cursor-pointer"
                  />
                </div>
                <span className="ml-3 text-sm font-semibold text-gray-700 group-hover:text-red-700 transition-colors">
                  備品データを削除する
                </span>
              </label>

              <label className="flex items-center cursor-pointer group">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    checked={deleteLogs} 
                    onChange={(e) => setDeleteLogs(e.target.checked)}
                    className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 transition-all cursor-pointer"
                  />
                </div>
                <span className="ml-3 text-sm font-semibold text-gray-700 group-hover:text-red-700 transition-colors">
                  関連する照合履歴も削除する
                </span>
              </label>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all shadow-sm"
            >
              キャンセル
            </button>
            <button
              onClick={() => onConfirm({ deleteEquipments, deleteLogs })}
              disabled={!deleteEquipments && !deleteLogs}
              className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 active:bg-red-800 transition-all shadow-md disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
            >
              削除を実行
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
