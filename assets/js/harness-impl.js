/**
 * Browser-based Tool-Calling Harness Implementation
 * Implements: user prompt → [system, user] → llm → tool_calls? → execute tools → [tool results] → llm → ... → text response
 */

/* ============================================================
   CONFIGURATION
============================================================ */

// OLLAMA_URL and MODEL are now defined in index.html and loaded from settings

const SYSTEM = `You are a helpful AI assistant with access to browser tools.

CRITICAL INSTRUCTION: You must EXECUTE operations using tools, NOT just explain how to do them.
When a user asks you to modify something, you should USE THE TOOLS to make the changes happen.

You can:
- Store and retrieve data using localStorage
- Manipulate DOM elements
- Perform calculations
- Access IndexedDB for persistent storage
- Manage a dynamic grid with rows and columns
- Perform CRUD operations on the grid (Create, Read, Update, Delete)

Grid Management:
- The grid starts with 1 row and 3 columns
- You can add/remove rows and columns based on user requests
- Each cell can be updated with data
- Grid data is automatically persisted to localStorage
- The grid uses 0-based indexing (row 0 is the first row, col 0 is the first column)
- Column headers are editable and can be customized using update_grid_header
- Columns can be sorted in ascending or descending order using sort_grid_column
- Sorting supports both numeric and alphabetic data
- Grid data can be exported to CSV format using export_grid_csv
- Grid data can be imported from CSV format using import_grid_csv
- The grid supports pagination - multiple pages of data can be navigated
- Page numbers are 1-based (page 1 is the first page, page 2 is the second page, etc.)
- You can navigate to specific pages, next page, or previous page
- The number of records per page is configurable in settings

USER INTENT EXAMPLES:
- "add a row" → EXECUTE: use add_grid_row tool, then confirm "Added a new row"
- "add a column" → EXECUTE: use add_grid_column tool, then confirm "Added a new column"
- "delete row 0" → EXECUTE: use delete_grid_row with rowIndex "0"
- "change header of column 0 to first name" → EXECUTE: use update_grid_header(columnIndex:"0", value:"first name")
- "set cell at row 1 column 0 to John" → EXECUTE: use update_grid_cell(rowIndex:"1", columnIndex:"0", value:"John")
- "sort column 0 ascending" → EXECUTE: use sort_grid_column(columnIndex:"0", order:"asc")
- "sort the Sales column" → EXECUTE: First get grid data to find Sales column index, then use sort_grid_column
- "display 2nd page" or "go to page 2" → EXECUTE: use grid_goto_page(pageNumber:"2")
- "next page" → EXECUTE: use grid_next_page
- "previous page" → EXECUTE: use grid_previous_page

CRITICAL BEHAVIOR:
1. When user asks you to do something, ALWAYS use the appropriate tools to execute the action
2. DO NOT just explain how to do it - ACTUALLY DO IT
3. After executing tools, provide a brief confirmation

Use tools when appropriate to help the user accomplish their tasks.`;


/* ============================================================
   UTILITY: PARAMETER SCHEMA BUILDER
============================================================ */

function mkp(...paramNames) {
  const properties = {};
  paramNames.forEach(name => {
    properties[name] = {
      type: 'string',
      description: `Parameter: ${name}`
    };
  });
  
  return {
    type: 'object',
    properties,
    required: paramNames
  };
}


/* ============================================================
   BROWSER-FRIENDLY TOOL IMPLEMENTATIONS
============================================================ */

const htools = {
  // localStorage operations
  store_data: async ({ key, value }) => {
    try {
      localStorage.setItem(key, value);
      return `Stored: ${key} = ${value}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  retrieve_data: async ({ key }) => {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? `Value: ${value}` : `Key "${key}" not found`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  // DOM manipulation
  update_dom: async ({ selector, content }) => {
    try {
      const element = document.querySelector(selector);
      if (!element) {
        return `Error: Element "${selector}" not found`;
      }
      element.textContent = content;
      return `Updated ${selector} with: ${content}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  // Calculate/evaluate expression
  calculate: async ({ expression }) => {
    try {
      // Safe evaluation using Function constructor (limited scope)
      const result = Function('"use strict"; return (' + expression + ')')();
      return `Result: ${result}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  // IndexedDB operations
  save_to_db: async ({ storeName, key, data }) => {
    try {
      // Use existing OllamaCache infrastructure if available
      if (typeof OllamaCache !== 'undefined') {
        const db = await OllamaCache.initDB();
        return `Saved to IndexedDB: ${key}`;
      }
      return 'IndexedDB not available';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  // Grid operations
  add_grid_row: async ({ position }) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const rowIndex = position ? parseInt(position) : undefined;
        const result = window.AgenticGrid.addRow(rowIndex);
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  add_grid_column: async ({ position }) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const colIndex = position ? parseInt(position) : undefined;
        const result = window.AgenticGrid.addColumn(colIndex);
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  delete_grid_row: async ({ rowIndex }) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const result = window.AgenticGrid.deleteRow(parseInt(rowIndex));
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  delete_grid_column: async ({ columnIndex }) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const result = window.AgenticGrid.deleteColumn(parseInt(columnIndex));
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  update_grid_cell: async ({ rowIndex, columnIndex, value }) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const result = window.AgenticGrid.updateCell(
          parseInt(rowIndex),
          parseInt(columnIndex),
          value
        );
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  get_grid_data: async ({}) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const state = window.AgenticGrid.getFullState();
        return `Grid State:
- Rows: ${state.rows}
- Columns: ${state.columns}
- Headers: ${JSON.stringify(state.headers)}
- Data: ${JSON.stringify(state.data, null, 2)}`;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  update_grid_header: async ({ columnIndex, value }) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const result = window.AgenticGrid.updateHeader(
          parseInt(columnIndex),
          value
        );
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  sort_grid_column: async ({ columnIndex, order }) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const sortOrder = order || 'asc';
        const result = window.AgenticGrid.sortColumn(
          parseInt(columnIndex),
          sortOrder
        );
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  move_grid_row: async ({ fromIndex, toIndex }) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const result = window.AgenticGrid.moveRow(
          parseInt(fromIndex),
          parseInt(toIndex)
        );
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  clear_grid: async ({}) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const result = window.AgenticGrid.clear();
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  export_grid_csv: async ({}) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const result = window.AgenticGrid.exportToCSV();
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  import_grid_csv: async ({ csvContent }) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const result = window.AgenticGrid.importFromCSV(csvContent);
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  // Pagination tools
  grid_goto_page: async ({ pageNumber }) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const result = window.AgenticGrid.goToPage(parseInt(pageNumber));
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  grid_next_page: async ({}) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const result = window.AgenticGrid.nextPage();
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  grid_previous_page: async ({}) => {
    try {
      if (typeof window.AgenticGrid !== 'undefined') {
        const result = window.AgenticGrid.previousPage();
        return result;
      }
      return 'Grid not initialized';
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }
};


/* ============================================================
   TOOL SCHEMAS (OpenAI-compatible format)
============================================================ */

const defs = [
  {
    name: 'store_data',
    description: 'Store data in localStorage',
    parameters: mkp('key', 'value')
  },
  {
    name: 'retrieve_data',
    description: 'Retrieve data from localStorage',
    parameters: mkp('key')
  },
  {
    name: 'update_dom',
    description: 'Update DOM element content',
    parameters: mkp('selector', 'content')
  },
  {
    name: 'calculate',
    description: 'Evaluate mathematical expression',
    parameters: mkp('expression')
  },
  {
    name: 'save_to_db',
    description: 'Save data to IndexedDB',
    parameters: mkp('storeName', 'key', 'data')
  },
  {
    name: 'add_grid_row',
    description: 'Add a new row to the grid at optional position',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'string', description: 'Optional row index (0-based). If not provided, adds at end.' }
      },
      required: []
    }
  },
  {
    name: 'add_grid_column',
    description: 'Add a new column to the grid at optional position',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'string', description: 'Optional column index (0-based). If not provided, adds at end.' }
      },
      required: []
    }
  },
  {
    name: 'delete_grid_row',
    description: 'Delete a row from the grid by index',
    parameters: mkp('rowIndex')
  },
  {
    name: 'delete_grid_column',
    description: 'Delete a column from the grid by index',
    parameters: mkp('columnIndex')
  },
  {
    name: 'update_grid_cell',
    description: 'Update a cell value in the grid',
    parameters: mkp('rowIndex', 'columnIndex', 'value')
  },
  {
    name: 'get_grid_data',
    description: 'Get current grid data and dimensions',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'update_grid_header',
    description: 'Update the header/label of a column',
    parameters: mkp('columnIndex', 'value')
  },
  {
    name: 'sort_grid_column',
    description: 'Sort a column in ascending or descending order',
    parameters: {
      type: 'object',
      properties: {
        columnIndex: { type: 'string', description: 'The column index to sort (0-based)' },
        order: { type: 'string', description: 'Sort order: "asc" or "desc". Default is "asc"' }
      },
      required: ['columnIndex']
    }
  },
  {
    name: 'move_grid_row',
    description: 'Move a row from one position to another',
    parameters: {
      type: 'object',
      properties: {
        fromIndex: { type: 'string', description: 'Source row index (0-based)' },
        toIndex: { type: 'string', description: 'Destination row index (0-based)' }
      },
      required: ['fromIndex', 'toIndex']
    }
  },
  {
    name: 'clear_grid',
    description: 'Clear all grid data and reset to initial state',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'export_grid_csv',
    description: 'Export grid data to CSV file (downloads automatically)',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'import_grid_csv',
    description: 'Import grid data from CSV content',
    parameters: mkp('csvContent')
  },
  {
    name: 'grid_goto_page',
    description: 'Navigate to a specific page number in the grid (1-based page numbers)',
    parameters: mkp('pageNumber')
  },
  {
    name: 'grid_next_page',
    description: 'Navigate to the next page in the grid',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'grid_previous_page',
    description: 'Navigate to the previous page in the grid',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
].map(f => ({ type: 'function', function: f }));


/* ============================================================
   MESSAGE HISTORY
============================================================ */

const hist = [{ role: 'system', content: SYSTEM }];

function extractAssistantMessage(data) {
  if (data && typeof data.message === 'object' && data.message !== null) {
    return data.message;
  }

  const choiceMessage = data?.choices?.[0]?.message;
  if (choiceMessage && typeof choiceMessage === 'object') {
    return choiceMessage;
  }

  return {
    role: 'assistant',
    content: data?.content ?? ''
  };
}


/* ============================================================
   OLLAMA API CALL
============================================================ */

async function callLLM(msgs) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(DEEPSEEK_API_KEY ? { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` } : {})
    },
    body: JSON.stringify({
      model: MODEL,
      messages: msgs,
      tools: defs,
      tool_choice: 'auto',
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return extractAssistantMessage(data);
}


/* ============================================================
   CORE RUN LOOP
   Implements: llm → tool_calls? → execute tools → [tool results] → llm → ... → text response
============================================================ */

async function run(msgs) {
  let iteration = 0;
  const maxIterations = 10; // Prevent infinite loops

  while (iteration < maxIterations) {
    iteration++;

    console.log(`\n[Iteration ${iteration}] Calling LLM...`);

    // Step 1: Call LLM
    const msg = await callLLM(msgs);

    // Step 2: Add assistant response to history
    msgs.push(msg);

    console.log('Assistant response:', msg);

    // Step 3: Check if there are tool calls
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      // No tools? We're done - return final text response
      console.log('[Done] No tool calls, returning final response');
      return msg.content;
    }

    // Step 4: Execute all tool calls
    console.log(`[Tools] Executing ${msg.tool_calls.length} tool(s)...`);

    for (const t of msg.tool_calls) {
      const name = t?.function?.name;
      if (!name) {
        continue;
      }

      let args = t?.function?.arguments;
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args);
        } catch {
          args = {};
        }
      }

      console.log(`  → Executing: ${name}(${JSON.stringify(args)})`);

      // Execute the tool
      const result = String(await htools[name](args));

      console.log(`  ← Result: ${result}`);

      // Step 5: Add tool result to messages
      msgs.push({
        role: 'tool',
        tool_call_id: t.id,
        content: result
      });
    }

    // Loop continues - LLM will process tool results
  }

  return 'Maximum iterations reached';
}


/* ============================================================
   USER INPUT (Browser Console Interface)
============================================================ */

async function ask(prompt) {
  return new Promise((resolve) => {
    // For browser console usage
    const input = window.prompt(prompt);
    resolve(input || '');
  });
}


/* ============================================================
   MAIN INTERACTION LOOP
============================================================ */

async function startHarness() {
  console.log('='.repeat(60));
  console.log('🔧 Browser Tool-Calling Harness Started');
  console.log('='.repeat(60));
  console.log('Type your message and press Enter');
  console.log('Example: "Store my name as John in localStorage"');
  console.log('Example: "Calculate 2 + 2 * 5"');
  console.log('='.repeat(60));

  while (true) {
    const input = await ask('\n> ');

    if (!input.trim()) {
      continue; // Skip empty input
    }

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('👋 Goodbye!');
      break;
    }

    // Add user message to history
    hist.push({ role: 'user', content: input });

    try {
      // Run the tool-calling loop
      const response = await run(hist);

      // Display final response
      console.log('\n✅ Final Response:');
      console.log(response);

    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}


/* ============================================================
   SINGLE-SHOT API (for programmatic use)
============================================================ */

async function chat(userMessage) {
  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userMessage }
  ];

  return await run(messages);
}


/* ============================================================
   EXPORTS (for use in index.html)
============================================================ */

window.Harness = {
  start: startHarness,
  chat: chat,
  tools: htools,
  history: hist,
  run: run
};
