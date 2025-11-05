import React, { useRef, useEffect, useState } from "react";

const MapPickerModal = ({ onClose, onSelect }) => {
    const mapRef = useRef(null);
    const [marker, setMarker] = useState(null);

    useEffect(() => {
        const loadMap = (position) => {
            const center = position
                ? { lat: position.coords.latitude, lng: position.coords.longitude }
                : { lat: 30.1575, lng: 71.5249 }; // fallback

            const map = new window.google.maps.Map(mapRef.current, {
                center,
                zoom: 14,
            });

            map.addListener("click", (e) => {
                const pos = {
                    lat: e.latLng.lat(),
                    lng: e.latLng.lng(),
                };
                if (marker) marker.setMap(null);
                const newMarker = new window.google.maps.Marker({
                    position: pos,
                    map,
                });
                setMarker(newMarker);
                onSelect(pos);
                onClose();
            });
        };

        if (window.google) {
            navigator.geolocation.getCurrentPosition(
                loadMap,
                () => loadMap(null), // On error, load with default
                { enableHighAccuracy: true }
            );
        }
    }, []);


    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
        <div className="w-full h-full flex flex-col bg-white rounded-none">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700">Pick Location on Map</h2>
                <button
                    onClick={onClose}
                    className="bg-transparent hover:bg-gray-300 text-gray-800 px-1 rounded-sm cursor-pointer"
                    aria-label="Close"
                >
                    ✕
                </button>
            </div>
            <div className="flex-1 relative">
                <div ref={mapRef} className="absolute inset-0 w-full h-full"></div>
            </div>
        </div>
    </div>
    
        // <div
        //     className="modal show"
        //     style={{
        //         display: "block",
        //         backgroundColor: "rgba(0,0,0,0.75)",
        //         position: "fixed",
        //         top: 0,
        //         left: 0,
        //         width: "100vw",
        //         height: "100vh",
        //         zIndex: 1050,
        //     }}
        // >
        //     <div
        //         className="modal-dialog"
        //         style={{
        //             maxWidth: "100%",
        //             height: "100%",
        //             margin: 0,
        //         }}
        //     >
        //         <div
        //             className="modal-content"
        //             style={{
        //                 borderRadius: 0,
        //                 height: "100%",
        //                 display: "flex",
        //                 flexDirection: "column",
        //             }}
        //         >
        //             <div className="bg-white">
        //                 <h5 className="modal-title">Pick Location on Map</h5>
        //                 <button className="btn-close bg-red-500" onClick={onClose}></button>
        //             </div>
        //             <div
        //                 className="modal-body p-0"
        //                 style={{ flex: 1, position: "relative" }}
        //             >
        //                 <div
        //                     ref={mapRef}
        //                     style={{ width: "100%", height: "100%" }}
        //                 ></div>
        //             </div>
        //         </div>
        //     </div>
        // </div>
    );
};

export default MapPickerModal;
