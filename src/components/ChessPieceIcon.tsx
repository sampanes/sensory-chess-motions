import React from 'react';
import { PieceType } from '../types';

interface ChessPieceIconProps {
  type: PieceType;
  size?: number;
  style?: React.CSSProperties;
}

export const ChessPieceIcon = ({ type, size = 48, style }: ChessPieceIconProps) => {
  const renderPiece = () => {
    switch (type) {
      case 'queen':
        return (
          <svg width={size} height={size} viewBox="0 0 45 45">
            <g fill="#fff" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {/* The Base */}
              <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" />
              <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
              {/* The Crown Points */}
              <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25l-7-11 2 12z" strokeLinecap="butt" />
              {/* The Decorative Orbs */}
              <circle cx="9" cy="12" r="2" />
              <circle cx="14" cy="9" r="2" />
              <circle cx="22.5" cy="7.5" r="2" />
              <circle cx="31" cy="9" r="2" />
              <circle cx="36" cy="12" r="2" />
              {/* Detail Lines */}
              <path d="M17.5 26h10M15 30h15" fill="none" strokeLinejoin="miter" />
            </g>
          </svg>
        );
        
      case 'rook':
        return (
          <svg width={size} height={size} viewBox="0 0 45 45">
            <g fill="#fff" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm-1-22V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt"/>
              <path d="M34 14l-3 3H14l-3-3"/>
              <path d="M31 17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter"/>
              <path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/>
              <path d="M11 14h23" fill="none" strokeLinejoin="miter"/>
            </g>
          </svg>
        );
      
      case 'bishop':
        return (
          <svg width={size} height={size} viewBox="0 0 45 45">
            <g fill="#fff" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/>
              <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
              <circle cx="22.5" cy="9.5" r="2.5"/>
              <path d="M17.5 26h10M15 30h15" fill="none" stroke="#222" strokeLinejoin="miter"/>
            </g>
          </svg>
        );
      
      case 'knight':
        return (
          <svg width={size} height={size} viewBox="0 0 45 45">
            <g fill="#fff" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/>
              <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/>
              <circle cx="9" cy="26" r="1" fill="#222"/>
              <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/>
            </g>
          </svg>
        );

      case 'pawn':
        return (
          <svg width={size} height={size} viewBox="0 0 45 45">
            <g fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="22.5" cy="11" r="5.5" />
              <path d="M16 21c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6c0 2.5-1.5 4.7-3.7 5.7L27 35H18l1.7-8.3C17.5 25.7 16 23.5 16 21z" />
              <rect x="13" y="35" width="19" height="3" rx="1" />
            </g>
          </svg>
        );

      case 'king':
        return (
          <svg width={size} height={size} viewBox="0 0 45 45">
            <g fill="#fff" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Base */}
              <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/>
              {/* Crown body — wide trapezoid with three rounded prongs.
                  Side prongs peak at y≈17, center prong peaks at y≈14 (where the cross sits). */}
              <path d="M8 34 L9 23 L12 23 Q14 11 16 23 L19.5 23 Q22.5 5 25.5 23 L29 23 Q31 11 33 23 L36 23 L37 34 Z" strokeLinejoin="round"/>
              {/* Cross — emerges from the center prong peak */}
              <path d="M22.5 5 V14 M19 9.5 H26" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              {/* Horizontal band lines */}
              <path d="M10.5 28 H34.5 M10 32 H35" fill="none" strokeLinejoin="miter"/>
            </g>
          </svg>
        );

      default:
        return (
          <svg width={size} height={size} viewBox="0 0 45 45">
            <g fill="#fff" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {/* Stylized Question Mark */}
              <path 
                d="M17.5 15.5c0-3 2.5-5.5 5-5.5s5 2.5 5 5.5c0 3-2.5 4.5-5 5.5v3" 
                fill="none" 
              />
              <circle cx="22.5" cy="30" r="1.5" fill="#222" stroke="none" />
              
              {/* Subtle "Thinking" Cloud or Base to match other pieces */}
              <path 
                d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" 
                opacity="0.5"
              />
            </g>
          </svg>
        );
    }
  };

  return <div className="flex items-center justify-center drop-shadow-lg" style={style}>{renderPiece()}</div>;
};
