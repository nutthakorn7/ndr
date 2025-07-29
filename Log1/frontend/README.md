# Authentication Log Management Frontend

A modern React-based frontend for the Authentication Log Management System, designed for compliance with the Thai Computer Crime Act.

## Features

- **Modern UI/UX**: Built with React 18, Tailwind CSS, and Heroicons
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Updates**: Uses React Query for efficient data fetching and caching
- **Authentication**: Secure login system with JWT token management
- **Dashboard**: Comprehensive overview with charts and statistics
- **Log Management**: Advanced filtering, search, and export capabilities
- **Source Management**: CRUD operations for log sources with connection testing
- **Analytics**: Interactive charts and data visualization
- **Security Alerts**: Real-time monitoring and alert management
- **Compliance Reports**: Thai Computer Crime Act compliance documentation

## Technology Stack

- **React 18**: Modern React with hooks and functional components
- **React Router**: Client-side routing
- **React Query**: Data fetching and state management
- **Tailwind CSS**: Utility-first CSS framework
- **Heroicons**: Beautiful SVG icons
- **Recharts**: Data visualization library
- **React Hook Form**: Form handling and validation
- **React Hot Toast**: Toast notifications
- **Axios**: HTTP client for API communication

## Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   └── LoginForm.js
│   │   └── Layout/
│   │       ├── Header.js
│   │       ├── Sidebar.js
│   │       └── Layout.js
│   ├── contexts/
│   │   └── AuthContext.js
│   ├── pages/
│   │   ├── Dashboard.js
│   │   ├── Logs.js
│   │   ├── Sources.js
│   │   ├── Analytics.js
│   │   ├── Alerts.js
│   │   └── Compliance.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── Dockerfile
├── nginx.conf
└── README.md
```

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Local Development

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

### Docker Deployment

1. **Build the Docker image:**
   ```bash
   docker build -t auth-log-frontend .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3000:80 auth-log-frontend
   ```

3. **Using Docker Compose:**
   ```bash
   docker-compose up frontend
   ```

## Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:8000
```

### API Configuration

The frontend communicates with the backend API through the `src/services/api.js` file. Key features:

- **Automatic token management**: JWT tokens are automatically handled
- **Request/response interceptors**: Automatic token refresh and error handling
- **Base URL configuration**: Configurable API endpoint

## Key Components

### Authentication

- **LoginForm**: Secure login interface with form validation
- **AuthContext**: Global authentication state management
- **Protected Routes**: Automatic redirection for unauthenticated users

### Layout

- **Sidebar**: Navigation menu with collapsible design
- **Header**: Top navigation with user menu and notifications
- **Layout**: Main layout wrapper with responsive design

### Pages

- **Dashboard**: Overview with statistics and charts
- **Logs**: Log management with filtering and export
- **Sources**: Log source configuration and management
- **Analytics**: Data visualization and trend analysis
- **Alerts**: Security alert monitoring and management
- **Compliance**: Thai Computer Crime Act compliance reports

## API Integration

The frontend integrates with the backend API through the following endpoints:

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Token refresh
- `GET /auth/permissions` - User permissions

### Logs
- `GET /logs` - Retrieve logs with filtering
- `GET /logs/stats` - Log statistics
- `GET /logs/export/{format}` - Export logs
- `DELETE /logs/cleanup` - Clean up old logs

### Sources
- `GET /sources` - List log sources
- `POST /sources` - Create new source
- `PUT /sources/{id}` - Update source
- `DELETE /sources/{id}` - Delete source
- `POST /sources/test-connection` - Test connection
- `POST /sources/{id}/collect` - Collect logs

### Analytics
- `GET /analytics/dashboard` - Dashboard data
- `GET /analytics/security-alerts` - Security alerts
- `GET /analytics/compliance-report` - Compliance reports
- `GET /analytics/trends` - Trend analysis
- `GET /analytics/geographic` - Geographic data

## Styling

The application uses Tailwind CSS for styling with custom components:

### Custom Classes

- `.btn-primary` - Primary button styling
- `.btn-secondary` - Secondary button styling
- `.btn-danger` - Danger button styling
- `.input-field` - Form input styling
- `.card` - Card container styling
- `.table-header` - Table header styling
- `.table-cell` - Table cell styling

### Color Scheme

- **Primary**: Blue (#3B82F6)
- **Secondary**: Gray (#64748B)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)

## Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Code Style

- Use functional components with hooks
- Follow React best practices
- Use TypeScript-like prop validation
- Maintain consistent naming conventions

### Testing

The application includes basic testing setup with React Testing Library:

```bash
npm test
```

## Deployment

### Production Build

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Serve with nginx:**
   The Dockerfile includes nginx configuration for production serving.

### Environment Configuration

For production deployment, ensure the following environment variables are set:

- `REACT_APP_API_URL` - Backend API URL
- `NODE_ENV=production` - Production environment

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Automatic Token Refresh**: Seamless token renewal
- **CORS Protection**: Configured CORS headers
- **XSS Protection**: Security headers in nginx configuration
- **Content Security Policy**: CSP headers for additional security

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Verify backend is running
   - Check `REACT_APP_API_URL` configuration
   - Ensure CORS is properly configured

2. **Build Errors**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are installed

3. **Docker Issues**
   - Ensure Docker is running
   - Check port availability
   - Verify Dockerfile syntax

### Debug Mode

Enable debug mode by setting:

```env
REACT_APP_DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Check the documentation
- Review the backend API documentation
- Open an issue on GitHub
- Contact the development team 