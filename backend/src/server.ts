import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as admin from 'firebase-admin';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
try {
  // Check if Firebase credentials are provided
  if (process.env.FIREBASE_PROJECT_ID) {
    // If service account key is provided as a JSON string in env var
    if (process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines in the private key
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    } else {
      // Try to use default credentials or service account file
      const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    console.warn('Firebase credentials not provided. Firebase functionality will be limited.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
}

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io setup
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Database connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('MongoDB URI not provided. Database functionality will be limited.');
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Import routes and agent registry
import routes from './routes';
import { 
  AgentRegistry, 
  ThinkingAgent, 
  DeveloperAgent, 
  EditorAgent, 
  OrchestratorAgent 
} from './agents';

// Initialize agent registry
const initializeAgentRegistry = () => {
  const registry = AgentRegistry.getInstance();
  
  // Register agent types
  registry.registerAgentType('thinking', (es, llm) => new ThinkingAgent(es, llm));
  registry.registerAgentType('developer', (es, llm) => new DeveloperAgent(es, llm));
  registry.registerAgentType('editor', (es, llm) => new EditorAgent(es, llm));
  registry.registerAgentType('orchestrator', (es, llm) => new OrchestratorAgent(es, llm));
  
  console.log('Agent registry initialized with agent types:', registry.getAgentTypes());
};

// Initialize agent registry
initializeAgentRegistry();

// Routes
app.get('/', (req, res) => {
  res.send('NeuroNest-AI API is running');
});

// API routes
app.use('/api', routes);

// Import LLM service
import { createLLMProvider } from './services/llmService';
import { DefaultEventStream, Observation } from './agents';

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Handle user messages
  socket.on('user-message', async (data) => {
    try {
      const { message, context } = data;
      console.log('Received message:', message);
      
      if (!message) {
        socket.emit('agent-response', {
          type: 'error',
          content: 'Message is required'
        });
        return;
      }
      
      // Extract API settings from context
      const apiSettings = {
        provider: context?.apiSettings?.provider || process.env.DEFAULT_AI_PROVIDER || 'gemini',
        apiKey: context?.apiSettings?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
        modelName: context?.apiSettings?.modelName,
        temperature: context?.apiSettings?.temperature
      };
      
      // Add API settings to context
      const enrichedContext = {
        ...context,
        apiSettings,
        socketId: socket.id
      };
      
      // Create LLM provider based on API settings
      let llmProvider;
      
      if (apiSettings.apiKey) {
        try {
          llmProvider = createLLMProvider(
            apiSettings.provider,
            apiSettings.apiKey,
            {
              modelName: apiSettings.modelName,
              temperature: apiSettings.temperature
            }
          );
        } catch (error) {
          console.error('Error creating LLM provider:', error);
          socket.emit('agent-response', {
            type: 'error',
            content: 'Failed to initialize AI provider'
          });
          return;
        }
      } else {
        socket.emit('agent-response', {
          type: 'error',
          content: 'No API key provided. Please configure your API key in settings.'
        });
        return;
      }
      
      // Get the agent registry
      const registry = AgentRegistry.getInstance();
      
      // Create a new event stream that emits events to the socket
      const eventStream = new DefaultEventStream();
      eventStream.on('action', (action) => {
        socket.emit('agent-action', action);
      });
      
      // Create an orchestrator agent
      const orchestrator = await registry.createAgent(
        'orchestrator',
        { 
          id: `orchestrator-${socket.id}`, 
          name: 'Orchestrator Agent', 
          description: 'Coordinates between agents and manages workflow' 
        },
        eventStream,
        llmProvider
      );
      
      // Create an observation from the message
      const observation = Observation.createUserMessageObservation('user', message);
      observation.data.context = enrichedContext;
      
      // Process the observation
      const action = await orchestrator.process(observation);
      
      // Convert the action to a response format
      let responses;
      if (action.data.type === 'composite' && Array.isArray(action.data.responses)) {
        responses = action.data.responses;
      } else {
        responses = [action.data];
      }
      
      // Send responses back to client
      responses.forEach(response => {
        socket.emit('agent-response', response);
      });
      
      // Clean up the agent when done
      registry.removeAgent(orchestrator.id);
      
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('agent-response', {
        type: 'error',
        content: 'Failed to process message'
      });
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});

export default server;