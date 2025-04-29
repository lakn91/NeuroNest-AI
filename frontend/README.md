# NeuroNest-AI Frontend

## Overview

This directory contains the frontend for the NeuroNest-AI project. It's built using React/Next.js and provides an interactive and user-friendly interface.

## Structure

```
frontend/
├── public/            # Public files and static assets
├── src/               # Source code
│   ├── components/    # Reusable React components
│   ├── contexts/      # React contexts for global state
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Next.js pages
│   ├── services/      # Services for interacting with the backend
│   ├── styles/        # Global CSS styles
│   └── utils/         # Helper functions
├── .env.example       # Example environment file
├── next.config.js     # Next.js configuration
├── package.json       # Project dependencies
└── tailwind.config.js # Tailwind CSS configuration
```

## Main Components

### Contexts

- **AuthContext**: Manages authentication and user state.
- **DatabaseContext**: Provides a unified interface for interacting with Firebase or Supabase.
- **ProjectContext**: Manages projects and their files.
- **ConversationContext**: Manages conversations with agents.
- **AgentContext**: Manages agents and their interactions.
- **AgentMemoryContext**: Manages agent memory.
- **RuntimeContext**: Manages the code execution environment.
- **SettingsContext**: Manages user settings.

### Services

- **firebaseService.js**: Provides an interface for interacting with Firebase.
- **supabaseService.js**: Provides an interface for interacting with Supabase.

### Components

- **auth/**: Authentication and user management components.
- **agent/**: Agent components and interaction interface.
- **editor/**: Code editor and editing components.
- **input/**: Input components including microphone.
- **runtime/**: Runtime environment and preview components.
- **settings/**: Settings components including dialect selection.

## Installation and Running

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and modify values as needed.

3. Run the local server:
   ```bash
   npm run dev
   ```

4. Open your browser at: `http://localhost:3000`

## Building for Production

```bash
npm run build
npm start
```

## Testing

```bash
npm run test
```

## Documentation

For more information about specific components and functions, see the comments in the code and README.md files in subdirectories.

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API.
- [React Documentation](https://reactjs.org/) - Learn more about React.
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework for styling.
- [Firebase Documentation](https://firebase.google.com/docs) - Firebase documentation.
- [Supabase Documentation](https://supabase.io/docs) - Supabase documentation.
