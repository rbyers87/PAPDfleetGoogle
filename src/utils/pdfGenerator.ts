// src/utils/pdfGenerator.ts
// COMPLETELY REPLACED - NO MORE PDFMAKE IMPORTS

export async function generateWorkOrderPDF(workOrder: any) {
  try {
    console.log('🆕 UPDATED PDF GENERATOR - Generating work order PDF for:', workOrder.work_order_number);
    
    // Create HTML content for the work order
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Work Order ${workOrder.work_order_number}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
          }
          
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
          }
          
          .subtitle {
            font-size: 16px;
            color: #666;
          }
          
          .content {
            margin-bottom: 30px;
          }
          
          .field {
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-left: 4px solid #007bff;
            border-radius: 0 5px 5px 0;
          }
          
          .field-label {
            font-weight: bold;
            font-size: 14px;
            color: #495057;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          
          .field-value {
            font-size: 16px;
            color: #212529;
            word-wrap: break-word;
          }
          
          .controls {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
          }
          
          .btn {
            padding: 12px 24px;
            margin: 0 5px;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .btn-primary {
            background: #007bff;
            color: white;
          }
          
          .btn-primary:hover {
            background: #0056b3;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0,123,255,0.3);
          }
          
          .btn-secondary {
            background: #6c757d;
            color: white;
          }
          
          .btn-secondary:hover {
            background: #545b62;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(108,117,125,0.3);
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
            border-top: 1px solid #dee2e6;
            padding-top: 20px;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 20px;
            }
            
            .controls {
              display: none !important;
            }
            
            .field {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            @page {
              margin: 0.5in;
              size: letter;
            }
          }
        </style>
      </head>
      <body>
        <div class="controls">
          <button class="btn btn-primary" onclick="window.print()">
            🖨️ Print/Save PDF
          </button>
          <button class="btn btn-secondary" onclick="window.close()">
            ✕ Close
          </button>
        </div>

        <div class="header">
          <div class="title">Work Order #${workOrder.work_order_number}</div>
          <div class="subtitle">Police Department Fleet Management</div>
        </div>

        <div class="content">
          <div class="field">
            <div class="field-label">Unit Number</div>
            <div class="field-value">${workOrder.unitNumber || workOrder.unit_number || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Make</div>
            <div class="field-value">${workOrder.make || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Model</div>
            <div class="field-value">${workOrder.model || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Year</div>
            <div class="field-value">${workOrder.year || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Status</div>
            <div class="field-value">${workOrder.status || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Current Location</div>
            <div class="field-value">${workOrder.currentLocation || workOrder.current_location || workOrder.location || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Current Mileage</div>
            <div class="field-value">${workOrder.currentMileage || workOrder.current_mileage || workOrder.mileage || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Priority</div>
            <div class="field-value">${workOrder.priority || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Description of Issue</div>
            <div class="field-value">${workOrder.issue || workOrder.description || workOrder.issueDescription || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Notes</div>
            <div class="field-value">${workOrder.notes || 'No additional notes'}</div>
          </div>

          <div class="field">
            <div class="field-label">Reported By</div>
            <div class="field-value">${workOrder.reportedBy || workOrder.reported_by || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Date Created</div>
            <div class="field-value">${workOrder.createdAt || workOrder.created_at || workOrder.dateCreated || 'Not specified'}</div>
          </div>
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Police Department Fleet Management System</p>
        </div>

        <script>
          // Auto-focus for better UX
          window.focus();
          
          // Optional: Auto-print after a short delay
          // setTimeout(() => window.print(), 500);
        </script>
      </body>
      </html>
    `;

    // Open new window with the content
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    if (!printWindow) {
      throw new Error('Unable to open print window. Please allow popups for this site.');
    }

    // Write the HTML content
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Focus the new window
    printWindow.focus();

    console.log('Work order PDF window opened successfully');
    
    return true;

  } catch (error) {
    console.error('Error generating work order PDF:', error);
    
    // User-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    alert(`Failed to generate PDF: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
    
    return false;
  }
}
