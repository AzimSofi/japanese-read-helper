import * as React from "react";

interface SidebarProps {
  setDropdownAlwaysOpenState: (state: boolean) => void;
  dropdownAlwaysOpenState: boolean;
}

export default function Sidebar({setDropdownAlwaysOpenState, dropdownAlwaysOpenState}: SidebarProps) {

  return (
    <div className="fixed bottom-2 left-0 h-full z-50 text-xs">
        <button
            onClick={() => setDropdownAlwaysOpenState(!dropdownAlwaysOpenState)}
            className={`hover:underline outline-1 m-5 p-2 cursor-pointer
                    ${dropdownAlwaysOpenState ? "bg-white" : "bg-grey-50"}`}
        >
            {dropdownAlwaysOpenState ? "表示" : "隠す"}
        </button>   
    </div>
  )
}
