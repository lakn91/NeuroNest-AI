/**
 * Interface for localization
 */
export interface I18n {
  /**
   * Get a localized string
   * @param key The key of the string
   * @param params Parameters for the string
   * @returns The localized string
   */
  t(key: string, params?: Record<string, any>): string;
  
  /**
   * Get the current locale
   * @returns The current locale
   */
  getLocale(): string;
  
  /**
   * Set the current locale
   * @param locale The locale to set
   */
  setLocale(locale: string): void;
  
  /**
   * Get all available locales
   * @returns Array of available locales
   */
  getAvailableLocales(): string[];
  
  /**
   * Add translations for a locale
   * @param locale The locale to add translations for
   * @param translations The translations to add
   */
  addTranslations(locale: string, translations: Record<string, string>): void;
}

/**
 * Implementation of the I18n interface
 */
export class DefaultI18n implements I18n {
  private static instance: DefaultI18n;
  private locale: string = 'en';
  private translations: Map<string, Record<string, string>> = new Map();
  private fallbackLocale: string = 'en';
  
  /**
   * Get the singleton instance of the I18n
   */
  public static getInstance(): DefaultI18n {
    if (!DefaultI18n.instance) {
      DefaultI18n.instance = new DefaultI18n();
      
      // Add default English translations
      DefaultI18n.instance.addTranslations('en', {
        'common.yes': 'Yes',
        'common.no': 'No',
        'common.ok': 'OK',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.create': 'Create',
        'common.search': 'Search',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.warning': 'Warning',
        'common.info': 'Information',
        'common.confirm': 'Confirm',
        'common.back': 'Back',
        'common.next': 'Next',
        'common.previous': 'Previous',
        'common.finish': 'Finish',
        'common.start': 'Start',
        'common.stop': 'Stop',
        'common.pause': 'Pause',
        'common.resume': 'Resume',
        'common.retry': 'Retry',
        'common.skip': 'Skip',
        'common.continue': 'Continue',
        'common.submit': 'Submit',
        'common.reset': 'Reset',
        'common.clear': 'Clear',
        'common.close': 'Close',
        'common.open': 'Open',
        'common.show': 'Show',
        'common.hide': 'Hide',
        'common.enable': 'Enable',
        'common.disable': 'Disable',
        'common.add': 'Add',
        'common.remove': 'Remove',
        'common.update': 'Update',
        'common.refresh': 'Refresh',
        'common.settings': 'Settings',
        'common.help': 'Help',
        'common.about': 'About',
        'common.logout': 'Logout',
        'common.login': 'Login',
        'common.register': 'Register',
        'common.username': 'Username',
        'common.password': 'Password',
        'common.email': 'Email',
        'common.name': 'Name',
        'common.description': 'Description',
        'common.date': 'Date',
        'common.time': 'Time',
        'common.status': 'Status',
        'common.type': 'Type',
        'common.category': 'Category',
        'common.tags': 'Tags',
        'common.priority': 'Priority',
        'common.size': 'Size',
        'common.file': 'File',
        'common.folder': 'Folder',
        'common.path': 'Path',
        'common.url': 'URL',
        'common.language': 'Language',
        'common.theme': 'Theme',
        'common.version': 'Version',
        'common.id': 'ID',
        'common.code': 'Code',
        'common.message': 'Message',
        'common.details': 'Details',
        'common.summary': 'Summary',
        'common.title': 'Title',
        'common.content': 'Content',
        'common.author': 'Author',
        'common.owner': 'Owner',
        'common.creator': 'Creator',
        'common.editor': 'Editor',
        'common.viewer': 'Viewer',
        'common.admin': 'Administrator',
        'common.user': 'User',
        'common.guest': 'Guest',
        'common.role': 'Role',
        'common.permission': 'Permission',
        'common.access': 'Access',
        'common.security': 'Security',
        'common.privacy': 'Privacy',
        'common.public': 'Public',
        'common.private': 'Private',
        'common.shared': 'Shared',
        'common.draft': 'Draft',
        'common.published': 'Published',
        'common.archived': 'Archived',
        'common.deleted': 'Deleted',
        'common.active': 'Active',
        'common.inactive': 'Inactive',
        'common.enabled': 'Enabled',
        'common.disabled': 'Disabled',
        'common.locked': 'Locked',
        'common.unlocked': 'Unlocked',
        'common.required': 'Required',
        'common.optional': 'Optional',
        'common.default': 'Default',
        'common.custom': 'Custom',
        'common.auto': 'Auto',
        'common.manual': 'Manual',
        'common.all': 'All',
        'common.none': 'None',
        'common.any': 'Any',
        'common.other': 'Other',
        'common.more': 'More',
        'common.less': 'Less',
        'common.new': 'New',
        'common.old': 'Old',
        'common.recent': 'Recent',
        'common.latest': 'Latest',
        'common.oldest': 'Oldest',
        'common.first': 'First',
        'common.last': 'Last',
        'common.top': 'Top',
        'common.bottom': 'Bottom',
        'common.left': 'Left',
        'common.right': 'Right',
        'common.center': 'Center',
        'common.up': 'Up',
        'common.down': 'Down',
        'common.high': 'High',
        'common.medium': 'Medium',
        'common.low': 'Low',
        'common.critical': 'Critical',
        'common.important': 'Important',
        'common.normal': 'Normal',
        'common.minor': 'Minor',
        'common.major': 'Major',
        'common.trivial': 'Trivial',
        'common.blocker': 'Blocker',
        'common.bug': 'Bug',
        'common.feature': 'Feature',
        'common.task': 'Task',
        'common.issue': 'Issue',
        'common.project': 'Project',
        'common.workspace': 'Workspace',
        'common.dashboard': 'Dashboard',
        'common.home': 'Home',
        'common.profile': 'Profile',
        'common.account': 'Account',
        'common.preferences': 'Preferences',
        'common.configuration': 'Configuration',
        'common.options': 'Options',
        'common.properties': 'Properties',
        'common.attributes': 'Attributes',
        'common.parameters': 'Parameters',
        'common.arguments': 'Arguments',
        'common.values': 'Values',
        'common.data': 'Data',
        'common.input': 'Input',
        'common.output': 'Output',
        'common.result': 'Result',
        'common.error.required': 'This field is required',
        'common.error.invalid': 'Invalid value',
        'common.error.notFound': 'Not found',
        'common.error.alreadyExists': 'Already exists',
        'common.error.unauthorized': 'Unauthorized',
        'common.error.forbidden': 'Forbidden',
        'common.error.serverError': 'Server error',
        'common.error.networkError': 'Network error',
        'common.error.timeout': 'Timeout',
        'common.error.unknown': 'Unknown error',
        'app.name': 'NeuroNest AI',
        'app.description': 'Advanced AI assistant platform',
        'app.welcome': 'Welcome to NeuroNest AI',
        'app.tagline': 'Your intelligent assistant for complex tasks',
        'agent.thinking': 'Thinking Agent',
        'agent.developer': 'Developer Agent',
        'agent.editor': 'Editor Agent',
        'agent.thinking.description': 'Specialized in analysis and reasoning',
        'agent.developer.description': 'Specialized in coding and development',
        'agent.editor.description': 'Specialized in text editing and content creation',
        'task.status.pending': 'Pending',
        'task.status.running': 'Running',
        'task.status.completed': 'Completed',
        'task.status.failed': 'Failed',
        'task.status.cancelled': 'Cancelled',
        'task.priority.low': 'Low',
        'task.priority.medium': 'Medium',
        'task.priority.high': 'High',
        'task.priority.critical': 'Critical',
        'memory.type.buffer': 'Buffer Memory',
        'memory.type.vector': 'Vector Memory',
        'memory.type.structured': 'Structured Memory',
        'memory.type.persistent': 'Persistent Memory',
        'llm.provider.openai': 'OpenAI',
        'llm.provider.anthropic': 'Anthropic',
        'llm.provider.google': 'Google',
        'llm.provider.local': 'Local',
        'runtime.type.local': 'Local Runtime',
        'runtime.type.docker': 'Docker Runtime',
        'runtime.type.sandbox': 'Sandbox Runtime',
        'plugin.status.enabled': 'Enabled',
        'plugin.status.disabled': 'Disabled',
        'plugin.status.error': 'Error',
        'plugin.action.enable': 'Enable Plugin',
        'plugin.action.disable': 'Disable Plugin',
        'plugin.action.configure': 'Configure Plugin',
        'plugin.action.update': 'Update Plugin',
        'plugin.action.uninstall': 'Uninstall Plugin',
        'plugin.action.install': 'Install Plugin'
      });
      
      // Add Arabic translations
      DefaultI18n.instance.addTranslations('ar', {
        'common.yes': 'نعم',
        'common.no': 'لا',
        'common.ok': 'موافق',
        'common.cancel': 'إلغاء',
        'common.save': 'حفظ',
        'common.delete': 'حذف',
        'common.edit': 'تعديل',
        'common.create': 'إنشاء',
        'common.search': 'بحث',
        'common.loading': 'جاري التحميل...',
        'common.error': 'خطأ',
        'common.success': 'نجاح',
        'common.warning': 'تحذير',
        'common.info': 'معلومات',
        'common.confirm': 'تأكيد',
        'common.back': 'رجوع',
        'common.next': 'التالي',
        'common.previous': 'السابق',
        'common.finish': 'إنهاء',
        'common.start': 'بدء',
        'common.stop': 'إيقاف',
        'common.pause': 'إيقاف مؤقت',
        'common.resume': 'استئناف',
        'common.retry': 'إعادة المحاولة',
        'common.skip': 'تخطي',
        'common.continue': 'متابعة',
        'common.submit': 'إرسال',
        'common.reset': 'إعادة تعيين',
        'common.clear': 'مسح',
        'common.close': 'إغلاق',
        'common.open': 'فتح',
        'common.show': 'عرض',
        'common.hide': 'إخفاء',
        'common.enable': 'تمكين',
        'common.disable': 'تعطيل',
        'common.add': 'إضافة',
        'common.remove': 'إزالة',
        'common.update': 'تحديث',
        'common.refresh': 'تحديث',
        'common.settings': 'الإعدادات',
        'common.help': 'المساعدة',
        'common.about': 'حول',
        'common.logout': 'تسجيل الخروج',
        'common.login': 'تسجيل الدخول',
        'common.register': 'تسجيل',
        'common.username': 'اسم المستخدم',
        'common.password': 'كلمة المرور',
        'common.email': 'البريد الإلكتروني',
        'common.name': 'الاسم',
        'common.description': 'الوصف',
        'common.date': 'التاريخ',
        'common.time': 'الوقت',
        'common.status': 'الحالة',
        'common.type': 'النوع',
        'common.category': 'الفئة',
        'common.tags': 'العلامات',
        'common.priority': 'الأولوية',
        'common.size': 'الحجم',
        'common.file': 'ملف',
        'common.folder': 'مجلد',
        'common.path': 'المسار',
        'common.url': 'الرابط',
        'common.language': 'اللغة',
        'common.theme': 'السمة',
        'common.version': 'الإصدار',
        'common.id': 'المعرف',
        'common.code': 'الرمز',
        'common.message': 'الرسالة',
        'common.details': 'التفاصيل',
        'common.summary': 'الملخص',
        'common.title': 'العنوان',
        'common.content': 'المحتوى',
        'common.author': 'المؤلف',
        'common.owner': 'المالك',
        'common.creator': 'المنشئ',
        'common.editor': 'المحرر',
        'common.viewer': 'المشاهد',
        'common.admin': 'المدير',
        'common.user': 'المستخدم',
        'common.guest': 'ضيف',
        'common.role': 'الدور',
        'common.permission': 'الصلاحية',
        'common.access': 'الوصول',
        'common.security': 'الأمان',
        'common.privacy': 'الخصوصية',
        'common.public': 'عام',
        'common.private': 'خاص',
        'common.shared': 'مشترك',
        'common.draft': 'مسودة',
        'common.published': 'منشور',
        'common.archived': 'مؤرشف',
        'common.deleted': 'محذوف',
        'common.active': 'نشط',
        'common.inactive': 'غير نشط',
        'common.enabled': 'مفعل',
        'common.disabled': 'معطل',
        'common.locked': 'مقفل',
        'common.unlocked': 'غير مقفل',
        'common.required': 'مطلوب',
        'common.optional': 'اختياري',
        'common.default': 'افتراضي',
        'common.custom': 'مخصص',
        'common.auto': 'تلقائي',
        'common.manual': 'يدوي',
        'common.all': 'الكل',
        'common.none': 'لا شيء',
        'common.any': 'أي',
        'common.other': 'آخر',
        'common.more': 'المزيد',
        'common.less': 'أقل',
        'common.new': 'جديد',
        'common.old': 'قديم',
        'common.recent': 'حديث',
        'common.latest': 'الأحدث',
        'common.oldest': 'الأقدم',
        'common.first': 'الأول',
        'common.last': 'الأخير',
        'common.top': 'أعلى',
        'common.bottom': 'أسفل',
        'common.left': 'يسار',
        'common.right': 'يمين',
        'common.center': 'وسط',
        'common.up': 'أعلى',
        'common.down': 'أسفل',
        'common.high': 'مرتفع',
        'common.medium': 'متوسط',
        'common.low': 'منخفض',
        'common.critical': 'حرج',
        'common.important': 'مهم',
        'common.normal': 'عادي',
        'common.minor': 'ثانوي',
        'common.major': 'رئيسي',
        'common.trivial': 'بسيط',
        'common.blocker': 'معطل',
        'common.bug': 'خلل',
        'common.feature': 'ميزة',
        'common.task': 'مهمة',
        'common.issue': 'مشكلة',
        'common.project': 'مشروع',
        'common.workspace': 'مساحة العمل',
        'common.dashboard': 'لوحة التحكم',
        'common.home': 'الرئيسية',
        'common.profile': 'الملف الشخصي',
        'common.account': 'الحساب',
        'common.preferences': 'التفضيلات',
        'common.configuration': 'التكوين',
        'common.options': 'الخيارات',
        'common.properties': 'الخصائص',
        'common.attributes': 'السمات',
        'common.parameters': 'المعلمات',
        'common.arguments': 'الوسائط',
        'common.values': 'القيم',
        'common.data': 'البيانات',
        'common.input': 'المدخلات',
        'common.output': 'المخرجات',
        'common.result': 'النتيجة',
        'common.error.required': 'هذا الحقل مطلوب',
        'common.error.invalid': 'قيمة غير صالحة',
        'common.error.notFound': 'غير موجود',
        'common.error.alreadyExists': 'موجود بالفعل',
        'common.error.unauthorized': 'غير مصرح',
        'common.error.forbidden': 'ممنوع',
        'common.error.serverError': 'خطأ في الخادم',
        'common.error.networkError': 'خطأ في الشبكة',
        'common.error.timeout': 'انتهت المهلة',
        'common.error.unknown': 'خطأ غير معروف',
        'app.name': 'نيورونيست للذكاء الاصطناعي',
        'app.description': 'منصة مساعد ذكاء اصطناعي متقدمة',
        'app.welcome': 'مرحبًا بك في نيورونيست للذكاء الاصطناعي',
        'app.tagline': 'مساعدك الذكي للمهام المعقدة',
        'agent.thinking': 'وكيل التفكير',
        'agent.developer': 'وكيل المطور',
        'agent.editor': 'وكيل المحرر',
        'agent.thinking.description': 'متخصص في التحليل والتفكير',
        'agent.developer.description': 'متخصص في البرمجة والتطوير',
        'agent.editor.description': 'متخصص في تحرير النصوص وإنشاء المحتوى',
        'task.status.pending': 'قيد الانتظار',
        'task.status.running': 'قيد التنفيذ',
        'task.status.completed': 'مكتمل',
        'task.status.failed': 'فشل',
        'task.status.cancelled': 'ملغى',
        'task.priority.low': 'منخفضة',
        'task.priority.medium': 'متوسطة',
        'task.priority.high': 'عالية',
        'task.priority.critical': 'حرجة',
        'memory.type.buffer': 'ذاكرة مؤقتة',
        'memory.type.vector': 'ذاكرة متجهية',
        'memory.type.structured': 'ذاكرة منظمة',
        'memory.type.persistent': 'ذاكرة دائمة',
        'llm.provider.openai': 'أوبن إيه آي',
        'llm.provider.anthropic': 'أنثروبيك',
        'llm.provider.google': 'جوجل',
        'llm.provider.local': 'محلي',
        'runtime.type.local': 'بيئة تشغيل محلية',
        'runtime.type.docker': 'بيئة تشغيل دوكر',
        'runtime.type.sandbox': 'بيئة تشغيل آمنة',
        'plugin.status.enabled': 'مفعل',
        'plugin.status.disabled': 'معطل',
        'plugin.status.error': 'خطأ',
        'plugin.action.enable': 'تفعيل الإضافة',
        'plugin.action.disable': 'تعطيل الإضافة',
        'plugin.action.configure': 'تكوين الإضافة',
        'plugin.action.update': 'تحديث الإضافة',
        'plugin.action.uninstall': 'إلغاء تثبيت الإضافة',
        'plugin.action.install': 'تثبيت الإضافة'
      });
    }
    return DefaultI18n.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Get a localized string
   * @param key The key of the string
   * @param params Parameters for the string
   * @returns The localized string
   */
  t(key: string, params?: Record<string, any>): string {
    // Get the translation for the current locale
    let translation = this.getTranslation(this.locale, key);
    
    // If not found, try the fallback locale
    if (!translation && this.fallbackLocale !== this.locale) {
      translation = this.getTranslation(this.fallbackLocale, key);
    }
    
    // If still not found, return the key
    if (!translation) {
      return key;
    }
    
    // Replace parameters
    if (params) {
      for (const [param, value] of Object.entries(params)) {
        translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
      }
    }
    
    return translation;
  }
  
  /**
   * Get a translation for a locale and key
   * @param locale The locale
   * @param key The key
   * @returns The translation, or undefined if not found
   */
  private getTranslation(locale: string, key: string): string | undefined {
    const translations = this.translations.get(locale);
    return translations ? translations[key] : undefined;
  }
  
  /**
   * Get the current locale
   * @returns The current locale
   */
  getLocale(): string {
    return this.locale;
  }
  
  /**
   * Set the current locale
   * @param locale The locale to set
   */
  setLocale(locale: string): void {
    if (this.translations.has(locale)) {
      this.locale = locale;
    } else {
      console.warn(`Locale '${locale}' not available, using '${this.locale}'`);
    }
  }
  
  /**
   * Get all available locales
   * @returns Array of available locales
   */
  getAvailableLocales(): string[] {
    return Array.from(this.translations.keys());
  }
  
  /**
   * Add translations for a locale
   * @param locale The locale to add translations for
   * @param translations The translations to add
   */
  addTranslations(locale: string, translations: Record<string, string>): void {
    const existingTranslations = this.translations.get(locale) || {};
    this.translations.set(locale, { ...existingTranslations, ...translations });
  }
  
  /**
   * Set the fallback locale
   * @param locale The fallback locale
   */
  setFallbackLocale(locale: string): void {
    if (this.translations.has(locale)) {
      this.fallbackLocale = locale;
    } else {
      console.warn(`Fallback locale '${locale}' not available, using '${this.fallbackLocale}'`);
    }
  }
  
  /**
   * Check if a locale is available
   * @param locale The locale to check
   * @returns Whether the locale is available
   */
  hasLocale(locale: string): boolean {
    return this.translations.has(locale);
  }
  
  /**
   * Get all translations for a locale
   * @param locale The locale
   * @returns All translations for the locale
   */
  getTranslations(locale: string): Record<string, string> {
    return this.translations.get(locale) || {};
  }
}