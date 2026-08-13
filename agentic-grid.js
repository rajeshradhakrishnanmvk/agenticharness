/**
 * Agentic Grid - Dynamic Grid with CRUD Operations
 * Stores data in localStorage and provides chat-based interaction
 */

(function() {
  'use strict';

  const GRID_STORAGE_KEY = 'agentic_grid_data';

  class AgenticGrid {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      const stored = this.loadFromStorage();
      this.data = stored?.data || this.createInitialData();
      this.headers = stored?.headers || this.createInitialHeaders();
      this.render();
    }

    createInitialData() {
      // Initial grid: 1 row, 3 columns
      return [
        ['', '', '']
      ];
    }

    createInitialHeaders() {
      // Initial headers for 3 columns
      return ['Col 0', 'Col 1', 'Col 2'];
    }

    loadFromStorage() {
      try {
        const stored = localStorage.getItem(GRID_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.error('Error loading grid data:', error);
        return null;
      }
    }

    saveToStorage() {
      try {
        localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify({
          data: this.data,
          headers: this.headers
        }));
        console.log('Grid saved to localStorage');
      } catch (error) {
        console.error('Error saving grid data:', error);
      }
    }

    addRow(position) {
      const columnCount = this.data[0] ? this.data[0].length : 3;
      const newRow = new Array(columnCount).fill('');
      
      if (position !== undefined && position >= 0 && position <= this.data.length) {
        this.data.splice(position, 0, newRow);
      } else {
        this.data.push(newRow);
      }
      
      this.saveToStorage();
      this.render();
      return `Row added. Grid now has ${this.data.length} rows.`;
    }

    addColumn(position) {
      const newColumnIndex = position !== undefined && position >= 0 ? position :
                             (this.data[0] ? this.data[0].length : 0);

      this.data.forEach(row => {
        row.splice(newColumnIndex, 0, '');
      });

      // Add header for new column
      const newHeader = `Col ${newColumnIndex}`;
      this.headers.splice(newColumnIndex, 0, newHeader);

      this.saveToStorage();
      this.render();
      const columnCount = this.data[0] ? this.data[0].length : 0;
      return `Column added. Grid now has ${columnCount} columns.`;
    }

    deleteRow(rowIndex) {
      if (rowIndex < 0 || rowIndex >= this.data.length) {
        return `Error: Invalid row index ${rowIndex}`;
      }
      
      if (this.data.length === 1) {
        return 'Error: Cannot delete the last row';
      }
      
      this.data.splice(rowIndex, 1);
      this.saveToStorage();
      this.render();
      return `Row ${rowIndex} deleted. Grid now has ${this.data.length} rows.`;
    }

    deleteColumn(columnIndex) {
      const columnCount = this.data[0] ? this.data[0].length : 0;

      if (columnIndex < 0 || columnIndex >= columnCount) {
        return `Error: Invalid column index ${columnIndex}`;
      }

      if (columnCount === 1) {
        return 'Error: Cannot delete the last column';
      }

      this.data.forEach(row => {
        row.splice(columnIndex, 1);
      });

      // Remove header for deleted column
      this.headers.splice(columnIndex, 1);

      this.saveToStorage();
      this.render();
      const newColumnCount = this.data[0] ? this.data[0].length : 0;
      return `Column ${columnIndex} deleted. Grid now has ${newColumnCount} columns.`;
    }

    updateCell(rowIndex, columnIndex, value) {
      if (rowIndex < 0 || rowIndex >= this.data.length) {
        return `Error: Invalid row index ${rowIndex}`;
      }

      const columnCount = this.data[rowIndex] ? this.data[rowIndex].length : 0;
      if (columnIndex < 0 || columnIndex >= columnCount) {
        return `Error: Invalid column index ${columnIndex}`;
      }

      this.data[rowIndex][columnIndex] = value;
      this.saveToStorage();
      this.render();
      return `Cell [${rowIndex}, ${columnIndex}] updated to: ${value}`;
    }

    updateHeader(columnIndex, value) {
      const columnCount = this.headers.length;

      if (columnIndex < 0 || columnIndex >= columnCount) {
        return `Error: Invalid column index ${columnIndex}`;
      }

      this.headers[columnIndex] = value;
      this.saveToStorage();
      this.render();
      return `Column header ${columnIndex} updated to: ${value}`;
    }

    getData() {
      return this.data;
    }

    getHeaders() {
      return this.headers;
    }

    getFullState() {
      return {
        rows: this.data.length,
        columns: this.headers.length,
        headers: this.headers,
        data: this.data
      };
    }

    forceRefresh() {
      console.log('🔄 Force refresh requested');
      this.render();
      return 'Grid refreshed';
    }

    moveRow(fromIndex, toIndex) {
      if (fromIndex < 0 || fromIndex >= this.data.length) {
        return `Error: Invalid source row index ${fromIndex}`;
      }

      if (toIndex < 0 || toIndex >= this.data.length) {
        return `Error: Invalid destination row index ${toIndex}`;
      }

      if (fromIndex === toIndex) {
        return `Row ${fromIndex} is already at position ${toIndex}`;
      }

      // Remove the row from its current position
      const [rowToMove] = this.data.splice(fromIndex, 1);

      // Insert it at the new position
      this.data.splice(toIndex, 0, rowToMove);

      this.saveToStorage();
      this.render();
      return `Row moved from position ${fromIndex} to position ${toIndex}`;
    }

    clear() {
      this.data = this.createInitialData();
      this.headers = this.createInitialHeaders();
      this.saveToStorage();
      this.render();
      return 'Grid cleared and reset to initial state';
    }

    sortColumn(columnIndex, order = 'asc') {
      const columnCount = this.headers.length;

      console.log('🔍 Sort Debug:', {
        columnIndex,
        order,
        columnCount,
        headers: this.headers,
        dataRowCount: this.data.length,
        sampleData: this.data.slice(0, 3)
      });

      if (columnIndex < 0 || columnIndex >= columnCount) {
        return `Error: Invalid column index ${columnIndex}. Grid has ${columnCount} columns (0-${columnCount - 1})`;
      }

      if (!['asc', 'desc'].includes(order.toLowerCase())) {
        return `Error: Order must be 'asc' or 'desc'`;
      }

      const sortOrder = order.toLowerCase();

      console.log('📊 Before sort:', JSON.parse(JSON.stringify(this.data)));

      // Sort the data rows by the specified column
      this.data.sort((rowA, rowB) => {
        const valueA = rowA[columnIndex] || '';
        const valueB = rowB[columnIndex] || '';

        // Try to parse as numbers for numeric sorting
        const numA = parseFloat(valueA);
        const numB = parseFloat(valueB);

        const isNumericA = !isNaN(numA) && valueA.toString().trim() !== '';
        const isNumericB = !isNaN(numB) && valueB.toString().trim() !== '';

        // Both are numbers - numeric sort
        if (isNumericA && isNumericB) {
          const result = sortOrder === 'asc' ? numA - numB : numB - numA;
          console.log(`  Comparing ${valueA} vs ${valueB} (numeric ${sortOrder}): ${result}`);
          return result;
        }

        // String comparison (case-insensitive)
        const strA = valueA.toString().toLowerCase();
        const strB = valueB.toString().toLowerCase();

        let result;
        if (sortOrder === 'asc') {
          result = strA.localeCompare(strB);
        } else {
          result = strB.localeCompare(strA);
        }
        console.log(`  Comparing "${valueA}" vs "${valueB}" (string ${sortOrder}): ${result}`);
        return result;
      });

      console.log('📊 After sort:', JSON.parse(JSON.stringify(this.data)));

      // Force save and render
      console.log('💾 Saving to storage...');
      this.saveToStorage();

      console.log('🎨 Starting render...');
      this.render();

      // Force a re-flow to ensure DOM updates
      if (this.container) {
        console.log('🔄 Forcing DOM reflow...');
        void this.container.offsetHeight;
      }

      const headerName = this.headers[columnIndex];
      const orderText = sortOrder === 'asc' ? 'ascending' : 'descending';
      const result = `Column "${headerName}" (index ${columnIndex}) sorted in ${orderText} order`;
      console.log('✅ Sort complete:', result);
      return result;
    }

    exportToCSV() {
      try {
        // Escape CSV field (handle quotes and commas)
        const escapeCSV = (field) => {
          const str = String(field || '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        // Build CSV content
        let csv = '';

        // Add headers
        csv += this.headers.map(escapeCSV).join(',') + '\n';

        // Add data rows
        for (let row of this.data) {
          csv += row.map(escapeCSV).join(',') + '\n';
        }

        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `grid_export_${Date.now()}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        return `CSV exported successfully (${this.data.length} rows, ${this.headers.length} columns)`;
      } catch (error) {
        console.error('Error exporting CSV:', error);
        return `Error exporting CSV: ${error.message}`;
      }
    }

    importFromCSV(csvContent) {
      try {
        // Parse CSV content
        const parseCSV = (text) => {
          const rows = [];
          let currentRow = [];
          let currentField = '';
          let inQuotes = false;

          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (inQuotes) {
              if (char === '"' && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i++; // Skip next quote
              } else if (char === '"') {
                // End of quoted field
                inQuotes = false;
              } else {
                currentField += char;
              }
            } else {
              if (char === '"') {
                // Start of quoted field
                inQuotes = true;
              } else if (char === ',') {
                // Field separator
                currentRow.push(currentField);
                currentField = '';
              } else if (char === '\n' || char === '\r') {
                // Row separator
                if (currentField || currentRow.length > 0) {
                  currentRow.push(currentField);
                  if (currentRow.some(f => f.trim())) { // Skip empty rows
                    rows.push(currentRow);
                  }
                  currentRow = [];
                  currentField = '';
                }
                // Skip \r\n combination
                if (char === '\r' && nextChar === '\n') {
                  i++;
                }
              } else {
                currentField += char;
              }
            }
          }

          // Add last field and row if any
          if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            if (currentRow.some(f => f.trim())) {
              rows.push(currentRow);
            }
          }

          return rows;
        };

        const rows = parseCSV(csvContent);

        if (rows.length === 0) {
          return 'Error: CSV file is empty';
        }

        // First row is headers
        this.headers = rows[0].map(h => h.trim() || 'Col');

        // Remaining rows are data
        if (rows.length > 1) {
          this.data = rows.slice(1);
        } else {
          // No data rows, create one empty row
          this.data = [new Array(this.headers.length).fill('')];
        }

        // Normalize all rows to have the same number of columns
        const columnCount = this.headers.length;
        this.data = this.data.map(row => {
          if (row.length < columnCount) {
            // Pad with empty strings
            return [...row, ...new Array(columnCount - row.length).fill('')];
          } else if (row.length > columnCount) {
            // Truncate
            return row.slice(0, columnCount);
          }
          return row;
        });

        this.saveToStorage();
        this.render();

        return `CSV imported successfully (${this.data.length} rows, ${this.headers.length} columns)`;
      } catch (error) {
        console.error('Error importing CSV:', error);
        return `Error importing CSV: ${error.message}`;
      }
    }

    render() {
      console.log('🎨 Render called');

      if (!this.container) {
        console.error('❌ Container not found! Cannot render.');
        return;
      }

      console.log('✅ Container exists:', this.container.id);

      const rowCount = this.data.length;
      const columnCount = this.data[0] ? this.data[0].length : 0;

      console.log(`📊 Rendering grid: ${rowCount} rows × ${columnCount} columns`);

      let html = '<div class="agentic-grid-wrapper">';
      html += `<div class="grid-info">Grid: ${rowCount} rows × ${columnCount} columns</div>`;
      html += '<div class="grid-table-wrapper"><table class="agentic-grid-table">';

      // Header row with editable headers and sort buttons
      html += '<thead><tr><th>Row</th>';
      for (let c = 0; c < columnCount; c++) {
        const headerValue = this.headers[c] || `Col ${c}`;
        html += `<th style="position: relative; padding: 0;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
            <input type="text" class="grid-header" data-col="${c}" value="${this.escapeHtml(headerValue)}" style="background: transparent; border: 1px solid transparent; text-align: center; font-weight: 600; flex: 1; padding: 4px;">
            <div style="display: flex; flex-direction: column; gap: 0;">
              <button class="sort-btn sort-asc" data-col="${c}" data-order="asc" title="Sort Ascending" style="font-size: 8px; padding: 0 2px; border: none; background: transparent; cursor: pointer; color: #9ca3af;">▲</button>
              <button class="sort-btn sort-desc" data-col="${c}" data-order="desc" title="Sort Descending" style="font-size: 8px; padding: 0 2px; border: none; background: transparent; cursor: pointer; color: #9ca3af;">▼</button>
            </div>
          </div>
        </th>`;
      }
      html += '<th>Actions</th></tr></thead>';
            // Grid controls
      html += '<div class="grid-controls">';
      // html += '<button class="grid-btn grid-btn-primary" id="addRowBtn">➕ Add Row</button>';
      // html += '<button class="grid-btn grid-btn-primary" id="addColumnBtn">➕ Add Column</button>';
      html += '<button class="grid-btn grid-btn-success" id="exportCSVBtn">📥 Export CSV</button>';
      html += '<button class="grid-btn grid-btn-success" id="importCSVBtn">📤 Import CSV</button>';
      html += '<input type="file" id="csvFileInput" accept=".csv" style="display: none;">';
      // html += '<button class="grid-btn grid-btn-danger" id="clearGridBtn">🗑️ Clear Grid</button>';
      html += '</div>';
      // Body rows
      html += '<tbody>';
      for (let r = 0; r < rowCount; r++) {
        html += `<tr><td class="row-header">${r}</td>`;

        for (let c = 0; c < columnCount; c++) {
          const cellValue = this.data[r][c] || '';
          html += `<td><input type="text" class="grid-cell" data-row="${r}" data-col="${c}" value="${this.escapeHtml(cellValue)}"></td>`;
        }

        // Action buttons
        html += '<td class="action-cell">';
        html += `<button class="grid-btn grid-btn-delete" data-action="delete-row" data-row="${r}" title="Delete Row">🗑️</button>`;
        html += '</td></tr>';
      }
      html += '</tbody>';

      html += '</table></div>';



      html += '</div>';

      console.log('📝 Setting innerHTML (length:', html.length, 'chars)');
      this.container.innerHTML = html;
      console.log('🔗 Attaching event listeners...');
      this.attachEventListeners();
      console.log('✅ Render complete!');
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    attachEventListeners() {
      // Sort button listeners
      const sortBtns = this.container.querySelectorAll('.sort-btn');
      sortBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const col = parseInt(e.target.dataset.col);
          const order = e.target.dataset.order;
          this.sortColumn(col, order);
        });

        btn.addEventListener('mouseenter', (e) => {
          e.target.style.color = '#2563eb';
        });

        btn.addEventListener('mouseleave', (e) => {
          e.target.style.color = '#9ca3af';
        });
      });

      // Header input listeners
      const headers = this.container.querySelectorAll('.grid-header');
      headers.forEach(header => {
        header.addEventListener('change', (e) => {
          const col = parseInt(e.target.dataset.col);
          const value = e.target.value;
          this.updateHeader(col, value);
        });

        header.addEventListener('blur', (e) => {
          const col = parseInt(e.target.dataset.col);
          const value = e.target.value;
          this.updateHeader(col, value);
        });

        header.addEventListener('focus', (e) => {
          e.target.style.border = '1px solid #2563eb';
          e.target.style.background = '#eff6ff';
        });

        header.addEventListener('blur', (e) => {
          e.target.style.border = '1px solid transparent';
          e.target.style.background = 'transparent';
        });
      });

      // Cell input listeners
      const cells = this.container.querySelectorAll('.grid-cell');
      cells.forEach(cell => {
        cell.addEventListener('change', (e) => {
          const row = parseInt(e.target.dataset.row);
          const col = parseInt(e.target.dataset.col);
          const value = e.target.value;
          this.updateCell(row, col, value);
        });

        cell.addEventListener('blur', (e) => {
          const row = parseInt(e.target.dataset.row);
          const col = parseInt(e.target.dataset.col);
          const value = e.target.value;
          this.updateCell(row, col, value);
        });
      });

      // Delete row buttons
      const deleteRowBtns = this.container.querySelectorAll('[data-action="delete-row"]');
      deleteRowBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const row = parseInt(e.target.dataset.row);
          if (confirm(`Delete row ${row}?`)) {
            this.deleteRow(row);
          }
        });
      });

      // Add row button
      const addRowBtn = this.container.querySelector('#addRowBtn');
      if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
          this.addRow();
        });
      }

      // Add column button
      const addColumnBtn = this.container.querySelector('#addColumnBtn');
      if (addColumnBtn) {
        addColumnBtn.addEventListener('click', () => {
          this.addColumn();
        });
      }

      // Clear grid button
      const clearGridBtn = this.container.querySelector('#clearGridBtn');
      if (clearGridBtn) {
        clearGridBtn.addEventListener('click', () => {
          if (confirm('Clear all grid data?')) {
            this.clear();
          }
        });
      }

      // Export CSV button
      const exportCSVBtn = this.container.querySelector('#exportCSVBtn');
      if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', () => {
          this.exportToCSV();
        });
      }

      // Import CSV button
      const importCSVBtn = this.container.querySelector('#importCSVBtn');
      const csvFileInput = this.container.querySelector('#csvFileInput');

      if (importCSVBtn && csvFileInput) {
        importCSVBtn.addEventListener('click', () => {
          csvFileInput.click();
        });

        csvFileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const csvContent = event.target.result;
              this.importFromCSV(csvContent);
            };
            reader.readAsText(file);
          }
          // Reset input so the same file can be selected again
          csvFileInput.value = '';
        });
      }
    }
  }

  // Expose to window for harness integration
  window.AgenticGrid = null;

  // Initialize grid when DOM is ready
  function initGrid() {
    const gridContainer = document.getElementById('agenticGridContainer');
    if (gridContainer) {
      window.AgenticGrid = new AgenticGrid('agenticGridContainer');
      console.log('✅ Agentic Grid initialized');
    }
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGrid);
  } else {
    initGrid();
  }

})();
