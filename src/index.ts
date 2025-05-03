/**
 * NeuroNest AI
 * Main entry point for the application
 */
import * as dotenv from 'dotenv';
import { NeuroNest } from './NeuroNest';
import { Logger, LogLevel } from './core/monitoring/Logger';

// Load environment variables
dotenv.config();

// Export all modules
export * from './NeuroNest';
export * from './core';

/**
 * Initialize the application
 */
async function initialize() {
  // Get the logger
  const logger = Logger.getInstance();
  logger.setMinLevel(LogLevel.DEBUG);
  
  logger.info('Initializing NeuroNest AI...', 'main');
  
  try {
    // Get the NeuroNest instance
    const neuroNest = NeuroNest.getInstance();
    
    // Initialize with configuration
    await neuroNest.initialize({
      apiKeys: {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        google: process.env.GOOGLE_API_KEY
      },
      defaultLocale: process.env.DEFAULT_LOCALE || 'en',
      maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '5'),
      pluginDir: process.env.PLUGIN_DIR || './plugins'
    });
    
    // Get the i18n instance
    const i18n = neuroNest.getI18n();
    
    // Log available locales
    logger.info(`Available locales: ${i18n.getAvailableLocales().join(', ')}`, 'main');
    
    // Log current locale
    logger.info(`Current locale: ${i18n.getLocale()}`, 'main');
    
    // Log welcome message
    logger.info(i18n.t('app.welcome'), 'main');
    
    // TODO: Start the server
    // This will be implemented in a separate file
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to initialize NeuroNest AI: ${errorMessage}`, 'main', error);
    process.exit(1);
  }
}

// Start the application
initialize().catch(error => {
  console.error('Unhandled error during initialization:', error);
  process.exit(1);
});
