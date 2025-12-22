
import React from 'react';
import { Candidate } from '../types.ts';
import { sanitizeImageUrl } from '../utils/urlHelper.ts';

interface VotingScreenProps {
  number: string;
  candidate: Candidate | null;
  isBranco: boolean;
  isNulo: boolean;
  isVoted: boolean;
}

const FALLBACK_PHOTO = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

const VotingScreen: React.FC<VotingScreenProps> = ({ number, candidate, isBranco, isNulo, isVoted }) => {
  if (isVoted) {
    return (
      <div className="w-full h-full lcd-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="lcd-scanline absolute inset-0"></div>
        <h1 className="text-9xl font-black text-[#1a1a1a] tracking-tighter font-urna z-20">FIM</h1>
      </div>
    );
  }

  return (
    <div className="w-full h-full lcd-screen flex flex-col p-6 text-[#1a1a1a] relative overflow-hidden font-urna">
      <div className="lcd-scanline absolute inset-0"></div>
      
      <div className="flex-1 flex flex-col z-20">
        <div className="text-xs font-bold mb-1">SEU VOTO PARA</div>
        <div className="text-xl font-bold mb-8 uppercase tracking-wider">Candidato CIPA</div>

        <div className="flex gap-8">
          <div className="flex flex-col gap-6 flex-1">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold">Número:</span>
              <div className="flex gap-1">
                {[0, 1].map((idx) => (
                  <div key={idx} className="w-10 h-14 border-[1px] border-black flex items-center justify-center text-4xl font-bold bg-transparent">
                    {number[idx] || ''}
                    {number.length === idx && <span className="animate-[pulse_0.5s_infinite]">|</span>}
                  </div>
                ))}
              </div>
            </div>

            {candidate && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <div className="text-[10px] font-bold opacity-60">Nome:</div>
                  <div className="text-xl font-bold uppercase">{candidate.name}</div>
                </div>
              </div>
            )}

            {isNulo && number.length === 2 && (
              <div className="mt-4 flex flex-col">
                 <h2 className="text-2xl font-black bg-[#1a1a1a] text-[#f1f3f1] px-2 py-1 inline-block w-fit">NÚMERO ERRADO</h2>
                 <h2 className="text-xs font-bold uppercase mt-2 text-red-800">Por favor, Selecione um dos candidatos</h2>
              </div>
            )}
          </div>

          {candidate && (
            <div className="ml-auto flex flex-col items-center">
              <div className="w-32 h-40 border-[1px] border-black bg-white flex items-center justify-center overflow-hidden grayscale contrast-125">
                <img 
                  src={sanitizeImageUrl(candidate.photoUrl)} 
                  alt={candidate.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => e.currentTarget.src = FALLBACK_PHOTO}
                />
              </div>
              <span className="text-[8px] mt-1 font-bold opacity-50 uppercase">Fotos Oficiais CIPA</span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t-[1px] border-black mt-auto pt-2 text-[10px] leading-tight z-20">
        Aperte a tecla:<br />
        <span className="font-bold">CONFIRMA</span> para <span className="font-bold">CONFIRMAR</span> este voto<br />
        <span className="font-bold">CORRIGE</span> para <span className="font-bold">REINICIAR</span> este voto
      </div>
    </div>
  );
};

export default VotingScreen;
