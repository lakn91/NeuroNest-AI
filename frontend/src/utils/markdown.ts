import { marked } from 'marked';
import Prism from 'prismjs';

// Import Prism language components
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';

// Configure marked to use Prism for syntax highlighting
marked.setOptions({
  highlight: (code, lang) => {
    if (Prism.languages[lang]) {
      return Prism.highlight(code, Prism.languages[lang], lang);
    }
    return code;
  },
  breaks: true,
  gfm: true,
});

/**
 * Parse markdown to HTML with syntax highlighting
 * @param markdown The markdown string to parse
 * @returns HTML string with syntax highlighting
 */
export const parseMarkdown = (markdown: string): string => {
  return marked.parse(markdown);
};

/**
 * Highlight code with Prism
 * @param code The code to highlight
 * @param language The programming language
 * @returns HTML string with syntax highlighting
 */
export const highlightCode = (code: string, language: string): string => {
  if (Prism.languages[language]) {
    return Prism.highlight(code, Prism.languages[language], language);
  }
  return code;
};

/**
 * Get the appropriate language class for Prism
 * @param language The programming language
 * @returns The language class for Prism
 */
export const getLanguageClass = (language: string): string => {
  return `language-${language}`;
};

export default {
  parseMarkdown,
  highlightCode,
  getLanguageClass,
};