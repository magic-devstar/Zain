import React from 'react';
import { useContactActions } from '../../utils/useContactActions';
import { Phone } from 'lucide-react';

const ClickablePhone = ({ 
    phone, 
    className = "", 
    showIcon = true, 
    children,
    disabled = false 
}) => {
    const { handlePhoneClick, isValidPhone } = useContactActions();
    
    const isClickable = isValidPhone(phone) && !disabled;
    
    if (!isClickable) {
        return (
            <span className={`text-gray-400 ${className}`}>
                {children || phone || "N/A"}
            </span>
        );
    }
    
    return (
        <button
            onClick={() => handlePhoneClick(phone)}
            className={`inline-flex items-center gap-1 text-primary hover:text-primary-dark hover:underline cursor-pointer transition-colors ${className}`}
            title={`Click to call ${phone}`}
            disabled={disabled}
        >
            {showIcon && <Phone className="h-3 w-3" />}
            {children || phone}
        </button>
    );
};

export default ClickablePhone;
