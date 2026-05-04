import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react'

export default function Admin() {
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [error, setError] = useState('')

  React.useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type === 'DELETE_CONFIRMED') {
        executeDelete(event.data.options)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
      setUploadResult(null)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return

    setIsUploading(true)
    setError('')
    setUploadResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post('/api/equipments/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUploadResult(response.data)
      setFile(null)
      // リセットするためファイル入力をクリア
      document.getElementById('excel-upload').value = ''
    } catch (err) {
      setError(err.response?.data?.detail || 'アップロードに失敗しました。ファイル形式と内容（備品番号、品名カラム）を確認してください。')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await axios.get('/api/audits/export', {
        responseType: 'blob' // 重要: ファイルダウンロードのための設定
      })
      
      // BlobからURLを生成してダウンロード
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'audit_results.xlsx')
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (err) {
      setError('エクスポートに失敗しました。')
    }
  }

  const openDeletePopup = () => {
    const width = 500
    const height = 600
    const left = (window.screen.width / 2) - (width / 2)
    const top = (window.screen.height / 2) - (height / 2)
    
    const params = new URLSearchParams({
      title: 'データの一括削除',
      message: 'どのデータを削除するか選択してください。'
    })

    window.open(
      `/popup/delete-confirm?${params.toString()}`,
      'DeleteConfirm',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    )
  }

  const executeDelete = async (options) => {
    try {
      await axios.delete('/api/equipments/', {
        params: {
          delete_equipments: options.deleteEquipments,
          delete_logs: options.deleteLogs
        },
        headers: { 'x-admin-password': options.password }
      })
      setUploadResult({ message: 'データの削除が完了しました', imported_count: 0, updated_count: 0 })
      setError('')
    } catch (err) {
      if (err.response && err.response.status === 401) {
        alert('パスワードが間違っています。')
      } else {
        setError('データの削除に失敗しました。')
      }
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">設定・データ管理</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* インポート（アップロード） */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-blue-50/50 flex items-center">
            <Upload className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-semibold text-blue-800">備品台帳のインポート</h3>
          </div>
          
          <div className="p-5">
            <p className="text-sm text-gray-600 mb-4">
              Excelファイル（.xlsx）をアップロードして、備品データを一括登録・更新します。
              <br/><span className="text-xs text-gray-500 font-semibold text-blue-700">※推奨カラム：備品番号、取得日、品名、銘柄・規格等、異動後所在場所、担当者</span>
            </p>

            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
                <div className="flex items-start"><AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />{error}</div>
              </div>
            )}

            {uploadResult && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-3 text-sm text-green-800">
                <div className="flex items-center mb-1"><CheckCircle2 className="w-4 h-4 mr-1" />インポート成功</div>
                <ul className="list-disc list-inside text-xs ml-2">
                  <li>新規登録: {uploadResult.imported_count} 件</li>
                  <li>情報更新: {uploadResult.updated_count} 件</li>
                </ul>
              </div>
            )}

            <form onSubmit={handleUpload}>
              <div className="flex items-center justify-center w-full mb-4">
                <label htmlFor="excel-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileSpreadsheet className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500 font-semibold">クリックしてファイルを選択</p>
                    <p className="text-xs text-gray-500">{file ? file.name : 'Excelファイル (.xlsx)'}</p>
                  </div>
                  <input id="excel-upload" type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              
              <button
                type="submit"
                disabled={!file || isUploading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isUploading ? 'アップロード中...' : 'アップロードを実行'}
              </button>
            </form>
          </div>
        </div>

        {/* エクスポート（ダウンロード） */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-green-50/50 flex items-center">
            <Download className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="font-semibold text-green-800">照合結果のエクスポート</h3>
          </div>
          
          <div className="p-5 flex flex-col h-full">
            <p className="text-sm text-gray-600 mb-6">
              これまでに確認した「備品突合履歴」をExcelファイルとしてダウンロードします。提出用や報告用に利用できます。
            </p>

            <div className="mt-auto">
              <button
                onClick={handleDownload}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-medium transition-colors"
              >
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                結果Excelをダウンロード
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* データ初期化 */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
        <div className="p-5 border-b border-red-100 bg-red-50/50 flex items-center">
          <Trash2 className="w-5 h-5 text-red-600 mr-2" />
          <h3 className="font-semibold text-red-800">データの初期化</h3>
        </div>
        
        <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            登録されているすべての備品データと照合履歴を削除します。年度の切り替え時や、データをやり直したい場合に使用してください。
          </p>
          <button
            onClick={openDeletePopup}
            className="flex-shrink-0 flex justify-center items-center py-2 px-6 border border-red-200 rounded-lg text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 font-medium transition-colors"
          >
            データを削除する
          </button>
        </div>
      </div>
    </div>
  )
}
