import React from "react";
import { GoTriangleDown, GoTriangleUp, GoX } from "react-icons/go";
import { LuSearch } from "react-icons/lu";
import PrimaryBtn from "./PrimaryBtn";

function FilterComponent({ children, ResetState, Search, extraActions = null }) {
    const [showMore, setShowMore] = React.useState(false);
    const ref = React.useRef(null);

    const handleClick = (e) => {
        e.stopPropagation(); // Prevent this click event from propagating to form
        setShowMore(!showMore);
        if (showMore) {
            ref.current.style.height = "56px";
        } else {
            ref.current.style.height = "auto";
        }
    };

    const handleClearFilters = (event) => {
        event.stopPropagation(); // Prevent the click from propagating to parent elements
        ResetState(); // Call the ResetState function passed from the parent to reset filters
    };

    const handleSubmit = (event) => {
        event.preventDefault(); // Prevent default form submission
        Search(); // Call the Search function passed from the parent when the form is submitted
    };

    return (
        <div>
            <form
                ref={ref}
                onSubmit={handleSubmit}
                className="filterContainer shadow overflow-hidden border-primary my-2 bg-white rounded-lg border py-2.5 px-1 p md:p-2.5 min-w-0">
                {/* Inputs */}
                <div className="flex flex-wrap gap-4 mt-4 justify-center px-2">{children}</div>
                <div className="mt-4 flex items-center w-full justify-end gap-2">
                    {/* Extra actions (e.g., Print) passed from parent */}
                    {extraActions}
                    <PrimaryBtn type="submit">
                        <LuSearch />
                        Search
                    </PrimaryBtn>
                </div>
            </form>
        </div>
    );
}

export default FilterComponent;
