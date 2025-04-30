/**
 * Supabase service for NeuroNest AI
 * Provides a centralized Supabase client instance
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
let supabase = null;

// Create a mock Supabase implementation for development/testing
const createMockSupabase = () => {
  console.log('Creating mock Supabase implementation for development/testing');
  
  // Mock database tables
  const tables = {
    users: [],
    agent_memories: [],
    user_settings: [],
    projects: [],
    conversations: []
  };
  
  // Generate a unique ID
  const generateId = () => {
    return `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };
  
  // Find items in a table
  const findItems = (table, conditions = {}) => {
    return tables[table].filter(item => {
      return Object.keys(conditions).every(key => {
        if (conditions[key] === undefined) return true;
        return item[key] === conditions[key];
      });
    });
  };
  
  // Mock Supabase client
  return {
    from: (tableName) => {
      // Create table if it doesn't exist
      if (!tables[tableName]) {
        tables[tableName] = [];
      }
      
      // Query builder
      let query = {
        conditions: {},
        orderField: null,
        orderDirection: 'asc',
        limitCount: null,
        
        // Select operation
        select: (fields = '*') => {
          // In our mock, we ignore the fields parameter and return all fields
          return query;
        },
        
        // Filter operations
        eq: (field, value) => {
          query.conditions[field] = value;
          return query;
        },
        
        neq: (field, value) => {
          // For simplicity, we'll just implement basic filtering
          return query;
        },
        
        ilike: (field, value) => {
          // For simplicity, we'll just implement basic filtering
          return query;
        },
        
        // Order operation
        order: (field, { ascending = true } = {}) => {
          query.orderField = field;
          query.orderDirection = ascending ? 'asc' : 'desc';
          return query;
        },
        
        // Limit operation
        limit: (count) => {
          query.limitCount = count;
          return query;
        },
        
        // Single result
        single: () => {
          return query.then(result => {
            if (result.data && result.data.length > 0) {
              return {
                data: result.data[0],
                error: null
              };
            }
            return {
              data: null,
              error: { code: 'PGRST116', message: 'No rows returned' }
            };
          });
        },
        
        // Execute the query
        then: (resolve) => {
          try {
            // Find matching items
            let result = findItems(tableName, query.conditions);
            
            // Apply ordering if specified
            if (query.orderField) {
              result.sort((a, b) => {
                if (query.orderDirection === 'asc') {
                  return a[query.orderField] > b[query.orderField] ? 1 : -1;
                } else {
                  return a[query.orderField] < b[query.orderField] ? 1 : -1;
                }
              });
            }
            
            // Apply limit if specified
            if (query.limitCount !== null) {
              result = result.slice(0, query.limitCount);
            }
            
            resolve({
              data: result,
              error: null
            });
            
            return Promise.resolve({
              data: result,
              error: null
            });
          } catch (error) {
            return Promise.resolve({
              data: null,
              error: { message: error.message }
            });
          }
        },
        
        // Insert operation
        insert: (data) => {
          return {
            select: () => {
              return {
                single: () => {
                  try {
                    // If data is an array, insert multiple items
                    if (Array.isArray(data)) {
                      const insertedItems = data.map(item => {
                        const newItem = {
                          id: generateId(),
                          ...item
                        };
                        tables[tableName].push(newItem);
                        return newItem;
                      });
                      
                      return Promise.resolve({
                        data: insertedItems,
                        error: null
                      });
                    } else {
                      // Insert a single item
                      const newItem = {
                        id: generateId(),
                        ...data
                      };
                      tables[tableName].push(newItem);
                      
                      return Promise.resolve({
                        data: newItem,
                        error: null
                      });
                    }
                  } catch (error) {
                    return Promise.resolve({
                      data: null,
                      error: { message: error.message }
                    });
                  }
                }
              };
            }
          };
        },
        
        // Update operation
        update: (data) => {
          return {
            eq: (field, value) => {
              return {
                select: () => {
                  return {
                    single: () => {
                      try {
                        // Find the item to update
                        const index = tables[tableName].findIndex(item => item[field] === value);
                        
                        if (index === -1) {
                          return Promise.resolve({
                            data: null,
                            error: { message: 'Item not found' }
                          });
                        }
                        
                        // Update the item
                        tables[tableName][index] = {
                          ...tables[tableName][index],
                          ...data
                        };
                        
                        return Promise.resolve({
                          data: tables[tableName][index],
                          error: null
                        });
                      } catch (error) {
                        return Promise.resolve({
                          data: null,
                          error: { message: error.message }
                        });
                      }
                    }
                  };
                }
              };
            }
          };
        },
        
        // Delete operation
        delete: () => {
          return {
            eq: (field, value) => {
              try {
                // Find the item to delete
                const index = tables[tableName].findIndex(item => item[field] === value);
                
                if (index === -1) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Item not found' }
                  });
                }
                
                // Delete the item
                tables[tableName].splice(index, 1);
                
                return Promise.resolve({
                  data: { success: true },
                  error: null
                });
              } catch (error) {
                return Promise.resolve({
                  data: null,
                  error: { message: error.message }
                });
              }
            }
          };
        }
      };
      
      return query;
    },
    
    // Auth methods
    auth: {
      signUp: async ({ email, password }) => {
        return {
          data: { user: { id: generateId(), email } },
          error: null
        };
      },
      signIn: async ({ email, password }) => {
        return {
          data: { user: { id: generateId(), email } },
          error: null
        };
      },
      signOut: async () => {
        return { error: null };
      }
    },
    
    // Storage methods
    storage: {
      from: (bucket) => {
        return {
          upload: async (path, file) => {
            return { data: { path }, error: null };
          },
          getPublicUrl: (path) => {
            return { data: { publicUrl: `https://mock-supabase-storage.example.com/${path}` } };
          }
        };
      }
    }
  };
};

// Only initialize Supabase if it's enabled and credentials are provided
if (process.env.USE_SUPABASE === 'true') {
  if (supabaseUrl && supabaseServiceKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      console.log('Supabase client initialized in supabase service');
    } catch (error) {
      console.error('Error initializing Supabase client in supabase service:', error);
      
      // If we're in development mode, use mock Supabase
      if (process.env.NODE_ENV === 'development' || process.env.MOCK_SUPABASE === 'true') {
        console.log('Using mock Supabase implementation for development');
        supabase = createMockSupabase();
      }
    }
  } else {
    console.log('Supabase credentials missing:');
    if (!supabaseUrl) console.log('- SUPABASE_URL is missing');
    if (!supabaseServiceKey) console.log('- SUPABASE_SERVICE_KEY is missing');
    
    // If we're in development mode, use mock Supabase
    if (process.env.NODE_ENV === 'development' || process.env.MOCK_SUPABASE === 'true') {
      console.log('Using mock Supabase implementation for development');
      supabase = createMockSupabase();
    }
  }
} else {
  console.log('Supabase is disabled (USE_SUPABASE != true)');
}

/**
 * Get the Supabase client instance
 * @returns {Object|null} The Supabase client or null if not initialized
 */
const getSupabaseClient = () => {
  // Lazy initialization if not already initialized
  if (!supabase && process.env.USE_SUPABASE === 'true') {
    if (supabaseUrl && supabaseServiceKey) {
      try {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
        console.log('Supabase client initialized lazily in getSupabaseClient()');
      } catch (error) {
        console.error('Error initializing Supabase client lazily:', error);
        
        // If we're in development mode, use mock Supabase
        if (process.env.NODE_ENV === 'development' || process.env.MOCK_SUPABASE === 'true') {
          console.log('Using mock Supabase implementation for development (lazy init)');
          supabase = createMockSupabase();
        }
      }
    } else if (process.env.NODE_ENV === 'development' || process.env.MOCK_SUPABASE === 'true') {
      console.log('Using mock Supabase implementation for development (lazy init)');
      supabase = createMockSupabase();
    }
  }
  return supabase;
};

/**
 * Check if Supabase is initialized
 * @returns {boolean} True if Supabase is initialized, false otherwise
 */
const isSupabaseInitialized = () => {
  return supabase !== null;
};

module.exports = {
  getSupabaseClient,
  isSupabaseInitialized
};