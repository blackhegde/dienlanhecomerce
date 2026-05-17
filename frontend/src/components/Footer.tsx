import { Phone, Mail, MapPin, Facebook, Youtube, Zap } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { handleImageError, getSafeImageUrl, FALLBACK_IMAGES } from '../utils/imageUtils';
import { useSettings } from '../hooks/useSettings';
import { QRCodeSVG } from 'qrcode.react';

interface FooterProps {
  onNavigate?: (page: 'admin') => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { companyInfo } = useSettings();
  const location = useLocation();
  
  const address = companyInfo?.address || '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM';
  const handleSamePagePolicyClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === '/chinh-sach') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer id="contact" className="bg-secondary-900 text-secondary-300">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Company Info + Contact */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-white shadow-sm text-white p-2 rounded-lg">
                <img 
                  src={getSafeImageUrl(companyInfo?.logoUrl || '', 'https://res.cloudinary.com/dhiczfj7e/image/upload/v1774328232/LOGO-QHN_h3xglw.png')}
                  alt={companyInfo?.companyName || "Logo"} 
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div className="font-bold text-xl text-white">{companyInfo?.companyName || 'PK Quạt hơi nước'}</div>
            </div>
            
            <h4 className="footer-title text-white font-semibold mb-4">Thông tin liên hệ</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <span>{address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">Hotline: {companyInfo?.phone || '1900 xxxx'}</p>
                  <p className="text-xs">Tư vấn 24/7</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <a href={`mailto:${companyInfo?.email || 'sales@dienlanhpro.com'}`} className="hover:text-primary-400 transition-colors">
                  {companyInfo?.email || 'sales@dienlanhpro.com'}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Policies */}
          <div>
            <h4 className="footer-title text-white font-semibold mb-4">Chính sách</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/chinh-sach" onClick={handleSamePagePolicyClick} className="hover:text-primary-400 transition-colors">
                  Chính sách bảo hành
                </Link>
              </li>
              <li>
                <Link to="/chinh-sach" onClick={handleSamePagePolicyClick} className="hover:text-primary-400 transition-colors">
                  Chính sách đổi trả
                </Link>
              </li>
              <li>
                <Link to="/chinh-sach" onClick={handleSamePagePolicyClick} className="hover:text-primary-400 transition-colors">
                  Chính sách vận chuyển
                </Link>
              </li>
              <li>
                <Link to="/chinh-sach" onClick={handleSamePagePolicyClick} className="hover:text-primary-400 transition-colors">
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link to="/chinh-sach" onClick={handleSamePagePolicyClick} className="hover:text-primary-400 transition-colors">
                  Bảo mật thông tin
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: QR Zalo */}
          <div>
            <h4 className="footer-title text-white font-semibold mb-4">Kết nối Zalo</h4>
            <div className="bg-white p-4 rounded-lg inline-block">
              <QRCodeSVG 
                value={companyInfo?.zaloLink || "https://zalo.me"} 
                size={128} 
                level={"H"}
                includeMargin={false}
              />
            </div>
            <p className="text-xs mt-2">Quét mã để chat Zalo</p>
          </div>

          {/* Column 4: Social Media */}
          <div>
            <h4 className="footer-title text-white font-semibold mb-4">Theo dõi chúng tôi</h4>
            <div className="space-y-3">
              <a 
                href={companyInfo?.facebookLink || "https://facebook.com"} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm hover:text-primary-400 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span>Facebook</span>
              </a>
              <a 
                href={companyInfo?.zaloLink || "https://zalo.me"} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm hover:text-primary-400 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold text-white">
                  Zalo
                </div>
                <span>Zalo</span>
              </a>
            </div>
          </div>
        </div>

        {/* Social & Working Hours */}
        <div className="mt-8 pt-8 border-t border-secondary-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-3">
            {/* Buttons removed */}
          </div>
          
          <div className="text-sm text-center md:text-right">
            <p className="font-semibold text-white">Giờ làm việc</p>
            <p>{companyInfo?.workingHours || 'Thứ 2 - Thứ 7: 8:00 - 18:00 | Chủ nhật: 8:00 - 12:00'}</p>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-secondary-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-sm text-center">© {new Date().getFullYear()} {companyInfo?.companyName || 'DienlanhPRO'}. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}