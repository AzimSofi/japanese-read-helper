"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { CSS_VARS } from '@/lib/constants';

interface BookImageProps {
  fileName: string;
  imagePath: string;
  altText?: string;
  chapterName?: string;
}

/**
 * BookImage Component
 *
 * Displays images from EPUB books with proper styling and loading states
 */
const BookImage: React.FC<BookImageProps> = ({
  fileName,
  imagePath,
  altText,
  chapterName,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Construct the image URL
  // In development: /bookv2-furigana/book-title/images/illustration-001.jpg
  // In production: Vercel Blob URL (already in imagePath)
  const imageUrl = imagePath.startsWith('http') || imagePath.startsWith('blob:')
    ? imagePath // Production Vercel Blob URL
    : imagePath; // Local development path

  if (hasError) {
    return (
      <div
        className="my-4 p-6 rounded-lg border flex flex-col items-center justify-center min-h-[200px]"
        style={{
          backgroundColor: CSS_VARS.BASE,
          borderColor: CSS_VARS.NEUTRAL,
        }}
      >
        <p style={{ color: CSS_VARS.NEUTRAL }}>
          📷 画像を読み込めませんでした: {fileName}
        </p>
        {chapterName && (
          <p className="text-sm mt-2" style={{ color: CSS_VARS.NEUTRAL }}>
            {chapterName}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="my-4 flex flex-col items-center">
      <div
        className="relative rounded-lg overflow-hidden border max-w-full"
        style={{
          borderColor: CSS_VARS.NEUTRAL,
          backgroundColor: isLoading ? CSS_VARS.BASE : 'transparent',
        }}
      >
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: CSS_VARS.BASE }}
          >
            <p style={{ color: CSS_VARS.NEUTRAL }}>画像を読み込んでいます...</p>
          </div>
        )}
        <img
          src={imageUrl}
          alt={altText || fileName}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className="max-w-full h-auto"
          style={{
            display: isLoading ? 'none' : 'block',
            maxHeight: '800px',
            objectFit: 'contain',
          }}
        />
      </div>
      {chapterName && !isLoading && !hasError && (
        <p
          className="text-sm mt-2 text-center"
          style={{ color: CSS_VARS.NEUTRAL }}
        >
          {chapterName}
        </p>
      )}
    </div>
  );
};

export default BookImage;
