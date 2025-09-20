import * as React from "react";

interface SidebarProps {
  setDropdownAlwaysOpenState: (state: boolean) => void;
  dropdownAlwaysOpenState: boolean;
}

export default function Sidebar({
  setDropdownAlwaysOpenState,
  dropdownAlwaysOpenState,
}: SidebarProps) {
  return ( 
    <div className="fixed bottom-2 left-0 h-full z-50 text-xs flex flex-col items-center">
      <button
        onClick={() => setDropdownAlwaysOpenState(!dropdownAlwaysOpenState)}
        className={`hover:underline outline-1 m-5 p-2 cursor-pointer
                    ${dropdownAlwaysOpenState ? "bg-white" : "bg-grey-50"}`}
      >
        {dropdownAlwaysOpenState ? "表示" : "隠す"}
      </button>
      <a
        href="#"
        className="hover:underline"
        onClick={e => {
          e.preventDefault();
          const el = document.getElementById("bookmark");
          if (el) {
            const offset = -window.innerHeight / 5 + el.offsetHeight / 5;
            const top = el.getBoundingClientRect().top + window.scrollY + offset;
            window.scrollTo({ top, behavior: "smooth" });
          }
        }}
      >
        ブックマークへ
      </a>
    </div>
  );
}
