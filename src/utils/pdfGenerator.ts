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
          /* ... existing styles remain the same ... */
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
            <div class="field-label">Work Order Number</div>
            <div class="field-value">#${workOrder.work_order_number || 'Not assigned'}</div>
          </div>

          <div class="field">
            <div class="field-label">Unit Number</div>
            <div class="field-value">${workOrder.unit_number || workOrder.unitNumber || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Description of Issue</div>
            <div class="field-value">${workOrder.description || workOrder.issue || 'Not specified'}</div>
          </div>

          ${workOrder.notes ? `
          <div class="field">
            <div class="field-label">Additional Notes</div>
            <div class="field-value">${workOrder.notes}</div>
          </div>
          ` : ''}

          <div class="field">
            <div class="field-label">Priority</div>
            <div class="field-value">${workOrder.priority ? workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1) : 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Location</div>
            <div class="field-value">${workOrder.location || workOrder.currentLocation || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Current Mileage</div>
            <div class="field-value">${workOrder.mileage ? workOrder.mileage.toLocaleString() + ' miles' : 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Vehicle ID</div>
            <div class="field-value">${workOrder.vehicle_id || workOrder.vehicleId || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Created By</div>
            <div class="field-value">${workOrder.created_by || workOrder.reportedBy || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Date Created</div>
            <div class="field-value">${workOrder.created_at ? new Date(workOrder.created_at).toLocaleString() : workOrder.createdAt || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Status</div>
            <div class="field-value">${workOrder.status || 'Open'}</div>
          </div>
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Police Department Fleet Management System</p>
        </div>

        <script>
          // Auto-focus for better UX
          window.focus();
        </script>
      </body>
      </html>
    `;

    // ... rest of the function remains the same ...
  } catch (error) {
    // ... error handling remains the same ...
  }
}
