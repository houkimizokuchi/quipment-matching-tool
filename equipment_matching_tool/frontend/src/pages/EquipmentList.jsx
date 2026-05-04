import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Search, Package, MapPin, User, Calendar, Loader2, AlertCircle, Trash2, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function EquipmentList() {
  const [equipments, setEquipments] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 100
  const deleteTargetIdRef = useRef(null)

  // refを常に最新のステートと同期させる
  useEffect(() => {
    deleteTargetIdRef.current = deleteTargetId
  }, [deleteTargetId])

  useEffect(() => {
    fetchEquipments(search, currentPage)
  }, [currentPage])

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type === 'DELETE_CONFIRMED') {
        executeDelete(event.data.options)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const fetchEquipments = async (searchTerm = '', page = 1) => {
    setLoading(true)
    try {
      const skip = (page - 1) * itemsPerPage
      
      const [countRes, dataRes] = await Promise.all([
        axios.get('/api/equipments/count', { params: { search: searchTerm } }),
        axios.get('/api/equipments/', {
          params: { search: searchTerm, skip: skip, limit: itemsPerPage }
        })
      ])
      
      setTotalCount(countRes.data.count)
      setEquipments(dataRes.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching equipments:', err)
      setError('備品データの取得に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearch(value)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (currentPage === 1) {
      fetchEquipments(search, 1)
    } else {
      setCurrentPage(1) // useEffect will trigger fetch
    }
  }

  // リアルタイム検索（デバウンスなしでもこの規模なら大丈夫そうだが、一応ボタンかEnterで実行）
  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(e)
    }
  }

  const openDeletePopup = (eq) => {
    setDeleteTargetId(eq.id)
    const width = 500
    const height = 600
    const left = (window.screen.width / 2) - (width / 2)
    const top = (window.screen.height / 2) - (height / 2)
    
    const params = new URLSearchParams({
      title: '備品の削除',
      message: `「${eq.name}」を台帳から削除しますか？`,
      initialDeleteLogs: 'true'
    })

    window.open(
      `/popup/delete-confirm?${params.toString()}`,
      'DeleteConfirm',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    )
  }

  const executeDelete = async (options) => {
    const targetId = deleteTargetIdRef.current
    if (!targetId) return

    try {
      await axios.delete(`/api/equipments/${targetId}`, {
        params: { delete_logs: options.deleteLogs },
        headers: { 'x-admin-password': options.password }
      })
      fetchEquipments(search, currentPage) // リストを現在のページで再取得
      setDeleteTargetId(null)
    } catch (err) {
      if (err.response && err.response.status === 401) {
        alert('パスワードが間違っています。')
      } else {
        setError('削除に失敗しました。')
      }
      setDeleteTargetId(null)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">備品台帳一覧</h2>
          <p className="text-sm text-gray-500 mt-1">インポートされたすべての備品データを確認できます。</p>
        </div>
        
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="備品番号、品名、場所などで検索..."
            value={search}
            onChange={handleSearchChange}
            onKeyDown={onKeyDown}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <button 
            type="submit" 
            className="absolute right-2 top-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            検索
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">備品番号</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">品名</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">銘柄・規格等</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">保管場所</th>
                 <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">責任者</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">取得日</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Loader2 className="w-8 h-8 mb-2 animate-spin text-blue-500" />
                      <p>データを読み込み中...</p>
                    </div>
                  </td>
                </tr>
              ) : equipments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>該当する備品が見つかりませんでした。</p>
                    {search && (
                      <button 
                        onClick={() => {setSearch(''); fetchEquipments('')}}
                        className="mt-2 text-blue-600 hover:underline text-sm"
                      >
                        検索をクリア
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                equipments.map((eq) => (
                  <tr key={eq.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {eq.equipment_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{eq.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{eq.specification || <span className="text-gray-300 italic">-</span>}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {eq.storage_location || <span className="text-gray-300 italic">未設定</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {eq.person_in_charge || <span className="text-gray-300 italic">未設定</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{eq.acquisition_date || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center space-x-2">
                      <Link
                        to={`/equipment/${eq.equipment_number}`}
                        className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        title="詳細を表示"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => openDeletePopup(eq)}
                        className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && equipments.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              全 <span className="font-semibold text-gray-800">{totalCount}</span> 件中 
              <span className="font-semibold text-gray-800"> {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalCount)}</span> 件を表示
            </p>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="前へ"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                <span className="text-blue-600 mr-1">{currentPage}</span>
                <span className="text-gray-400 mx-2">/</span>
                <span>{Math.ceil(totalCount / itemsPerPage) || 1}</span>
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / itemsPerPage)))}
                disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="次へ"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
