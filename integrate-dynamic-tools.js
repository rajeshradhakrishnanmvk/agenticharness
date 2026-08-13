/**
 * Integration layer for Dynamic Tool Creation System
 * Connects the DynamicToolCreator with the main application
 */

let dynamicToolCreator = null;
const DYNAMIC_TOOLS_STORAGE_KEY = 'ollama_dynamic_tools';

/**
 * Initialize the dynamic tool creation system
 */
function initializeDynamicToolSystem(tools, toolSchemas) {
  if (!window.DynamicToolCreator) {
    console.error('❌ DynamicToolCreator class not found!');
    return false;
  }

  if (!window.ToolTemplates) {
    console.error('❌ ToolTemplates not found!');
    return false;
  }

  // Create the dynamic tool creator instance
  dynamicToolCreator = new DynamicToolCreator(tools, toolSchemas);

  // Load previously created tools from localStorage
  loadPersistedDynamicTools();

  // Register meta-tools (tools that create other tools)
  registerMetaTools(tools, toolSchemas);

  console.log('✅ Dynamic Tool Creation System initialized');
  return true;
}

/**
 * Load dynamic tools from localStorage
 */
function loadPersistedDynamicTools() {
  try {
    const stored = localStorage.getItem(DYNAMIC_TOOLS_STORAGE_KEY);
    if (stored) {
      const tools = JSON.parse(stored);
      dynamicToolCreator.importTools(tools);
      console.log(`📦 Loaded ${Object.keys(tools).length} persisted dynamic tools`);
    }
  } catch (error) {
    console.error('❌ Failed to load persisted tools:', error);
  }
}

/**
 * Save dynamic tools to localStorage
 */
function persistDynamicTools() {
  try {
    const exported = dynamicToolCreator.exportTools();
    localStorage.setItem(DYNAMIC_TOOLS_STORAGE_KEY, JSON.stringify(exported));
    console.log('💾 Dynamic tools persisted to localStorage');
  } catch (error) {
    console.error('❌ Failed to persist tools:', error);
  }
}

/**
 * Register meta-tools that allow the AI to create new tools
 */
function registerMetaTools(tools, toolSchemas) {
  // Tool 1: List available templates
  tools.list_tool_templates = async () => {
    const templates = Object.entries(window.ToolTemplates).map(([key, template]) => ({
      templateKey: key,
      name: template.name,
      description: template.description,
      parameters: template.parameters
    }));

    return JSON.stringify({
      success: true,
      count: templates.length,
      templates
    }, null, 2);
  };

  toolSchemas.push({
    type: 'function',
    function: {
      name: 'list_tool_templates',
      description: 'List all available tool templates that can be used to create new tools',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  });

  // Tool 2: Create tool from template
  tools.create_tool_from_template = async ({ templateKey }) => {
    const template = window.ToolTemplates[templateKey];
    
    if (!template) {
      return JSON.stringify({
        success: false,
        error: `Template '${templateKey}' not found. Use list_tool_templates to see available templates.`
      });
    }

    const result = await dynamicToolCreator.createTool(template);
    
    if (result.success) {
      persistDynamicTools();
    }

    return JSON.stringify(result, null, 2);
  };

  toolSchemas.push({
    type: 'function',
    function: {
      name: 'create_tool_from_template',
      description: 'Create a new tool from a pre-built template. Use list_tool_templates first to see available templates.',
      parameters: {
        type: 'object',
        properties: {
          templateKey: { type: 'string', description: 'The template key from list_tool_templates (e.g., "copyRow", "bulkUpdate")' }
        },
        required: ['templateKey']
      }
    }
  });

  // Tool 3: List dynamically created tools
  tools.list_dynamic_tools = async () => {
    const result = dynamicToolCreator.listCreatedTools();
    return JSON.stringify(result, null, 2);
  };

  toolSchemas.push({
    type: 'function',
    function: {
      name: 'list_dynamic_tools',
      description: 'List all tools that have been dynamically created during this or previous sessions',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  });
}

// Make functions globally available
window.initializeDynamicToolSystem = initializeDynamicToolSystem;
window.getDynamicToolCreator = () => dynamicToolCreator;
