// src/utils/pdfGenerator.ts
import logo from “../assets/logo.png”;

// Helper: convert an image URL to base64 for pdfmake
async function getBase64Image(url: string): Promise<string> {
const res = await fetch(url);
const blob = await res.blob();
return new Promise((resolve) => {
const reader = new FileReader();
reader.onloadend = () => resolve(reader.result as string);
reader.readAsDataURL(blob);
});
}

// Initialize pdfMake with proper error handling
async function initializePdfMake() {
try {
console.log(‘Attempting to load pdfMake modules…’);

```
// Try dynamic imports first
const [pdfMakeModule, pdfFontsModule] = await Promise.all([
  import("pdfmake/build/pdfmake"),
  import("pdfmake/build/vfs_fonts")
]);

console.log('Modules loaded:', { pdfMakeModule, pdfFontsModule });

// Handle different export patterns
const pdfMake = pdfMakeModule.default || pdfMakeModule;
const pdfFonts = pdfFontsModule.default || pdfFontsModule;

console.log('Extracted modules:', { pdfMake, pdfFonts });

// Try different VFS setup patterns
if (!(pdfMake as any).vfs) {
  let vfsSet = false;
  
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