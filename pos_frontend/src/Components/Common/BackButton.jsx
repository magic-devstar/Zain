import React from "react";
import { useNavigate } from "react-router-dom";
import { IoArrowBackSharp } from "react-icons/io5";

const BackButton = ({  }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className={`flex items-center text-gray-700 hover:text-primary transition duration-200 cursor-pointer`}
    >
      <IoArrowBackSharp className="text-xl" />
    </button>
  );
};

export default BackButton;
