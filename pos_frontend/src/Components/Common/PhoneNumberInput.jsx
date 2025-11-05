import React, { useState } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const PhoneNumberInput = ({value, onPhoneChange, disabled=false }) => {
  const [selectedCountry, setSelectedCountry] = useState("US"); 
  
  // Handle phone number input
  const handlePhoneChange = (value) => {
    onPhoneChange(`+${value}`);
  };

  return (
    <div>
      <PhoneInput
        country={selectedCountry.toLowerCase()} // Convert to lowercase (ISO-2 format)
        value={value}
        onChange={handlePhoneChange}
        inputClass="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
        inputStyle={{ width: "100%", paddingTop:"20px" , paddingBottom:"20px" , paddingLeft: "50px" }}
        disabled={disabled}
      />
    </div>
  );
};

export default PhoneNumberInput;
