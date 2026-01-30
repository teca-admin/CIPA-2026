
import React from 'react';

interface KeypadProps {
  onNumberClick: (num: string) => void;
  onBranco: () => void;
  onCorrige: () => void;
  onConfirma: () => void;
}

const Keypad: React.FC<KeypadProps> = ({ onNumberClick, onBranco, onCorrige, onConfirma }) => {
  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="bg-[#1f2937] p-8 rounded-sm shadow-[10px_10px_20px_rgba(0,0,0,0.5)] flex flex-col gap-6 w-full max-w-[340px] border-t-2 border-gray-600">
      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
        {buttons.slice(0, 9).map((num) => (
          <button
            key={num}
            onClick={() => onNumberClick(num)}
            className="btn-teclado h-12 text-2xl font-bold"
          >
            {num}
          </button>
        ))}
        <div />
        <button
          onClick={() => onNumberClick('0')}
          className="btn-teclado h-12 text-2xl font-bold"
        >
          0
        </button>
        <div />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 h-16">
        <button
          onClick={onBranco}
          className="bg-[#ef4444] text-white text-[10px] font-bold uppercase p-2 rounded-sm shadow-md border-b-4 border-[#b91c1c] active:border-b-0 active:translate-y-1 transition-all flex items-end justify-center pb-2"
        >
          Nulo
        </button>
        <button
          onClick={onCorrige}
          className="bg-[#f06520] text-black text-[10px] font-bold uppercase p-2 rounded-sm shadow-md border-b-4 border-[#c04d16] active:border-b-0 active:translate-y-1 transition-all flex items-end justify-center pb-2"
        >
          Corrige
        </button>
        <button
          onClick={onConfirma}
          className="bg-[#00a651] text-black text-xs font-bold uppercase p-2 rounded-sm shadow-md border-b-4 border-[#007b3b] active:border-b-0 active:translate-y-1 transition-all h-20 -mt-4 flex items-end justify-center pb-3"
        >
          Confirma
        </button>
      </div>
    </div>
  );
};

export default Keypad;
