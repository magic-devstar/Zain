import React from "react";
import { RxTrash } from "react-icons/rx";

const DeleteButton = ({ onClick }) => { 
  return (
    <button data-btnbelowtooltip="Delete"  onClick={onClick} className="border-2 border-red-400 rounded-lg p-2 cursor-pointer hover:bg-red-200 duration-200 w-fit">
      <RxTrash className="text-red-400" />
    </button>
  );
}

export default DeleteButton;
