import { PieceType } from '../types';

interface ChessPieceIconProps {
  type: PieceType;
  size?: number;
}

export const ChessPieceIcon = ({ type, size = 48 }: ChessPieceIconProps) => {
  const renderPiece = () => {
    switch (type) {
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
    }
  };

  return <div className="flex items-center justify-center drop-shadow-lg">{renderPiece()}</div>;
};
