import React from "react";
import { RxPencil1 } from "react-icons/rx";

const EditButton = ({ onClick }) => {
  return (
    <button data-btnbelowtooltip="Edit" onClick={onClick} className="border-2 border-gray-300 rounded-lg p-2 cursor-pointer hover:bg-slate-200 duration-200">
      <RxPencil1 />
    </button>
  );
}

export default EditButton;
