// src/utils/pdfGenerator.ts

// Simple HTML to PDF approach using browser's print functionality
export async function generateWorkOrderPDF(workOrder: any) {
  try {
    console.log('Generating PDF for work order:', workOrder.work_order_number);
    
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Could not open print window. Please allow popups.');
    }

    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Work Order ${workOrder.work_order_number}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            width: 120px;
            height: auto;
            margin-bottom: 20px;
          }
          .work-order-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .field {
            margin-bottom: 15px;
            padding: 10px;
            border-bottom: 1px solid #eee;
          }
          .field-label {
            font-weight: bold;
            color: #333;
          }
          .field-value {
            margin-top: 5px;
            color: #666;
          }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="work-order-title">Work Order #${workOrder.work_order_number}</div>
        </div>
        
        <div class="field">
          <div class="field-label">Unit Number:</div>
          <div class="field-value">${workOrder.unitNumber || 'N/A'}</div>
        </div>
        
        <div class="field">
          <div class="field-label">Issue:</div>
          <div class="field-value">${workOrder.issue || 'N/A'}</div>
        </div>
        
        <div class="field">
          <div class="field-label">Notes:</div>
          <div class="field-value">${workOrder.notes || 'None'}</div>
        </div>
        
        <div class="field">
          <div class="field-label">Reported By:</div>
          <div class="field-value">${workOrder.reportedBy || 'N/A'}</div>
        </div>
        
        <div class="field">
          <div class="field-label">Created:</div>
          <div class="field-value">${workOrder.createdAt || 'N/A'}</div>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Print/Save as PDF
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `;

    // Write content to the new window
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Auto-focus the new window
    printWindow.focus();

    console.log('PDF generation window opened successfully');

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert(`Failed to generate PDF: ${error.message}. Please ensure popups are allowed.`);
  }
}
