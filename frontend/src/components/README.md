# Components

This directory contains reusable React components for the NeuroNest-AI frontend.

## Structure

- **agent/**: Components related to agent interaction and visualization.
  - `AgentWorkflow.jsx`: Visualizes the agent workflow and decision-making process.

- **auth/**: Authentication-related components.
  - `ProtectedRoute.jsx`: Route component that requires authentication.
  - `LoginForm.jsx`: User login form.
  - `RegisterForm.jsx`: User registration form.

- **editor/**: Code editing components.
  - `CodeEditor.jsx`: Monaco-based code editor with syntax highlighting.

- **input/**: User input components.
  - `VoiceInput.jsx`: Microphone input with dialect selection.
  - `TextInput.jsx`: Text input for chat and commands.

- **runtime/**: Code execution components.
  - `RuntimePreview.jsx`: Preview and execution environment for projects.

- **settings/**: User settings components.
  - `DialectSelector.jsx`: Arabic dialect selection component.

## Usage

Import components as needed in your pages or other components:

```jsx
import CodeEditor from '../components/editor/CodeEditor';
import VoiceInput from '../components/input/VoiceInput';

function MyPage() {
  return (
    <div>
      <CodeEditor language="javascript" value={code} onChange={handleCodeChange} />
      <VoiceInput onSpeechRecognized={handleSpeech} dialect="egyptian" />
    </div>
  );
}
```

## Documentation

Each component should have JSDoc comments explaining its props and usage. For example:

```jsx
/**
 * CodeEditor component for editing code with syntax highlighting
 * 
 * @param {Object} props
 * @param {string} props.language - Programming language for syntax highlighting
 * @param {string} props.value - Initial code value
 * @param {function} props.onChange - Callback when code changes
 * @param {boolean} [props.readOnly=false] - Whether the editor is read-only
 * @returns {JSX.Element}
 */
```
