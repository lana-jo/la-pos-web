import {Transaction, TransactionItem} from "@/types";

export interface PrintOptions {
    silent?: boolean;
    printerName?: string;
}

export class PrintManager {
    private static instance: PrintManager;
    private isPrinting = false;

    static getInstance(): PrintManager {
        if (!PrintManager.instance) {
            PrintManager.instance = new PrintManager();
        }
        return PrintManager.instance;
    }

    async printReceipt(
        transaction: Transaction & { items: TransactionItem[] },
        cashierName: string,
        options: PrintOptions = {},
    ): Promise<boolean> {
        if (this.isPrinting) {
            console.warn("Print already in progress");
            return false;
        }

        this.isPrinting = true;

        try {
            // Method 1: Try ESC/POS direct printing (USB thermal)
            if (options.silent && options.printerName) {
                const success = await this.printESCPOS(
                    transaction,
                    cashierName,
                    options.printerName,
                );
                if (success) return true;
            }

            // Method 2: Browser print API (universal compatibility)
            await this.printBrowser(transaction, cashierName, options.silent);

            return true;
        } catch (error) {
            console.error("Print failed:", error);
            return false;
        } finally {
            this.isPrinting = false;
        }
    }

    private async printBrowser(
        transaction: Transaction & { items: TransactionItem[] },
        cashierName: string,
        silent?: boolean,
    ): Promise<void> {
        console.log("[printBrowser] Starting print...");

        // Create a new window for printing
        const printWindow = window.open("", "_blank", "width=800,height=600");
        if (!printWindow) {
            console.error(
                "[printBrowser] Failed to open print window - popup blocker?",
            );
            // Fallback: show user-friendly message and try alternative approach
            if (!silent) {
                // Create a temporary element and print it directly
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.generateReceiptHTML(transaction, cashierName);
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                document.body.appendChild(tempDiv);
                
                // Wait a bit for rendering, then print
                setTimeout(() => {
                    window.print();
                    if (tempDiv.parentNode === document.body) {
                        document.body.removeChild(tempDiv);
                    }
                }, 100);
                return;
            }
            throw new Error("Failed to open print window - please allow popups for this site");
        }
        console.log("[printBrowser] Print window opened");

        // Generate receipt HTML
        const receiptHTML = this.generateReceiptHTML(transaction, cashierName);
        console.log(
            "[printBrowser] Receipt HTML generated, length:",
            receiptHTML.length,
        );

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${transaction.id.slice(-8).toUpperCase()}</title>
          <style>
            @page {
              size: 58mm 210mm;
              margin: 0;
            }
            body {
              font-family: monospace;
              font-size: 9px;
              margin: 0;
              padding: 3mm;
              width: 52mm;
              line-height: 1.15;
            }
            .header {
              text-align: center;
              margin-bottom: 12px;
            }
            .header h1 {
              font-size: 12px;
              font-weight: bold;
              margin: 0;
            }
            .header p {
              font-size: 8px;
              margin: 1px 0;
            }
            .transaction-info {
              margin-bottom: 10px;
            }
            .transaction-info div {
              display: flex;
              justify-content: space-between;
              margin: 1px 0;
              font-size: 8px;
            }
            .items {
              margin-bottom: 10px;
            }
            .item {
              margin-bottom: 3px;
            }
            .item-name {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
            }
            .item-details {
              font-size: 7px;
              color: #666;
              margin-left: 6px;
            }
            .item-variant-details {
              font-size: 6px;
              color: #888;
              margin-left: 12px;
              margin-top: 2px;
            }
            .transaction-details {
              margin-bottom: 10px;
            }
            .section-title {
              font-size: 8px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 4px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              font-size: 7px;
              margin: 1px 0;
            }
            .totals {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 3px 0;
              margin-bottom: 10px;
            }
            .totals div {
              display: flex;
              justify-content: space-between;
              margin: 1px 0;
              font-size: 8px;
            }
            .total {
              font-weight: bold;
              font-size: 9px;
            }
            .footer {
              text-align: center;
              margin-top: 12px;
            }
            .footer p {
              font-size: 8px;
              margin: 1px 0;
            }
            .qr-code {
              display: flex;
              justify-content: center;
              margin: 6px 0;
            }
            .qr-code img {
              width: 40px;
              height: 40px;
            }
            @media print {
                body {
                    margin: 0;
                    font-family: monospace;
                    font-size: 12px;
                    -webkit-font-smoothing: none;
                    font-smooth: never;
                    text-rendering: geometricPrecision;
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                }
                * {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    box-sizing: border-box;
                }
                .header p {
                    font-size: 11px;
                }
                .transaction-info div {
                    font-size: 11px;
                }
                .item-name {
                    font-size: 12px;
                }
                .item-details {
                    font-size: 10px;
                }
                .item-variant-details {
                    font-size: 9px;
                }
                .section-title {
                    font-size: 11px;
                }
                .detail-row {
                    font-size: 10px;
                }
                .totals div {
                    font-size: 11px;
                }
                .total {
                    font-size: 13px;
                    font-weight: bold;
                }
                .footer p {
                    font-size: 11px;
                }
                .qr-code img {
                    width: 120px;
                    height: 120px;
                    image-rendering: pixelated;
                }
                img {
                    image-rendering: pixelated;
                    max-width: 100%;
                    height: auto;
                }
                @page {
                    size: 58mm 210mm;
                    margin: 0;
                    marks: none;
                }
            }
          </style>
        </head>
        <body>
          ${receiptHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);

        printWindow.document.close();
        console.log("[printBrowser] Document written and closed");

        if (!silent) {
            // Wait for print dialog to close (with 30s timeout so it never hangs)
            return new Promise<void>((resolve) => {
                const checkClosed = setInterval(() => {
                    if (printWindow.closed) {
                        clearInterval(checkClosed);
                        resolve();
                    }
                }, 500);
                setTimeout(() => {
                    clearInterval(checkClosed);
                    resolve();
                }, 30000);
            });
        }
    }

    private async printESCPOS(
        transaction: Transaction & { items: TransactionItem[] },
        cashierName: string,
        printerName: string,
    ): Promise<boolean> {
        try {
            // WebUSB API for direct thermal printer communication
            const nav = navigator as Navigator & { usb: any };
            const device = await nav.usb.requestDevice({
                filters: [{vendorId: 0x04b8}], // Epson vendor ID example
            });

            await device.open();
            await device.claimInterface(0);

            const commands = this.generateESCPOSCommands(transaction, cashierName);

            // Send commands to printer
            await device.transferOut(1, commands);

            await device.close();
            return true;
        } catch (error) {
            console.error("ESC/POS printing failed:", error);
            return false;
        }
    }

    private generateReceiptHTML(
        transaction: Transaction & { items: TransactionItem[] },
        cashierName: string,
    ): string {
        console.log(
            "[generateReceiptHTML] Items count:",
            transaction.items?.length || 0,
        );
        console.log("[generateReceiptHTML] Items:", transaction.items);

        const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
            }).format(amount);
        };

        const formatDate = (dateString: string) => {
            return new Date(dateString).toLocaleString("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            });
        };

        const getTransactionId = (id: string) => {
            return id.toUpperCase().slice(-8);
        };

        const itemsHTML = transaction.items
            .map(
                (item) => {
                    const productName = item.product?.name || item.product_name || "Unknown Product";
                    const variantName = item.variant?.variant_name || item.variant_name;
                    const variantInfo = variantName ? ` (${variantName})` : "";
                    const barcode = item.variant?.barcode || item.product?.barcode || item.barcode;
                    const barcodeInfo = barcode ? ` • ${barcode}` : "";
                    
                    const additionalVariantDetails = variantName ? `
          <div class="item-variant-details">
            Variant: ${variantName}
            ${barcode ? `Code: ${barcode}` : ''}
          </div>
        ` : '';
        
                    return `
      <div class="item">
        <div class="item-name">
          <span>${productName}${variantInfo}</span>
          <span>${formatCurrency(item.subtotal)}</span>
        </div>
        <div class="item-details">
          ${item.qty} × ${formatCurrency(item.unit_price)}${barcodeInfo}
        </div>
        ${additionalVariantDetails}
      </div>
    `;
                },
            )
            .join("");

        return `
      <div class="header">
        <h1>POS Store</h1>
        <p>123 Main St, City, Country</p>
        <p>+62 123 456 789</p>
        <p>*** RECEIPT ***</p>
      </div>
      
      <div class="transaction-info">
        <div><span>Transaction ID:</span><span>${getTransactionId(transaction.id)}</span></div>
        <div><span>Date:</span><span>${formatDate(transaction.created_at)}</span></div>
        <div><span>Cashier:</span><span>${cashierName}</span></div>
        ${transaction.paid_at ? `<div><span>Paid:</span><span>${formatDate(transaction.paid_at)}</span></div>` : ""}
      </div>
      
      <div class="items">
        <div class="item-name"><span>ITEMS</span><span>AMOUNT</span></div>
        ${itemsHTML}
      </div>
      
      <div class="transaction-details">
        <div class="section-title">TRANSACTION DETAILS</div>
        <div class="detail-row"><span>Total Items:</span><span>${transaction.items.reduce((sum, item) => sum + item.qty, 0)}</span></div>
        <div class="detail-row"><span>Unique Products:</span><span>${transaction.items.length}</span></div>
        ${transaction.items.some(item => item.variant || item.variant_name) ? `<div class="detail-row"><span>With Variants:</span><span>${transaction.items.filter(item => item.variant || item.variant_name).length}</span></div>` : ''}
      </div>
      
      <div class="totals">
        <div class="total"><span>TOTAL:</span><span>${formatCurrency(transaction.total)}</span></div>
        <div><span>Payment:</span><span>${transaction.payment_method === "cash" ? "Cash" : "QRIS"}</span></div>
        <div><span>Change:</span><span>Rp 0</span></div>
      </div>
      
      <div class="footer">
        <p>Thank you for your purchase!</p>
        <div class="qr-code">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/receipt/${transaction.id}`)}" alt="QR Code" />
        </div>
        <p>Scan for digital receipt</p>
        <p>This is a computer-generated receipt</p>
        <p>No signature required</p>
      </div>
    `;
    }

    private generateESCPOSCommands(
        transaction: Transaction & { items: TransactionItem[] },
        cashierName: string,
    ): Uint8Array {
        // ESC/POS command sequence for thermal printers
        const commands: number[] = [];

        // Initialize printer
        commands.push(0x1b, 0x40); // ESC @ - Initialize

        // Set font to built-in Font A for 58mm printers
        commands.push(0x1b, 0x21, 0x00); // ESC ! 0 - Font A, normal size

        // Set text alignment to center
        commands.push(0x1b, 0x61, 0x01); // ESC a 1 - Center align

        // Store name (bold, double height)
        commands.push(0x1b, 0x21, 0x08); // ESC ! 8 - Font A, double height
        commands.push(0x1b, 0x45, 0x01); // ESC E 1 - Bold on
        commands.push(...this.textToBytes("POS Store\n"));
        commands.push(0x1b, 0x45, 0x00); // ESC E 0 - Bold off
        commands.push(0x1b, 0x21, 0x00); // ESC ! 0 - Font A, normal size

        // Store details
        commands.push(...this.textToBytes("123 Main St, City, Country\n"));
        commands.push(...this.textToBytes("+62 123 456 789\n"));
        commands.push(...this.textToBytes("*** RECEIPT ***\n\n"));

        // Set alignment to left
        commands.push(0x1b, 0x61, 0x00); // ESC a 0 - Left align

        // Transaction info
        commands.push(
            ...this.textToBytes(
                `Transaction ID: ${transaction.id.slice(-8).toUpperCase()}\n`,
            ),
        );
        commands.push(
            ...this.textToBytes(
                `Date: ${new Date(transaction.created_at).toLocaleString("id-ID")}\n`,
            ),
        );
        commands.push(...this.textToBytes(`Cashier: ${cashierName}\n`));

        // Items
        commands.push(0x1b, 0x61, 0x00); // Left align
        commands.push(...this.textToBytes("\nITEMS              AMOUNT\n"));
        commands.push(...this.textToBytes("--------------------------------\n"));

        transaction.items.forEach((item) => {
            const productName = item.product?.name || item.product_name || "Unknown Product";
            const variantName = item.variant?.variant_name || item.variant_name;
            const variantInfo = variantName ? ` (${variantName})` : "";
            const displayName = (productName + variantInfo).padEnd(16);
            
            const amount = new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
            }).format(item.subtotal);

            commands.push(...this.textToBytes(`${displayName}${amount}\n`));

            const details = `  ${item.qty} × ${new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
            }).format(item.unit_price)}`;
            
            const barcode = item.variant?.barcode || item.product?.barcode || item.barcode;
            const barcodeInfo = barcode ? ` • ${barcode}` : "";
            commands.push(...this.textToBytes(`${details}${barcodeInfo}\n`));
            
            // Additional variant details for ESC/POS
            if (variantName) {
                const variantDetails = `    Variant: ${variantName}`;
                commands.push(...this.textToBytes(`${variantDetails}\n`));
                if (barcode) {
                    const variantCode = `    Code: ${barcode}`;
                    commands.push(...this.textToBytes(`${variantCode}\n`));
                }
            }
        });
        
        // Transaction details for ESC/POS
        commands.push(...this.textToBytes("\nTRANSACTION DETAILS\n"));
        commands.push(...this.textToBytes("--------------------\n"));
        commands.push(...this.textToBytes(`Total Items:    ${transaction.items.reduce((sum, item) => sum + item.qty, 0)}\n`));
        commands.push(...this.textToBytes(`Unique Products: ${transaction.items.length}\n`));
        if (transaction.items.some(item => item.variant || item.variant_name)) {
            commands.push(...this.textToBytes(`With Variants:  ${transaction.items.filter(item => item.variant || item.variant_name).length}\n`));
        }

        // Totals
        commands.push(...this.textToBytes("--------------------------------\n"));
        commands.push(0x1b, 0x21, 0x08); // ESC ! 8 - Font A, double height
        commands.push(0x1b, 0x45, 0x01); // Bold on
        const total = new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(transaction.total);
        commands.push(...this.textToBytes(`TOTAL:      ${total}\n`));
        commands.push(0x1b, 0x45, 0x00); // Bold off
        commands.push(0x1b, 0x21, 0x00); // ESC ! 0 - Font A, normal size

        commands.push(
            ...this.textToBytes(
                `Payment:    ${transaction.payment_method === "cash" ? "Cash" : "QRIS"}\n`,
            ),
        );
        commands.push(...this.textToBytes(`Change:     Rp 0\n\n`));

        // Footer
        commands.push(0x1b, 0x61, 0x01); // Center align
        commands.push(...this.textToBytes("Thank you for your purchase!\n"));
        commands.push(
            ...this.textToBytes("This is a computer-generated receipt\n"),
        );
        commands.push(...this.textToBytes("No signature required\n\n"));

        // Cut paper
        commands.push(0x1d, 0x56, 0x00); // GS V 0 - Full cut

        return new Uint8Array(commands);
    }

    private textToBytes(text: string): number[] {
        const bytes: number[] = [];
        for (let i = 0; i < text.length; i++) {
            bytes.push(text.charCodeAt(i));
        }
        return bytes;
    }
}
