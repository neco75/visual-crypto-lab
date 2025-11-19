import React, { useState, useRef, useEffect } from 'react';

interface DraggableShareProps {
  imageData: ImageData;
  index: number;
  total: number;
  startPos: { x: number; y: number };
  centerPos: { x: number; y: number };
  alignTrigger: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const DraggableShare: React.FC<DraggableShareProps> = ({
  imageData,
  index,
  total,
  startPos,
  centerPos,
  alignTrigger,
  containerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [position, setPosition] = useState(startPos);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Render ImageData to Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }, [imageData]);

  // Handle alignment trigger
  useEffect(() => {
    if (alignTrigger > 0) {
      setPosition(centerPos);
    }
  }, [alignTrigger, centerPos]);

  // Setup Pointer Events for Dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    // Calculate offset from top-left of the element
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();

    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate new position relative to container
    const x = e.clientX - containerRect.left - offset.x;
    const y = e.clientY - containerRect.top - offset.y;

    setPosition({ x, y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className="absolute cursor-move touch-none select-none shadow-lg hover:shadow-xl border border-slate-600/30"
      style={{
        left: position.x,
        top: position.y,
        mixBlendMode: 'multiply', // The magic for physical simulation
        zIndex: isDragging ? 50 : 10 + index,
        // Smooth transition when aligning, immediate response when dragging
        transition: isDragging ? 'none' : 'left 0.5s cubic-bezier(0.4, 0, 0.2, 1), top 0.5s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="bg-white p-2 pb-8 relative group"> 
        {/* Handle/Label */}
        <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-mono text-slate-400 pointer-events-none select-none">
           {index + 1}枚目 / 全{total}枚
        </div>
        {/* The "Transparency Film" */}
        <canvas 
          ref={canvasRef} 
          className="block pointer-events-none"
          style={{
             // Ensure the canvas itself is treated as transparency
             opacity: 0.95, 
          }}
        />
      </div>
    </div>
  );
};