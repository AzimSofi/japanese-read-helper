"use client";

import React, { useState } from 'react';

interface CollapsibleItemProps {
  head: string;
  subItems: string[];
  initialDropdownState?: boolean;
}

const CollapsibleItem: React.FC<CollapsibleItemProps> = ({ head, subItems, initialDropdownState = false }) => {
  const [isOpen, setIsOpen] = useState(initialDropdownState);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className='flex collapsibleItem'>
      <div>
        
      </div>
      <div className="border p-2 my-1">
        <div className="head-text" onClick={toggleOpen}>
          {head}
        </div>
        {isOpen && (
          <div className="ml-4 mt-2">
            {subItems.map((subItem, index) => (
              <div key={index} className="sub-item-text">
                {subItem}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollapsibleItem;
