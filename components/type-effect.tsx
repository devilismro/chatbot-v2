import React, { useState, useEffect } from 'react';

interface TypingEffectProps {
  text: string;
  typingSpeed?: number;
}

const TypingEffect: React.FC<TypingEffectProps> = ({ text, typingSpeed = 50 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prevText) => prevText + text[currentIndex]);
        setCurrentIndex((prevIndex) => prevIndex + 1);
      }, typingSpeed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, typingSpeed]);

  return (
    <div className="typing-effect">
      {displayedText}
      <span className="cursor">|</span>
      <style jsx>{`
        .typing-effect {
          font-family: monospace;
          font-size: 1rem;
          line-height: 1.5;
        }
        .cursor {
          animation: blink 0.7s infinite;
        }
        @keyframes blink {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default TypingEffect;