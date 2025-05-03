# NeuroNest-AI Backend

## نظرة عامة

هذا المجلد يحتوي على الخادم الخلفي لمشروع NeuroNest-AI. تم بناؤه باستخدام Node.js/Express ويوفر نقاط نهاية API والمنطق الخلفي للتطبيق.

## البنية الجديدة

تم تحديث النظام لاستخدام بنية قائمة على الأحداث (Event-Driven Architecture) مع واجهات موحدة للعملاء ومزودي نماذج اللغة.

### المكونات الرئيسية

- **AgentInterface**: واجهة موحدة لجميع العملاء
- **BaseAgent**: فئة أساسية تنفذ الوظائف المشتركة
- **EventStream**: نظام لنقل الأحداث بين العملاء
- **LLMProvider**: واجهة موحدة لمزودي نماذج اللغة
- **AgentRegistry**: نظام مركزي لإدارة أنواع وحالات العملاء

## هيكل المشروع

```
backend/
├── config/           # ملفات التكوين
├── controllers/      # معالجات الطلبات
├── middleware/       # وسيط Express
├── models/           # نماذج البيانات
├── routes/           # تعريفات مسارات API
├── services/         # منطق الأعمال
├── src/              # كود TypeScript المصدري
│   ├── agents/       # نظام العملاء الجديد
│   ├── controllers/  # معالجات الطلبات بـ TypeScript
│   ├── routes/       # مسارات API بـ TypeScript
│   └── services/     # خدمات بـ TypeScript
├── utils/            # دوال مساعدة
├── .env.example      # مثال لملف البيئة
├── package.json      # تبعيات المشروع
└── server.js         # ملف الخادم الرئيسي
```

## المكونات الرئيسية

### العملاء (Agents)

- **ThinkingAgent**: عميل متخصص في التفكير العميق وحل المشكلات.
- **DeveloperAgent**: عميل متخصص في تطوير البرمجيات وكتابة الكود.
- **EditorAgent**: عميل متخصص في تحرير النصوص والملفات.
- **OrchestratorAgent**: عميل رئيسي يقوم بتنسيق العمل بين العملاء المتخصصين.

### الخدمات

- **llmService**: خدمة للتعامل مع مزودي نماذج اللغة المختلفة (OpenAI و Google Gemini).
- **firebaseService**: تكامل مع Firebase.
- **supabaseService**: تكامل مع Supabase.
- **runtimeService**: بيئة تنفيذ الكود.

## نقاط نهاية API

### العملاء (Agents)

- `POST /api/agents/process`: معالجة رسالة من خلال نظام العملاء.
- `GET /api/agents`: الحصول على معلومات حول العملاء المتاحين.
- `GET /api/agents/providers`: الحصول على مزودي نماذج اللغة المدعومين.

### المصادقة (Authentication)

- `POST /api/auth/register`: تسجيل مستخدم جديد.
- `POST /api/auth/login`: تسجيل دخول مستخدم.
- `POST /api/auth/logout`: تسجيل خروج مستخدم.
- `GET /api/auth/user`: الحصول على المستخدم الحالي.

### المشاريع (Projects)

- `GET /api/projects`: الحصول على جميع المشاريع للمستخدم الحالي.
- `GET /api/projects/:id`: الحصول على مشروع محدد.
- `POST /api/projects`: إنشاء مشروع جديد.
- `PUT /api/projects/:id`: تحديث مشروع.
- `DELETE /api/projects/:id`: حذف مشروع.
- `GET /api/projects/:id/files`: الحصول على جميع ملفات مشروع.
- `POST /api/projects/:id/files`: إضافة ملف إلى مشروع.

### المحادثات (Conversations)

- `GET /api/conversations`: الحصول على جميع المحادثات للمستخدم الحالي.
- `GET /api/conversations/:id`: الحصول على محادثة محددة.
- `POST /api/conversations`: إنشاء محادثة جديدة.
- `PUT /api/conversations/:id`: تحديث محادثة.
- `DELETE /api/conversations/:id`: حذف محادثة.

### ذاكرة العميل (Agent Memory)

- `GET /api/memories/:agentId`: الحصول على ذكريات لعميل محدد.
- `POST /api/memories/:agentId`: إضافة ذاكرة لعميل.
- `DELETE /api/memories/:agentId/:memoryId`: حذف ذاكرة محددة.

## استخدام النظام الجديد

### إنشاء عميل جديد

```typescript
import { BaseAgent, EventStream, LLMProvider, Action, Observation } from './agents';

export class MyAgent extends BaseAgent {
  constructor(eventStream: EventStream, llmProvider: LLMProvider) {
    super(eventStream, llmProvider);
  }
  
  async initialize(config: AgentConfig): Promise<void> {
    await super.initialize(config);
    // إعداد إضافي
  }
  
  async process(observation: Observation): Promise<Action> {
    // معالجة الملاحظة
    // إنشاء إجراء
    return Action.createTextAction(this.id, 'نص الاستجابة');
  }
}
```

### تسجيل نوع العميل

```typescript
import { AgentRegistry } from './agents';
import { MyAgent } from './MyAgent';

const registry = AgentRegistry.getInstance();
registry.registerAgentType('my-agent', (es, llm) => new MyAgent(es, llm));
```

### معالجة رسالة

```typescript
const observation = Observation.createUserMessageObservation('user', 'رسالة المستخدم');
const action = await agent.process(observation);
console.log(action.data);
```

## التثبيت والتشغيل

1. تثبيت التبعيات:
   ```bash
   npm install
   ```

2. نسخ `.env.example` إلى `.env` وتعديل القيم حسب الحاجة.

3. تشغيل الخادم:
   ```bash
   npm start
   ```

   للتطوير مع إعادة التشغيل التلقائي:
   ```bash
   npm run dev
   ```

   لتشغيل الخادم بـ TypeScript:
   ```bash
   npm run dev:ts
   ```

## اختبار النظام

يمكنك اختبار النظام باستخدام الأمر التالي:

```bash
# تشغيل اختبار العملاء
./src/tests/run-test.sh
```

## المتغيرات البيئية

- `PORT`: منفذ الخادم (الافتراضي: 5000)
- `NODE_ENV`: البيئة (development, production)
- `FIREBASE_PROJECT_ID`: معرف مشروع Firebase
- `FIREBASE_CLIENT_EMAIL`: بريد إلكتروني لعميل Firebase
- `FIREBASE_PRIVATE_KEY`: مفتاح خاص لـ Firebase
- `FIREBASE_DATABASE_URL`: عنوان URL لقاعدة بيانات Firebase
- `FIREBASE_STORAGE_BUCKET`: سلة تخزين Firebase
- `SUPABASE_URL`: عنوان URL لـ Supabase
- `SUPABASE_KEY`: مفتاح API لـ Supabase
- `JWT_SECRET`: سر لرموز JWT
- `OPENAI_API_KEY`: مفتاح API لـ OpenAI
- `GEMINI_API_KEY`: مفتاح API لـ Google Gemini
- `DEFAULT_AI_PROVIDER`: مزود الذكاء الاصطناعي الافتراضي (gemini أو openai)

## Socket.IO

يمكنك استخدام Socket.IO للتفاعل مع النظام في الوقت الفعلي:

```javascript
// إرسال رسالة
socket.emit('user-message', {
  message: 'رسالة المستخدم',
  context: {
    apiSettings: {
      provider: 'gemini',
      apiKey: 'your-api-key'
    }
  }
});

// استقبال استجابة
socket.on('agent-response', (response) => {
  console.log(response);
});

// استقبال إجراء
socket.on('agent-action', (action) => {
  console.log(action);
});
```

## التوثيق

لمزيد من المعلومات حول نقاط النهاية والوظائف المحددة، راجع التعليقات في الكود.

للحصول على معلومات حول التحديثات الأخيرة، راجع ملف `/docs/UPDATES.md`.
