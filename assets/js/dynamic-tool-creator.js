/**
 * Dynamic Tool Creation System
 * Allows AI agent to create and register new tools on-the-fly
 */

class DynamicToolCreator {
  constructor(tools, toolSchemas, systemPrompt) {
    this.tools = tools;
    this.toolSchemas = toolSchemas;
    this.systemPrompt = systemPrompt;
    this.createdTools = new Map(); // Track dynamically created tools
  }

  /**
   * Create a new tool dynamically
   * @param {Object} toolSpec - Tool specification
   * @param {string} toolSpec.name - Tool name (snake_case)
   * @param {string} toolSpec.description - What the tool does
   * @param {Object} toolSpec.parameters - Parameter definitions
   * @param {string} toolSpec.implementation - Function body code as string
   * @returns {Object} Result of tool creation
   */
  async createTool(toolSpec) {
    const { name, description, parameters, implementation } = toolSpec;

    // Validate tool doesn't already exist
    if (this.tools[name]) {
      return {
        success: false,
        message: `Tool '${name}' already exists`,
        toolName: name
      };
    }

    try {
      // Create the tool function from implementation string
      const toolFunction = new Function('args', `
        return (async () => {
          try {
            ${implementation}
          } catch (error) {
            return \`Error in ${name}: \${error.message}\`;
          }
        })();
      `);

      // Register the tool implementation
      this.tools[name] = async (args) => {
        console.log(`🔧 Dynamic tool '${name}' called with:`, args);
        return await toolFunction(args);
      };

      // Register the tool schema
      const schema = {
        type: 'function',
        function: {
          name,
          description,
          parameters: {
            type: 'object',
            properties: parameters.properties || {},
            required: parameters.required || []
          }
        }
      };

      this.toolSchemas.push(schema);

      // Track the created tool
      this.createdTools.set(name, {
        schema,
        implementation,
        createdAt: new Date().toISOString()
      });

      console.log(`✅ Dynamic tool '${name}' created successfully`);

      return {
        success: true,
        message: `Tool '${name}' created and registered successfully`,
        toolName: name,
        schema
      };

    } catch (error) {
      console.error(`❌ Failed to create tool '${name}':`, error);
      return {
        success: false,
        message: `Failed to create tool: ${error.message}`,
        toolName: name
      };
    }
  }

  /**
   * List all dynamically created tools
   */
  listCreatedTools() {
    const tools = Array.from(this.createdTools.entries()).map(([name, info]) => ({
      name,
      createdAt: info.createdAt,
      description: info.schema.function.description
    }));

    return {
      count: tools.length,
      tools
    };
  }

  /**
   * Get implementation of a dynamically created tool
   */
  getToolImplementation(toolName) {
    const tool = this.createdTools.get(toolName);
    if (!tool) {
      return null;
    }
    return {
      name: toolName,
      implementation: tool.implementation,
      schema: tool.schema
    };
  }

  /**
   * Export all dynamic tools (for persistence)
   */
  exportTools() {
    const exported = {};
    this.createdTools.forEach((info, name) => {
      exported[name] = {
        schema: info.schema,
        implementation: info.implementation,
        createdAt: info.createdAt
      };
    });
    return exported;
  }

  /**
   * Import previously created tools (for persistence)
   */
  async importTools(exportedTools) {
    const results = [];
    for (const [name, info] of Object.entries(exportedTools)) {
      const result = await this.createTool({
        name,
        description: info.schema.function.description,
        parameters: info.schema.function.parameters,
        implementation: info.implementation
      });
      results.push(result);
    }
    return results;
  }
}

// Export for use
window.DynamicToolCreator = DynamicToolCreator;
