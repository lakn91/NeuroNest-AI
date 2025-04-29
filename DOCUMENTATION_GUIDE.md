# دليل التوثيق الشامل

## مقدمة

يعتبر التوثيق الجيد أساسًا لنجاح أي مشروع برمجي. هذا الدليل يوضح معايير وإرشادات التوثيق في مشروع NeuroNest-AI لضمان فهم واضح للكود والهيكل من قبل جميع المطورين.

## المبدأ الأساسي

> "ما تقدر تفهمه بدون شرح، لازم تشرحه"

هذا المبدأ يعني أن أي جزء من الكود أو الهيكل قد يكون غير واضح للمطور الجديد يجب توثيقه بشكل مناسب.

## مستويات التوثيق

### 1. توثيق المشروع العام

- **ملف README.md الرئيسي**: يشرح الغرض من المشروع، كيفية تثبيته وتشغيله، والمتطلبات الأساسية.
- **ملف OVERVIEW.md**: يقدم نظرة عامة على هيكل المشروع ومكوناته الرئيسية.
- **ملف CHANGELOG.md**: يتتبع التغييرات والتحديثات في كل إصدار.
- **ملف VERSIONING_GUIDE.md**: يشرح نظام الإصدارات المستخدم في المشروع.
- **ملف CONTRIBUTING.md**: يوضح كيفية المساهمة في المشروع.

### 2. توثيق المجلدات

كل مجلد رئيسي يجب أن يحتوي على ملف README.md خاص به يشرح:

- الغرض من المجلد.
- المكونات الرئيسية داخل المجلد.
- كيفية تفاعل هذا المجلد مع باقي أجزاء المشروع.
- أي إرشادات خاصة للعمل مع محتويات المجلد.

### 3. توثيق الملفات

في بداية كل ملف، يجب إضافة تعليق يشرح:

- الغرض من الملف.
- المكونات الرئيسية في الملف.
- أي تبعيات أو متطلبات خاصة.

مثال:
```javascript
/**
 * Authentication Service
 * Provides authentication functionality using Firebase/Supabase
 * 
 * This file handles user registration, login, logout, and profile management.
 * It abstracts the underlying authentication provider to allow switching between Firebase and Supabase.
 * 
 * Dependencies:
 * - Firebase Auth SDK or Supabase Auth
 * - DatabaseContext for provider selection
 */
```

### 4. توثيق الدوال والفئات

كل دالة أو فئة يجب أن تحتوي على تعليق يشرح:

- الغرض منها.
- المعلمات المدخلة (Parameters).
- القيمة المرجعة (Return Value).
- أي آثار جانبية (Side Effects).
- أمثلة على الاستخدام (إذا كان ذلك مناسبًا).

مثال:
```javascript
/**
 * Authenticates a user with email and password
 * 
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} User object if authentication is successful
 * @throws {Error} If authentication fails
 * 
 * @example
 * try {
 *   const user = await loginUser('user@example.com', 'password123');
 *   console.log('Logged in user:', user);
 * } catch (error) {
 *   console.error('Login failed:', error.message);
 * }
 */
async function loginUser(email, password) {
  // Implementation
}
```

### 5. توثيق المتغيرات المهمة

المتغيرات المهمة أو المعقدة يجب أن تحتوي على تعليق يشرح الغرض منها والقيم المتوقعة.

مثال:
```javascript
// Maximum number of retry attempts for API calls
const MAX_RETRY_ATTEMPTS = 3;

// User session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;
```

### 6. توثيق واجهات البرمجة (APIs)

واجهات البرمجة يجب توثيقها بشكل مفصل، بما في ذلك:

- نقاط النهاية (Endpoints).
- طرق الطلب (Request Methods).
- المعلمات المطلوبة والاختيارية.
- هيكل الاستجابة.
- رموز الحالة المحتملة.
- أمثلة على الطلبات والاستجابات.

## أدوات وتقنيات التوثيق

### JSDoc / TSDoc

استخدم JSDoc أو TSDoc لتوثيق الكود JavaScript/TypeScript:

```javascript
/**
 * @typedef {Object} User
 * @property {string} id - Unique user identifier
 * @property {string} email - User's email address
 * @property {string} displayName - User's display name
 * @property {string} [photoURL] - Optional URL to user's profile photo
 */

/**
 * @param {string} userId - The ID of the user to fetch
 * @returns {Promise<User>} The user object
 */
```

### Markdown

استخدم Markdown لكتابة ملفات التوثيق مثل README.md:

```markdown
# Component Name

## Description
Brief description of the component.

## Props
| Name | Type | Default | Description |
|------|------|---------|-------------|
| prop1 | string | '' | Description of prop1 |
| prop2 | number | 0 | Description of prop2 |
```

## إرشادات عامة

1. **الوضوح**: استخدم لغة بسيطة وواضحة.
2. **الاختصار**: كن مختصرًا ولكن شاملًا.
3. **التحديث**: حافظ على تحديث التوثيق عند تغيير الكود.
4. **الأمثلة**: قدم أمثلة عملية عندما يكون ذلك مفيدًا.
5. **التناسق**: استخدم أسلوبًا موحدًا في جميع أنحاء المشروع.

## قائمة التحقق للتوثيق

استخدم هذه القائمة للتحقق من اكتمال التوثيق:

- [ ] هل يحتوي المجلد على ملف README.md؟
- [ ] هل تم توثيق الغرض من كل ملف؟
- [ ] هل تم توثيق جميع الدوال والفئات العامة؟
- [ ] هل تم توثيق المتغيرات المهمة؟
- [ ] هل تم تحديث CHANGELOG.md بالتغييرات الأخيرة؟
- [ ] هل التوثيق متناسق مع بقية المشروع؟

## الخلاصة

التوثيق الجيد يوفر الوقت والجهد على المدى الطويل ويسهل على المطورين الجدد فهم المشروع والمساهمة فيه. التزم بهذه الإرشادات لضمان جودة واستمرارية المشروع.