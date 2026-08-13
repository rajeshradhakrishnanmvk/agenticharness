/**
 * Tool Templates Library
 * Pre-built templates for common tool patterns
 */

const ToolTemplates = {
  /**
   * Move Row Template
   */
  moveRow: {
    name: 'move_grid_row',
    description: 'Move a row from one position to another in the grid. The row is removed from its original position and inserted at the target position.',
    parameters: {
      properties: {
        fromIndex: {
          type: 'string',
          description: 'The index of the row to move (0-based)'
        },
        toIndex: {
          type: 'string',
          description: 'The target position to move the row to (0-based)'
        }
      },
      required: ['fromIndex', 'toIndex']
    },
    implementation: `
      // Get the grid instance
      if (!window.AgenticGrid) {
        return 'Error: Grid not initialized';
      }

      const fromIdx = parseInt(args.fromIndex);
      const toIdx = parseInt(args.toIndex);

      // Call the moveRow method on the grid
      const result = window.AgenticGrid.moveRow(fromIdx, toIdx);

      return result;
    `
  },

  /**
   * Grid Row Copy Template
   */
  copyRow: {
    name: 'copy_grid_row',
    description: 'Copy a row to a new position in the grid. Creates a duplicate of the source row at the target position.',
    parameters: {
      properties: {
        sourceRowIndex: { 
          type: 'string', 
          description: 'The index of the row to copy (0-based)' 
        },
        targetPosition: { 
          type: 'string', 
          description: 'Where to insert the copied row (0-based). If not provided, adds at the end.' 
        }
      },
      required: ['sourceRowIndex']
    },
    implementation: `
      // Get the grid instance
      if (!window.AgenticGrid) {
        return 'Error: Grid not initialized';
      }

      const sourceIdx = parseInt(args.sourceRowIndex);
      const targetPos = args.targetPosition ? parseInt(args.targetPosition) : undefined;

      // Get current grid data
      const state = window.AgenticGrid.getFullState();
      
      // Validate source row
      if (sourceIdx < 0 || sourceIdx >= state.data.length) {
        return \`Error: Invalid source row index \${sourceIdx}. Grid has \${state.data.length} rows.\`;
      }

      // Copy the row data
      const sourceRow = [...state.data[sourceIdx]];

      // Add new row at target position
      window.AgenticGrid.addRow(targetPos);

      // Get the actual position where row was added
      const newState = window.AgenticGrid.getFullState();
      const actualPos = targetPos !== undefined ? targetPos : newState.data.length - 1;

      // Update each cell in the new row with copied data
      sourceRow.forEach((value, colIdx) => {
        window.AgenticGrid.updateCell(actualPos, colIdx, value);
      });

      return \`Row \${sourceIdx} copied to position \${actualPos}. Grid now has \${newState.rows} rows.\`;
    `
  },

  /**
   * Grid Column Copy Template
   */
  copyColumn: {
    name: 'copy_grid_column',
    description: 'Copy a column to a new position in the grid. Creates a duplicate of the source column at the target position.',
    parameters: {
      properties: {
        sourceColumnIndex: { 
          type: 'string', 
          description: 'The index of the column to copy (0-based)' 
        },
        targetPosition: { 
          type: 'string', 
          description: 'Where to insert the copied column (0-based). If not provided, adds at the end.' 
        }
      },
      required: ['sourceColumnIndex']
    },
    implementation: `
      if (!window.AgenticGrid) {
        return 'Error: Grid not initialized';
      }

      const sourceIdx = parseInt(args.sourceColumnIndex);
      const targetPos = args.targetPosition ? parseInt(args.targetPosition) : undefined;

      const state = window.AgenticGrid.getFullState();
      
      if (sourceIdx < 0 || sourceIdx >= state.columns) {
        return \`Error: Invalid source column index \${sourceIdx}. Grid has \${state.columns} columns.\`;
      }

      // Copy column data
      const columnData = state.data.map(row => row[sourceIdx]);
      const headerValue = state.headers[sourceIdx];

      // Add new column
      window.AgenticGrid.addColumn(targetPos);

      // Get actual position
      const newState = window.AgenticGrid.getFullState();
      const actualPos = targetPos !== undefined ? targetPos : newState.columns - 1;

      // Copy header
      window.AgenticGrid.updateHeader(actualPos, headerValue + ' (Copy)');

      // Copy data
      columnData.forEach((value, rowIdx) => {
        window.AgenticGrid.updateCell(rowIdx, actualPos, value);
      });

      return \`Column \${sourceIdx} copied to position \${actualPos}. Grid now has \${newState.columns} columns.\`;
    `
  },

  /**
   * Bulk Cell Update Template
   */
  bulkUpdate: {
    name: 'bulk_update_cells',
    description: 'Update multiple cells in the grid at once. Accepts an array of cell updates.',
    parameters: {
      properties: {
        updates: { 
          type: 'string', 
          description: 'JSON array of updates, each with rowIndex, columnIndex, and value. Example: "[{\\"rowIndex\\":0,\\"columnIndex\\":0,\\"value\\":\\"New\\"}]"' 
        }
      },
      required: ['updates']
    },
    implementation: `
      if (!window.AgenticGrid) {
        return 'Error: Grid not initialized';
      }

      let updateList;
      try {
        updateList = JSON.parse(args.updates);
      } catch (error) {
        return 'Error: Invalid JSON in updates parameter';
      }

      const results = [];
      for (const update of updateList) {
        const result = window.AgenticGrid.updateCell(
          parseInt(update.rowIndex),
          parseInt(update.columnIndex),
          update.value
        );
        results.push(result);
      }

      return \`Bulk update completed: \${results.length} cells updated.\`;
    `
  },

  /**
   * Find Column by Header Template
   */
  findColumnByHeader: {
    name: 'find_column_by_header',
    description: 'Find the column index by searching for a header name (case-insensitive). Useful for operations that need to locate a column by name.',
    parameters: {
      properties: {
        headerName: {
          type: 'string',
          description: 'The header name to search for (case-insensitive)'
        }
      },
      required: ['headerName']
    },
    implementation: `
      if (!window.AgenticGrid) {
        return 'Error: Grid not initialized';
      }

      const state = window.AgenticGrid.getFullState();
      const searchName = args.headerName.toLowerCase().trim();

      // Find column index by header name (case-insensitive)
      const columnIndex = state.headers.findIndex(header =>
        header.toLowerCase().trim() === searchName
      );

      if (columnIndex === -1) {
        return \`Error: Column with header "\${args.headerName}" not found. Available headers: \${state.headers.join(', ')}\`;
      }

      return \`Column "\${state.headers[columnIndex]}" found at index \${columnIndex}\`;
    `
  }
};

window.ToolTemplates = ToolTemplates;
