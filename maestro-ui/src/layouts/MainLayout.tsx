import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';

const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-slate-100 p-3 gap-3">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden border border-slate-200/70 bg-white/70 rounded-2xl shadow-sm">
        {/* Top Navigation */}
        <TopNav />

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto">
          <div className="bg-gradient-light min-h-full" style={{padding: '28px 32px'}}>
            <div className="w-full">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
