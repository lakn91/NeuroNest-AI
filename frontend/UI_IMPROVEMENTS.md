# توصيات تحسين واجهة المستخدم لـ NeuroNest-AI

## مقدمة

هذا المستند يقدم توصيات لتحسين واجهة المستخدم الأمامية (Frontend) لمنصة NeuroNest-AI لتتكامل بشكل أفضل مع المكونات الجديدة التي تم إضافتها في الخلفية (Backend). هذه التحسينات ستمكن المستخدمين من الاستفادة الكاملة من قدرات LangChain وLlamaIndex وChroma وأدوات تحليل الكود.

## التحسينات المقترحة

### 1. محرر الكود المباشر

**الوصف:**
تطوير محرر كود متكامل يتيح للمستخدمين كتابة وتنفيذ الكود مباشرة في المنصة، مع دعم للإكمال التلقائي والتلميحات الذكية.

**المكونات:**
- محرر كود مبني على Monaco Editor (المستخدم في VS Code)
- دعم التلوين النحوي (Syntax Highlighting) للغات المختلفة
- إكمال تلقائي مدعوم بالذكاء الاصطناعي
- عرض الأخطاء والتحذيرات في الوقت الفعلي
- زر لتنفيذ الكود مباشرة في بيئة آمنة

**التنفيذ:**
```javascript
import MonacoEditor from 'react-monaco-editor';

function CodeEditor({ code, onChange, language }) {
  return (
    <MonacoEditor
      width="100%"
      height="500px"
      language={language}
      theme="vs-dark"
      value={code}
      onChange={onChange}
      options={{
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: false,
        cursorStyle: 'line',
        automaticLayout: true,
      }}
    />
  );
}

function CodeOutput({ output, isLoading, error }) {
  return (
    <div className="code-output">
      <div className="output-header">
        <h3>المخرجات</h3>
        {isLoading && <span className="loading-indicator">جاري التنفيذ...</span>}
      </div>
      <pre className={`output-content ${error ? 'error' : ''}`}>
        {error ? error : output || 'لا توجد مخرجات بعد'}
      </pre>
    </div>
  );
}

import SplitPane from 'react-split-pane';

function CodeWorkspace({ code, output, language, onChange }) {
  return (
    <SplitPane split="vertical" minSize={300} defaultSize="50%">
      <CodeEditor code={code} onChange={onChange} language={language} />
      <CodeOutput output={output} />
    </SplitPane>
  );
}
```

**التكامل مع الخلفية:**
- يتصل بـ `runtime_service.py` لتنفيذ الكود
- يستخدم `code_analysis_service.py` للحصول على اقتراحات وتحليلات

### 2. واجهة عرض حالة المشروع

**الوصف:**
لوحة معلومات تعرض حالة المشروع الحالي، بما في ذلك الوكلاء النشطين، المهام قيد التنفيذ، والموارد المستخدمة.

**المكونات:**
- عرض مرئي للوكلاء النشطين مع حالتهم الحالية
- قائمة بالمهام قيد التنفيذ مع نسبة الإكمال
- مؤشرات لاستخدام الموارد (الذاكرة، وحدة المعالجة المركزية)
- تمثيل بياني للعلاقات بين الوكلاء والمهام

**التنفيذ:**
```javascript
function ProjectDashboard({ project }) {
  return (
    <div className="project-dashboard">
      <div className="project-header">
        <h2>{project.name}</h2>
        <span className="project-language">{project.language}</span>
      </div>
      <div className="project-stats">
        <div className="stat-item">
          <span className="stat-value">{project.files.length}</span>
          <span className="stat-label">ملفات</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{project.runtime?.status || 'غير نشط'}</span>
          <span className="stat-label">حالة التشغيل</span>
        </div>
      </div>
    </div>
  );
}

function AgentsStatus({ agents }) {
  return (
    <div className="agents-status">
      <h3>الوكلاء النشطون</h3>
      <div className="agents-list">
        {agents.map(agent => (
          <div key={agent.id} className={`agent-item ${agent.status.toLowerCase()}`}>
            <div className="agent-icon">
              <i className={`fa fa-${agent.type === 'thinker' ? 'brain' : 'code'}`}></i>
            </div>
            <div className="agent-info">
              <div className="agent-name">{agent.name}</div>
              <div className="agent-status">{agent.status}</div>
            </div>
            <div className="agent-actions">
              <button className="agent-action" onClick={() => agent.pause()}>
                <i className="fa fa-pause"></i>
              </button>
              <button className="agent-action" onClick={() => agent.resume()}>
                <i className="fa fa-play"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function PerformanceChart({ data }) {
  return (
    <div className="performance-chart">
      <h3>أداء الوكلاء</h3>
      <LineChart width={600} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="thinkerAgent" stroke="#8884d8" />
        <Line type="monotone" dataKey="coderAgent" stroke="#82ca9d" />
      </LineChart>
    </div>
  );
}
```

**التكامل مع الخلفية:**
- يتصل بـ `orchestration_service.py` للحصول على معلومات حول الوكلاء والمهام
- يستخدم `runtime_service.py` للحصول على معلومات حول استخدام الموارد

### 3. واجهة البحث في المستندات

**الوصف:**
واجهة تتيح للمستخدمين البحث في المستندات والملفات باستخدام الاستعلامات الطبيعية، مع عرض النتائج بطريقة سهلة الاستخدام.

**المكونات:**
- حقل بحث مع دعم للاستعلامات باللغة الطبيعية
- عرض النتائج مع تمييز الأجزاء ذات الصلة
- تصفية النتائج حسب نوع المستند، التاريخ، إلخ
- إمكانية حفظ الاستعلامات المتكررة

**التنفيذ:**
```jsx
import React, { useState } from 'react';
import { Input, List, Tag, Spin, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { searchDocuments } from '../services/documentService';

const { Search } = Input;

const DocumentSearch = ({ projectId }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const handleSearch = async (value) => {
    if (!value.trim()) return;
    
    setIsSearching(true);
    setQuery(value);
    
    try {
      const searchResults = await searchDocuments(projectId, value);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  const renderSearchResult = (item) => {
    // Highlight matching text
    const highlightText = (text, query) => {
      if (!query) return text;
      
      const parts = text.split(new RegExp(`(${query})`, 'gi'));
      return (
        <>
          {parts.map((part, i) => 
            part.toLowerCase() === query.toLowerCase() ? 
              <mark key={i}>{part}</mark> : part
          )}
        </>
      );
    };
    
    return (
      <List.Item>
        <List.Item.Meta
          title={<a href={`/document/${item.id}`}>{item.title}</a>}
          description={
            <>
              <div className="document-snippet">
                {highlightText(item.snippet, query)}
              </div>
              <div className="document-meta">
                {item.tags && item.tags.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
                <span className="document-similarity">
                  Relevance: {Math.round(item.similarity * 100)}%
                </span>
              </div>
            </>
          }
        />
      </List.Item>
    );
  };
  
  return (
    <div className="document-search">
      <Search
        placeholder="Search documents using natural language..."
        enterButton={<SearchOutlined />}
        size="large"
        onSearch={handleSearch}
        loading={isSearching}
      />
      
      {isSearching ? (
        <div className="search-loading">
          <Spin tip="Searching documents..." />
        </div>
      ) : results.length > 0 ? (
        <List
          itemLayout="vertical"
          dataSource={results}
          renderItem={renderSearchResult}
          pagination={{
            pageSize: 5,
            simple: true
          }}
        />
      ) : query && (
        <Empty description="No documents found matching your query" />
      )}
    </div>
  );
};
```

**التكامل مع الخلفية:**
- يتصل بـ `document_index_service.py` للبحث في المستندات
- يستخدم LlamaIndex للحصول على نتائج دقيقة

### 4. واجهة اختيار اللهجات

**الوصف:**
واجهة تتيح للمستخدمين اختيار اللهجة العربية أو الإنجليزية المفضلة للتفاعل الصوتي مع النظام.

**المكونات:**
- قائمة منسدلة لاختيار اللهجة
- نماذج صوتية لكل لهجة
- إعدادات لضبط سرعة الكلام ونبرة الصوت
- اختبار مباشر للتعرف على الصوت

**التنفيذ:**
```javascript
function LanguageSelector({ currentLanguage, currentDialect, onLanguageChange, onDialectChange }) {
  const languages = [
    { code: 'ar', name: 'العربية' },
    { code: 'en', name: 'English' }
  ];
  
  const dialects = {
    ar: [
      { code: 'ar-sa', name: 'السعودية' },
      { code: 'ar-eg', name: 'مصر' },
      { code: 'ar-ma', name: 'المغرب' },
      { code: 'ar-lb', name: 'لبنان' },
      { code: 'ar-iq', name: 'العراق' }
    ],
    en: [
      { code: 'en-us', name: 'American' },
      { code: 'en-gb', name: 'British' },
      { code: 'en-au', name: 'Australian' }
    ]
  };
  
  return (
    <div className="language-selector">
      <div className="language-dropdown">
        <select value={currentLanguage} onChange={e => onLanguageChange(e.target.value)}>
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>
      
      <div className="dialect-dropdown">
        <select value={currentDialect} onChange={e => onDialectChange(e.target.value)}>
          {dialects[currentLanguage].map(dialect => (
            <option key={dialect.code} value={dialect.code}>{dialect.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function VoiceInput({ language, dialect, onSpeechResult }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const startListening = () => {
    setIsListening(true);
    
    // Initialize speech recognition with the selected language and dialect
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = dialect;
    recognition.continuous = true;
    
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      setTranscript(transcript);
      onSpeechResult(transcript);
    };
    
    recognition.start();
  };
  
  const stopListening = () => {
    setIsListening(false);
    recognition.stop();
  };
  
  return (
    <div className="voice-input">
      <button 
        className={`mic-button ${isListening ? 'active' : ''}`}
        onClick={isListening ? stopListening : startListening}
      >
        <i className={`fa fa-microphone${isListening ? '-slash' : ''}`}></i>
      </button>
      
      {transcript && (
        <div className="transcript">
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
}
```

**التكامل مع الخلفية:**
- يتصل بـ `speech_service.py` للتعرف على الصوت وتحويله إلى نص
- يدعم لهجات عربية متعددة (مصرية، خليجية، شامية، مغاربية)

## خطة التنفيذ

1. **المرحلة الأولى:**
   - تطوير محرر الكود المباشر
   - تحسين واجهة المحادثات والذاكرة
   - إضافة واجهة البحث في المستندات

2. **المرحلة الثانية:**
   - تطوير لوحة تحكم المشروع
   - إضافة واجهة عرض حالة المشروع
   - تطوير واجهة تحليل الكود

3. **المرحلة الثالثة:**
   - إضافة واجهة اختيار اللهجات
   - تحسين التكامل بين جميع المكونات
   - اختبار شامل وتحسين تجربة المستخدم

## تحسينات عامة

1. **وضع الظلام/الفاتح**: إضافة دعم لوضع الظلام والفاتح
2. **تخصيص الألوان**: السماح للمستخدم بتخصيص ألوان الواجهة
3. **تخطيط متجاوب**: التأكد من أن الواجهة تعمل بشكل جيد على جميع أحجام الشاشات
4. **تحميل تدريجي**: تحسين تجربة التحميل باستخدام التحميل التدريجي
5. **إشعارات في الوقت الحقيقي**: إضافة نظام إشعارات في الوقت الحقيقي
6. **دعم اختصارات لوحة المفاتيح**: إضافة دعم لاختصارات لوحة المفاتيح للعمليات الشائعة

## الخلاصة

تنفيذ هذه التحسينات سيجعل واجهة المستخدم لمنصة NeuroNest-AI أكثر قوة وسهولة في الاستخدام، مما يتيح للمستخدمين الاستفادة الكاملة من القدرات الجديدة التي تم إضافتها في الخلفية. هذه التحسينات ستجعل المنصة أكثر تنافسية وستوفر تجربة مستخدم متميزة.