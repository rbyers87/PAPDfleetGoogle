import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts"; // <-- add this line

pdfMake.vfs = pdfFonts.pdfMake.vfs; // <-- assign the vfs


export function generateWorkOrderPDF(workOrder: {
    work_order_number: number;
    unitNumber: string;
    description: string;
    priority: string;
    location: string;
    mileage: string;
    created_at: string;
}) {
    const docDefinition = {
        content: [
            {
                columns: [
                    {
                        image: 'logo',
                        width: 80
                    },
                    {
                        text: 'Police Fleet Maintenance',
                        style: 'header',
                        alignment: 'right'
                    }
                ]
            },
            { text: `Work Order #${workOrder.work_order_number}`, style: 'subheader', margin: [0, 20, 0, 10] },
            {
                table: {
                    widths: ['auto', '*'],
                    body: [
                        ['Unit Number', workOrder.unitNumber],
                        ['Description', workOrder.description],
                        ['Priority', workOrder.priority],
                        ['Location', workOrder.location],
                        ['Mileage', workOrder.mileage],
                        ['Created At', new Date(workOrder.created_at).toLocaleString()]
                    ]
                }
            }
        ],
        styles: {
            header: { fontSize: 18, bold: true },
            subheader: { fontSize: 14, bold: true }
        },
        images: {
            logo: '/assets/logo.png' // make sure logo.png is in public/assets
        }
    };

    return pdfMake.createPdf(docDefinition).download(`work_order_${workOrder.work_order_number}.pdf`);
}
