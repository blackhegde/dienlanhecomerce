import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyInfo extends Document {
  companyName: string;
  phone: string;
  email: string;
  address: string;
  workingHours: string;
  zaloLink: string;
  facebookLink: string;
  qrCodeUrl: string;
  logoUrl: string;
  headerTagline: string;
  faviconUrl: string;
  siteTitle: string;
  siteDescription: string;
  bannerText: string;
  bannerSubtext: string;
  bannerImageUrl: string;
  quoteBannerImageUrl: string;
  policyContent: string;
  updatedAt: Date;
}

const companyInfoSchema = new Schema<ICompanyInfo>(
  {
    companyName: {
      type: String,
      required: true,
      default: 'Công ty TNHH Điện Lạnh ABC',
    },
    phone: {
      type: String,
      required: true,
      default: '1900 xxxx',
    },
    email: {
      type: String,
      required: true,
      default: 'info@dienlanh.com',
    },
    address: {
      type: String,
      required: true,
      default: '123 Đường ABC, Quận 1, TP.HCM',
    },
    workingHours: {
      type: String,
      required: true,
      default: 'Thứ 2 - Thứ 7: 8:00 - 18:00',
    },
    zaloLink: {
      type: String,
      default: '',
    },
    facebookLink: {
      type: String,
      default: '',
    },
    qrCodeUrl: {
      type: String,
      default: '',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    headerTagline: {
      type: String,
      default: '',
    },
    faviconUrl: {
      type: String,
      default: '',
    },
    siteTitle: {
      type: String,
      default: '',
    },
    siteDescription: {
      type: String,
      default: '',
    },
    bannerText: {
      type: String,
      default: 'Giải pháp làm mát công nghiệp hiệu quả',
    },
    bannerSubtext: {
      type: String,
      default: 'Cung cấp điều hòa cây và quạt điều hòa chất lượng cao cho nhà xưởng, văn phòng và không gian thương mại. Công suất lớn, tiết kiệm điện, bảo hành chính hãng.',
    },
    bannerImageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1766788467067-d443f19314b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwYWlyJTIwY29uZGl0aW9uZXIlMjBmYWN0b3J5fGVufDF8fHx8MTc2ODM2MDM5MXww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    quoteBannerImageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1702498286150-e6f1cd70fa3f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMG9mZmljZSUyMGJ1aWxkaW5nJTIwbW9kZXJuJTIwZ2xhc3N8ZW58MXx8fHwxNzcwNzM2OTE3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    policyContent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one document exists
companyInfoSchema.pre('save', async function (next) {
  const count = await mongoose.model('CompanyInfo').countDocuments();
  if (count > 0 && this.isNew) {
    throw new Error('Chỉ được phép có một document CompanyInfo');
  }
  next();
});

export default mongoose.model<ICompanyInfo>('CompanyInfo', companyInfoSchema);
