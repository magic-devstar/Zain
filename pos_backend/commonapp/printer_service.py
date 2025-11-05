import socket
import serial
import subprocess
import os
import platform
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class PrinterService:
    """Service for direct communication with label printers"""
    
    def __init__(self):
        self.system = platform.system()
    
    def send_to_network_printer(self, ip_address: str, port: int, commands: str) -> bool:
        """Send commands to a network-connected printer"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(10)  # 10 second timeout
                sock.connect((ip_address, port))
                sock.send(commands.encode('utf-8'))
                logger.info(f"Successfully sent commands to network printer {ip_address}:{port}")
                return True
        except Exception as e:
            logger.error(f"Failed to send to network printer {ip_address}:{port}: {str(e)}")
            return False
    
    def send_to_usb_printer(self, device_path: str, commands: str) -> bool:
        """Send commands to a USB-connected printer"""
        try:
            if self.system == "Windows":
                return self._send_to_windows_usb_printer(device_path, commands)
            else:
                return self._send_to_unix_usb_printer(device_path, commands)
        except Exception as e:
            logger.error(f"Failed to send to USB printer {device_path}: {str(e)}")
            return False
    
    def _send_to_windows_usb_printer(self, printer_name: str, commands: str) -> bool:
        """Send commands to USB printer on Windows"""
        try:
            # Use Windows print spooler
            temp_file = "temp_print_commands.txt"
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(commands)
            
            # Use copy command to send to printer
            result = subprocess.run([
                'copy', temp_file, printer_name
            ], capture_output=True, text=True, shell=True)
            
            # Clean up temp file
            if os.path.exists(temp_file):
                os.remove(temp_file)
            
            if result.returncode == 0:
                logger.info(f"Successfully sent commands to Windows printer {printer_name}")
                return True
            else:
                logger.error(f"Windows printer command failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Windows USB printer error: {str(e)}")
            return False
    
    def _send_to_unix_usb_printer(self, device_path: str, commands: str) -> bool:
        """Send commands to USB printer on Unix/Linux/macOS"""
        try:
            with open(device_path, 'wb') as device:
                device.write(commands.encode('utf-8'))
                device.flush()
            logger.info(f"Successfully sent commands to Unix printer {device_path}")
            return True
        except Exception as e:
            logger.error(f"Unix USB printer error: {str(e)}")
            return False
    
    def send_to_serial_printer(self, port: str, baudrate: int, commands: str) -> bool:
        """Send commands to a serial-connected printer"""
        try:
            with serial.Serial(port, baudrate, timeout=10) as ser:
                ser.write(commands.encode('utf-8'))
                ser.flush()
            logger.info(f"Successfully sent commands to serial printer {port}")
            return True
        except Exception as e:
            logger.error(f"Failed to send to serial printer {port}: {str(e)}")
            return False
    
    def get_available_printers(self) -> Dict[str, Any]:
        """Get list of available printers on the system"""
        printers = {
            'network': [],
            'usb': [],
            'serial': []
        }
        
        try:
            if self.system == "Windows":
                printers.update(self._get_windows_printers())
            else:
                printers.update(self._get_unix_printers())
        except Exception as e:
            logger.error(f"Error getting available printers: {str(e)}")
        
        return printers
    
    def _get_windows_printers(self) -> Dict[str, Any]:
        """Get available printers on Windows"""
        printers = {'usb': []}
        try:
            # Use wmic to get printer list
            result = subprocess.run([
                'wmic', 'printer', 'get', 'name,portname'
            ], capture_output=True, text=True, shell=True)
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')[1:]  # Skip header
                for line in lines:
                    if line.strip():
                        parts = line.strip().split()
                        if len(parts) >= 2:
                            printer_name = ' '.join(parts[:-1])
                            port = parts[-1]
                            printers['usb'].append({
                                'name': printer_name,
                                'port': port,
                                'type': 'usb'
                            })
        except Exception as e:
            logger.error(f"Error getting Windows printers: {str(e)}")
        
        return printers
    
    def _get_unix_printers(self) -> Dict[str, Any]:
        """Get available printers on Unix/Linux/macOS"""
        printers = {'usb': [], 'serial': []}
        try:
            # Check common USB printer paths
            usb_paths = [
                '/dev/usb/lp0', '/dev/usb/lp1', '/dev/usb/lp2',
                '/dev/usblp0', '/dev/usblp1', '/dev/usblp2'
            ]
            
            for path in usb_paths:
                if os.path.exists(path):
                    printers['usb'].append({
                        'name': f'USB Printer ({path})',
                        'path': path,
                        'type': 'usb'
                    })
            
            # Check serial ports
            serial_paths = [
                '/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyUSB2',
                '/dev/ttyACM0', '/dev/ttyACM1', '/dev/ttyACM2'
            ]
            
            for path in serial_paths:
                if os.path.exists(path):
                    printers['serial'].append({
                        'name': f'Serial Printer ({path})',
                        'path': path,
                        'type': 'serial'
                    })
                    
        except Exception as e:
            logger.error(f"Error getting Unix printers: {str(e)}")
        
        return printers
    
    def test_printer_connection(self, printer_config: Dict[str, Any]) -> bool:
        """Test connection to a printer"""
        try:
            printer_type = printer_config.get('type')
            
            if printer_type == 'network':
                return self.send_to_network_printer(
                    printer_config['ip_address'],
                    printer_config['port'],
                    '^XA^FO50,50^A0N,30,30^FDTest^FS^XZ'
                )
            elif printer_type == 'usb':
                return self.send_to_usb_printer(
                    printer_config['device_path'],
                    '^XA^FO50,50^A0N,30,30^FDTest^FS^XZ'
                )
            elif printer_type == 'serial':
                return self.send_to_serial_printer(
                    printer_config['port'],
                    printer_config['baudrate'],
                    '^XA^FO50,50^A0N,30,30^FDTest^FS^XZ'
                )
            else:
                logger.error(f"Unknown printer type: {printer_type}")
                return False
                
        except Exception as e:
            logger.error(f"Printer connection test failed: {str(e)}")
            return False

# Global printer service instance
printer_service = PrinterService() 