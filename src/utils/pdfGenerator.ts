// src/utils/pdfGenerator.ts
export async function generateWorkOrderPDF(workOrder: any) {
  try {
    console.log('🆕 Generating work order PDF for:', workOrder.work_order_number);
    console.log('Complete work order data:', workOrder); // Debug log

    // Helper function to safely get values
    const getValue = (value: any, fallback: string = 'Not specified') => {
      if (value === null || value === undefined || value === '') return fallback;
      return value;
    };

    const getMileage = () => {
      const mileage = workOrder.mileage;
      if (!mileage && mileage !== 0) return 'Not specified';
      return `${mileage.toLocaleString()} miles`;
    };

    const getDate = (dateField: any) => {
      if (!dateField) return 'Not specified';
      try {
        return new Date(dateField).toLocaleString();
      } catch {
        return 'Invalid date';
      }
    };

    const getPriority = () => {
      const priority = workOrder.priority;
      if (!priority) return 'Not specified';
      return priority.charAt(0).toUpperCase() + priority.slice(1);
    };

    // Extract nested data
    const unitNumber = workOrder.vehicle?.unit_number || workOrder.unit_number || 'Not specified';
    const vehicleMake = workOrder.vehicle?.make || 'Not specified';
    const vehicleModel = workOrder.vehicle?.model || 'Not specified';
    const vehicleYear = workOrder.vehicle?.year || 'Not specified';
    const createdByName = workOrder.creator?.full_name || workOrder.created_by || 'Not specified';
    const createdByBadge = workOrder.creator?.badge_number ? `(Badge #${workOrder.creator.badge_number})` : '';

    // Create HTML content for the work order
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: "Helvetica Neue", Arial, sans-serif;
      margin: 40px;
      color: #222;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #003366;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .header .title {
      font-size: 26px;
      font-weight: bold;
      color: #003366;
    }
    .header .subtitle {
      font-size: 14px;
      color: #555;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      color: #444;
      margin-bottom: 8px;
      border-left: 4px solid #003366;
      padding-left: 8px;
    }
    .field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 20px;
      background: #f8f9fc;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 6px;
    }
    .field {
      font-size: 14px;
    }
    .field-label {
      font-weight: bold;
      color: #555;
    }
    .field-value {
      margin-top: 2px;
      font-size: 15px;
      color: #111;
    }
    .highlight {
      background: #fff9db;
      border-left: 4px solid #e0a800;
      padding: 10px 12px;
      margin-top: 8px;
      border-radius: 4px;
    }
    .footer {
      margin-top: 40px;
      font-size: 11px;
      color: #666;
      text-align: center;
      border-top: 1px solid #ddd;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Work Order #${getValue(workOrder.work_order_number)}</div>
      <div class="subtitle">Police Department Fleet Management</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Work Order Details</div>
    <div class="field-grid">
      <div class="field">
        <div class="field-label">Work Order Number</div>
        <div class="field-value">#${getValue(workOrder.work_order_number)}</div>
      </div>
      <div class="field">
        <div class="field-label">Priority</div>
        <div class="field-value">${getPriority()}</div>
      </div>
      <div class="field">
        <div class="field-label">Status</div>
        <div class="field-value">${getValue(workOrder.status, 'Open')}</div>
      </div>
      <div class="field">
        <div class="field-label">Date Created</div>
        <div class="field-value">${getDate(workOrder.created_at)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Vehicle Information</div>
    <div class="field-grid">
      <div class="field">
        <div class="field-label">Unit Number</div>
        <div class="field-value">${unitNumber}</div>
      </div>
      <div class="field">
        <div class="field-label">Year / Make / Model</div>
        <div class="field-value">${vehicleYear} ${vehicleMake} ${vehicleModel}</div>
      </div>
      <div class="field">
        <div class="field-label">Mileage</div>
        <div class="field-value">${getMileage()}</div>
      </div>
      <div class="field">
        <div class="field-label">Location</div>
        <div class="field-value">${getValue(workOrder.location)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Description of Issue</div>
    <div class="highlight">
      ${getValue(workOrder.description)}
    </div>
    ${getValue(workOrder.notes) !== 'Not specified' ? `
      <div class="highlight" style="margin-top:10px;">
        <strong>Additional Notes:</strong> ${getValue(workOrder.notes)}
      </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">Created By</div>
    <div class="field-value">${createdByName} ${createdByBadge}</div>
  </div>

  <div class="footer">
    Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br>
    Police Department Fleet Management System
  </div>
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
