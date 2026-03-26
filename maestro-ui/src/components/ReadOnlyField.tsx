import React from 'react';

export const looksLikeHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

export const renderPrimitive = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return String(value);
  return String(value);
};

const ReadOnlyField: React.FC<{ label: string; value: unknown }> = ({ label, value }) => {
  if (Array.isArray(value)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <div className="mt-2 space-y-2">
          {value.length ? value.map((item, index) => (
            <div key={`${label}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
              <ReadOnlyField label={`${label} ${index + 1}`} value={item} />
            </div>
          )) : <p className="text-sm text-slate-500">Aucune valeur.</p>}
        </div>
      </div>
    );
  }

  if (value && typeof value === 'object') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <div className="mt-3 grid grid-cols-1 gap-3">
          {Object.entries(value).map(([key, nestedValue]) => (
            <ReadOnlyField key={`${label}-${key}`} label={key} value={nestedValue} />
          ))}
        </div>
      </div>
    );
  }

  const textValue = renderPrimitive(value);
  const isHtml = typeof value === 'string' && looksLikeHtml(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      {label ? <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p> : null}
      {isHtml ? (
        <div
          className={`prose prose-sm max-w-none text-slate-700 prose-p:my-2 prose-ul:my-2 prose-li:my-1 ${label ? 'mt-2' : ''}`}
          dangerouslySetInnerHTML={{ __html: textValue }}
        />
      ) : (
        <p className={`${label ? 'mt-2' : ''} whitespace-pre-wrap break-words text-sm text-slate-700`}>{textValue}</p>
      )}
    </div>
  );
};

export default ReadOnlyField;
