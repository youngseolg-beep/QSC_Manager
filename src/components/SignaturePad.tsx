import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { RotateCcw } from 'lucide-react';

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  getSignatureDataUrl: () => string | null;
}

const SignaturePad = forwardRef<SignaturePadHandle, {}>((props, ref) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      sigCanvas.current?.clear();
    },
    isEmpty: () => {
      return sigCanvas.current?.isEmpty() ?? true;
    },
    getSignatureDataUrl: () => {
      if (sigCanvas.current?.isEmpty()) {
        return null;
      }
      return sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png') ?? null;
    }
  }));

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 relative flex flex-col overflow-hidden">
      <div className="absolute top-1 right-1 z-10">
        <button
          onClick={(e) => {
            e.preventDefault();
            sigCanvas.current?.clear();
          }}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
          title="서명 지우기"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
      <SignatureCanvas
        ref={sigCanvas}
        penColor="black"
        canvasProps={{
          className: 'w-full h-24 cursor-crosshair',
        }}
      />
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
