import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Printer, Download, MapPin, QrCode, FileText, User } from 'lucide-react';
import { DocumentItem, Language, PhysicalFileRecord } from '../../types/index.js';
import { formatEthiopianDate } from '../../lib/translations.js';

interface PhysicalLabelModalProps {
  file: PhysicalFileRecord;
  document?: DocumentItem;
  language: Language;
  onClose: () => void;
}

export const PhysicalLabelModal: React.FC<PhysicalLabelModalProps> = ({
  file,
  document: doc,
  language,
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>(doc?.qrCodeDataUrl || '');

  useEffect(() => {
    let active = true;
    const payload = JSON.stringify({
      system: 'EPSS-EDRMS',
      fileCode: file.fileCode,
      regNo: file.registrationNumber,
      location: file.locationPath,
      custodian: file.currentCustodianName
    });
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active && doc?.qrCodeDataUrl) setQrDataUrl(doc.qrCodeDataUrl);
      });

    return () => {
      active = false;
    };
  }, [file, doc]);

  const handleDownloadQr = () => {
    if (!qrDataUrl || typeof window === 'undefined') return;
    const link = window.document.createElement('a');
    link.href = qrDataUrl;
    link.download = `EPSS_Label_${file.fileCode}.png`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {language === 'am' ? 'የአካላዊ ፋይል መለያ እና የQR ህትመት' : 'Physical Dossier Barcode & Location Label'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
            aria-label="Close label preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 bg-slate-50 dark:bg-slate-950/50">
          {/* Printable Label Sheet */}
          <div className="epss-printable-label bg-white text-slate-900 border-2 border-slate-900 rounded-lg p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-300 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Ethiopian Pharmaceutical Supply Service
                </p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  OFFICIAL ARCHIVE BINDER CONTROL LABEL
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold border border-slate-900 px-1.5 py-0.5 uppercase">
                {doc?.confidentiality || 'Internal'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-28 h-28 shrink-0 border border-slate-300 rounded p-1 bg-white flex items-center justify-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR Label ${file.fileCode}`} className="w-full h-full object-contain" />
                ) : (
                  <QrCode className="w-12 h-12 text-slate-400" />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                    Binder Control Code
                  </span>
                  <span className="text-lg font-mono font-bold tracking-tight text-slate-900 tabular-nums">
                    {file.fileCode}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                    Electronic Registration #
                  </span>
                  <span className="text-sm font-mono font-semibold text-teal-800 tabular-nums">
                    {file.registrationNumber}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="truncate font-medium">
                    {doc ? (language === 'am' ? doc.subjectAm : doc.subjectEn) : file.registrationNumber}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-700 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                    Vault Storage Hierarchy
                  </span>
                  <span className="font-mono font-semibold text-slate-900 text-[11px]">
                    {file.locationPath}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Custodian: <strong className="text-slate-900">{file.currentCustodianName}</strong>
                </span>
                <span className="font-mono tabular-nums">
                  {formatEthiopianDate(file.createdAt, language)}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            {language === 'am'
              ? 'ይህን መለያ አትመው በአካላዊው ማህደር ሽፋን ላይ ይለጥፉ።'
              : 'Affix this QR control label to the physical binder spine for registry scan verification.'}
          </p>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDownloadQr}
            disabled={!qrDataUrl}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'QR አውርድ' : 'Download QR PNG'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              {language === 'am' ? 'ዝጋ' : 'Close'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'መለያ አትም' : 'Print Label'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
