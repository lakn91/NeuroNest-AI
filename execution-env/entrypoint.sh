#!/bin/bash

# This script serves as the entrypoint for the execution container
# It determines the project type and runs the appropriate commands

PROJECT_TYPE=${PROJECT_TYPE:-"web"}
PORT=${PORT:-3000}

echo "Starting project of type: $PROJECT_TYPE"

cd /app/project

case "$PROJECT_TYPE" in
  "web")
    echo "Starting web server on port $PORT"
    serve -s . -l $PORT
    ;;
    
  "node")
    echo "Installing Node.js dependencies"
    npm install
    
    if [ -f "package.json" ]; then
      if grep -q "\"start\"" package.json; then
        echo "Running npm start"
        npm start
      elif [ -f "index.js" ]; then
        echo "Running node index.js"
        node index.js
      elif [ -f "server.js" ]; then
        echo "Running node server.js"
        node server.js
      else
        echo "No entry point found"
        exit 1
      fi
    elif [ -f "index.js" ]; then
      echo "Running node index.js"
      node index.js
    elif [ -f "server.js" ]; then
      echo "Running node server.js"
      node server.js
    else
      echo "No entry point found"
      exit 1
    fi
    ;;
    
  "python")
    echo "Setting up Python environment"
    python3 -m venv venv
    source venv/bin/activate
    
    if [ -f "requirements.txt" ]; then
      echo "Installing Python dependencies"
      pip install -r requirements.txt
    fi
    
    if [ -f "main.py" ]; then
      echo "Running python main.py"
      python main.py
    elif [ -f "app.py" ]; then
      echo "Running python app.py"
      python app.py
    else
      echo "No entry point found"
      exit 1
    fi
    ;;
    
  *)
    echo "Unknown project type: $PROJECT_TYPE"
    exit 1
    ;;
esac