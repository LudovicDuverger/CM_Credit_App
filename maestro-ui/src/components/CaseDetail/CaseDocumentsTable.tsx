import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CaseDetail } from '../../services/cases';

interface Props {
  documents?: CaseDetail['documents'];
  onOpenDocument: (url: string, fileName: string, docId: string) => void;
  openingDocId: string | null;
}

const CaseDocumentsTable: React.FC<Props> = ({ documents, onOpenDocument, openingDocId }) => {
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="mb-5 font-semibold text-slate-900">{t('caseDetail.documents')}</h3>
      {!documents?.length ? (
        <p className="text-slate-500 text-sm">{t('caseDetail.noDocuments')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4">{t('caseDetail.docType')}</th>
                <th className="py-2 pr-4">{t('caseDetail.docName')}</th>
                <th className="py-2 pr-4">{t('caseDetail.docAction')}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 text-slate-700">
                  <td className="py-3 pr-4">{doc.fileType || '-'}</td>
                  <td className="py-3 pr-4">{doc.fileName || '-'}</td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => onOpenDocument(doc.url || '', doc.fileName || 'document', doc.id)}
                      disabled={openingDocId === doc.id}
                      className="inline-flex items-center gap-2 text-cyan-700 hover:text-cyan-600 font-semibold disabled:opacity-50"
                    >
                      <FileText size={14} />
                      {openingDocId === doc.id ? t('caseDetail.loading') : t('caseDetail.openDoc')}
                      <ExternalLink size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default CaseDocumentsTable;
