
import React from 'react';
import { Candidate } from '../types';
import { sanitizeImageUrl } from '../utils/urlHelper';

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
      <div className="w-full h-full bg-[#d7dbd8] flex items-center justify-center border-4 border-[#888] rounded p-4 urna-screen-shadow">
        <h1 className="text-8xl font-black text-[#333] tracking-widest animate-pulse">FIM</h1>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#d7dbd8] flex flex-col border-4 border-[#888] rounded p-4 urna-screen-shadow text-[#222]">
      <div className="flex-1 flex flex-col">
        <div className="text-xl font-bold mb-2">SEU VOTO PARA</div>
        <div className="text-2xl font-bold mb-4 uppercase">Candidato CIPA</div>

        {isBranco ? (
          <div className="flex-1 flex items-center justify-center">
            <h2 className="text-3xl font-bold text-red-600">VOTO NÃO PERMITIDO</h2>
          </div>
        ) : (
          <div className="flex gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold uppercase">Número:</span>
              <div className="flex gap-2">
                <div className="w-12 h-16 border-2 border-black flex items-center justify-center text-4xl font-bold bg-white">
                  {number[0] || ''}
                </div>
                <div className="w-12 h-16 border-2 border-black flex items-center justify-center text-4xl font-bold bg-white">
                  {number[1] || ''}
                </div>
              </div>

              {candidate && (
                <div className="mt-4 flex flex-col gap-2">
                  <div>
                    <span className="text-sm font-bold uppercase">Nome: </span>
                    <span className="text-xl font-bold uppercase">{candidate.name}</span>
                  </div>
                </div>
              )}

              {isNulo && number.length === 2 && (
                <div className="mt-4 flex flex-col bg-red-100 p-3 rounded border border-red-300">
                   <h2 className="text-sm font-black text-red-700 leading-tight uppercase">Número Inválido</h2>
                   <h2 className="text-lg font-black uppercase mt-1 text-red-600">Por favor, Selecione um dos candidatos</h2>
                </div>
              )}
            </div>

            {candidate && (
              <div className="ml-auto w-32 h-40 border-2 border-black bg-white flex items-center justify-center overflow-hidden">
                <img 
                  src={sanitizeImageUrl(candidate.photoUrl)} 
                  alt={candidate.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    console.error("Erro ao carregar foto na urna:", candidate.photoUrl);
                    e.currentTarget.src = FALLBACK_PHOTO;
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t-2 border-black mt-4 pt-2 text-[10px] leading-tight">
        Aperte a tecla:<br />
        <span className="font-bold">VERDE</span> para <span className="font-bold">CONFIRMAR</span> este voto<br />
        <span className="font-bold">LARANJA</span> para <span className="font-bold">REINICIAR</span> este voto
      </div>
    </div>
  );
};

export default VotingScreen;
