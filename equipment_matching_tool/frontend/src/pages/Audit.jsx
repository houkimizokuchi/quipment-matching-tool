import React, { useState } from 'react'
import axios from 'axios'
import { Search, Camera, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import ScannerModal from '../components/ScannerModal'

export default function Audit() {
  const [equipmentNumber, setEquipmentNumber] = useState('')
  const [equipment, setEquipment] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('正常')
  const [needsReplacement, setNeedsReplacement] = useState(false)
  const [image, setImage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const searchEquipment = async (e, forcedNumber = null) => {
    if (e) e.preventDefault()
    setError('')
    setEquipment(null)
    setSuccess(false)
    
    const targetNumber = forcedNumber || equipmentNumber
    if (!targetNumber) return

    try {
      const res = await axios.get(`/api/equipments/${targetNumber}`)
      setEquipment(res.data)
      if (forcedNumber) setEquipmentNumber(forcedNumber)
    } catch (err) {
      setError('備品が見つかりませんでした。番号を確認してください。')
    }
  }

  const handleScanSuccess = (decodedNumber) => {
    setIsScannerOpen(false)
    searchEquipment(null, decodedNumber)
  }

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          // 最大幅・高さを1200pxに設定（ファイルサイズと画質のバランスが良い）
          const MAX_WIDTH = 1200
          const MAX_HEIGHT = 1200
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob((blob) => {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(newFile)
          }, 'image/jpeg', 0.8) // 画質80%
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  const handleImageChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // 画像ファイルかチェック
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。')
        return
      }

      // 1MB以上の場合は自動圧縮（スマホの高解像度写真対策）
      if (file.size > 1024 * 1024) {
        try {
          const compressedFile = await compressImage(file)
          setImage(compressedFile)
        } catch (err) {
          console.error("Image compression failed", err)
          setImage(file) // 失敗した場合はそのままセット（バックエンドの5MB制限で弾く）
        }
      } else {
        setImage(file)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!equipment) return
    
    setIsSubmitting(true)
    setError('')
    
    const formData = new FormData()
    formData.append('equipment_number', equipment.equipment_number)
    formData.append('status', status)
    formData.append('needs_replacement', needsReplacement)
    if (image) {
      formData.append('image', image)
    }

    try {
      await axios.post('/api/audits/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSuccess(true)
      // Reset form
      setEquipmentNumber('')
      setEquipment(null)
      setStatus('正常')
      setNeedsReplacement(false)
      setImage(null)
    } catch (err) {
      setError('登録に失敗しました。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">備品照合</h2>

      {/* 検索フォーム */}
      <form onSubmit={searchEquipment} className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">備品番号</label>
        <div className="flex relative">
          <input
            type="text"
            value={equipmentNumber}
            onChange={(e) => setEquipmentNumber(e.target.value)}
            placeholder="例: 41902665"
            className="flex-1 block w-full rounded-l-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg p-3 border"
            required
          />
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
        {/* スマホ用カメラ起動ボタン */}
        <div className="mt-2 text-right">
            <button 
              type="button" 
              onClick={() => setIsScannerOpen(true)}
              className="text-sm text-blue-600 flex items-center justify-end w-full hover:bg-blue-50 p-2 rounded-lg transition-colors"
            >
                <Camera className="w-4 h-4 mr-1" /> カメラで読み取る（OCR・バーコード）
            </button>
        </div>
      </form>

      {/* スキャナーモーダル */}
      <ScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScanSuccess={handleScanSuccess} 
      />

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex items-center">
            <CheckCircle2 className="h-6 w-6 text-green-500 mr-3" />
            <p className="text-green-800 font-medium">照合記録を保存しました！</p>
          </div>
        </div>
      )}

      {/* 照合登録フォーム */}
      {equipment && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="bg-blue-50 p-4 border-b border-blue-100">
            <h3 className="font-bold text-blue-800">{equipment.name}</h3>
            <p className="text-sm text-blue-600 mt-1">取得日: {equipment.acquisition_date || '不明'}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状態</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
              >
                <option value="正常">正常</option>
                <option value="破損している（修理希望）">破損している（修理希望）</option>
                <option value="破損している（廃棄希望）">破損している（廃棄希望）</option>
              </select>
            </div>

            <div className="flex items-start bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex items-center h-5">
                <input
                  id="needs_replacement"
                  type="checkbox"
                  checked={needsReplacement}
                  onChange={(e) => setNeedsReplacement(e.target.checked)}
                  className="focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="needs_replacement" className="font-medium text-gray-700">シール破損・再発行希望</label>
                <p className="text-gray-500">備品シールが破れている、見えない等の場合にチェック</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">写真を添付（任意）</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>写真を選択</span>
                      <input id="file-upload" name="file-upload" type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleImageChange} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    {image ? image.name : 'PNG, JPG (自動圧縮対応)'}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 font-bold text-lg disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : 'この内容で照合完了'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
