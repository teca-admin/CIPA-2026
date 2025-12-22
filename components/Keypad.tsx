
import React from 'react';
import { audioService } from '../services/audioService';

interface KeypadProps {
  onNumberClick: (num: string) => void;
  onBranco: () => void;
  onCorrige: () => void;
  onConfirma: () => void;
}

const Keypad: React.FC<KeypadProps> = ({ onNumberClick, onBranco, onCorrige, onConfirma }) => {
  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  const handleKeyClick = (val: string) => {
    audioService.playBeep();
    onNumberClick(val);
  };

  return (
    <div className="bg-[#212121] p-6 rounded-lg shadow-2xl flex flex-col gap-4 w-full max-w-sm">
      <div className="grid grid-cols-3 gap-3">
        {buttons.slice(0, 9).map((num) => (
          <button
            key={num}
            onClick={() => handleKeyClick(num)}
            className="bg-[#1a1a1a] text-white text-2xl font-bold py-4 rounded shadow-[0_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all border border-gray-700"
          >
            {num}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleKeyClick('0')}
          className="bg-[#1a1a1a] text-white text-2xl font-bold py-4 rounded shadow-[0_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all border border-gray-700"
        >
          0
        </button>
        <div />
      </div>

      <div className="flex gap-2 mt-4 h-16">
        <button
          disabled
          className="flex-1 bg-gray-200 text-gray-400 text-xs font-bold uppercase p-2 rounded cursor-not-allowed opacity-50"
          title="Votos em branco não são permitidos nesta eleição"
        >
          Branco
        </button>
        <button
          onClick={() => { audioService.playBeep(); onCorrige(); }}
          className="flex-1 bg-[#f57c00] text-black text-xs font-bold uppercase p-2 rounded shadow-[0_4px_0_0_#e65100] active:shadow-none active:translate-y-1 transition-all"
        >
          Corrige
        </button>
        <button
          onClick={onConfirma}
          className="flex-[1.5] bg-[#43a047] text-black text-sm font-bold uppercase p-2 rounded shadow-[0_4px_0_0_#2e7d32] active:shadow-none active:translate-y-1 transition-all h-20 -mt-4"
        >
          Confirma
        </button>
      </div>
    </div>
  );
};

export default Keypad;
