"""
Code Analysis Service - Provides static code analysis functionality
"""

import os
import json
import subprocess
import tempfile
from typing import Dict, List, Any, Optional, Union
import pylint.lint
from pylint.reporters.json_reporter import JSONReporter
from io import StringIO
import ast
from tree_sitter import Language, Parser

class CodeAnalysisService:
    """Service for analyzing code using various static analysis tools"""
    
    def __init__(self):
        """Initialize the code analysis service"""
        # Initialize tree-sitter parser
        self._init_tree_sitter()
    
    def _init_tree_sitter(self):
        """Initialize tree-sitter language parsers"""
        # Path to tree-sitter language libraries
        # In production, these should be pre-built and stored in a known location
        try:
            # Try to load pre-built languages
            self.PY_LANGUAGE = Language('/tmp/tree-sitter-languages.so', 'python')
            self.JS_LANGUAGE = Language('/tmp/tree-sitter-languages.so', 'javascript')
            self.TS_LANGUAGE = Language('/tmp/tree-sitter-languages.so', 'typescript')
        except:
            # Build languages if not available
            # Note: In production, this should be done during deployment
            Language.build_library(
                '/tmp/tree-sitter-languages.so',
                [
                    '/tmp/tree-sitter-python',
                    '/tmp/tree-sitter-javascript',
                    '/tmp/tree-sitter-typescript'
                ]
            )
            self.PY_LANGUAGE = Language('/tmp/tree-sitter-languages.so', 'python')
            self.JS_LANGUAGE = Language('/tmp/tree-sitter-languages.so', 'javascript')
            self.TS_LANGUAGE = Language('/tmp/tree-sitter-languages.so', 'typescript')
        
        # Create parsers
        self.py_parser = Parser()
        self.py_parser.set_language(self.PY_LANGUAGE)
        
        self.js_parser = Parser()
        self.js_parser.set_language(self.JS_LANGUAGE)
        
        self.ts_parser = Parser()
        self.ts_parser.set_language(self.TS_LANGUAGE)
    
    def analyze_python_code(self, code: str) -> Dict[str, Any]:
        """
        Analyze Python code using Pylint
        
        Args:
            code: Python code as string
            
        Returns:
            Dictionary with analysis results
        """
        # Create a temporary file for the code
        with tempfile.NamedTemporaryFile(suffix='.py', delete=False) as temp_file:
            temp_file.write(code.encode('utf-8'))
            temp_file_path = temp_file.name
        
        try:
            # Run pylint with JSON reporter
            output_stream = StringIO()
            reporter = JSONReporter(output_stream)
            
            # Configure pylint arguments
            args = [
                '--disable=all',
                '--enable=E,F,W,R,C',  # Enable errors, fatals, warnings, refactors, conventions
                '--output-format=json',
                temp_file_path
            ]
            
            # Run pylint
            pylint.lint.Run(args, reporter=reporter, exit=False)
            
            # Get JSON output
            output_stream.seek(0)
            result = json.loads(output_stream.read())
            
            # Parse AST for structure analysis
            with open(temp_file_path, 'r') as f:
                tree = ast.parse(f.read())
            
            # Extract functions and classes
            functions = []
            classes = []
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    functions.append({
                        'name': node.name,
                        'line': node.lineno,
                        'args': [arg.arg for arg in node.args.args],
                        'docstring': ast.get_docstring(node)
                    })
                elif isinstance(node, ast.ClassDef):
                    methods = []
                    for item in node.body:
                        if isinstance(item, ast.FunctionDef):
                            methods.append({
                                'name': item.name,
                                'line': item.lineno,
                                'args': [arg.arg for arg in item.args.args if arg.arg != 'self'],
                                'docstring': ast.get_docstring(item)
                            })
                    
                    classes.append({
                        'name': node.name,
                        'line': node.lineno,
                        'methods': methods,
                        'docstring': ast.get_docstring(node)
                    })
            
            # Combine results
            return {
                'issues': result,
                'structure': {
                    'functions': functions,
                    'classes': classes
                }
            }
        
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
    
    def analyze_javascript_code(self, code: str) -> Dict[str, Any]:
        """
        Analyze JavaScript code using ESLint
        
        Args:
            code: JavaScript code as string
            
        Returns:
            Dictionary with analysis results
        """
        # Create a temporary file for the code
        with tempfile.NamedTemporaryFile(suffix='.js', delete=False) as temp_file:
            temp_file.write(code.encode('utf-8'))
            temp_file_path = temp_file.name
        
        try:
            # Run ESLint
            eslint_cmd = [
                'npx', 'eslint',
                '--format', 'json',
                temp_file_path
            ]
            
            try:
                result = subprocess.run(
                    eslint_cmd,
                    capture_output=True,
                    text=True,
                    check=False
                )
                
                # Parse ESLint output
                if result.stdout:
                    eslint_results = json.loads(result.stdout)
                else:
                    eslint_results = []
            
            except (subprocess.SubprocessError, json.JSONDecodeError) as e:
                eslint_results = [{"error": f"ESLint error: {str(e)}"}]
            
            # Parse with tree-sitter for structure analysis
            tree = self.js_parser.parse(bytes(code, 'utf-8'))
            
            # Extract functions and classes using tree-sitter
            functions = []
            classes = []
            
            # Helper function to extract functions and classes
            def extract_structure(node, code_bytes):
                if node.type == 'function_declaration':
                    # Extract function name
                    name_node = node.child_by_field_name('name')
                    if name_node:
                        name = code_bytes[name_node.start_byte:name_node.end_byte].decode('utf-8')
                        
                        # Extract parameters
                        params = []
                        params_node = node.child_by_field_name('parameters')
                        if params_node:
                            for child in params_node.children:
                                if child.type == 'identifier':
                                    params.append(code_bytes[child.start_byte:child.end_byte].decode('utf-8'))
                        
                        functions.append({
                            'name': name,
                            'line': node.start_point[0] + 1,
                            'params': params
                        })
                
                elif node.type == 'class_declaration':
                    # Extract class name
                    name_node = node.child_by_field_name('name')
                    if name_node:
                        name = code_bytes[name_node.start_byte:name_node.end_byte].decode('utf-8')
                        
                        # Extract methods
                        methods = []
                        body_node = node.child_by_field_name('body')
                        if body_node:
                            for child in body_node.children:
                                if child.type == 'method_definition':
                                    method_name_node = child.child_by_field_name('name')
                                    if method_name_node:
                                        method_name = code_bytes[method_name_node.start_byte:method_name_node.end_byte].decode('utf-8')
                                        
                                        # Extract parameters
                                        method_params = []
                                        method_params_node = child.child_by_field_name('parameters')
                                        if method_params_node:
                                            for param in method_params_node.children:
                                                if param.type == 'identifier':
                                                    method_params.append(code_bytes[param.start_byte:param.end_byte].decode('utf-8'))
                                        
                                        methods.append({
                                            'name': method_name,
                                            'line': child.start_point[0] + 1,
                                            'params': method_params
                                        })
                        
                        classes.append({
                            'name': name,
                            'line': node.start_point[0] + 1,
                            'methods': methods
                        })
                
                # Recursively process children
                for child in node.children:
                    extract_structure(child, code_bytes)
            
            # Process the tree
            code_bytes = bytes(code, 'utf-8')
            extract_structure(tree.root_node, code_bytes)
            
            # Combine results
            return {
                'issues': eslint_results,
                'structure': {
                    'functions': functions,
                    'classes': classes
                }
            }
        
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
    
    def analyze_typescript_code(self, code: str) -> Dict[str, Any]:
        """
        Analyze TypeScript code
        
        Args:
            code: TypeScript code as string
            
        Returns:
            Dictionary with analysis results
        """
        # Create a temporary file for the code
        with tempfile.NamedTemporaryFile(suffix='.ts', delete=False) as temp_file:
            temp_file.write(code.encode('utf-8'))
            temp_file_path = temp_file.name
        
        try:
            # Run ESLint with TypeScript parser
            eslint_cmd = [
                'npx', 'eslint',
                '--format', 'json',
                '--parser', '@typescript-eslint/parser',
                temp_file_path
            ]
            
            try:
                result = subprocess.run(
                    eslint_cmd,
                    capture_output=True,
                    text=True,
                    check=False
                )
                
                # Parse ESLint output
                if result.stdout:
                    eslint_results = json.loads(result.stdout)
                else:
                    eslint_results = []
            
            except (subprocess.SubprocessError, json.JSONDecodeError) as e:
                eslint_results = [{"error": f"ESLint error: {str(e)}"}]
            
            # Parse with tree-sitter for structure analysis
            tree = self.ts_parser.parse(bytes(code, 'utf-8'))
            
            # Extract functions, classes and interfaces using tree-sitter
            functions = []
            classes = []
            interfaces = []
            
            # Helper function to extract TypeScript structures
            def extract_ts_structure(node, code_bytes):
                if node.type == 'function_declaration':
                    # Extract function name
                    name_node = node.child_by_field_name('name')
                    if name_node:
                        name = code_bytes[name_node.start_byte:name_node.end_byte].decode('utf-8')
                        
                        # Extract parameters
                        params = []
                        params_node = node.child_by_field_name('parameters')
                        if params_node:
                            for child in params_node.children:
                                if child.type == 'required_parameter' or child.type == 'optional_parameter':
                                    param_name_node = child.child_by_field_name('pattern')
                                    if param_name_node:
                                        params.append(code_bytes[param_name_node.start_byte:param_name_node.end_byte].decode('utf-8'))
                        
                        # Extract return type
                        return_type = None
                        type_node = node.child_by_field_name('return_type')
                        if type_node:
                            return_type = code_bytes[type_node.start_byte:type_node.end_byte].decode('utf-8')
                        
                        functions.append({
                            'name': name,
                            'line': node.start_point[0] + 1,
                            'params': params,
                            'return_type': return_type
                        })
                
                elif node.type == 'class_declaration':
                    # Extract class name
                    name_node = node.child_by_field_name('name')
                    if name_node:
                        name = code_bytes[name_node.start_byte:name_node.end_byte].decode('utf-8')
                        
                        # Extract methods
                        methods = []
                        body_node = node.child_by_field_name('body')
                        if body_node:
                            for child in body_node.children:
                                if child.type == 'method_definition':
                                    method_name_node = child.child_by_field_name('name')
                                    if method_name_node:
                                        method_name = code_bytes[method_name_node.start_byte:method_name_node.end_byte].decode('utf-8')
                                        
                                        # Extract parameters
                                        method_params = []
                                        method_params_node = child.child_by_field_name('parameters')
                                        if method_params_node:
                                            for param in method_params_node.children:
                                                if param.type == 'required_parameter' or param.type == 'optional_parameter':
                                                    param_name_node = param.child_by_field_name('pattern')
                                                    if param_name_node:
                                                        method_params.append(code_bytes[param_name_node.start_byte:param_name_node.end_byte].decode('utf-8'))
                                        
                                        methods.append({
                                            'name': method_name,
                                            'line': child.start_point[0] + 1,
                                            'params': method_params
                                        })
                        
                        classes.append({
                            'name': name,
                            'line': node.start_point[0] + 1,
                            'methods': methods
                        })
                
                elif node.type == 'interface_declaration':
                    # Extract interface name
                    name_node = node.child_by_field_name('name')
                    if name_node:
                        name = code_bytes[name_node.start_byte:name_node.end_byte].decode('utf-8')
                        
                        # Extract properties
                        properties = []
                        body_node = node.child_by_field_name('body')
                        if body_node:
                            for child in body_node.children:
                                if child.type == 'property_signature':
                                    prop_name_node = child.child_by_field_name('name')
                                    if prop_name_node:
                                        prop_name = code_bytes[prop_name_node.start_byte:prop_name_node.end_byte].decode('utf-8')
                                        
                                        # Extract type
                                        prop_type = None
                                        type_node = child.child_by_field_name('type')
                                        if type_node:
                                            prop_type = code_bytes[type_node.start_byte:type_node.end_byte].decode('utf-8')
                                        
                                        properties.append({
                                            'name': prop_name,
                                            'type': prop_type,
                                            'line': child.start_point[0] + 1
                                        })
                        
                        interfaces.append({
                            'name': name,
                            'line': node.start_point[0] + 1,
                            'properties': properties
                        })
                
                # Recursively process children
                for child in node.children:
                    extract_ts_structure(child, code_bytes)
            
            # Process the tree
            code_bytes = bytes(code, 'utf-8')
            extract_ts_structure(tree.root_node, code_bytes)
            
            # Combine results
            return {
                'issues': eslint_results,
                'structure': {
                    'functions': functions,
                    'classes': classes,
                    'interfaces': interfaces
                }
            }
        
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
    
    def analyze_code(self, code: str, language: str) -> Dict[str, Any]:
        """
        Analyze code in the specified language
        
        Args:
            code: Code as string
            language: Programming language ('python', 'javascript', 'typescript', etc.)
            
        Returns:
            Dictionary with analysis results
        """
        language = language.lower()
        
        # Use LangChain for advanced code analysis
        try:
            from langchain_openai import ChatOpenAI
            from langchain.prompts import ChatPromptTemplate
            
            # Initialize language model
            llm = ChatOpenAI(temperature=0)
            
            # Create prompt template for code analysis
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a code analysis expert. Analyze the provided code and provide insights about:
                1. Code quality
                2. Potential bugs or issues
                3. Performance concerns
                4. Security vulnerabilities
                5. Best practices that could be applied
                
                Format your response as a JSON object with the following structure:
                {
                    "quality_score": number between 0-10,
                    "issues": [
                        {
                            "type": "bug|performance|security|style",
                            "description": "Description of the issue",
                            "line": line number or null if not applicable,
                            "severity": "high|medium|low",
                            "suggestion": "Suggestion to fix the issue"
                        }
                    ],
                    "summary": "Brief summary of the code quality"
                }
                """),
                ("human", f"Language: {language}\n\nCode:\n```{language}\n{code}\n```")
            ])
            
            # Get analysis from LLM
            response = llm.invoke(prompt)
            
            try:
                # Parse JSON response
                import json
                llm_analysis = json.loads(response.content)
            except json.JSONDecodeError:
                llm_analysis = {
                    "error": "Failed to parse LLM response",
                    "raw_response": response.content
                }
            
            # Combine with traditional analysis
            if language == 'python':
                traditional_analysis = self.analyze_python_code(code)
            elif language == 'javascript':
                traditional_analysis = self.analyze_javascript_code(code)
            elif language == 'typescript':
                traditional_analysis = self.analyze_typescript_code(code)
            else:
                # For unsupported languages, use tree-sitter if available
                try:
                    # Try to parse with tree-sitter
                    tree = None
                    if hasattr(self, f"{language}_parser"):
                        parser = getattr(self, f"{language}_parser")
                        tree = parser.parse(bytes(code, 'utf-8'))
                    
                    traditional_analysis = {
                        "issues": [],
                        "structure": {
                            "functions": [],
                            "classes": []
                        }
                    }
                except Exception as e:
                    traditional_analysis = {
                        "error": f"Unsupported language for traditional analysis: {language}",
                        "exception": str(e)
                    }
            
            # Combine results
            return {
                "traditional_analysis": traditional_analysis,
                "llm_analysis": llm_analysis
            }
            
        except ImportError:
            # Fallback to traditional analysis if LangChain is not available
            if language == 'python':
                return self.analyze_python_code(code)
            elif language == 'javascript':
                return self.analyze_javascript_code(code)
            elif language == 'typescript':
                return self.analyze_typescript_code(code)
            else:
                raise ValueError(f"Unsupported language: {language}")
    
    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze a file based on its extension
        
        Args:
            file_path: Path to the file
            
        Returns:
            Dictionary with analysis results
        """
        if not os.path.isfile(file_path):
            raise ValueError(f"File not found: {file_path}")
        
        # Determine language from file extension
        _, ext = os.path.splitext(file_path)
        
        language = None
        if ext.lower() in ['.py']:
            language = 'python'
        elif ext.lower() in ['.js', '.jsx']:
            language = 'javascript'
        elif ext.lower() in ['.ts', '.tsx']:
            language = 'typescript'
        else:
            raise ValueError(f"Unsupported file extension: {ext}")
        
        # Read file content
        with open(file_path, 'r', encoding='utf-8') as f:
            code = f.read()
        
        # Analyze code
        return self.analyze_code(code, language)
    
    def analyze_project(self, project_path: str, include_patterns: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Analyze a project directory
        
        Args:
            project_path: Path to the project directory
            include_patterns: Optional list of file patterns to include (e.g., ['*.py', '*.js'])
            
        Returns:
            Dictionary with analysis results for all supported files
        """
        if not os.path.isdir(project_path):
            raise ValueError(f"Directory not found: {project_path}")
        
        # Default patterns if none provided
        if not include_patterns:
            include_patterns = ['*.py', '*.js', '*.jsx', '*.ts', '*.tsx']
        
        # Find all matching files
        matching_files = []
        for root, _, files in os.walk(project_path):
            for file in files:
                file_path = os.path.join(root, file)
                
                # Check if file matches any pattern
                for pattern in include_patterns:
                    if self._matches_pattern(file, pattern):
                        matching_files.append(file_path)
                        break
        
        # Analyze each file
        results = {}
        for file_path in matching_files:
            try:
                rel_path = os.path.relpath(file_path, project_path)
                results[rel_path] = self.analyze_file(file_path)
            except Exception as e:
                results[rel_path] = {"error": str(e)}
        
        return results
    
    def _matches_pattern(self, filename: str, pattern: str) -> bool:
        """
        Check if a filename matches a pattern
        
        Args:
            filename: Filename to check
            pattern: Pattern to match (e.g., '*.py')
            
        Returns:
            True if filename matches pattern, False otherwise
        """
        import fnmatch
        return fnmatch.fnmatch(filename, pattern)