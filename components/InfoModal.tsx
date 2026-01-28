
import React, { useEffect } from 'react';
import { GameItem } from '../types';

interface InfoModalProps {
  item: GameItem;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ item, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keysToClose = [
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 
        'Enter', 'Escape', ' ', 'Spacebar'
      ];
      
      if (keysToClose.includes(e.code) || keysToClose.includes(e.key)) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl bg-black border-2"
        style={{ borderColor: item.color }}
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-lg bg-slate-900"
                style={{ color: item.color, border: `1px solid ${item.color}44` }}
              >
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
              <div>
                <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">סל הניצחון נכבש!</span>
                <h2 className="text-3xl font-bold text-white">{item.title}</h2>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2"
            >
              <i className="fa-solid fa-xmark text-2xl"></i>
            </button>
          </div>

          <div className="space-y-6">
            <section className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
              <h3 className="text-xl font-semibold text-white mb-2 border-r-4 border-slate-500 pr-3">ניתוח המהלך</h3>
              <p className="text-slate-200 leading-relaxed text-lg">{item.description}</p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-white mb-3 border-r-4 border-slate-500 pr-3">סטטיסטיקה מהשטח</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {item.examples.map((ex, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-900 p-3 rounded-lg text-slate-200 border border-slate-800">
                    <i className="fa-solid fa-basketball text-orange-500 mt-1"></i>
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-emerald-950/40 border border-emerald-500/50 p-4 rounded-xl">
              <h3 className="text-emerald-400 font-bold mb-1 flex items-center gap-2">
                <i className="fa-solid fa-trophy"></i>
                הערך בטבלת הליגה
              </h3>
              <p className="text-slate-100 italic">{item.managementValue}</p>
            </section>
          </div>

          <div className="mt-8 flex justify-between items-center">
            <span className="text-slate-500 text-xs font-semibold flex items-center gap-2">
              <i className="fa-solid fa-keyboard"></i>
              לחץ על החיצים או Enter להמשך המשחק
            </span>
            <button 
              onClick={onClose}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95 border border-orange-400"
            >
              המשך למשימה הבאה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;