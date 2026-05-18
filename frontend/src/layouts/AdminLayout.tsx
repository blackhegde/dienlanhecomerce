import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FolderTree, Settings, MessageSquare, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import adminApi from '../api/adminApi';
import { Toaster } from 'react-hot-toast';
import { useSettings } from '../hooks/useSettings';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { companyInfo: siteInfo } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Login Data
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await adminApi.login(loginData);
      localStorage.setItem('token', response.token);
      window.location.reload();
    } catch (error: any) {
      setLoginError(error.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <Toaster position="top-right" />
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-primary-600 text-white p-3 rounded-xl inline-block mb-4">
              <LayoutDashboard className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-secondary-900">Đăng nhập Admin</h2>
            <p className="text-secondary-600 mt-1">Nhập thông tin tài khoản của bạn</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">Email</label>
              <input
                type="email"
                required
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg focus:border-primary-600 focus:outline-none transition-colors"
                placeholder="admin@dienlanh.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">Mật khẩu</label>
              <input
                type="password"
                required
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg focus:border-primary-600 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full text-secondary-600 hover:text-primary-600 transition-colors text-sm"
            >
              Quay lại trang chủ
            </button>
          </form>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', path: '/admin/products', label: 'Sản phẩm', icon: Package },
    { id: 'categories', path: '/admin/categories', label: 'Danh mục', icon: FolderTree },
    { id: 'requests', path: '/admin/requests', label: 'Yêu cầu khách hàng', icon: MessageSquare },
    { id: 'settings', path: '/admin/settings', label: 'Quản lý thông tin', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-secondary-50 flex">
      <Toaster position="top-right" />
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-secondary-200 transition-transform duration-300 z-50 flex flex-col`}>
        <div className="p-6 border-b border-secondary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white border border-secondary-200 p-1.5 rounded-lg flex-shrink-0">
                {siteInfo?.logoUrl ? (
                  <img
                    src={siteInfo.logoUrl}
                    alt={siteInfo.companyName || 'Logo'}
                    className="w-6 h-6 object-contain"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <LayoutDashboard className="w-6 h-6 text-primary-600" />
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-primary-700 leading-tight">{siteInfo?.companyName || 'Admin Panel'}</div>
                <div className="text-xs text-secondary-500">Quản trị</div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive ? 'bg-primary-600 text-white shadow-lg' : 'text-secondary-700 hover:bg-secondary-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-secondary-200">
          <div className="mb-3 px-4 py-2 bg-secondary-50 rounded-lg">
            <p className="text-xs text-secondary-500">Đăng nhập bởi</p>
            <p className="font-semibold text-secondary-800">{user.name}</p>
            <p className="text-xs text-secondary-500">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-secondary-200 px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-secondary-100 rounded-lg">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-secondary-900">
                  {menuItems.find(i => i.path === location.pathname)?.label || 'Bảng điều khiển'}
                </h1>
                <p className="text-sm text-secondary-500">Quản lý hệ thống</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-secondary-500">{user.email}</p>
              </div>
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                {user.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
