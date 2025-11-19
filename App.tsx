import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Layers, 
  Image as ImageIcon, 
  RefreshCw, 
  Scissors,
  Eye,
  Info,
  Magnet,
  Download
} from 'lucide-react';
import { generateVisualShares, resizeImage } from './utils/imageProcessing';
import { DraggableShare } from './components/DraggableShare';
import { ProcessedShare, ProcessingStatus } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [shareCount, setShareCount] = useState(2);
  const [isColor, setIsColor] = useState(true);
  const [generatedShares, setGeneratedShares] = useState<ProcessedShare[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [alignTrigger, setAlignTrigger] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playAreaRef = useRef<HTMLDivElement>(null);

  // Handle Image Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    processImage(url);
  };

  const processImage = (url: string) => {
    setStatus(ProcessingStatus.PROCESSING);
    
    const img = new Image();
    img.src = url;
    img.onload = () => {
      try {
        // 1. Resize (Max 400px width for performance and screen real estate)
        const { canvas } = resizeImage(img, 400, 400);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Context error");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 2. Generate Shares
        const rawShares = generateVisualShares(imageData, shareCount, isColor);

        // 3. Map to state
        const mappedShares: ProcessedShare[] = rawShares.map((data, idx) => ({
          id: idx,
          data,
          color: ['#ef4444', '#3b82f6', '#22c55e', '#eab308'][idx % 4]
        }));

        setGeneratedShares(mappedShares);
        setStatus(ProcessingStatus.COMPLETE);
        // Reset align trigger on new generation
        setAlignTrigger(0);
      } catch (error) {
        console.error(error);
        setStatus(ProcessingStatus.ERROR);
      }
    };
  };

  const handleGenerate = () => {
    if (previewUrl) {
      processImage(previewUrl);
    }
  };

  const handleAlign = () => {
    setAlignTrigger(prev => prev + 1);
  };

  const handleDownloadAll = () => {
    generatedShares.forEach((share, index) => {
      // Create a temporary canvas to convert ImageData to Data URL
      const canvas = document.createElement('canvas');
      canvas.width = share.data.width;
      canvas.height = share.data.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(share.data, 0, 0);
        
        const link = document.createElement('a');
        link.download = `vc_share_${index + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="text-indigo-400" size={24} />
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Visual Crypto Lab
            </h1>
          </div>
          <a 
            href="https://www.google.com/search?q=%E8%A6%96%E8%A6%9A%E5%BE%A9%E5%8F%B7%E5%9E%8B%E6%9A%97%E5%8F%B7%E3%80%80%E8%A7%A3%E8%AA%AC&sca_esv=da4047d43b4ca818&sxsrf=AE3TifMAVI82hdkXv8HJCQIBrvLDKUuekA%3A1763563380666&ei=dNcdaf-1KM--0-kPjbb-6AQ&ved=0ahUKEwj_v9_Guf6QAxVP3zQHHQ2bH00Q4dUDCBE&uact=5&oq=%E8%A6%96%E8%A6%9A%E5%BE%A9%E5%8F%B7%E5%9E%8B%E6%9A%97%E5%8F%B7%E3%80%80%E8%A7%A3%E8%AA%AC&gs_lp=Egxnd3Mtd2l6LXNlcnAiHuimluimmuW-qeWPt-Wei-aal-WPt-OAgOino-iqrDIFEAAY7wUyCBAAGIAEGKIEMggQABiABBiiBDIFEAAY7wVImRZQiglY1xNwAXgAkAEAmAF8oAHECKoBAzEuObgBA8gBAPgBAZgCCKACnQbCAgcQIxiwAxgnwgIKEAAYsAMY1gQYR8ICBBAjGCfCAgkQIRigARgKGCrCAgUQIRigAZgDAIgGAZAGA5IHAzEuN6AH6xWyBwMwLje4B5kGwgcDMi42yAcL&sclient=gws-wiz-serp" 
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
            <Info size={14} />
            技術解説 (Wikipedia)
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sidebar: Controls & Original */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Upload Section */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ImageIcon size={16} /> 元画像
            </h2>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group relative w-full aspect-square bg-slate-900 rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-slate-800/80 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden"
            >
              {previewUrl ? (
                <>
                  <img 
                    src={previewUrl} 
                    alt="Source" 
                    className="w-full h-full object-contain p-4 opacity-70 group-hover:opacity-100 transition-opacity" 
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-medium flex items-center gap-2">
                      <RefreshCw size={16} /> 画像を変更
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-center p-6">
                  <Upload size={40} className="mx-auto mb-3 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  <p className="text-sm font-medium">クリックしてアップロード</p>
                  <p className="text-xs text-slate-600 mt-1">JPG, PNG 対応</p>
                </div>
              )}
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </div>
          </div>

          {/* Controls Section */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers size={16} /> 設定
            </h2>

            <div className="space-y-6">
              {/* Share Count Slider */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">分解枚数</label>
                  <span className="text-indigo-400 font-mono font-bold">{shareCount}枚</span>
                </div>
                <input 
                  type="range" 
                  min="2" 
                  max="4" 
                  value={shareCount} 
                  onChange={(e) => setShareCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-2">
                  生成する透明シートの枚数です。2枚が最も鮮明に復元できます。
                </p>
              </div>

              {/* Color Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">カラーモード</span>
                <button 
                  onClick={() => setIsColor(!isColor)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isColor ? 'bg-indigo-500' : 'bg-slate-600'}`}
                >
                  <span 
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${isColor ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!previewUrl || status === ProcessingStatus.PROCESSING}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                {status === ProcessingStatus.PROCESSING ? (
                   <RefreshCw className="animate-spin" size={20} />
                ) : (
                   <Scissors size={20} />
                )}
                {status === ProcessingStatus.PROCESSING ? '処理中...' : '画像を分解する'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Playground: Canvas */}
        <div className="lg:col-span-2 flex flex-col h-[600px] lg:h-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Eye size={16} /> シミュレーション
            </h2>
            {status === ProcessingStatus.COMPLETE && (
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadAll}
                  className="group flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-all text-xs font-medium"
                  title="すべての画像をダウンロード"
                >
                  <Download size={14} />
                  一括保存
                </button>
                <button
                  onClick={handleAlign}
                  className="group flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded-lg transition-all text-xs font-medium"
                >
                  <Magnet size={14} className="group-hover:rotate-[-45deg] transition-transform" />
                  自動位置合わせ
                </button>
              </div>
            )}
          </div>

          <div 
            ref={playAreaRef}
            className="flex-1 bg-slate-200 relative rounded-2xl overflow-hidden border border-slate-700 shadow-inner bg-grid-pattern flex items-center justify-center"
          >
            {status === ProcessingStatus.IDLE && (
              <div className="text-slate-400 flex flex-col items-center">
                <Layers size={48} className="mb-4 opacity-50" />
                <p>画像をアップロードして「分解」ボタンを押してください</p>
              </div>
            )}

            {status === ProcessingStatus.COMPLETE && generatedShares.map((share, idx) => {
              // Initial spread positions
              const spreadX = (idx - (shareCount - 1) / 2) * 60;
              
              // Calculate center position (ignoring spread)
              // We assume the parent container size or fallback, and center the share
              const centerX = (playAreaRef.current?.clientWidth || 600) / 2 - share.data.width / 2;
              const centerY = (playAreaRef.current?.clientHeight || 500) / 2 - share.data.height / 2;

              return (
                <DraggableShare
                  key={`share-${idx}-${shareCount}-${isColor}`} // Force remount on config change
                  index={idx}
                  total={shareCount}
                  imageData={share.data}
                  startPos={{ 
                    x: centerX + spreadX, 
                    y: centerY 
                  }}
                  centerPos={{ x: centerX, y: centerY }}
                  alignTrigger={alignTrigger}
                  containerRef={playAreaRef}
                />
              );
            })}
            
            {/* Information Overlay */}
            {status === ProcessingStatus.COMPLETE && (
              <div className="absolute bottom-4 right-4 pointer-events-none">
                 <div className="bg-slate-900/80 backdrop-blur text-slate-300 text-xs p-3 rounded-lg border border-slate-700 max-w-[300px]">
                   <p className="font-bold mb-1">使い方:</p>
                   <p>
                     分解された画像（シェア）は、単体ではノイズに見えます。
                     ドラッグして重ね合わせるか「自動位置合わせ」を押すと、元の画像が浮かび上がります。
                   </p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;