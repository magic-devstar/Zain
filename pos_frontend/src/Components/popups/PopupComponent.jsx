import React from "react";
import { IoClose } from "react-icons/io5";

function PopupComponent({ popup, setPopup, children, loading }) {
    const closePopup = () => {
        if (!loading) {
            setPopup(false);
        }
    };

    return (
        <div className="position-relative" style={{ zIndex: "2000" }}>
            {popup && (
                <div className="popup-overlay md-padding">
                    <div onClick={closePopup} className="popup-background"></div>
                    <div className="popup-container">
                        <button
                            type="button"
                            onClick={closePopup}
                            className="popup-close-btn "
                            disabled={loading}
                        >
                            <IoClose className="w-5 h-5" />
                            <span className="sr-only">Close modal</span>
                        </button>
                        <div className="my-2 p-1 h-full w-full overflow-auto">
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PopupComponent;
