# 🌿 HerbionYX - Blockchain-based Ayurvedic Herb Traceability System

A comprehensive supply chain traceability platform for Ayurvedic medicines built with React, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Features

- **Complete Supply Chain Tracking**: From herb collection to final product manufacturing
- **Blockchain Integration**: Hyperledger Fabric simulation with Supabase backend
- **QR Code Generation**: Real, scannable QR codes for each supply chain step
- **Role-based Access**: Different interfaces for collectors, testers, processors, manufacturers, and consumers
- **Real-time Updates**: Live data synchronization across all components
- **Consumer Verification**: Public product authenticity verification
- **SMS Integration**: Offline collection support via SMS
- **IPFS Storage**: Decentralized file storage simulation
- **Audit Trail**: Complete blockchain transaction history
- **Platform Rating**: User feedback and rating system

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage + IPFS simulation
- **QR Codes**: Real QR code generation with qrcode library
- **Icons**: Lucide React
- **Build Tool**: Vite

## 📋 Prerequisites

- Node.js 18+
- Supabase account
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd herbionyx-project
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your project URL and anon key
3. Copy `.env.example` to `.env` and update with your Supabase credentials:

```bash
cp .env.example .env
```

Update `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Set up Database Schema

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and run the SQL from `supabase/migrations/create_complete_schema.sql`

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 👥 User Roles & Demo Credentials

The system supports different user roles with specific functionalities:

### Demo Login Credentials

- **Collector**: `collector@demo.com` / `demo123`
- **Tester**: `tester@demo.com` / `demo123`
- **Processor**: `processor@demo.com` / `demo123`
- **Manufacturer**: `manufacturer@demo.com` / `demo123`
- **Consumer**: No login required (click "Consumer Access")

### Role Capabilities

1. **Collector Group (Role 1)**
   - Record herb collection with GPS location
   - Generate collection QR codes
   - SMS integration for offline collection

2. **Testing Labs (Role 2)**
   - Scan collection QR codes
   - Record quality test results
   - Generate test result QR codes

3. **Processing Unit (Role 3)**
   - Scan test QR codes
   - Record processing operations
   - Generate processing QR codes

4. **Manufacturing Plant (Role 4)**
   - Scan processing QR codes
   - Record final product manufacturing
   - Generate consumer QR codes

5. **Consumer (Role 6)**
   - Verify product authenticity
   - View complete supply chain journey
   - No login required

## 🔄 Supply Chain Flow

1. **Collection**: Collectors record herb collection with location, weight, and quality grade
2. **Quality Testing**: Labs test collected herbs for purity, moisture, and pesticide levels
3. **Processing**: Processing units transform raw herbs using various methods
4. **Manufacturing**: Final products are manufactured with expiry dates and certifications
5. **Consumer Verification**: End consumers can verify product authenticity

## 📱 QR Code System

- **Real QR Codes**: Generated using the qrcode library, scannable with any QR scanner
- **Comprehensive Data**: Each QR contains batch ID, event ID, and tracking URL
- **Downloadable**: High-quality PNG downloads available for printing
- **Cross-Platform**: Works with phone cameras and dedicated QR scanner apps

## 🗄️ Database Schema

The system uses Supabase with the following main tables:

- `users`: User authentication and profiles
- `batches`: Main batch tracking
- `events`: Supply chain events for each batch
- `platform_ratings`: User feedback and ratings
- `sms_notifications`: SMS notification logs
- `ipfs_storage`: File storage tracking

## 🔧 Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

### Project Structure

```
src/
├── components/          # React components
│   ├── Auth/           # Authentication components
│   ├── Collection/     # Collection form and logic
│   ├── Quality/        # Quality testing components
│   ├── Processing/     # Processing components
│   ├── Manufacturing/  # Manufacturing components
│   ├── Consumer/       # Consumer verification
│   ├── Common/         # Shared components
│   └── Layout/         # Layout components
├── services/           # API and service layers
├── hooks/              # Custom React hooks
├── config/             # Configuration files
└── types/              # TypeScript type definitions
```

## 🚀 Deployment

### Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to Netlify

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

## 🔒 Security Features

- Row Level Security (RLS) enabled on all Supabase tables
- Role-based access control
- Secure authentication with Supabase Auth
- Input validation and sanitization
- CORS protection

## 🌐 API Integration

The system is designed to work with:

- **Supabase**: Primary database and authentication
- **IPFS**: Decentralized file storage (simulated)
- **SMS Services**: Offline collection support
- **Weather APIs**: Environmental data collection
- **QR Code Libraries**: Real QR code generation

## 📊 Monitoring & Analytics

- Real-time batch tracking
- Supply chain analytics
- User feedback and ratings
- SMS notification logs
- Audit trail with blockchain simulation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

1. Check the documentation
2. Review the demo credentials and user flows
3. Ensure Supabase is properly configured
4. Check browser console for any errors

## 🎯 Key Features Demonstration

- **Real GPS Integration**: Actual location capture
- **Functional QR Codes**: Scannable with any QR app
- **Persistent Data**: Survives browser refresh via Supabase
- **Real-time Updates**: Live dashboard changes
- **Mobile Responsive**: Works on all devices
- **Offline Support**: SMS integration for remote areas

---

Built with ❤️ for the Smart India Hackathon 2024