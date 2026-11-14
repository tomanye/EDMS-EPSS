import { Language } from '../types/index.js';

const INTERNAL_ID_PATTERNS: RegExp[] = [
  /\b(?:usr|doc|wfi|wf-def|tpl|lnk|trn|sess|cert|wh|att|mfa|del|inc|phy)-[a-z0-9-]{2,}\b/gi,
  /\/app\/applet\/[^\s)]+/gi,
  /\bat\s+[A-Za-z0-9_$.]+\s+\([^)]+\)/g
];

export function sanitizeClientErrorText(text: string): string {
  let clean = text;
  for (const pattern of INTERNAL_ID_PATTERNS) {
    clean = clean.replace(pattern, '').replace(/\s{2,}/g, ' ').trim();
  }
  return clean;
}

export function localizeErrorMessage(
  rawMessage: string | undefined | null,
  language: Language = 'en'
): string {
  const msg = (rawMessage || '').trim();
  if (!msg) {
    return language === 'am'
      ? 'ያልተጠበቀ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
      : 'An unexpected error occurred. Please try again.';
  }

  const lower = msg.toLowerCase();

  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return language === 'am'
      ? 'የኔትወርክ ግንኙነት ችግር ተከስቷል። እባክዎ ግንኙነትዎን ያረጋግጡ።'
      : 'Network connection error. Please check your connection and try again.';
  }
  if (lower.includes('legal hold')) {
    return language === 'am'
      ? 'ይህ ሰነድ በሕጋዊ እግድ (Legal Hold) ስር ስለሆነ ማሻሻል ወይም መሰረዝ አይቻልም።'
      : 'This record is protected under an active Legal Hold and cannot be modified or deleted.';
  }
  if (lower.includes('forbidden') || lower.includes('permission denied') || lower.includes('permission required')) {
    return language === 'am'
      ? 'ይህን ተግባር ለማከናወን በቂ ፈቃድ የለዎትም።'
      : 'You do not have sufficient permissions to perform this action.';
  }
  if (lower.includes('mfa') || lower.includes('biometric')) {
    return language === 'am'
      ? 'ይህን ሚስጥራዊ ሰነድ ለመክፈት የሁለት ደረጃ (MFA / ባዮሜትሪክ) ማረጋገጫ ያስፈልጋል።'
      : 'Step-up MFA or biometric verification is required for this sensitive record.';
  }
  if (lower.includes('duplicate')) {
    return language === 'am'
      ? 'ተመሳሳይ ሰነድ ቀደም ሲል ተመዝግቦ ተገኝቷል። እባክዎ ተዛማጅ መዝገቦችን ይገምግሙ።'
      : 'A potential duplicate correspondence record was detected. Review existing matches before continuing.';
  }
  if (lower.includes('subject (english)') || lower.includes('5 and 500') || lower.includes('min 5')) {
    return language === 'am'
      ? 'የሰነዱ ርዕስ ቢያንስ 5 ፊደላት መሆን አለበት።'
      : 'Document subject must be between 5 and 500 characters.';
  }
  if (lower.includes('sender organization')) {
    return language === 'am'
      ? 'ለገቢ ደብዳቤ የላኪ ድርጅት ስም መግለጽ ግዴታ ነው።'
      : 'Sender organization is required for incoming correspondence.';
  }
  if (lower.includes('recipient organization')) {
    return language === 'am'
      ? 'ለወጪ ደብዳቤ የተቀባይ ድርጅት ስም መግለጽ ግዴታ ነው።'
      : 'Recipient organization is required for outgoing correspondence.';
  }
  if (lower.includes('future')) {
    return language === 'am'
      ? 'የተደረሰበት ቀን ከዛሬ ቀን በኋላ መሆን አይችልም።'
      : 'Received date cannot be in the future.';
  }
  if (lower.includes('itself')) {
    return language === 'am'
      ? 'አንድን ሰነድ ከራሱ ጋር ማገናኘት አይቻልም።'
      : 'A correspondence record cannot be linked to itself.';
  }
  if (lower.includes('already exists') && lower.includes('link')) {
    return language === 'am'
      ? 'ይህ የግንኙነት ዓይነት በሰነዶቹ መካከል ቀደም ብሎ ተመዝግቧል።'
      : 'A dossier link of this relationship type already exists between these records.';
  }
  if (lower.includes('system default')) {
    return language === 'am'
      ? 'ዋና የስርዓት ቅጾችን መሰረዝ የሚችሉት የስርዓት አስተዳዳሪ (SuperAdmin) ብቻ ናቸው።'
      : 'Only a SuperAdmin may delete system default institutional templates.';
  }
  if (lower.includes('not found')) {
    return language === 'am'
      ? 'የተጠየቀው መረጃ አልተገኘም።'
      : 'The requested record could not be found.';
  }
  if (lower.includes('unexpected server error') || lower.includes('internal server')) {
    return language === 'am'
      ? 'የአገልጋይ ችግር ተከስቷል። እባክዎ ቆይተው እንደገና ይሞክሩ።'
      : 'A server error occurred. Please try again shortly.';
  }

  const scrubbed = sanitizeClientErrorText(msg);
  return scrubbed || (language === 'am' ? 'ተግባሩ አልተሳካም።' : 'The requested operation could not be completed.');
}
