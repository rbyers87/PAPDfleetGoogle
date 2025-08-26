// src/utils/pdfGenerator.ts
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import logo from "../assets/logo.png"; // Vite handles this import

// ✅ For pdfMake 0.2.20 - set up VFS correctly
pdfMake.vfs = pdfFonts.pdfMake.vfs;

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

export async function generateWorkOrderPDF(workOrder: any) {
  try {
    // Convert logo.png → base64
    const logoBase64 = await getBase64Image(logo);
    
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
    
    pdfMake.createPdf(docDefinition).download(`work_order_${workOrder.work_order_number}.pdf`);
  } catch (err) {
    console.error("Error generating PDF:", err);
  }
}
