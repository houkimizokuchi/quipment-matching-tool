import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react'

export default function Dashboard() {
  const [logs, setLogs] = useState([])
  const [progressData, setProgressData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [logsResponse, progressResponse] = await Promise.all([
        axios.get('/api/audits/'),
        axios.get('/api/equipments/progress')
      ])
      setLogs(logsResponse.data)
      setProgressData(progressResponse.data)
    } catch (error) {
      console.error('Failed to fetch data', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    if (status.includes('正常')) return <CheckCircle className="w-5 h-5 text-green-500" />
    if (status.includes('修理')) return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    return <AlertOctagon className="w-5 h-5 text-red-500" />
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">ダッシュボード</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">責任者・保管場所別の進捗状況</h3>
          </div>
          
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              読み込み中...
            </div>
          ) : progressData.length === 0 ? (
            <div className="p-12 text-center text-gray-500">データがありません</div>
          ) : (
            <div className="p-5">
              <div className="space-y-6">
                {progressData.map((item, index) => {
                  const percent = Math.round((item.checked / item.total) * 100);
                  const isComplete = item.checked === item.total;
                  
                  return (
                    <div key={index} className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-800">{item.person_in_charge}</span>
                          <span className="text-sm text-gray-500">({item.storage_location})</span>
                        </div>
                        <div className="text-sm font-medium flex items-center">
                          <span className={isComplete ? "text-green-600" : "text-blue-600"}>{item.checked}</span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-gray-600 mr-2">{item.total} 件</span>
                          <span className="text-gray-400 text-xs font-normal">({percent}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full ${isComplete ? 'bg-green-500' : 'bg-blue-600'}`} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">最近の突合履歴</h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">全 {logs.length} 件</span>
          </div>
        
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            読み込み中...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">履歴がありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="p-4 whitespace-nowrap">備品番号</th>
                  <th className="p-4 whitespace-nowrap">状態</th>
                  <th className="p-4 whitespace-nowrap text-center">再発行</th>
                  <th className="p-4 whitespace-nowrap">確認日時</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-4 font-medium text-blue-600 whitespace-nowrap">{log.equipment_number}</td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(log.status)}
                        <span className="text-sm font-medium text-gray-700">{log.status}</span>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-center">
                      {log.needs_replacement ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">必要</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">不要</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(log.checked_at).toLocaleString('ja-JP', { 
                        year: 'numeric', month: '2-digit', day: '2-digit', 
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
