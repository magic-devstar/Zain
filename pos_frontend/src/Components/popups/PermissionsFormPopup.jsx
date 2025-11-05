import React, { useState, useEffect } from "react";
import PrimaryBtn from "../Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";
import PERMISSIONS from "../../utils/permissionsData";

function PermissionsFormPopup({ initialPermissions = [], onSubmit, loading, role }) {
    const [selected, setSelected] = useState([]);

    useEffect(() => {
        setSelected(Array.isArray(initialPermissions) ? initialPermissions : []);
    }, [initialPermissions]);

    const toggle = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(selected);
    };

    return (
        <div className="w-full max-w-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Update Permissions</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PERMISSIONS.map(p => {
                        // Only show permission 1 (Manage Vault) for Admin or Manager roles
                        if (p.id === 1 && role && !['Admin', 'Manager'].includes(role)) {
                            return null;
                        }
                        return (
                            <label key={p.id} className="flex items-center gap-2 text-sm border rounded px-3 py-2">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(p.id)}
                                    onChange={() => toggle(p.id)}
                                    className="w-4 h-4 cursor-pointer"
                                    disabled={loading}
                                />
                                <span>{p.label}</span>
                            </label>
                        );
                    })}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <SecondaryBtn type="button" disabled={loading} onClick={(e)=>{ e.preventDefault(); onSubmit(selected); }}>Save</SecondaryBtn>
                    <PrimaryBtn type="submit" disabled={loading}>{loading ? "Saving..." : "Save & Close"}</PrimaryBtn>
                </div>
            </form>
        </div>
    );
}

export default PermissionsFormPopup;


