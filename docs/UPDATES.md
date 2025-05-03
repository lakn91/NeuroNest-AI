# تحديثات مشروع NeuroNest-AI

## التغييرات الرئيسية

تم إجراء التحديثات التالية على مشروع NeuroNest-AI:

### 1. تحديث بنية العملاء (Agents)

- تم تحديث جميع العملاء لاستخدام البنية الجديدة القائمة على الأحداث (Event-Driven Architecture)
- تم إضافة واجهة `LLMProvider` لتوحيد التعامل مع نماذج اللغة المختلفة
- تم إنشاء `AgentRegistry` لإدارة أنواع وحالات العملاء بشكل مركزي
- تم تحديث `OrchestratorAgent` لاستخدام البنية الجديدة والتنسيق بين العملاء المتخصصين

### 2. إضافة خدمة LLM

- تم إنشاء خدمة `llmService` للتعامل مع مزودي نماذج اللغة المختلفة (OpenAI و Google Gemini)
- تم إضافة دعم لتكوين نماذج اللغة من خلال واجهة API

### 3. تحديث واجهة API

- تم تحديث `agentController` لاستخدام البنية الجديدة
- تم تحسين التعامل مع الطلبات والاستجابات
- تم إضافة دعم للتكوين الديناميكي لنماذج اللغة

### 4. تحديث Socket.IO

- تم تحديث معالج اتصال Socket.IO لاستخدام العملاء الجدد
- تم إضافة دعم للتحديثات في الوقت الفعلي أثناء معالجة الرسائل

### 5. توثيق

- تم إنشاء دليل الترحيل (migration-guide.md) لشرح كيفية الانتقال إلى البنية الجديدة
- تم إنشاء وثيقة إعادة الهيكلة (refactoring.md) لشرح التغييرات التي تم إجراؤها

## كيفية استخدام البنية الجديدة

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

### إنشاء حالة عميل

```typescript
const eventStream = new DefaultEventStream();
const llmProvider = createLLMProvider('openai', 'your-api-key');

const agent = await registry.createAgent(
  'my-agent',
  { id: 'unique-id', name: 'My Agent', description: 'Description' },
  eventStream,
  llmProvider
);
```

### معالجة رسالة

```typescript
const observation = Observation.createUserMessageObservation('user', 'رسالة المستخدم');
const action = await agent.process(observation);
console.log(action.data);
```

## الخطوات القادمة

1. تحديث واجهة المستخدم لاستخدام البنية الجديدة
2. إضافة المزيد من العملاء المتخصصين
3. تحسين التكامل مع خدمات الطرف الثالث
4. إضافة اختبارات شاملة للبنية الجديدة