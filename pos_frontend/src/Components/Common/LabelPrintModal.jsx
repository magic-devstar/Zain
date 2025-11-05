import { useState, useEffect } from 'react';
import { IoClose, IoPrint, IoDownload, IoWifi, IoHardwareChip, IoCheckmarkCircle } from 'react-icons/io5';
import { toast } from 'react-hot-toast';
import { LABEL_SIZES, printLabels, generateZPL, generateEPL, getPrinterCommands, printLabelsDirect, getAvailablePrinters, testPrinterConnection } from '../../utils/labelPrinter';
import PrimaryBtn from './PrimaryBtn';
import SecondaryBtn from './SecondaryBtn';

const LabelPrintModal = ({ isOpen, onClose, inventoryData }) => {
  // Early return before any hooks
  if (!isOpen || !inventoryData) return null;

  const [selectedSize, setSelectedSize] = useState(LABEL_SIZES.MEDIUM);
  const [quantity, setQuantity] = useState(20);
  const [customWidth, setCustomWidth] = useState(50);
  const [customHeight, setCustomHeight] = useState(25);
  const [printerType, setPrinterType] = useState('browser'); // browser, zpl, epl
  const [availablePrinters, setAvailablePrinters] = useState({ network: [], usb: [], serial: [] });
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [printerConfig, setPrinterConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState(false);

  // Load available printers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAvailablePrinters();
    }
  }, [isOpen]);

  const loadAvailablePrinters = async () => {
    try {
      const printers = await getAvailablePrinters();
      setAvailablePrinters(printers);
    } catch (error) {
      console.warn('Could not load available printers:', error);
    }
  };

  const handlePrint = async () => {
    try {
      setLoading(true);
      
      if (printerType === 'browser') {
        const labelSize = selectedSize === LABEL_SIZES.CUSTOM 
          ? { width: customWidth, height: customHeight, name: 'Custom' }
          : selectedSize;
        
        printLabels(inventoryData, labelSize, quantity);
        toast.success(`Printing ${quantity} labels...`);
      } else if (selectedPrinter && printerConfig.type) {
        // Direct printing to connected printer
        const labelSize = selectedSize === LABEL_SIZES.CUSTOM 
          ? { width: customWidth, height: customHeight, name: 'Custom' }
          : selectedSize;
        
        const response = await printLabelsDirect(
          inventoryData.id, 
          printerType, 
          labelSize, 
          quantity, 
          printerConfig
        );
        
        toast.success(response.message || `Successfully printed ${quantity} labels!`);
      } else {
        // Fallback to command generation
        const labelSize = selectedSize === LABEL_SIZES.CUSTOM 
          ? { width: customWidth, height: customHeight, name: 'Custom' }
          : selectedSize;
        
        let commands;
        try {
          // Try backend API first
          const response = await getPrinterCommands(inventoryData.id, printerType, labelSize, quantity);
          commands = response.commands;
        } catch (apiError) {
          console.warn('Backend API failed, using frontend generation:', apiError);
          // Fallback to frontend generation
          commands = printerType === 'zpl' 
            ? generateZPL(inventoryData, labelSize, quantity)
            : generateEPL(inventoryData, labelSize, quantity);
        }
        
        // Copy to clipboard
        navigator.clipboard.writeText(commands);
        toast.success(`${printerType.toUpperCase()} commands copied to clipboard!`);
      }
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to print labels');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCommands = async () => {
    try {
      const labelSize = selectedSize === LABEL_SIZES.CUSTOM 
        ? { width: customWidth, height: customHeight, name: 'Custom' }
        : selectedSize;
      
      let commands;
      try {
        // Try backend API first
        const response = await getPrinterCommands(inventoryData.id, printerType, labelSize, quantity);
        commands = response.commands;
      } catch (apiError) {
        console.warn('Backend API failed, using frontend generation:', apiError);
        // Fallback to frontend generation
        commands = printerType === 'zpl' 
          ? generateZPL(inventoryData, labelSize, quantity)
          : generateEPL(inventoryData, labelSize, quantity);
      }
      
      const blob = new Blob([commands], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inventoryData.name}_${printerType}_commands.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${printerType.toUpperCase()} commands downloaded!`);
    } catch (error) {
      toast.error('Failed to download commands');
    }
  };

  const handlePrinterSelect = (printer) => {
    setSelectedPrinter(printer);
    setPrinterConfig({
      type: printer.type,
      ...printer
    });
  };

  const handleTestPrinter = async () => {
    if (!printerConfig.type) {
      toast.error('Please select a printer first');
      return;
    }

    try {
      setTestingPrinter(true);
      await testPrinterConnection(printerConfig);
      toast.success('Printer connection test successful!');
    } catch (error) {
      toast.error(`Printer test failed: ${error.message}`);
    } finally {
      setTestingPrinter(false);
    }
  };

  const handleManualPrinterConfig = () => {
    setSelectedPrinter(null);
    setPrinterConfig({
      type: 'network',
      ip_address: '',
      port: 9100
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Print Labels</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <IoClose size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Item Info */}
          <div className="bg-gray-50 p-3 rounded">
            <h3 className="font-semibold text-sm text-gray-700">Item Details</h3>
            <p className="text-sm text-gray-600">{inventoryData.name}</p>
            <p className="text-sm text-gray-600">UPC: {inventoryData.upc}</p>
          </div>

          {/* Printer Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Printer Type
            </label>
            <select
              value={printerType}
              onChange={(e) => setPrinterType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="browser">Browser Print (Label Paper)</option>
              <option value="zpl">ZPL (Zebra Printers)</option>
              <option value="epl">EPL (Epson Printers)</option>
            </select>
          </div>

          {/* Printer Selection (for ZPL/EPL) */}
          {printerType !== 'browser' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                  Connected Printers
                </label>
                <button
                  type="button"
                  onClick={handleManualPrinterConfig}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  Manual Config
                </button>
              </div>
              
              {/* Available Printers */}
              {Object.entries(availablePrinters).map(([type, printers]) => 
                printers.length > 0 && (
                  <div key={type} className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      {type} Printers
                    </h4>
                    <div className="space-y-1">
                      {printers.map((printer, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handlePrinterSelect(printer)}
                          className={`w-full p-2 text-left rounded border ${
                            selectedPrinter === printer
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {type === 'network' && <IoWifi size={16} />}
                            {type === 'usb' && <IoHardwareChip size={16} />}
                            {type === 'serial' && <IoHardwareChip size={16} />}
                            <span className="text-sm">{printer.name}</span>
                            {selectedPrinter === printer && (
                              <IoCheckmarkCircle size={16} className="text-primary ml-auto" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              )}

              {/* Manual Printer Configuration */}
              {!selectedPrinter && (
                <div className="space-y-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Connection Type
                    </label>
                    <select
                      value={printerConfig.type || 'network'}
                      onChange={(e) => setPrinterConfig({...printerConfig, type: e.target.value})}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="network">Network</option>
                      <option value="usb">USB</option>
                      <option value="serial">Serial</option>
                    </select>
                  </div>

                  {printerConfig.type === 'network' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          IP Address
                        </label>
                        <input
                          type="text"
                          value={printerConfig.ip_address || ''}
                          onChange={(e) => setPrinterConfig({...printerConfig, ip_address: e.target.value})}
                          placeholder="192.168.1.100"
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Port
                        </label>
                        <input
                          type="number"
                          value={printerConfig.port || 9100}
                          onChange={(e) => setPrinterConfig({...printerConfig, port: parseInt(e.target.value)})}
                          placeholder="9100"
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>
                  )}

                  {printerConfig.type === 'usb' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Device Path
                      </label>
                      <input
                        type="text"
                        value={printerConfig.device_path || ''}
                        onChange={(e) => setPrinterConfig({...printerConfig, device_path: e.target.value})}
                        placeholder="/dev/usb/lp0 or Printer Name"
                        className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  )}

                  {printerConfig.type === 'serial' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Port
                        </label>
                        <input
                          type="text"
                          value={printerConfig.port || ''}
                          onChange={(e) => setPrinterConfig({...printerConfig, port: e.target.value})}
                          placeholder="/dev/ttyUSB0"
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Baud Rate
                        </label>
                        <input
                          type="number"
                          value={printerConfig.baudrate || 9600}
                          onChange={(e) => setPrinterConfig({...printerConfig, baudrate: parseInt(e.target.value)})}
                          placeholder="9600"
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleTestPrinter}
                    disabled={testingPrinter || !printerConfig.type}
                    className="w-full p-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingPrinter ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Label Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label Size
            </label>
            <select
              value={selectedSize.name}
              onChange={(e) => {
                const size = Object.values(LABEL_SIZES).find(s => s.name === e.target.value);
                setSelectedSize(size);
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {Object.values(LABEL_SIZES).map((size) => (
                <option key={size.name} value={size.name}>
                  {size.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Size Inputs */}
          {selectedSize === LABEL_SIZES.CUSTOM && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (mm)
                </label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  min="10"
                  max="200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (mm)
                </label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  min="10"
                  max="200"
                />
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              min="1"
              max="100"
            />
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-3 rounded">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Preview</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Size: {selectedSize === LABEL_SIZES.CUSTOM ? `${customWidth}mm x ${customHeight}mm` : `${selectedSize.width}mm x ${selectedSize.height}mm`}</p>
              <p>Quantity: {quantity}</p>
              <p>Printer: {printerType.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <SecondaryBtn onClick={onClose}>
            Cancel
          </SecondaryBtn>
          {printerType !== 'browser' && !selectedPrinter && (
            <PrimaryBtn
              onClick={handleDownloadCommands}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <IoDownload size={16} />
              Download Commands
            </PrimaryBtn>
          )}
          <PrimaryBtn 
            onClick={handlePrint}
            disabled={loading}
            className={selectedPrinter ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <IoPrint size={16} />
            {loading ? 'Printing...' : (
              printerType === 'browser' ? 'Print Labels' : 
              selectedPrinter ? 'Print to Label Printer' : 'Copy Commands'
            )}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
};

export default LabelPrintModal; 