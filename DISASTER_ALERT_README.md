# DisasterAlert - AI-Powered Disaster Preparedness App

A comprehensive, production-ready web application for natural disaster preparedness focused on Asia (especially India). Built with React, TypeScript, and AI integration for real-time monitoring and personalized safety recommendations.

![DisasterAlert Hero](src/assets/disaster-alert-hero.jpg)

## 🚀 Features

### Core Functionality
- **Real-time Disaster Monitoring** - Integration with Indian Meteorological Department (IMD) APIs
- **AI-Powered Safety Precautions** - Personalized precautions using Hugging Face transformers
- **Survival Stories** - AI-generated inspiring survival stories based on historical events  
- **Multi-disaster Support** - Floods, Earthquakes, Cyclones, Heatwaves, Tsunamis, Storms, Fires, Droughts
- **Safety Status Dashboard** - Real-time safety levels with color-coded alerts
- **Location-based Alerts** - Customized for user's specific location
- **Offline Support** - Cached data when internet connection is unavailable

### AI Integration
- **Precautions Generation** - AI-generated safety measures based on disaster type and location
- **Story Generation** - Inspiring survival stories to educate and prepare users
- **Fallback System** - Comprehensive fallback data when AI services are unavailable

### APIs Integrated
- **IMD Weather APIs** - City weather, district warnings, rainfall data, nowcasts
- **Open-Meteo** - Global weather data as fallback
- **Real-time Processing** - Data refreshed every 15 minutes

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI**: Hugging Face Transformers (@huggingface/transformers)
- **HTTP Client**: Axios
- **State Management**: React Hooks + Local Storage
- **Notifications**: Sonner toast notifications
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 📱 Mobile-Ready Design

The application is built with responsive design and can be easily converted to a mobile app using:
- **Capacitor** (recommended) - for native iOS/Android apps
- **PWA** - Progressive Web App capabilities built-in

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <your-repo-url>
   cd disaster-alert
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**: Navigate to `http://localhost:8080`

### Environment Setup

The app works out-of-the-box with public APIs. For enhanced AI features, you can optionally configure:

- **Hugging Face API Key** (optional) - For enhanced AI model access
- **Firebase Config** (for notifications in production)
- **MongoDB Atlas** (for user data persistence in production)

## 📊 API Integrations

### Indian Meteorological Department (IMD)
- City Weather: `https://city.imd.gov.in/api/cityweather.php`
- Current Weather: `https://mausam.imd.gov.in/api/current_wx_api.php`
- District Warnings: `https://mausam.imd.gov.in/api/warnings_district_api.php`
- Rainfall Data: `https://mausam.imd.gov.in/api/districtwise_rainfall_api.php`
- And 15+ more specialized APIs

### Global Coverage
- **Open-Meteo API** - Worldwide weather data
- **Automatic Fallback** - Seamless switching between data sources

## 🏗️ Architecture

### Component Structure
```
src/
├── components/
│   ├── ui/                 # shadcn/ui base components
│   ├── Dashboard.tsx       # Main dashboard orchestrator
│   ├── SafetyStatus.tsx    # Safety level display
│   ├── AlertCard.tsx       # Individual alert cards
│   ├── DisasterGrid.tsx    # Disaster types grid
│   ├── DisasterIcon.tsx    # Disaster type icons
│   ├── PrecautionsModal.tsx # AI precautions modal
│   ├── StoriesModal.tsx    # AI stories modal
│   └── LocationSelector.tsx # Location selection
├── services/
│   ├── aiService.ts        # AI/ML integration
│   └── weatherService.ts   # Weather APIs integration
├── assets/                 # Images and static assets
└── pages/                  # Main application pages
```

### Key Services

#### AI Service (`aiService.ts`)
- WebGPU-accelerated inference (fallback to CPU)
- Smart prompt engineering for safety content
- Comprehensive fallback data system
- Error handling and retry logic

#### Weather Service (`weatherService.ts`)
- Multi-API integration with automatic failover
- Real-time data processing and analysis
- Location-based data fetching
- Alert severity calculation

## 🎨 Design System

### Color Scheme
- **Safety Levels**: Green (Safe), Yellow (Caution), Red (Danger)
- **Disaster Types**: Blue (Flood), Orange (Earthquake), Purple (Cyclone), Red (Heatwave)
- **Gradients**: Dynamic gradients for enhanced visual appeal
- **Dark/Light Mode**: Automatic theme adaptation

### Components
- Custom button variants for different alert levels
- Responsive grid layouts
- Accessible color contrasts
- Loading states and animations

## 🔧 Customization

### Adding New Disaster Types
1. Add to `DisasterType` union in `DisasterIcon.tsx`
2. Update `getDisasterInfo()` function
3. Add icon mapping in `DisasterIcon` component
4. Update fallback data in AI service

### Adding New Locations
1. Update city mapping in `weatherService.ts`
2. Add location options in `LocationSelector.tsx`
3. Configure API endpoints for new regions

### Enhancing AI Responses
1. Modify prompts in `aiService.ts`
2. Update fallback data arrays
3. Adjust response parsing logic

## 📈 Performance Optimizations

- **Lazy Loading** - Components loaded on demand
- **Caching** - Local storage for offline functionality
- **Debounced API calls** - Prevents excessive requests
- **Optimized Images** - WebP format with fallbacks
- **Bundle Splitting** - Optimal code splitting for fast loading

## 🌐 Internationalization

Currently supports English with Hindi support ready for implementation using react-i18next.

## 🚀 Deployment Options

### Web Deployment
- **Vercel/Netlify** - Zero-config deployment
- **Static Hosting** - Any CDN or web server

### Mobile App Deployment
```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# Initialize Capacitor
npx cap init

# Build and sync
npm run build
npx cap sync

# Open in native IDEs
npx cap open ios
npx cap open android
```

## 🔒 Security Features

- **Input Validation** - All user inputs sanitized
- **HTTPS Only** - Secure API communications
- **No API Keys Exposed** - Uses public APIs only
- **Privacy First** - Location data stored locally only
- **CORS Handling** - Proper cross-origin configurations

## 🧪 Testing

### Manual Testing Scenarios
1. **Location Selection** - Test various cities and countries
2. **Weather Data** - Verify API responses and fallbacks
3. **AI Generation** - Test precautions and stories generation
4. **Offline Mode** - Disconnect internet and verify cached data
5. **Responsive Design** - Test on mobile, tablet, desktop
6. **Error Handling** - Test API failures and recovery

### Load Testing
- API rate limits respected (15-30 minute intervals)
- Multiple concurrent user simulation
- Network failure recovery testing

## 📋 Production Checklist

### Before Go-Live
- [ ] Configure Firebase for notifications
- [ ] Set up MongoDB for user data
- [ ] Implement analytics tracking
- [ ] Add error monitoring (Sentry)
- [ ] Configure CDN for static assets
- [ ] Set up automated backups
- [ ] Implement rate limiting
- [ ] Add security headers
- [ ] Test disaster scenarios
- [ ] Verify mobile responsiveness

### Monitoring & Maintenance
- [ ] API health monitoring
- [ ] Performance metrics tracking
- [ ] User feedback collection
- [ ] Regular AI model updates
- [ ] Security vulnerability scanning
- [ ] Backup verification

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Contact

- **Issues**: GitHub Issues page
- **Documentation**: This README and inline code comments
- **Emergency**: For actual emergencies, contact local emergency services

## 🙏 Acknowledgments

- **Indian Meteorological Department** - Weather and disaster data
- **Hugging Face** - AI model hosting and inference
- **Open-Meteo** - Global weather data
- **shadcn/ui** - Beautiful UI components
- **Lucide** - Icon library

---

**⚠️ Important Disclaimer**: This application is for preparedness and educational purposes. Always follow official emergency services and local authorities' instructions during actual disasters.