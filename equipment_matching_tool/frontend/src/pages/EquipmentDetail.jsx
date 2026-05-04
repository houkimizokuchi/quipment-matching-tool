import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  MapPin, 
  User, 
  Info, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  AlertOctagon,
  Image as ImageIcon,
  FileText
} from 'lucide-react'

export default function EquipmentDetail() {
  const { equipment_number } = useParams()
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchEquipmentDetail()
  }, [equipment_number])

  const fetchEquipmentDetail = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/equipments/${equipment_number}`)
      setEquipment(response.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching equipment detail:', err)
      setError('備品詳細の取得に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    if (status.includes('正常')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{status}</span>
    }
    if (status.includes('修理')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />{status}</span>
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertOctagon className="w-3 h-3 mr-1" />{status}</span>
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p>データを読み込み中...</p>
      </div>
    )
  }

  if (error || !equipment) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-red-700">
          {error || '備品が見つかりませんでした。'}
        </div>
        <button 
          onClick={() => navigate('/list')}
          className="inline-flex items-center text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> 一覧に戻る
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button 
        onClick={() => navigate('/list')}
        className="mb-6 inline-flex items-center text-gray-500 hover:text-blue-600 transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" /> 
        一覧に戻る
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mr-4">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{equipment.name}</h2>
              <p className="text-sm text-gray-500">備品番号: <span className="font-mono font-semibold text-gray-700">{equipment.equipment_number}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {equipment.logs.length > 0 ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-lg border border-green-200">照合済み</span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-400 text-sm font-bold rounded-lg border border-gray-200">未照合</span>
            )}
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
            <Info className="w-4 h-4 mr-2" /> 基本情報
          </h3>
          <div className="border-t border-gray-200">
            <dl className="divide-y divide-gray-200">
              <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-2 hover:bg-gray-50 transition-colors">
                <dt className="text-sm font-bold text-gray-500 flex items-center">
                  <FileText className="w-4 h-4 mr-2" /> 銘柄・規格等
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-medium flex items-center">
                  {equipment.specification || '-'}
                </dd>
              </div>
              <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-2 hover:bg-gray-50 transition-colors">
                <dt className="text-sm font-bold text-gray-500 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" /> 保管場所
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-medium flex items-center">
                  {equipment.storage_location || '未設定'}
                </dd>
              </div>
              <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-2 hover:bg-gray-50 transition-colors">
                <dt className="text-sm font-bold text-gray-500 flex items-center">
                  <User className="w-4 h-4 mr-2" /> 担当者
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-medium flex items-center">
                  {equipment.person_in_charge || '未設定'}
                </dd>
              </div>
              <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-2 hover:bg-gray-50 transition-colors">
                <dt className="text-sm font-bold text-gray-500 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" /> 取得年月日
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-medium flex items-center">
                  {equipment.acquisition_date || '-'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" /> 照合履歴
          </h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {equipment.logs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>過去の照合履歴はありません。</p>
            </div>
          ) : (
            equipment.logs.sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at)).map((log) => (
              <div key={log.id} className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(log.status)}
                        {log.needs_replacement && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">再発行が必要</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-400 font-medium">
                        {new Date(log.checked_at).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    {/* ここにメモがあれば表示するなどの拡張も可能 */}
                  </div>
                  
                  {log.image_path && (
                    <div className="flex-shrink-0">
                      <div className="relative group cursor-pointer" onClick={() => window.open(`/api/uploads/${log.image_path.split(/[\\/]/).pop()}`, '_blank')}>
                        <img 
                          src={`/api/uploads/${log.image_path.split(/[\\/]/).pop()}`} 
                          alt="照合写真" 
                          className="w-32 h-32 md:w-48 md:h-48 object-cover rounded-xl border border-gray-200 shadow-sm group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-xl">
                          <ImageIcon className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
