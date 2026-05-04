import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Audit from './pages/Audit'
import Admin from './pages/Admin'
import EquipmentList from './pages/EquipmentList'
import EquipmentDetail from './pages/EquipmentDetail'
import PopupDeleteConfirm from './pages/PopupDeleteConfirm'
import { ClipboardList, LayoutDashboard, Settings, List as ListIcon } from 'lucide-react'

function App() {
  return (
    <Router>
      <Routes>
        {/* ポップアップ用ルート（ナビゲーションなし） */}
        <Route path="/popup/delete-confirm" element={<PopupDeleteConfirm />} />

        {/* 通常のルート（ナビゲーションあり） */}
        <Route path="*" element={
          <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
            {/* Navigation - Bottom on mobile, Side on desktop */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 md:relative md:w-64 md:min-h-screen md:border-t-0 md:border-r z-50 shadow-sm flex-shrink-0">
              <div className="flex justify-around md:flex-col md:p-6 md:sticky md:top-0">
                <div className="hidden md:block mb-8 px-2">
                  <h1 className="text-2xl font-bold text-blue-600 tracking-tight">備品現物確認</h1>
                  <p className="text-xs text-gray-500 mt-1">管理システム</p>
                </div>
                
                <Link to="/" className="flex flex-col md:flex-row items-center p-3 md:py-3 md:px-4 md:mb-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors w-full">
                  <LayoutDashboard className="w-6 h-6 md:w-5 md:h-5 md:mr-3" />
                  <span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0 whitespace-nowrap">ダッシュボード</span>
                </Link>
                
                <Link to="/audit" className="flex flex-col md:flex-row items-center p-3 md:py-3 md:px-4 md:mb-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors w-full">
                  <ClipboardList className="w-6 h-6 md:w-5 md:h-5 md:mr-3" />
                  <span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0 whitespace-nowrap">照合（カメラ）</span>
                </Link>

                <Link to="/list" className="flex flex-col md:flex-row items-center p-3 md:py-3 md:px-4 md:mb-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors w-full">
                  <ListIcon className="w-6 h-6 md:w-5 md:h-5 md:mr-3" />
                  <span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0 whitespace-nowrap">備品一覧</span>
                </Link>
                
                <Link to="/admin" className="flex flex-col md:flex-row items-center p-3 md:py-3 md:px-4 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors w-full mt-auto">
                  <Settings className="w-6 h-6 md:w-5 md:h-5 md:mr-3" />
                  <span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0 whitespace-nowrap">設定・管理</span>
                </Link>
              </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden w-full">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/audit" element={<Audit />} />
                <Route path="/list" element={<EquipmentList />} />
                <Route path="/equipment/:equipment_number" element={<EquipmentDetail />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </main>
          </div>
        } />
      </Routes>
    </Router>
  )
}

export default App
