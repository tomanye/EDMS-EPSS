import { GoogleGenAI, Type } from '@google/genai';
import type {
  ConfidentialityLevel,
  Department,
  DocumentType,
  OcrExtractionResult,
  PriorityLevel
} from '../../src/types/index.js';

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

function clampConfidence(val: unknown, fallback = 0.85): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, Number(n.toFixed(2))));
}

function matchDepartment(suggestedName: string, departments: Department[]): Department | undefined {
  const lower = (suggestedName || '').toLowerCase();
  if (!lower) return departments[0];
  return (
    departments.find(
      (d) =>
        d.nameEn.toLowerCase() === lower ||
        d.nameEn.toLowerCase().includes(lower) ||
        lower.includes(d.nameEn.toLowerCase().split(' ')[0] || '')
    ) || departments[0]
  );
}

function normalizeDocType(val: unknown): DocumentType {
  const allowed: DocumentType[] = [
    'IncomingLetter',
    'OutgoingLetter',
    'InternalMemo',
    'Application',
    'TenderDocument',
    'InspectionReport',
    'Circular'
  ];
  return typeof val === 'string' && (allowed as string[]).includes(val)
    ? (val as DocumentType)
    : 'IncomingLetter';
}

function normalizePriority(val: unknown): PriorityLevel {
  const allowed: PriorityLevel[] = ['Normal', 'Urgent', 'VeryUrgent'];
  return typeof val === 'string' && (allowed as string[]).includes(val)
    ? (val as PriorityLevel)
    : 'Normal';
}

function normalizeConfidentiality(val: unknown): ConfidentialityLevel {
  const allowed: ConfidentialityLevel[] = ['Public', 'Internal', 'Confidential', 'Secret'];
  return typeof val === 'string' && (allowed as string[]).includes(val)
    ? (val as ConfidentialityLevel)
    : 'Internal';
}

function extractHeuristicMetadata(params: {
  rawText: string;
  subjectHint?: string;
  fileName?: string;
  departments: Department[];
  thresholdUsed: number;
  extractionId: string;
}): OcrExtractionResult {
  const raw = (params.rawText || '').trim();
  const combined = `${raw}\n${params.subjectHint || ''}\n${params.fileName || ''}`.trim();
  const lower = combined.toLowerCase();

  // Split English vs Amharic lines when mixed text exists
  const amharicLines: string[] = [];
  const englishLines: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (/[\u1200-\u137F]/.test(t)) amharicLines.push(t);
    if (/[A-Za-z]/.test(t)) englishLines.push(t);
  }

  const hasAmharic = amharicLines.length > 0;
  const hasEnglish = englishLines.length > 0;
  const detectedLanguage: 'en' | 'am' | 'bilingual' =
    hasAmharic && hasEnglish ? 'bilingual' : hasAmharic ? 'am' : 'en';

  // Extract reference number if pattern appears
  const refMatch = combined.match(/\b([A-Z]{2,8}\/[A-Z0-9-]+\/[A-Z0-9/-]+)\b/);
  const extractedRef = refMatch ? refMatch[1] : `REF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`;

  // Extract sender hints
  let senderOrg = 'Ethiopian Food and Drug Authority (EFDA)';
  if (lower.includes('moh') || lower.includes('ministry of health') || lower.includes('ጤና ሚኒስቴር')) {
    senderOrg = 'Federal Ministry of Health (MoH)';
  } else if (lower.includes('pharma') || lower.includes('supplier') || lower.includes('serum') || lower.includes('tender')) {
    senderOrg = 'International Pharmaceutical Supplier';
  } else if (lower.includes('memo') || lower.includes('circular') || lower.includes('internal') || lower.includes('የውስጥ')) {
    senderOrg = 'EPSS Directorate Office';
  }

  let suggestedType: DocumentType = 'IncomingLetter';
  if (lower.includes('memo') || lower.includes('የውስጥ ማስታወሻ')) suggestedType = 'InternalMemo';
  else if (lower.includes('application') || lower.includes('permit') || lower.includes('ማመልከቻ')) suggestedType = 'Application';
  else if (lower.includes('outgoing') || lower.includes('ወጪ')) suggestedType = 'OutgoingLetter';

  let priority: PriorityLevel = 'Normal';
  if (lower.includes('emergency') || lower.includes('cholera') || lower.includes('outbreak') || lower.includes('critical') || lower.includes('አስቸኳይ')) {
    priority = 'VeryUrgent';
  } else if (lower.includes('urgent') || lower.includes('immediate') || lower.includes('deadline')) {
    priority = 'Urgent';
  }

  let confidentiality: ConfidentialityLevel = 'Internal';
  if (lower.includes('secret') || lower.includes('classified') || lower.includes('ሚስጥር')) {
    confidentiality = 'Secret';
  } else if (lower.includes('confidential') || lower.includes('tender') || lower.includes('bid') || lower.includes('contract')) {
    confidentiality = 'Confidential';
  }

  let category = 'Pharmaceutical Supply Correspondence';
  let deptKeyword = 'Storage';
  if (lower.includes('tender') || lower.includes('procure') || lower.includes('bid') || lower.includes('lc') || lower.includes('ጨረታ')) {
    category = 'Procurement & Tender Management';
    deptKeyword = 'Procurement';
  } else if (lower.includes('efda') || lower.includes('clearance') || lower.includes('quality') || lower.includes('batch') || lower.includes('ጥራት')) {
    category = 'Regulatory & Batch Clearance';
    deptKeyword = 'Quality';
  } else if (lower.includes('finance') || lower.includes('budget') || lower.includes('invoice') || lower.includes('fund') || lower.includes('በጀት')) {
    category = 'Financial & Fund Allocation';
    deptKeyword = 'Finance';
  }

  const matchedDept =
    params.departments.find((d) => d.nameEn.toLowerCase().includes(deptKeyword.toLowerCase())) ||
    params.departments[0];

  const firstMeaningfulEn =
    params.subjectHint?.trim() ||
    englishLines.find((l) => l.length > 12) ||
    (params.fileName ? `Scanned Document: ${params.fileName}` : 'Official EPSS Correspondence Extraction');

  const firstMeaningfulAm =
    amharicLines.find((l) => l.length > 6) ||
    `የኢ.መ.አ.አ ${category === 'Procurement & Tender Management' ? 'የግዥ እና ጨረታ' : category === 'Regulatory & Batch Clearance' ? 'የጥራት ቁጥጥር' : 'ይፋዊ'} ደብዳቤ`;

  // Lower confidence if input text is very sparse or illegible
  const isSparse = raw.length < 30 && !params.fileName;
  const ocrConfidence = isSparse ? 0.54 : raw.length < 80 ? 0.78 : 0.92;
  const lowConfidenceFlagged = ocrConfidence < params.thresholdUsed;

  const summaryEn = `Extracted ${category.toLowerCase()} record from ${senderOrg} referencing ${extractedRef}. Recommended for ${matchedDept?.nameEn || 'Central Registry'} review with ${priority} priority.`;
  const summaryAm = `ከ${senderOrg} የቀረበ (${extractedRef}) ይፋዊ ሰነድ። ለ${matchedDept?.nameAm || 'ማዕከላዊ መዝገብ ቤት'} በ${priority === 'VeryUrgent' ? 'በጣም አስቸኳይ' : priority === 'Urgent' ? 'አስቸኳይ' : 'መደበኛ'} ደረጃ እንዲመራ ይመከራል።`;

  return {
    extractionId: params.extractionId,
    rawTextEn: englishLines.join('\n') || raw || `[OCR Scan Output from ${params.fileName || 'uploaded document'}]`,
    rawTextAm: amharicLines.join('\n') || (hasAmharic ? raw : firstMeaningfulAm),
    detectedLanguage,
    ocrConfidence,
    lowConfidenceFlagged,
    thresholdUsed: params.thresholdUsed,
    modelUsed: 'rule-based-ocr-fallback',
    suggestedType,
    suggestedSubjectEn: firstMeaningfulEn.slice(0, 200),
    suggestedSubjectAm: firstMeaningfulAm.slice(0, 200),
    suggestedSenderOrg: senderOrg,
    suggestedRecipientOrg: 'Ethiopian Pharmaceutical Supply Service (EPSS)',
    suggestedReferenceNumber: extractedRef,
    suggestedPriority: priority,
    suggestedConfidentiality: confidentiality,
    suggestedCategory: category,
    suggestedDepartment: matchedDept?.nameEn || 'Storage & Distribution Directorate',
    suggestedDepartmentId: matchedDept?.id || '',
    summaryEn,
    summaryAm,
    routingRecommendation: `Route to ${matchedDept?.nameEn || 'Storage & Distribution Directorate'} (${priority} SLA queue) after verifying reference ${extractedRef}.`,
    fieldConfidences: {
      subjectEn: isSparse ? 0.55 : 0.91,
      subjectAm: hasAmharic ? 0.9 : 0.68,
      senderOrganization: isSparse ? 0.58 : 0.87,
      referenceNumber: refMatch ? 0.96 : 0.62,
      department: 0.89
    },
    fallbackUsed: true
  };
}

export async function extractOcrAndSuggestFields(params: {
  fileBuffer?: Buffer;
  mimeType?: string;
  fileName?: string;
  rawText?: string;
  subjectHint?: string;
  departments: Department[];
  thresholdUsed: number;
  enableGeminiExtraction: boolean;
}): Promise<OcrExtractionResult> {
  const extractionId = `ocr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const ai = params.enableGeminiExtraction ? createGeminiClient() : null;
  const deptNames = params.departments.map((d) => d.nameEn).join(', ');

  if (ai) {
    try {
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      if (params.fileBuffer && params.mimeType) {
        if (
          params.mimeType.startsWith('image/') ||
          params.mimeType === 'application/pdf'
        ) {
          parts.push({
            inlineData: {
              mimeType: params.mimeType,
              data: params.fileBuffer.toString('base64')
            }
          });
        } else if (params.mimeType.startsWith('text/')) {
          parts.push({
            text: `Uploaded text file (${params.fileName || 'document.txt'}):\n${params.fileBuffer.toString('utf8').slice(0, 24000)}`
          });
        }
      }

      const instructionText = `You are the Bilingual (English + Amharic) OCR & Document Intelligence Engine for the Ethiopian Pharmaceutical Supply Service (EPSS).
Perform accurate optical character recognition (if file attached) and structured metadata extraction.
Departments available in EPSS: ${deptNames}.
${params.subjectHint ? `Subject hint: ${params.subjectHint}` : ''}
${params.rawText ? `Submitted/OCR Text:\n${params.rawText.slice(0, 24000)}` : ''}

Return strictly valid JSON following the schema. Never invent impossible registration dates; extract exact sender, recipient, reference number, bilingual English and Amharic subjects, summaries, confidence score (0..1), and routing recommendation.`;

      parts.push({ text: instructionText });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction:
            'Extract faithful English and Amharic OCR text, assess realistic OCR confidence (lower if text is noisy, sparse, or missing Amharic/English detail), and recommend EPSS directorate routing without fabricating confidential credentials.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              rawTextEn: { type: Type.STRING },
              rawTextAm: { type: Type.STRING },
              detectedLanguage: { type: Type.STRING },
              ocrConfidence: { type: Type.NUMBER },
              suggestedType: { type: Type.STRING },
              suggestedSubjectEn: { type: Type.STRING },
              suggestedSubjectAm: { type: Type.STRING },
              suggestedSenderOrg: { type: Type.STRING },
              suggestedRecipientOrg: { type: Type.STRING },
              suggestedReferenceNumber: { type: Type.STRING },
              suggestedPriority: { type: Type.STRING },
              suggestedConfidentiality: { type: Type.STRING },
              suggestedCategory: { type: Type.STRING },
              suggestedDepartment: { type: Type.STRING },
              summaryEn: { type: Type.STRING },
              summaryAm: { type: Type.STRING },
              routingRecommendation: { type: Type.STRING },
              subjectEnConfidence: { type: Type.NUMBER },
              subjectAmConfidence: { type: Type.NUMBER },
              senderConfidence: { type: Type.NUMBER },
              referenceConfidence: { type: Type.NUMBER },
              departmentConfidence: { type: Type.NUMBER }
            }
          }
        }
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      const ocrConfidence = clampConfidence(parsed.ocrConfidence, 0.88);
      const matchedDept = matchDepartment(parsed.suggestedDepartment, params.departments);

      return {
        extractionId,
        rawTextEn: String(parsed.rawTextEn || params.rawText || ''),
        rawTextAm: String(parsed.rawTextAm || ''),
        detectedLanguage:
          parsed.detectedLanguage === 'am' || parsed.detectedLanguage === 'bilingual'
            ? parsed.detectedLanguage
            : 'en',
        ocrConfidence,
        lowConfidenceFlagged: ocrConfidence < params.thresholdUsed,
        thresholdUsed: params.thresholdUsed,
        modelUsed: 'gemini-4-hydrogen',
        suggestedType: normalizeDocType(parsed.suggestedType),
        suggestedSubjectEn: String(parsed.suggestedSubjectEn || params.subjectHint || 'Extracted Correspondence').slice(0, 500),
        suggestedSubjectAm: String(parsed.suggestedSubjectAm || parsed.suggestedSubjectEn || 'የተተነተነ ሰነድ').slice(0, 500),
        suggestedSenderOrg: String(parsed.suggestedSenderOrg || 'External Authority / Partner'),
        suggestedRecipientOrg: String(parsed.suggestedRecipientOrg || 'Ethiopian Pharmaceutical Supply Service (EPSS)'),
        suggestedReferenceNumber: String(parsed.suggestedReferenceNumber || ''),
        suggestedPriority: normalizePriority(parsed.suggestedPriority),
        suggestedConfidentiality: normalizeConfidentiality(parsed.suggestedConfidentiality),
        suggestedCategory: String(parsed.suggestedCategory || 'Pharmaceutical Supply Correspondence'),
        suggestedDepartment: matchedDept?.nameEn || String(parsed.suggestedDepartment || 'Storage & Distribution Directorate'),
        suggestedDepartmentId: matchedDept?.id || '',
        summaryEn: String(parsed.summaryEn || ''),
        summaryAm: String(parsed.summaryAm || ''),
        routingRecommendation: String(parsed.routingRecommendation || ''),
        fieldConfidences: {
          subjectEn: clampConfidence(parsed.subjectEnConfidence, ocrConfidence),
          subjectAm: clampConfidence(parsed.subjectAmConfidence, ocrConfidence),
          senderOrganization: clampConfidence(parsed.senderConfidence, 0.85),
          referenceNumber: clampConfidence(parsed.referenceConfidence, 0.8),
          department: clampConfidence(parsed.departmentConfidence, 0.88)
        },
        fallbackUsed: false
      };
    } catch (err) {
      console.warn('Gemini OCR extraction fell back to heuristic extractor:', err);
    }
  }

  // Fallback text (if text buffer provided without rawText)
  let fallbackText = params.rawText || '';
  if (!fallbackText && params.fileBuffer && params.mimeType?.startsWith('text/')) {
    fallbackText = params.fileBuffer.toString('utf8');
  }

  return extractHeuristicMetadata({
    rawText: fallbackText,
    subjectHint: params.subjectHint,
    fileName: params.fileName,
    departments: params.departments,
    thresholdUsed: params.thresholdUsed,
    extractionId
  });
}
