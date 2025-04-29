# Contexts

This directory contains React context providers for managing global state in the NeuroNest-AI frontend.

## Available Contexts

- **AuthContext**: Manages user authentication state.
  - Provides user login, registration, and logout functionality.
  - Tracks the current user and authentication status.

- **DatabaseContext**: Provides a unified interface for database operations.
  - Abstracts Firebase and Supabase implementations.
  - Allows switching between database providers.

- **ProjectContext**: Manages project state and operations.
  - Provides project creation, retrieval, updating, and deletion.
  - Manages project files and metadata.

- **ConversationContext**: Manages conversation history.
  - Stores and retrieves conversation messages.
  - Provides real-time updates for ongoing conversations.

- **AgentContext**: Manages agent orchestration.
  - Coordinates between different agent types.
  - Handles agent selection and execution flow.

- **AgentMemoryContext**: Manages agent memory persistence.
  - Stores and retrieves agent memory.
  - Provides context awareness across sessions.

- **RuntimeContext**: Manages code execution environment.
  - Provides code execution capabilities.
  - Manages runtime output and state.

- **SettingsContext**: Manages user settings.
  - Stores user preferences.
  - Provides dialect selection for voice input.

## Usage

Wrap your application or component tree with the context providers:

```jsx
import { AuthProvider } from '../contexts/AuthContext';
import { ProjectProvider } from '../contexts/ProjectContext';

function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        {/* Your app components */}
      </ProjectProvider>
    </AuthProvider>
  );
}
```

Use the context in your components:

```jsx
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';

function Dashboard() {
  const { user } = useAuth();
  const { projects, createProject } = useProjects();

  return (
    <div>
      <h1>Welcome, {user.displayName}</h1>
      <button onClick={() => createProject('New Project')}>Create Project</button>
      {/* Display projects */}
    </div>
  );
}
```

## Context Structure

Each context typically consists of:

1. A context object created with `React.createContext()`.
2. A provider component that manages state and provides values/functions.
3. A custom hook for consuming the context.

Example:

```jsx
// AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authentication logic...

  const value = {
    user,
    loading,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```
