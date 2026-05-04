import React, { useEffect, useState } from 'react'
import { AlertTriangle, X, Check, Trash2 } from 'lucide-react'

export default function PopupDeleteConfirm() {
  const [params, setParams] = useState(null)
  const [deleteLogs, setDeleteLogs] = useState(false)
  const [deleteEquipments, setDeleteEquipments] = useState(true)
  const [password, setPassword] = useState('')

  useEffect(() => {
    // URLからパラメータを取得
    const urlParams = new URLSearchParams(window.location.search)
    setParams({
      title: urlParams.get('title') || '削除の確認',
      message: urlParams.get('message') || 'このデータを削除しますか？',
      initialDeleteLogs: urlParams.get('initialDeleteLogs') === 'true'
    })
    setDeleteLogs(urlParams.get('initialDeleteLogs') === 'true')
  }, [])

  const handleConfirm = () => {
    if (window.opener) {
      window.opener.postMessage({
        type: 'DELETE_CONFIRMED',
        options: { deleteEquipments, deleteLogs, password }
      }, window.location.origin)
      window.close()
    }
  }

  const handleCancel = () => {
    window.close()
  }

  if (!params) return null

  return (
    <div className="min-h-screen bg-white p-6 font-sans">
      <div className="flex items-center text-red-600 mb-6 border-b pb-4">
        <AlertTriangle className="w-8 h-8 mr-3" />
        <h1 className="text-2xl font-bold">{params.title}</h1>
      </div>

      <p className="text-lg text-gray-700 mb-8 leading-relaxed">
        {params.message}
      </p>

      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-8 shadow-sm">
        <h2 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-4 flex items-center">
          <Trash2 className="w-4 h-4 mr-2" />
          実行オプション
        </h2>
        
        <div className="space-y-4">
          <label className="flex items-center p-3 bg-white rounded-xl border border-red-200 cursor-pointer hover:bg-red-50 transition-colors shadow-sm">
            <input 
              type="checkbox" 
              checked={deleteEquipments} 
              onChange={(e) => setDeleteEquipments(e.target.checked)}
              className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="ml-3 font-bold text-gray-800">備品データを削除する</span>
          </label>

          <label className="flex items-center p-3 bg-white rounded-xl border border-red-200 cursor-pointer hover:bg-red-50 transition-colors shadow-sm">
            <input 
              type="checkbox" 
              checked={deleteLogs} 
              onChange={(e) => setDeleteLogs(e.target.checked)}
              className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="ml-3 font-bold text-gray-800">関連する照合履歴も削除する</span>
          </label>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          管理者パスワード <span className="text-red-500">*</span>
        </label>
        <input 
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワードを入力してください"
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
        />
        <p className="mt-2 text-xs text-gray-500">
          ※ 削除を実行するにはパスワードが必要です
        </p>
      </div>

      <div className="flex gap-4 sticky bottom-0 bg-white py-4 border-t">
        <button
          onClick={handleCancel}
          className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-lg"
        >
          キャンセル
        </button>
        <button
          onClick={handleConfirm}
          disabled={(!deleteEquipments && !deleteLogs) || !password}
          className="flex-1 py-4 px-6 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg text-lg disabled:opacity-50 disabled:grayscale"
        >
          削除を実行
        </button>
      </div>

      <p className="mt-6 text-xs text-center text-gray-400">
        このウィンドウを閉じると操作はキャンセルされます。
      </p>
    </div>
  )
}
