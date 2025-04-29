# NeuroNest-AI

![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

NeuroNest-AI is a comprehensive AI platform that provides an integrated environment for developing and running intelligent agents with full support for Arabic language and dialects.

## Features

- **Complete Firebase/Supabase Integration**: Full data storage, conversation history, and user settings.
- **Real Authentication System**: User account creation, login, and project/file storage.
- **Agent Memory Integration**: Agents remember previous interactions and project context.
- **Runtime & Preview Engine**: Real execution environment for created projects (Web Apps, Python Apps, etc.).
- **Smart UI**: Interactive agent workflow visualization, live code editor, and project management dashboard.
- **Advanced Agent Orchestration**: Dynamic decision-making logic for agent selection and tool usage.
- **Arabic Dialect Support**: Interface for selecting specific Arabic dialects for speech recognition.

## Project Structure

```
NeuroNest-AI/
├── frontend/                # React/Next.js frontend
│   ├── public/              # Static assets
│   └── src/                 # Source code
│       ├── components/      # React components
│       ├── contexts/        # React contexts
│       ├── pages/           # Next.js pages
│       └── services/        # API services
├── backend/                 # Node.js/Express backend
│   ├── routes/              # API routes
│   ├── controllers/         # Request handlers
│   ├── services/            # Business logic
│   └── middleware/          # Express middleware
├── supabase/                # Supabase configuration
│   ├── schema.sql           # Database schema
│   └── config.toml          # Supabase configuration
├── CHANGELOG.md             # Version history
├── VERSIONING_GUIDE.md      # Versioning guidelines
├── DOCUMENTATION_GUIDE.md   # Documentation guidelines
└── OVERVIEW.md              # Project overview
```

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Firebase account (optional)
- Supabase account (optional)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/NIR64Ft/NeuroNest-AI.git
   cd NeuroNest-AI
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd ../backend
   npm install
   ```

4. Set up environment variables:
   - Copy `.env.example` to `.env.local` in the frontend directory
   - Copy `.env.example` to `.env` in the backend directory
   - Fill in the required values

5. Start the development servers:
   ```bash
   # In the frontend directory
   npm run dev
   
   # In the backend directory
   npm run dev
   ```

## Documentation

- [Project Overview](OVERVIEW.md): General information about the project structure and components.
- [Versioning Guide](VERSIONING_GUIDE.md): Guidelines for versioning the project.
- [Documentation Guide](DOCUMENTATION_GUIDE.md): Guidelines for documenting the project.
- [Changelog](CHANGELOG.md): Version history and changes.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the foundation models
- OpenRouter for API integration
- Firebase and Supabase for backend services
