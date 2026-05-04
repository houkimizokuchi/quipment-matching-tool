import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { createWorker } from 'tesseract.js';
import { X, Camera, RefreshCw, Loader2 } from 'lucide-react';

const ScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrError, setOcrError] = useState(null);
  const scannerRef = useRef(null);
  const regionRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        // Barcode found!
        stopScanner().then(() => {
          onScanSuccess(decodedText);
        });
      },
      (errorMessage) => {
        // Scanning...
      }
    ).catch(err => {
      console.error("Camera start error:", err);
      setOcrError(`カメラの起動に失敗しました: ${err}. HTTPS接続であることと、カメラの許可を確認してください。`);
    });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (e) {
        console.error("Stop error", e);
      }
    }
  };

  const handleOCR = async () => {
    if (!scannerRef.current) return;
    
    setIsOCRProcessing(true);
    setOcrError(null);

    try {
      // Capture frame from video element
      const video = document.querySelector('#reader video');
      if (!video) throw new Error("Video element not found");

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();

      // Extract 8-9 digit numbers
      const match = text.match(/\b\d{8,9}\b/);
      if (match) {
        await stopScanner();
        onScanSuccess(match[0]);
      } else {
        setOcrError("番号が見つかりませんでした。ラベルを枠の中央に置いてください。");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      setOcrError("文字認識中にエラーが発生しました。");
    } finally {
      setIsOCRProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">スキャナー</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Camera Feed */}
        <div className="relative aspect-square bg-black overflow-hidden">
          <div id="reader" className="w-full h-full"></div>
          
          {/* Overlay Guide */}
          <div className="absolute inset-0 border-2 border-dashed border-blue-500/50 pointer-events-none m-12 rounded-xl"></div>
          
          {isOCRProcessing && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-6 text-center">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-400" />
              <p className="font-medium">文字を解析中...</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-white space-y-4">
          <p className="text-xs text-center text-gray-500">
            バーコード・QRコードは自動的に読み取ります。<br/>
            文字ラベルの場合は、下のボタンを押してください。
          </p>

          {ocrError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 animate-pulse">
              {ocrError}
            </div>
          )}

          <button
            onClick={handleOCR}
            disabled={isOCRProcessing}
            className="w-full flex items-center justify-center py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            <Camera className="w-5 h-5 mr-2" />
            ラベルの文字を読み取る (OCR)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScannerModal;
