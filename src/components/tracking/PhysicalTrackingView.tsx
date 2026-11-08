import React, { useState, useEffect } from 'react';
import { 
  PackageSearch, 
  QrCode, 
  Building, 
  MapPin, 
  User, 
  Clock, 
  ArrowRightLeft, 
  Printer, 
  CheckCircle2, 
  Search,
  AlertOctagon 
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { DocumentItem, PhysicalHandoverMovement } from '../../types/index.js';

export const PhysicalTrackingView: React.FC = () => {
  const { documents, currentUser, language, refreshData, t } = useApp();
  const [handovers, setHandovers] = useState<PhysicalHandoverMovement[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [targetCustodian, setTargetCustodian] = useState('');
  const [targetDept, setTargetDept] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleReportMissing = async (doc: DocumentItem) => {
    const reason = prompt(
      language === 'am' 
        ? `የሰነድ ${doc.registrationNumber} መጥፋትን ይመዝግቡ፦ የት እንደተፈለገ እና ተጨማሪ ማስታወሻ ያስገቡ`
        : `Report missing physical dossier for ${doc.registrationNumber}. Enter details/last seen location:`
    );
    if (!reason) return;

    try {
      const res = await fetch('/api/v1/tracking/missing-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify({ documentId: doc.id, notes: reason })
      });
      if (!res.ok) throw new Error('Failed to record report');
      alert(language === 'am' ? 'የሰነዱ መጥፋት ሪፖርት በኦዲት መዝገብ ላይ ተመዝግቧል!' : 'Missing dossier incident logged to security audit trail.');
    } catch (e: any) {
      alert(e.message || 'Error logging report');
    }
  };

  const fetchHandovers = async () => {
    try {
      const res = await fetch('/api/v1/tracking/handovers');
      const data = await res.json();
      setHandovers(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHandovers();
  }, []);

  const physicalDocs = documents.filter(d => !!d.physicalTracking);

  const filteredDocs = physicalDocs.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.registrationNumber.toLowerCase().includes(q) ||
      d.physicalTracking?.fileCode.toLowerCase().includes(q) ||
      d.physicalTracking?.currentCustodianName.toLowerCase().includes(q) ||
      d.subjectEn.toLowerCase().includes(q)
    );
  });

  const handleRecordHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    try {
      setIsSubmitting(true);
      const payload = {
        documentId: selectedDoc.id,
        registrationNumber: selectedDoc.registrationNumber,
        fromCustodian: selectedDoc.physicalTracking?.currentCustodianName || currentUser?.fullNameEn || 'Central Registry',
        toCustodian: targetCustodian,
        department: targetDept || 'Designated Directorate',
        transferReason: transferReason || 'Official review and evaluation',
        status: 'InCustody' as const,
        verifiedByReceiver: true
      };

      const res = await fetch('/api/v1/tracking/handover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Handover failed');

      await refreshData();
      await fetchHandovers();
      setIsHandoverModalOpen(false);
      setTransferReason('');
      setTargetCustodian('');
    } catch (err) {
      console.error(err);
      alert('Failed to record handover');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navTracking')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'የዋናውን ወረቀት ሰነድ አካላዊ መገኛ፣ የመደርደሪያ ቁጥር እና የባለሙያዎች ርክክብ መዝገብ'
              : 'Physical original paper document custody, warehouse shelf coordinates, and chain-of-custody transfer.'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search physical file by binder ID, registration number, custodian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Physical Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => {
          const pt = doc.physicalTracking!;
          return (
            <div
              key={doc.id}
              className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400">
                    {pt.fileCode}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {doc.registrationNumber}
                  </span>
                </div>

                <h3 className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                  {language === 'am' ? doc.subjectAm : doc.subjectEn}
                </h3>

                {/* Storage Location Coordinates */}
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Building className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>{pt.building} · {pt.floor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>{pt.room} · {pt.shelfNumber}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>Box: <strong className="text-slate-700 dark:text-slate-300">{pt.boxNumber}</strong></span>
                  </div>
                </div>

                {/* Current Custodian */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">{pt.currentCustodianName}</span>
                  </div>
                  <span className="font-mono text-[11px]">{pt.movementsCount} moves</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setSelectedDoc(doc);
                    setIsHandoverModalOpen(true);
                  }}
                  className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-teal-600" />
                  <span>Transfer Custody</span>
                </button>

                {doc.qrCodeDataUrl && (
                  <button
                    onClick={() => {
                      const win = window.open('');
                      win?.document.write(`
                        <html>
                          <head><title>Print QR Physical Binder Label - ${pt.fileCode}</title></head>
                          <body style="font-family: sans-serif; text-align: center; padding: 20px;">
                            <h2>Ethiopian Pharmaceutical Supply Service</h2>
                            <p><strong>Physical Archive Binder Label</strong></p>
                            <img src="${doc.qrCodeDataUrl}" style="width: 200px; height: 200px;" />
                            <p style="font-size: 18px; font-weight: bold; margin-top: 10px;">${pt.fileCode}</p>
                            <p>Reg No: ${doc.registrationNumber}</p>
                            <p>Location: ${pt.building} / ${pt.room} / ${pt.shelfNumber}</p>
                          </body>
                        </html>
                      `);
                      win?.print();
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg"
                    title="Print QR File Label"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => handleReportMissing(doc)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                  title="Report Missing Dossier Incident"
                >
                  <AlertOctagon className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custody Movement History Log */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-200 dark:border-slate-800">
          {t('handoverHistory')}
        </h2>
        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {handovers.length === 0 ? (
            <div className="py-6 text-center text-slate-400">
              No physical handover transfers recorded yet.
            </div>
          ) : (
            handovers.map((h) => (
              <div key={h.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{h.registrationNumber}</span>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{h.transferReason}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <span>From: <strong className="text-slate-700 dark:text-slate-300">{h.fromCustodian}</strong></span>
                  <span>→</span>
                  <span>To: <strong className="text-slate-700 dark:text-slate-300">{h.toCustodian}</strong></span>
                  <span className="font-mono">{formatEthiopianDate(h.handoverDate, language)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Handover Modal */}
      {isHandoverModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400">
                  {selectedDoc.physicalTracking?.fileCode}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t('handoverAction')}
                </h3>
              </div>
              <button 
                onClick={() => setIsHandoverModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordHandover} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Recipient Custodian Name & Position
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ato Girma Wondimu (Head of Procurement)"
                  value={targetCustodian}
                  onChange={(e) => setTargetCustodian(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Receiving Directorate / Branch
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance Directorate"
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Purpose of Physical Handover
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify review reason, court legal exhibit, or tender opening evaluation..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsHandoverModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold"
                >
                  {isSubmitting ? 'Recording...' : 'Register Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
