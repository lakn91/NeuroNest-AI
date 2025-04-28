/**
 * Read a file as text
 * @param file The file to read
 * @returns A promise that resolves with the file content as text
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Read a file as data URL
 * @param file The file to read
 * @returns A promise that resolves with the file content as data URL
 */
export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Read a file as array buffer
 * @param file The file to read
 * @returns A promise that resolves with the file content as array buffer
 */
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as ArrayBuffer);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Get file extension
 * @param filename The filename
 * @returns The file extension (without the dot)
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Check if a file is a text file
 * @param file The file to check
 * @returns True if the file is a text file
 */
export const isTextFile = (file: File): boolean => {
  const textTypes = [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/typescript',
  ];
  
  // Check MIME type
  if (textTypes.includes(file.type)) {
    return true;
  }
  
  // Check extension for common text file types
  const extension = getFileExtension(file.name).toLowerCase();
  const textExtensions = [
    'txt', 'html', 'htm', 'css', 'js', 'ts', 'json', 'xml',
    'md', 'markdown', 'csv', 'log', 'yml', 'yaml', 'toml',
    'py', 'java', 'c', 'cpp', 'h', 'cs', 'php', 'rb', 'go',
    'rs', 'swift', 'kt', 'sh', 'bat', 'ps1', 'sql'
  ];
  
  return textExtensions.includes(extension);
};

export default {
  readFileAsText,
  readFileAsDataURL,
  readFileAsArrayBuffer,
  getFileExtension,
  isTextFile,
};