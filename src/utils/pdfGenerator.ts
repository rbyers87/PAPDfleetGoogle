// src/utils/pdfGenerator.ts
import logo from "../assets/logo.png";

// Helper: convert an image URL to base64 for pdfmake
async function getBase64Image(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert image to base64'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

// Load pdfMake from CDN (most reliable approach)
async function loadPdfMakeFromCDN(): Promise<any> {
  // Check if already loaded
  if ((window as any).pdfMake) {
    console.log('pdfMake already loaded');
    return (window as any).pdfMake;
  }

  console.log('Loading pdfMake from CDN...');
  
  return new Promise((resolve, reject) => {
    // Create script elements
    const pdfMakeScript = document.createElement('script');
    const vfsScript = document.createElement('script');
    
    let scriptsLoaded = 0;
    
    const checkComplete = () => {
      scriptsLoaded++;
      if (scriptsLoaded === 2) {
        if ((window as any).pdfMake) {
          console.log('pdfMake loaded successfully from CDN');
          resolve((window as any).pdfMake);
        } else {
          reject(new Error('pdfMake not found on window after loading scripts'));
        }
      }
    };
    
    // Load pdfMake
    pdfMakeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.20/pdfmake.min.js';
    pdfMakeScript.onload = checkComplete;
    pdfMakeScript.onerror = () => reject(new Error('Failed to load pdfMake script'));
    
    // Load vfs_fonts
    vfsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.20/vfs_fonts.min.js';
    vfsScript.onload = checkComplete;
    vfsScript.onerror = () => reject(new Error('Failed to load vfs_fonts script'));
    
    // Add scripts to head
    document.head.appendChild(pdfMakeScript);
    document.head.appendChild(vfsScript);
  });
}

export async function generateWorkOrderPDF(workOrder: any) {
  try {
    console.log('Starting PDF generation for work order:', workOrder.work_order_number);
    
    // Load pdfMake from CDN
    const pdfMake = await loadPdfMakeFromCDN();
    
    // Convert logo to base64 (handle potential errors)
    let logoBase64: string | undefined;
    try {
      logoBase64 = await getBase64Image(logo);
      console.log('Logo converted to base64 successfully');
    } catch (logoError) {
      console.warn('Failed to load logo, continuing without it:', logoError);
      logoBase64 = undefined;
    }
    
    // Build content array - include logo only if it loaded successfully
    const content: any[] = [];
    
    if (logoBase64) {
      content.push({ image: logoBase64, width: 120, alignment: "center", margin: [0, 0, 0, 20] });
    }
    
    content.push(
      { text: `Work Order #${workOrder.work_order_number}`, style: "header" },
      { text: `Unit: ${workOrder.unitNumber}`, margin: [0, 5, 0, 0] },
      { text: `Issue: ${workOrder.issue}`, margin: [0, 5, 0, 0] },
      { text: `Notes: ${workOrder.notes || 'None'}`, margin: [0, 5, 0, 0] },
      { text: `Reported By: ${workOrder.reportedBy}`, margin: [0, 5, 0, 0] },
      { text: `Created: ${workOrder.createdAt}`, margin: [0, 5, 0, 0] }
    );
    
    const docDefinition = {
      content,
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10],
        },
      },
      defaultStyle: {
        fontSize: 12,
        lineHeight: 1.4
      },
      pageMargins: [40, 60, 40, 60]
    };
    
    console.log('Document definition created, generating PDF...');
    
    // Create and download the PDF
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.download(`work_order_${workOrder.work_order_number}.pdf`);
    
    console.log('PDF download initiated successfully');
    
  } catch (err) {
    console.error("Error generating PDF:", err);
    console.error("Error details:", {
      name: err?.name,
      message: err?.message,
      stack: err?.stack
    });
    
    // Show user-friendly error message
    alert(`Failed to generate PDF: ${err?.message || 'Unknown error'}. Please try again.`);
  }
}  let vfsSet = false;
  
  // Pattern 1: pdfFonts.pdfMake.vfs
  if (pdfFonts?.pdfMake?.vfs) {
    (pdfMake as any).vfs = pdfFonts.pdfMake.vfs;
    vfsSet = true;
    console.log('VFS set using pdfFonts.pdfMake.vfs');
  }
  // Pattern 2: pdfFonts.vfs
  else if ((pdfFonts as any)?.vfs) {
    (pdfMake as any).vfs = (pdfFonts as any).vfs;
    vfsSet = true;
    console.log('VFS set using pdfFonts.vfs');
  }
  // Pattern 3: Check if it's nested differently
  else if (pdfFonts?.default?.pdfMake?.vfs) {
    (pdfMake as any).vfs = pdfFonts.default.pdfMake.vfs;
    vfsSet = true;
    console.log('VFS set using pdfFonts.default.pdfMake.vfs');
  }
  
  if (!vfsSet) {
    console.error('Failed to set VFS. Available properties:', Object.keys(pdfFonts || {}));
    throw new Error('Unable to initialize pdfMake VFS');
  }
} else {
  console.log('VFS already set');
}

return pdfMake;
```

} catch (error) {
console.error(‘Error initializing pdfMake:’, error);
throw error;
}
}

export async function generateWorkOrderPDF(workOrder: any) {
try {
console.log(‘Starting PDF generation for work order:’, workOrder.work_order_number);

```
// Initialize pdfMake
const pdfMake = await initializePdfMake();

console.log('pdfMake initialized successfully');

// Convert logo.png → base64
const logoBase64 = await getBase64Image(logo);
console.log('Logo converted to base64');

const docDefinition = {
  content: [
    { image: logoBase64, width: 120, alignment: "center", margin: [0, 0, 0, 20] },
    { text: `Work Order #${workOrder.work_order_number}`, style: "header" },
    { text: `Unit: ${workOrder.unitNumber}`, margin: [0, 5, 0, 0] },
    { text: `Issue: ${workOrder.issue}`, margin: [0, 5, 0, 0] },
    { text: `Notes: ${workOrder.notes}`, margin: [0, 5, 0, 0] },
    { text: `Reported By: ${workOrder.reportedBy}`, margin: [0, 5, 0, 0] },
    { text: `Created: ${workOrder.createdAt}`, margin: [0, 5, 0, 0] },
  ],
  styles: {
    header: {
      fontSize: 18,
      bold: true,
      margin: [0, 0, 0, 10],
    },
  },
};

console.log('Document definition created, generating PDF...');

// Create and download the PDF
const pdfDocGenerator = (pdfMake as any).createPdf(docDefinition);
pdfDocGenerator.download(`work_order_${workOrder.work_order_number}.pdf`);

console.log('PDF download initiated');
```

} catch (err) {
console.error(“Error generating PDF:”, err);
console.error(“Error details:”, {
name: err?.name,
message: err?.message,
stack: err?.stack
});

```
// Show user-friendly error message
alert("Failed to generate PDF. Please check the console for details and try again.");
```

}
}
