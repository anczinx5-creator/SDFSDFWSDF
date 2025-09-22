import React from 'react';

interface PlatformRatingProps {
  rating?: number;
  maxRating?: number;
  onRatingChange?: (rating: number) => void;
}

const PlatformRating: React.FC<PlatformRatingProps> = ({ 
  rating = 0, 
  maxRating = 5, 
  onRatingChange 
}) => {
  const handleRatingClick = (newRating: number) => {
    if (onRatingChange) {
      onRatingChange(newRating);
    }
  };

  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: maxRating }, (_, index) => {
        const starValue = index + 1;
        return (
          <button
            key={index}
            onClick={() => handleRatingClick(starValue)}
            className={`text-2xl transition-colors ${
              starValue <= rating
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-yellow-300'
            }`}
            disabled={!onRatingChange}
          >
            ★
          </button>
        );
      })}
      <span className="ml-2 text-sm text-gray-600">
        {rating}/{maxRating}
      </span>
    </div>
  );
};

export default PlatformRating;