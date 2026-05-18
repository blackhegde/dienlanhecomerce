import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Settings,
  MessageSquare,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Users,
  ShoppingCart,
  Plus,
  Edit,
  Trash2,
  Search,
  Upload,
  Eye,
  EyeOff,
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Loader,
  Image,
  Link,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import RichTextEditor from '../components/RichTextEditor';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import adminApi, { DashboardStats } from '../api/adminApi';
import productApi from '../api/productApi';
import categoryApi from '../api/categoryApi';
import quoteApi from '../api/quoteApi';
import { Product } from '../types/product';
import { Category } from '../types/category';
import { QuoteRequest } from '../types/quote';
import { handleImageError, getSafeImageUrl, FALLBACK_IMAGES } from '../utils/imageUtils';
import { RequestsContent } from '../components/RequestsContent';
import { useSettings } from '../hooks/useSettings';
import { SettingsAdmin } from './admin/SettingsAdmin';
interface AdminPageProps {
  onNavigate?: (page: 'home') => void;
}

type MenuItem = 'dashboard' | 'products' | 'categories' | 'settings' | 'requests';

// Helper để sinh slug từ tên
const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { user, logout } = useAuth();
  const { companyInfo: siteInfo } = useSettings();
  const [activeMenu, setActiveMenu] = useState<MenuItem>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Dashboard stats
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Login
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

  if (!user) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
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
              <label className="block text-sm font-semibold text-secondary-700 mb-2">
                Email
              </label>
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
              <label className="block text-sm font-semibold text-secondary-700 mb-2">
                Mật khẩu
              </label>
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
              onClick={() => onNavigate?.('home')}
              className="w-full text-secondary-600 hover:text-primary-600 transition-colors text-sm"
            >
              Quay lại trang chủ
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    category: '',
    brand: '',
    productModel: '',
    power: '',
    capacity: '',
    area: '',
    price: 0,
    originalPrice: 0,
    images: [],
    description: '',
    specifications: [],
    features: [],
    inStock: true,
    stock: 0,
    status: 'active',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<Partial<Category>>({
    name: '',
    slug: '',
    description: '',
    image: '',
    order: 1,
    status: 'active',
  });

  // Quote requests
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'quoted' | 'completed'>('all');
  const [showRequestDetail, setShowRequestDetail] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);

  // Company info (settings)
  const [companyInfo, setCompanyInfo] = useState({
    companyName: '',
    phone: '',
    email: '',
    address: '',
    workingHours: '',
    zaloLink: '',
    facebookLink: '',
    qrCodeUrl: '',
  });

  // Chart data (mock – có thể thay bằng API sau)
  const requestsData = [
    { date: '08/01', requests: 12, quotes: 8 },
    { date: '09/01', requests: 19, quotes: 15 },
    { date: '10/01', requests: 15, quotes: 12 },
    { date: '11/01', requests: 25, quotes: 20 },
    { date: '12/01', requests: 22, quotes: 18 },
    { date: '13/01', requests: 30, quotes: 25 },
    { date: '14/01', requests: 28, quotes: 22 },
  ];

  const productCategoriesData = [
    { name: 'Điều hòa cây', value: 45 },
    { name: 'Quạt điều hòa', value: 28 },
    { name: 'Phụ kiện', value: 15 },
  ];

  // Fetch data based on active menu
  useEffect(() => {
    if (activeMenu === 'dashboard') {
      fetchDashboardStats();
    } else if (activeMenu === 'products') {
      fetchProducts();
    } else if (activeMenu === 'categories') {
      fetchCategories();
    } else if (activeMenu === 'requests') {
      fetchQuoteRequests();
    } else if (activeMenu === 'settings') {
      fetchCompanyInfo();
    }
  }, [activeMenu]);

  //Test quote
  useEffect(() => {
    const testQuoteAPI = async () => {
      try {
        console.log('Testing quote API...');
        const response = await quoteApi.getQuoteRequests({ limit: 10 });
        console.log('Quote API test response:', response);
      } catch (error) {
        console.error('Quote API test error:', error);
      }
    };
    
    testQuoteAPI();
  }, []);
  // Fetch categories ngay khi component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoryApi.getCategories();
        setCategories(Array.isArray(data) ? data : data.categories || []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    loadCategories();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await productApi.getProducts({ limit: 100 });
      setProducts(response.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryApi.getCategories();
      const categoriesArray = Array.isArray(data) ? data : (data?.categories || []);
      setCategories(categoriesArray);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuoteRequests = async () => {
    setLoading(true);
    try {
      console.log('Fetching quote requests...');
      const response = await quoteApi.getQuoteRequests({ limit: 100 });
      console.log('Quote requests response:', response);
      
      if (response && response.requests) {
        // Chuyển đổi dữ liệu từ API sang format hiển thị
        const formattedRequests = response.requests.map((req: any) => ({
          ...req,
          id: req._id, // Thêm id để tương thích với RequestsContent
          customerName: req.customerName || req.fullName || 'N/A', // Hỗ trợ cả hai field
          date: req.createdAt ? new Date(req.createdAt).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'),
        }));
        setQuoteRequests(formattedRequests);
      } else {
        setQuoteRequests([]);
      }
    } catch (error) {
      console.error('Failed to fetch quote requests:', error);
      setQuoteRequests([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Thêm effect để fetch khi chuyển tab requests
  useEffect(() => {
    if (activeMenu === 'requests') {
      fetchQuoteRequests();
    }
  }, [activeMenu]);

  const fetchCompanyInfo = async () => {
    // Giả lập – thay bằng API thật nếu có
    setCompanyInfo({
      companyName: 'Công ty TNHH Điện Lạnh ABC',
      phone: '0901 234 567',
      email: 'info@dienlanh.com',
      address: '123 Đường ABC, Quận 1, TP.HCM',
      workingHours: 'Thứ 2 - Thứ 7: 8:00 - 18:00',
      zaloLink: 'https://zalo.me/0901234567',
      facebookLink: 'https://facebook.com/dienlanhABC',
      qrCodeUrl: 'https://images.unsplash.com/photo-1609770231080-e321deccc34c?w=200',
    });
  };

  // ========== XỬ LÝ SẢN PHẨM ==========
  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File ảnh không được vượt quá 5MB');
      return null;
    }
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh (JPG, PNG, WEBP)');
      return null;
    }

    setUploadingImage(true);
    try {
      const response = await adminApi.uploadFile(file, 'products');
      return response.url;
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload ảnh thất bại');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Upload ảnh cho mô tả (có thể dùng thư mục riêng)
  const handleDescriptionImageUpload = async (file: File): Promise<string | null> => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File ảnh không được vượt quá 5MB');
      return null;
    }
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh (JPG, PNG, WEBP)');
      return null;
    }

    try {
      const response = await adminApi.uploadFile(file, 'products/description');
      return response.url;
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload ảnh thất bại');
      return null;
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      category: '',
      brand: '',
      productModel: '',
      power: '',
      capacity: '',
      area: '',
      price: 0,
      originalPrice: 0,
      images: [],
      description: '',
      specifications: [],
      features: [],
      inStock: true,
      stock: 0,
      status: 'active',
    });
    setImagePreview('');
    setShowProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      ...product,
      category: typeof product.category === 'object' ? product.category._id : product.category,
    });
    setImagePreview(product.images?.[0] || '');
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    setLoading(true);
    try {
      await productApi.deleteProduct(id);
      setProducts(products.filter(p => p._id !== id));
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Xóa sản phẩm thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProductStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setLoading(true);
    try {
      await productApi.updateProductStatus(id, newStatus);
      setProducts(products.map(p => p._id === id ? { ...p, status: newStatus } : p));
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Cập nhật trạng thái thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.category) {
      alert('Vui lòng nhập tên sản phẩm và chọn danh mục');
      return;
    }
  
    setLoading(true);
    try {
      // Sử dụng images từ formData, không ghi đè bằng imagePreview
      const payload = {
        ...productForm,
        price: Number(productForm.price) || 0,
        originalPrice: Number(productForm.originalPrice) || 0,
        stock: Number(productForm.stock) || 0,
        inStock: productForm.inStock !== undefined ? productForm.inStock : true,
        // Đảm bảo specifications và features là mảng
        specifications: productForm.specifications || [],
        features: productForm.features || [],
        images: productForm.images || [], // Giữ nguyên mảng images
      };
  
      console.log('Saving product payload:', payload); // Debug
  
      let savedProduct: Product;
      if (editingProduct) {
        savedProduct = await productApi.updateProduct(editingProduct._id, payload as any);
        setProducts(products.map(p => p._id === editingProduct._id ? savedProduct : p));
      } else {
        savedProduct = await productApi.createProduct(payload as any);
        setProducts([...products, savedProduct]);
      }
      setShowProductModal(false);
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Lưu sản phẩm thất bại');
    } finally {
      setLoading(false);
    }
  };

  // ========== XỬ LÝ DANH MỤC ==========
  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      slug: '',
      description: '',
      image: '',
      order: categories.length + 1,
      status: 'active',
    });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm(category);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;
    setLoading(true);
    try {
      await categoryApi.deleteCategory(id);
      setCategories(categories.filter(c => c._id !== id));
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Xóa danh mục thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCategoryStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setLoading(true);
    try {
      await categoryApi.updateCategoryStatus(id, newStatus);
      setCategories(categories.map(c => c._id === id ? { ...c, status: newStatus } : c));
    } catch (error) {
      console.error('Failed to update category status:', error);
      alert('Cập nhật trạng thái thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name || !categoryForm.slug) {
      alert('Vui lòng nhập tên và slug');
      return;
    }

    setLoading(true);
    try {
      let savedCategory: Category;
      if (editingCategory) {
        savedCategory = await categoryApi.updateCategory(editingCategory._id, categoryForm as any);
        setCategories(categories.map(c => c._id === editingCategory._id ? savedCategory : c));
      } else {
        savedCategory = await categoryApi.createCategory(categoryForm as any);
        setCategories([...categories, savedCategory]);
      }
      setShowCategoryModal(false);
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('Lưu danh mục thất bại');
    } finally {
      setLoading(false);
    }
  };

  // ========== XỬ LÝ YÊU CẦU BÁO GIÁ ==========
  const handleUpdateRequestStatus = async (id: string, status: string, quotedPrice?: number) => {
    setLoading(true);
    try {
      await quoteApi.updateQuoteStatus(id, status, quotedPrice);
      setQuoteRequests(prev => prev.map(q => q._id === id ? { ...q, status: status as any, quotedPrice } : q));
      if (selectedRequest?._id === id) {
        setSelectedRequest({ ...selectedRequest, status: status as any, quotedPrice });
      }
    } catch (error) {
      console.error('Failed to update quote status:', error);
      alert('Cập nhật trạng thái thất bại');
    } finally {
      setLoading(false);
    }
  };

  // ========== XỬ LÝ CÀI ĐẶT ==========
  const handleSaveCompanyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // await adminApi.updateCompanyInfo(companyInfo);
      alert('Cập nhật thông tin thành công!');
    } catch (error) {
      console.error('Failed to save company info:', error);
      alert('Lưu thông tin thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onNavigate?.('home');
  };

  // Filtered data
  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof p.category === 'object' && p.category.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  ) ?? [];

  const filteredCategories = categories?.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  const filteredQuoteRequests = quoteRequests.filter(req => {
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesSearch = searchTerm === '' ||
      req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.phone.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  // Menu items
  const menuItems: { id: MenuItem; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Sản phẩm', icon: Package },
    { id: 'categories', label: 'Danh mục', icon: FolderTree },
    { id: 'requests', label: 'Yêu cầu khách hàng', icon: MessageSquare },
    { id: 'settings', label: 'Quản lý thông tin', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-secondary-50 flex">
      <Toaster position="top-right" />
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-3">
            <Loader className="w-6 h-6 animate-spin text-primary-600" />
            <span className="text-secondary-700">Đang xử lý...</span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-secondary-200 transition-transform duration-300 z-50 flex flex-col`}>
        {/* Logo */}
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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveMenu(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'text-secondary-700 hover:bg-secondary-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User info & logout */}
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
        {/* Top bar */}
        <header className="bg-white border-b border-secondary-200 px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-secondary-100 rounded-lg">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-secondary-900">
                  {menuItems.find(i => i.id === activeMenu)?.label}
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

        {/* Dashboard */}
        {activeMenu === 'dashboard' && (
          <main className="flex-1 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard icon={Package} label="Tổng sản phẩm" value={stats?.totalProducts ?? 0} color="blue" />
              <StatCard icon={MessageSquare} label="Yêu cầu báo giá" value={stats?.totalQuotes?.all ?? 0} color="green" />
              <StatCard icon={Users} label="Khách hàng mới" value={42} color="purple" />
              <StatCard icon={Eye} label="Lượt truy cập hôm nay" value="1,234" color="orange" />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 border border-secondary-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg">Yêu cầu báo giá theo ngày</h3>
                    <p className="text-sm text-secondary-500">7 ngày gần nhất</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={requestsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="requests" stroke="#2563eb" name="Yêu cầu" />
                    <Line type="monotone" dataKey="quotes" stroke="#10b981" name="Đã báo giá" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl p-6 border border-secondary-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg">Sản phẩm theo danh mục</h3>
                    <p className="text-sm text-secondary-500">Tổng quan phân bổ</p>
                  </div>
                  <ShoppingCart className="w-5 h-5 text-primary-600" />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productCategoriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" radius={[8,8,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent requests */}
            <div className="bg-white rounded-xl border border-secondary-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-secondary-200">
                <h3 className="font-bold text-lg">Yêu cầu báo giá gần đây</h3>
                <p className="text-sm text-secondary-500">Quản lý và theo dõi yêu cầu từ khách hàng</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-sm">Khách hàng</th>
                      <th className="text-left py-4 px-6 font-semibold text-sm">Sản phẩm</th>
                      <th className="text-left py-4 px-6 font-semibold text-sm">Số lượng</th>
                      <th className="text-left py-4 px-6 font-semibold text-sm">Ngày</th>
                      <th className="text-left py-4 px-6 font-semibold text-sm">Trạng thái</th>
                      <th className="text-left py-4 px-6 font-semibold text-sm">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteRequests.slice(0, 4).map(req => (
                      <tr key={req._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                        <td className="py-4 px-6">
                          <div className="font-semibold">{req.customerName}</div>
                          {req.company && <div className="text-xs text-secondary-500">{req.company}</div>}
                        </td>
                        <td className="py-4 px-6 max-w-xs truncate">{req.product}</td>
                        <td className="py-4 px-6 font-semibold">{req.quantity}</td>
                        <td className="py-4 px-6 text-sm">{new Date(req.createdAt).toLocaleDateString('vi-VN')}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(req.status)}`}>
                            {getStatusLabel(req.status)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowRequestDetail(true);
                            }}
                            className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}

        {/* Products */}
        {activeMenu === 'products' && (
          <main className="flex-1 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Quản lý sản phẩm</h2>
                <p className="text-sm text-secondary-600">Thêm, sửa, xóa sản phẩm</p>
              </div>
              <button
                onClick={handleAddProduct}
                className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700"
              >
                <Plus className="w-5 h-5" />
                Thêm sản phẩm
              </button>
            </div>

            <div className="bg-white rounded-xl p-4 border border-secondary-200 mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-secondary-200 rounded-lg focus:border-primary-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="text-left py-4 px-6">Ảnh</th>
                      <th className="text-left py-4 px-6">Tên sản phẩm</th>
                      <th className="text-left py-4 px-6">Danh mục</th>
                      <th className="text-left py-4 px-6">Công suất</th>
                      <th className="text-left py-4 px-6">Giá</th>
                      <th className="text-left py-4 px-6">Tồn kho</th>
                      <th className="text-left py-4 px-6">Trạng thái</th>
                      <th className="text-left py-4 px-6">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => (
                      <tr key={product._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                        <td className="py-4 px-6">
                          <img
                            src={getSafeImageUrl(product.images?.[0])}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-lg border"
                            onError={(e) => handleImageError(e, FALLBACK_IMAGES.product)}
                          />
                        </td>
                        <td className="py-4 px-6 font-semibold max-w-xs">{product.name}</td>
                        <td className="py-4 px-6">
                          <span className="inline-flex px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            {typeof product.category === 'object' ? product.category.name : 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-6">{product.power}</td>
                        <td className="py-4 px-6">{product.price.toLocaleString('vi-VN')}đ</td>
                        <td className="py-4 px-6">
                          <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleToggleProductStatus(product._id, product.status)}
                            className="flex items-center gap-2"
                          >
                            {product.status === 'active' ? (
                              <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                <Eye className="w-4 h-4" />
                                Hiển thị
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-100 text-secondary-600 rounded-full text-sm">
                                <EyeOff className="w-4 h-4" />
                                Ẩn
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Sửa"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Xóa"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredProducts.length === 0 && (
                <div className="py-12 text-center text-secondary-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Không tìm thấy sản phẩm nào</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Categories */}
        {activeMenu === 'categories' && (
          <main className="flex-1 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Quản lý danh mục</h2>
                <p className="text-sm text-secondary-600">Thêm, sửa, xóa danh mục</p>
              </div>
              <button
                onClick={handleAddCategory}
                className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700"
              >
                <Plus className="w-5 h-5" />
                Thêm danh mục
              </button>
            </div>

            <div className="bg-white rounded-xl p-4 border border-secondary-200 mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm danh mục..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-secondary-200 rounded-lg focus:border-primary-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="text-left py-4 px-6">Ảnh</th>
                      <th className="text-left py-4 px-6">Tên danh mục</th>
                      <th className="text-left py-4 px-6">Slug</th>
                      <th className="text-left py-4 px-6">Mô tả</th>
                      <th className="text-left py-4 px-6">Thứ tự</th>
                      <th className="text-left py-4 px-6">Trạng thái</th>
                      <th className="text-left py-4 px-6">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map(category => (
                      <tr key={category._id} className="border-b border-secondary-100 hover:bg-secondary-50">
                        <td className="py-4 px-6">
                          <img
                            src={getSafeImageUrl(category.image)}
                            alt={category.name}
                            className="w-16 h-16 object-cover rounded-lg border"
                            onError={(e) => handleImageError(e, FALLBACK_IMAGES.category)}
                          />
                        </td>
                        <td className="py-4 px-6 font-semibold">{category.name}</td>
                        <td className="py-4 px-6">
                          <code className="px-2 py-1 bg-secondary-100 rounded text-sm">{category.slug}</code>
                        </td>
                        <td className="py-4 px-6 max-w-xs truncate">{category.description}</td>
                        <td className="py-4 px-6">{category.order}</td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleToggleCategoryStatus(category._id, category.status)}
                            className="flex items-center gap-2"
                          >
                            {category.status === 'active' ? (
                              <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                <Eye className="w-4 h-4" />
                                Hiển thị
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-100 text-secondary-600 rounded-full text-sm">
                                <EyeOff className="w-4 h-4" />
                                Ẩn
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Sửa"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Xóa"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredCategories.length === 0 && (
                <div className="py-12 text-center text-secondary-500">
                  <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Không tìm thấy danh mục nào</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Requests */}
        {activeMenu === 'requests' && (
          <RequestsContent
            quoteRequests={quoteRequests}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            filteredQuoteRequests={filteredQuoteRequests}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onViewDetail={(req) => {
              setSelectedRequest(req);
              setShowRequestDetail(true);
            }}
            getStatusColor={getStatusColor}
            getStatusLabel={getStatusLabel}
          />
        )}

        {/* Settings */}
        {activeMenu === 'settings' && (
          <SettingsAdmin />
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          formData={productForm}
          setFormData={setProductForm}
          categories={categories}
          onClose={() => setShowProductModal(false)}
          onSave={handleSaveProduct}
          onImageUpload={handleImageUpload}
          onDescriptionImageUpload={handleDescriptionImageUpload}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          uploading={uploadingImage}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          formData={categoryForm}
          setFormData={setCategoryForm}
          onClose={() => setShowCategoryModal(false)}
          onSave={handleSaveCategory}
          generateSlug={generateSlug}
        />
      )}

      {/* Request Detail Modal */}
      {showRequestDetail && selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setShowRequestDetail(false)}
          onUpdateStatus={handleUpdateRequestStatus}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      )}
    </div>
  );
}

// ========== CÁC COMPONENT PHỤ ==========

function StatCard({ icon: Icon, label, value, color }: any) {
  const colorClasses: any = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };
  return (
    <div className="bg-white rounded-xl p-6 border border-secondary-200 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={`${colorClasses[color]} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className="text-secondary-600 text-sm mb-1">{label}</h3>
      <p className="text-3xl font-bold text-secondary-900">{value}</p>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-700';
    case 'quoted': return 'bg-blue-100 text-blue-700';
    case 'completed': return 'bg-green-100 text-green-700';
    default: return 'bg-secondary-100 text-secondary-700';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Chờ xử lý';
    case 'quoted': return 'Đã báo giá';
    case 'completed': return 'Hoàn thành';
    default: return status;
  }
}

// Trong ProductModal, thêm các trường specifications và features

function ProductModal({ product, formData, setFormData, categories, onClose, onSave, onImageUpload, onDescriptionImageUpload, imagePreview, setImagePreview, uploading }: any) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 File input changed event triggered!');
    console.log('Files:', e.target.files);
    
    const file = e.target.files?.[0];
    if (file) {
      console.log('✅ File selected:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      const url = await onImageUpload(file);
      if (url) {
        setImagePreview(url);
        const currentImages = formData.images || [];
        setFormData({ ...formData, images: [...currentImages, url] });
      }
    } else {
      console.log('❌ No file selected');
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const currentImages = formData.images || [];
    const newImages = currentImages.filter((_: any, index: number) => index !== indexToRemove);
    setFormData({ ...formData, images: newImages });
    
    // Nếu xóa ảnh đang preview, cập nhật preview
    if (imagePreview === currentImages[indexToRemove]) {
      setImagePreview(newImages[0] || '');
    }
  };

  const handleInsertImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const url = await onDescriptionImageUpload(file);
        if (url) {
          const alt = prompt('Nhập mô tả ngắn cho ảnh (alt):', 'Hình ảnh sản phẩm');
          const markdown = `\n![${alt || 'Hình ảnh sản phẩm'}](${url})\n`;
          const textarea = document.getElementById('product-description') as HTMLTextAreaElement;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const newText = text.substring(0, start) + markdown + text.substring(end);
            setFormData({ ...formData, description: newText });
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
              textarea.focus();
            }, 0);
          } else {
            setFormData({ ...formData, description: (formData.description || '') + markdown });
          }
        }
      }
    };
    input.click();
  };

  // Xử lý specifications
  const handleAddSpecification = () => {
    const specs = formData.specifications || [];
    setFormData({
      ...formData,
      specifications: [...specs, { label: '', value: '' }]
    });
  };

  const handleRemoveSpecification = (index: number) => {
    const specs = formData.specifications || [];
    setFormData({
      ...formData,
      specifications: specs.filter((_: any, i: number) => i !== index)
    });
  };

  const handleSpecificationChange = (index: number, field: 'label' | 'value', value: string) => {
    const specs = formData.specifications || [];
    specs[index] = { ...specs[index], [field]: value };
    setFormData({ ...formData, specifications: specs });
  };

  // Xử lý features
  const handleAddFeature = () => {
    const features = formData.features || [];
    setFormData({
      ...formData,
      features: [...features, { icon: 'zap', title: '', description: '' }]
    });
  };

  const handleRemoveFeature = (index: number) => {
    const features = formData.features || [];
    setFormData({
      ...formData,
      features: features.filter((_: any, i: number) => i !== index)
    });
  };

  const handleFeatureChange = (index: number, field: 'icon' | 'title' | 'description', value: string) => {
    const features = formData.features || [];
    features[index] = { ...features[index], [field]: value };
    setFormData({ ...formData, features: features });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-secondary-200 px-6 py-4 flex justify-between">
          <div>
            <h3 className="text-xl font-bold">{product ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
            <p className="text-sm text-secondary-600">{product ? 'Cập nhật thông tin' : 'Điền đầy đủ thông tin'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={onSave} className="p-6 space-y-6">
          {/* Tên sản phẩm */}
          <div>
            <label className="block text-sm font-semibold mb-2">Tên sản phẩm *</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg focus:border-primary-600"
              placeholder="Ví dụ: Điều hòa cây Daikin FVRN100BXV1V"
            />
          </div>

          {/* Danh mục và Thương hiệu */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Danh mục *</label>
              <select
                required
                value={formData.category || ''}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((cat: any) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Thương hiệu *</label>
              <input
                type="text"
                required
                value={formData.brand || ''}
                onChange={e => setFormData({...formData, brand: e.target.value})}
                className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
                placeholder="Daikin, LG, ..."
              />
            </div>
          </div>

          {/* Model, Công suất, Năng lực, Diện tích */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Model</label>
              <input
                type="text"
                value={formData.productModel || ''}
                onChange={e => setFormData({...formData, productModel: e.target.value})}
                className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
                placeholder="VD: FVRN100BXV1V"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Công suất *</label>
              <input
                type="text"
                required
                value={formData.power || ''}
                onChange={e => setFormData({...formData, power: e.target.value})}
                placeholder="4.0 HP"
                className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Năng lực (BTU)</label>
              <input
                type="text"
                value={formData.capacity || ''}
                onChange={e => setFormData({...formData, capacity: e.target.value})}
                placeholder="34,400 BTU"
                className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Diện tích làm mát</label>
              <input
                type="text"
                value={formData.area || ''}
                onChange={e => setFormData({...formData, area: e.target.value})}
                placeholder="40-50 m²"
                className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
              />
            </div>
          </div>

          {/* Giá */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Giá bán (VNĐ) *</label>
              <input
                type="number"
                required
                value={formData.price || 0}
                onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Giá gốc (VNĐ)</label>
              <input
                type="number"
                value={formData.originalPrice || 0}
                onChange={e => setFormData({...formData, originalPrice: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
              />
            </div>
          </div>

          {/* Tồn kho */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Số lượng tồn kho</label>
              <input
                type="number"
                min="0"
                value={formData.stock || 0}
                onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Trạng thái còn hàng</label>
              <div className="flex items-center h-full pt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.inStock}
                    onChange={e => setFormData({ ...formData, inStock: e.target.checked })}
                    className="w-5 h-5 text-primary-600 border-2 border-secondary-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-secondary-700">Còn hàng</span>
                </label>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">Thông số kỹ thuật</label>
              <button
                type="button"
                onClick={handleAddSpecification}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm thông số
              </button>
            </div>
            <div className="space-y-3">
              {(formData.specifications || []).map((spec: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Tên thông số (VD: Công nghệ)"
                    value={spec.label || ''}
                    onChange={(e) => handleSpecificationChange(index, 'label', e.target.value)}
                    className="flex-1 px-4 py-2 border-2 border-secondary-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Giá trị (VD: Inverter)"
                    value={spec.value || ''}
                    onChange={(e) => handleSpecificationChange(index, 'value', e.target.value)}
                    className="flex-1 px-4 py-2 border-2 border-secondary-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecification(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">Tính năng nổi bật</label>
              <button
                type="button"
                onClick={handleAddFeature}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm tính năng
              </button>
            </div>
            <div className="space-y-3">
              {(formData.features || []).map((feature: any, index: number) => (
                <div key={index} className="space-y-2 p-3 border border-secondary-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium">Tính năng {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <select
                      value={feature.icon || 'zap'}
                      onChange={(e) => handleFeatureChange(index, 'icon', e.target.value)}
                      className="px-3 py-2 border-2 border-secondary-200 rounded-lg"
                    >
                      <option value="zap">Tiết kiệm điện</option>
                      <option value="maximize">Diện tích lớn</option>
                      <option value="shield">Bảo hành</option>
                      <option value="wind">Làm mát nhanh</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Tiêu đề"
                      value={feature.title || ''}
                      onChange={(e) => handleFeatureChange(index, 'title', e.target.value)}
                      className="px-3 py-2 border-2 border-secondary-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Mô tả"
                      value={feature.description || ''}
                      onChange={(e) => handleFeatureChange(index, 'description', e.target.value)}
                      className="px-3 py-2 border-2 border-secondary-200 rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">Mô tả chi tiết</label>
            </div>
            <div className="border border-secondary-200 rounded-lg overflow-hidden">
              <RichTextEditor
                value={formData.description || ''}
                onChange={(content) => setFormData({ ...formData, description: content })}
                onImageUpload={onDescriptionImageUpload}
              />
            </div>
          </div>

          {/* Ảnh sản phẩm */}
          <div>
            <label className="block text-sm font-semibold mb-2">Ảnh sản phẩm</label>
            
            {/* Upload area */}
            <div className="border-2 border-dashed border-secondary-300 rounded-lg p-6 text-center mb-4">
              <Upload className="w-12 h-12 mx-auto mb-3 text-secondary-400" />
              <p className="text-sm text-secondary-600 mb-2">
                Kéo thả ảnh hoặc{' '}
                <label className="text-primary-600 font-semibold cursor-pointer hover:text-primary-700">
                  chọn file
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </p>
              <p className="text-xs text-secondary-500">JPG, PNG, WEBP (tối đa 5MB)</p>
              {uploading && <p className="mt-2 text-primary-600">Đang upload...</p>}
            </div>

            {/* Danh sách ảnh đã upload */}
            {(formData.images && formData.images.length > 0) && (
              <div className="grid grid-cols-4 gap-3">
                {formData.images.map((imgUrl: string, index: number) => (
                  <div key={index} className="relative group">
                    <img
                      src={getSafeImageUrl(imgUrl)}
                      alt={`Product ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border-2 border-secondary-200"
                      onError={(e) => handleImageError(e, FALLBACK_IMAGES.product)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {imgUrl === imagePreview && (
                      <div className="absolute inset-0 border-2 border-primary-600 rounded-lg pointer-events-none" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trạng thái hiển thị */}
          <div className="flex items-center gap-4 p-4 bg-secondary-50 rounded-lg">
            <p className="font-semibold">Hiển thị sản phẩm</p>
            <button
              type="button"
              onClick={() => setFormData({...formData, status: formData.status === 'active' ? 'inactive' : 'active'})}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                formData.status === 'active' ? 'bg-green-600' : 'bg-secondary-300'
              }`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                formData.status === 'active' ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border-2 border-secondary-300 rounded-lg font-semibold hover:bg-secondary-50">
              Hủy
            </button>
            <button type="submit" disabled={uploading} className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50">
              {uploading ? 'Đang upload...' : (product ? 'Cập nhật' : 'Thêm sản phẩm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryModal({ category, formData, setFormData, onClose, onSave, generateSlug }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-secondary-200 px-6 py-4 flex justify-between">
          <div>
            <h3 className="text-xl font-bold">{category ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h3>
            <p className="text-sm text-secondary-600">{category ? 'Cập nhật thông tin' : 'Điền đầy đủ thông tin'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={onSave} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2">Tên danh mục *</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={e => {
                const name = e.target.value;
                setFormData({ ...formData, name, slug: generateSlug(name) });
              }}
              className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
              placeholder="Ví dụ: Điều hòa cây"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Slug *</label>
            <input
              type="text"
              required
              value={formData.slug || ''}
              onChange={e => setFormData({...formData, slug: e.target.value})}
              className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg font-mono"
              placeholder="dieu-hoa-cay"
            />
            <p className="text-xs text-secondary-500 mt-1">Slug dùng cho URL, tự động sinh từ tên</p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Mô tả</label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
              placeholder="Mô tả ngắn về danh mục"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Thứ tự hiển thị *</label>
            <input
              type="number"
              min="1"
              value={formData.order || 1}
              onChange={e => setFormData({...formData, order: parseInt(e.target.value)})}
              className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Ảnh danh mục</label>
            <input
              type="text"
              value={formData.image || ''}
              onChange={e => setFormData({...formData, image: e.target.value})}
              className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
              placeholder="URL ảnh"
            />
            {formData.image && (
              <img src={formData.image} alt="Preview" className="mt-4 w-32 h-32 object-cover rounded-lg border" />
            )}
          </div>
          <div className="flex items-center gap-4 p-4 bg-secondary-50 rounded-lg">
            <p className="font-semibold">Hiển thị danh mục</p>
            <button
              type="button"
              onClick={() => setFormData({...formData, status: formData.status === 'active' ? 'inactive' : 'active'})}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                formData.status === 'active' ? 'bg-green-600' : 'bg-secondary-300'
              }`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                formData.status === 'active' ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border-2 border-secondary-300 rounded-lg font-semibold hover:bg-secondary-50">
              Hủy
            </button>
            <button type="submit" className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700">
              {category ? 'Cập nhật' : 'Thêm danh mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RequestDetailModal({ request, onClose, onUpdateStatus, getStatusColor, getStatusLabel }: any) {
  const [quotedPrice, setQuotedPrice] = useState(request.quotedPrice || '');
  const [status, setStatus] = useState(request.status);

  const handleUpdate = (newStatus: string) => {
    onUpdateStatus(request._id, newStatus, newStatus === 'quoted' ? parseInt(quotedPrice) : undefined);
    setStatus(newStatus);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-secondary-200 px-6 py-4 flex justify-between">
          <div>
            <h3 className="text-xl font-bold">Chi tiết yêu cầu báo giá</h3>
            <p className="text-sm text-secondary-600">Thông tin từ khách hàng</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-secondary-50 p-4 rounded-lg">
            <h4 className="font-bold mb-2">Thông tin khách hàng</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-sm text-secondary-600">Tên:</span> {request.customerName}</div>
              <div><span className="text-sm text-secondary-600">Điện thoại:</span> {request.phone}</div>
              <div><span className="text-sm text-secondary-600">Email:</span> {request.email}</div>
              {request.company && <div><span className="text-sm text-secondary-600">Công ty:</span> {request.company}</div>}
              {request.address && <div><span className="text-sm text-secondary-600">Địa chỉ:</span> {request.address}</div>}
              {request.businessType && <div><span className="text-sm text-secondary-600">Loại hình:</span> {request.businessType}</div>}
            </div>
          </div>
          <div className="bg-secondary-50 p-4 rounded-lg">
            <h4 className="font-bold mb-2">Thông tin sản phẩm</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-sm text-secondary-600">Sản phẩm:</span> {request.product}</div>
              <div><span className="text-sm text-secondary-600">Số lượng:</span> {request.quantity}</div>
              {request.quotedPrice && <div><span className="text-sm text-secondary-600">Giá đã báo:</span> {request.quotedPrice.toLocaleString('vi-VN')}đ</div>}
            </div>
          </div>
          {request.notes && (
            <div className="bg-secondary-50 p-4 rounded-lg">
              <h4 className="font-bold mb-2">Ghi chú</h4>
              <p className="text-sm">{request.notes}</p>
            </div>
          )}
          <div className="bg-secondary-50 p-4 rounded-lg">
            <h4 className="font-bold mb-2">Trạng thái hiện tại</h4>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
              {getStatusLabel(status)}
            </span>
          </div>
          {request.status === 'pending' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Giá báo (nếu có)</label>
                <input
                  type="number"
                  value={quotedPrice}
                  onChange={e => setQuotedPrice(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-secondary-200 rounded-lg"
                  placeholder="Nhập giá báo"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleUpdate('quoted')} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
                  Đã báo giá
                </button>
                <button onClick={() => handleUpdate('completed')} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
                  Hoàn thành
                </button>
              </div>
            </div>
          )}
          {request.status === 'quoted' && (
            <button onClick={() => handleUpdate('completed')} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
              Đánh dấu hoàn thành
            </button>
          )}
          <button onClick={onClose} className="w-full border-2 border-secondary-300 py-3 rounded-lg font-semibold hover:bg-secondary-50">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}