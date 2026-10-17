/**
 * Interactive NPC Dialogue Modal
 * Clean typography, character badge, branching response choices, and keyboard selection.
 */

import React from 'react';
import { NPCDefinition, DialogueNode } from '../game/npcData';

interface DialogueModalProps {
  npc: NPCDefinition;
  currentNode: DialogueNode;
  onSelectOption: (optionIndex: number) => void;
  onClose: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  npc,
  currentNode,
  onSelectOption,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/60 pointer-events-auto">
      <div className="w-full max-w-xl bg-zinc-950 border border-emerald-500/30 rounded-xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 font-sans animate-fade-in">
        {/* Character Title Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-950 font-bold text-sm shadow-md"
              style={{ backgroundColor: npc.colorAccent }}
            >
              {npc.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-white font-bold text-base tracking-wide flex items-center gap-2">
                {npc.name}
              </h2>
              <p className="text-emerald-400 font-mono text-xs uppercase tracking-wider">
                {npc.role}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialogue"
            className="cursor-pointer text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900 border border-white/5 text-xs font-mono"
          >
            Esc Close
          </button>
        </div>

        {/* Dialogue Text */}
        <div className="p-3.5 bg-zinc-900/60 rounded-lg border border-white/5">
          <p className="text-zinc-100 text-sm sm:text-base leading-relaxed font-normal">
            &ldquo;{currentNode.text}&rdquo;
          </p>
        </div>

        {/* Choices / Responses */}
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
            Responses:
          </span>
          {currentNode.options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectOption(idx)}
              className="group cursor-pointer flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 hover:bg-emerald-950/40 border border-white/10 hover:border-emerald-500/50 rounded-lg text-left text-xs sm:text-sm font-mono text-zinc-200 hover:text-emerald-300 transition-all duration-150"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded bg-zinc-800 group-hover:bg-emerald-500/20 text-zinc-400 group-hover:text-emerald-400 flex items-center justify-center text-[11px] font-bold">
                  {idx + 1}
                </span>
                <span>{opt.label}</span>
              </div>
              <span className="text-zinc-500 group-hover:text-emerald-400 text-xs">➔</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
