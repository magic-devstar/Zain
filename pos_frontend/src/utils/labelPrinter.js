/**
 * Label Printer Utility
 * Supports different label sizes and formats for various label printers
 */

// Common label sizes (width x height in mm)
export const LABEL_SIZES = {
  SMALL: { width: 25, height: 15, name: 'Small (25x15mm)' },
  MEDIUM: { width: 50, height: 25, name: 'Medium (50x25mm)' },
  LARGE: { width: 100, height: 50, name: 'Large (100x50mm)' },
  ADDRESS: { width: 100, height: 30, name: 'Address (100x30mm)' },
  SHIPPING: { width: 100, height: 150, name: 'Shipping (100x150mm)' },
  CUSTOM: { width: 50, height: 25, name: 'Custom' }
};

/**
 * Generate label print content for a specific label size
 * @param {Object} inventoryData - Inventory item data
 * @param {Object} labelSize - Label size configuration
 * @param {number} quantity - Number of labels to print
 * @returns {string} HTML content for printing
 */
export const generateLabelContent = (inventoryData, labelSize = LABEL_SIZES.MEDIUM, quantity = 20) => {
  const { width, height } = labelSize;
  
  // Calculate font sizes based on label size
  const getFontSizes = () => {
    if (width <= 30) {
      return { qr: 12, name: 6, upc: 5, description: 4 };
    } else if (width <= 60) {
      return { qr: 18, name: 8, upc: 6, description: 5 };
    } else {
      return { qr: 25, name: 10, upc: 8, description: 6 };
    }
  };

  const fontSizes = getFontSizes();
  const qrSize = Math.min(width * 0.3, height * 0.4); // QR code size relative to label

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Labels - ${inventoryData.name}</title>
        <style>
          @page {
            size: ${width}mm ${height}mm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            font-size: ${fontSizes.name}px;
            line-height: 1.2;
            background: white;
          }
          .label {
            width: ${width}mm;
            height: ${height}mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1mm;
            box-sizing: border-box;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .qr-code {
            width: ${qrSize}mm;
            height: ${qrSize}mm;
            object-fit: contain;
            margin-bottom: 1mm;
          }
          .item-name {
            font-weight: bold;
            text-align: center;
            margin-bottom: 0.5mm;
            font-size: ${fontSizes.name}px;
            max-width: ${width - 2}mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .item-upc {
            text-align: center;
            font-size: ${fontSizes.upc}px;
            color: #666;
            margin-bottom: 0.5mm;
          }
          .item-description {
            text-align: center;
            font-size: ${fontSizes.description}px;
            color: #888;
            max-width: ${width - 2}mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          @media print {
            .label {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            @page {
              size: ${width}mm ${height}mm;
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        ${Array(quantity).fill().map(() => `
          <div class="label">
            <img src="${inventoryData.qr_code}" class="qr-code" alt="QR Code" />
            <div class="item-name">${inventoryData.name}</div>
            <div class="item-upc">UPC: ${inventoryData.upc}</div>
            ${inventoryData.description ? `<div class="item-description">${inventoryData.description}</div>` : ''}
          </div>
        `).join('')}
      </body>
    </html>
  `;
};

/**
 * Print labels using browser print functionality
 * @param {Object} inventoryData - Inventory item data
 * @param {Object} labelSize - Label size configuration
 * @param {number} quantity - Number of labels to print
 */
export const printLabels = (inventoryData, labelSize = LABEL_SIZES.MEDIUM, quantity = 20) => {
  if (!inventoryData?.qr_code) {
    throw new Error('No QR code available for printing');
  }

  // Create a hidden iframe for label printing
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  // Generate the label content
  const labelContent = generateLabelContent(inventoryData, labelSize, quantity);
  
  // Write the content to the iframe
  iframe.contentDocument.write(labelContent);
  iframe.contentDocument.close();

  // Print the iframe content
  iframe.onload = () => {
    iframe.contentWindow.print();
    // Remove the iframe after printing
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 500);
  };
};

/**
 * Generate ZPL (Zebra Programming Language) commands for Zebra label printers
 * @param {Object} inventoryData - Inventory item data
 * @param {Object} labelSize - Label size configuration
 * @param {number} quantity - Number of labels to print
 * @returns {string} ZPL commands
 */
export const generateZPL = (inventoryData, labelSize = LABEL_SIZES.MEDIUM, quantity = 1) => {
  const { width, height } = labelSize;
  
  // Convert mm to dots (203 DPI = 8 dots per mm)
  const widthDots = Math.round(width * 8);
  const heightDots = Math.round(height * 8);
  
  return `
^XA
^PW${widthDots}
^LL${heightDots}
^LS0
^FO50,50^A0N,30,30^FD${inventoryData.name}^FS
^FO50,100^A0N,25,25^FDUPC: ${inventoryData.upc}^FS
^FO50,150^BY3^BCN,50,Y,N,N^FD${inventoryData.upc}^FS
^XZ
`.repeat(quantity);
};

/**
 * Generate EPL (Eltron Programming Language) commands for Epson label printers
 * @param {Object} inventoryData - Inventory item data
 * @param {Object} labelSize - Label size configuration
 * @param {number} quantity - Number of labels to print
 * @returns {string} EPL commands
 */
export const generateEPL = (inventoryData, labelSize = LABEL_SIZES.MEDIUM, quantity = 1) => {
  const { width, height } = labelSize;
  
  // Convert mm to dots (203 DPI = 8 dots per mm)
  const widthDots = Math.round(width * 8);
  const heightDots = Math.round(height * 8);
  
  return `
N
q${widthDots}
Q${heightDots}
ZT
A50,50,0,2,1,1,N,"${inventoryData.name}"
A50,100,0,2,1,1,N,"UPC: ${inventoryData.upc}"
B50,150,0,1,2,2,50,B,"${inventoryData.upc}"
P${quantity}
`.repeat(quantity);
};

/**
 * Get printer commands from backend API
 * @param {number} inventoryId - Inventory item ID
 * @param {string} printerType - Printer type (zpl, epl)
 * @param {Object} labelSize - Label size configuration
 * @param {number} quantity - Number of labels to print
 * @returns {Promise<Object>} API response with commands
 */
export const getPrinterCommands = async (inventoryId, printerType = 'zpl', labelSize = LABEL_SIZES.MEDIUM, quantity = 1) => {
  try {
    const response = await fetch(`/common/api/inventory/${inventoryId}/print-labels/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        printer_type: printerType,
        label_size: labelSize,
        quantity: quantity
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting printer commands:', error);
    throw error;
  }
};

/**
 * Print labels directly to connected printer
 * @param {number} inventoryId - Inventory item ID
 * @param {string} printerType - Printer type (zpl, epl)
 * @param {Object} labelSize - Label size configuration
 * @param {number} quantity - Number of labels to print
 * @param {Object} printerConfig - Printer configuration
 * @returns {Promise<Object>} API response
 */
export const printLabelsDirect = async (inventoryId, printerType = 'zpl', labelSize = LABEL_SIZES.MEDIUM, quantity = 1, printerConfig = {}) => {
  try {
    const response = await fetch(`/common/api/inventory/${inventoryId}/print-labels-direct/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        printer_type: printerType,
        label_size: labelSize,
        quantity: quantity,
        printer_config: printerConfig
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error printing labels directly:', error);
    throw error;
  }
};

/**
 * Get available printers from backend
 * @returns {Promise<Object>} Available printers
 */
export const getAvailablePrinters = async () => {
  try {
    const response = await fetch('/common/api/inventory/available-printers/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting available printers:', error);
    throw error;
  }
};

/**
 * Test printer connection
 * @param {Object} printerConfig - Printer configuration
 * @returns {Promise<Object>} Test result
 */
export const testPrinterConnection = async (printerConfig) => {
  try {
    const response = await fetch('/common/api/inventory/test-printer/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        printer_config: printerConfig
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error testing printer connection:', error);
    throw error;
  }
};

export default {
  LABEL_SIZES,
  generateLabelContent,
  printLabels,
  generateZPL,
  generateEPL,
  getPrinterCommands,
  printLabelsDirect,
  getAvailablePrinters,
  testPrinterConnection
}; 