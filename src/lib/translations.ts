/**
 * EPSS EDRMS Bilingual Localization (English & Amharic)
 * Ethiopian Pharmaceutical Supply Service / የኢትዮጵያ መድኃኒት አቅራቢ አገልግሎት
 */

export const translations = {
  en: {
    // Brand & App
    appName: "EPSS EDRMS",
    appFullName: "Ethiopian Pharmaceutical Supply Service",
    systemName: "Enterprise Document & Records Management System",
    officialSeal: "OFFICIAL EPSS RECORD VERIFIED",
    
    // Top Bar & Global
    searchPlaceholder: "Search by ref #, subject, sender, or keyword...",
    language: "Language",
    english: "English",
    amharic: "አማርኛ",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    notifications: "Notifications",
    userRole: "Role",
    switchRole: "Switch Persona",
    headOffice: "EPSS Head Office (Addis Ababa)",

    // Navigation Menu
    navDashboard: "Executive Dashboard",
    navIncoming: "Incoming Correspondence",
    navOutgoing: "Outgoing Correspondence",
    navMemos: "Internal Memorandums",
    navApplications: "Applications & Permits",
    navWorkflows: "Workflow & Approval Inbox",
    navTracking: "Physical Custody & QR",
    navRepository: "Document Repository",
    navSearch: "Advanced Search",
    navArchives: "Records & Archival",
    navReports: "Reports & Analytics",
    navOrganization: "Organization & Branches",
    navIntegrations: "Enterprise Integrations",
    navSecurity: "Audit & Security Logs",

    // Common Actions
    actions: "Actions",
    view: "View Details",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    submit: "Submit",
    register: "Register",
    approve: "Approve",
    reject: "Reject",
    forward: "Forward",
    returnForCorrection: "Return for Correction",
    addMinutes: "Add Minute Note",
    dispatch: "Dispatch Letter",
    printQr: "Print QR Barcode",
    download: "Download",
    exportCsv: "Export CSV",
    exportPdf: "Export PDF",
    filter: "Filter",
    reset: "Reset",
    close: "Close",
    signDigitally: "Apply Digital Signature",

    // Document Fields
    regNumber: "Registration No.",
    refNumber: "Reference No.",
    documentType: "Document Type",
    subject: "Subject",
    sender: "Sender Organization",
    senderPerson: "Sender Officer / Contact",
    recipient: "Recipient Organization",
    receivedDate: "Received Date",
    registrationDate: "Registration Date",
    priority: "Priority",
    confidentiality: "Confidentiality",
    status: "Status",
    branch: "Branch / Hub",
    department: "Directorate / Department",
    assignedTo: "Assigned Officer",
    attachments: "Attachments",
    description: "Brief Description",
    qrCode: "Verification QR Code",
    timeline: "Processing History & Minutes",
    physicalLocation: "Physical File Location",
    retentionPolicy: "Retention Schedule",

    // Priorities
    priorityNormal: "Normal",
    priorityUrgent: "Urgent",
    priorityVeryUrgent: "Very Urgent",

    // Confidentiality
    confidentialityPublic: "Public",
    confidentialityInternal: "Internal",
    confidentialityConfidential: "Confidential",
    confidentialitySecret: "Secret",

    // Statuses
    statusReceived: "Received",
    statusRegistered: "Registered",
    statusUnderReview: "Under Review",
    statusAssigned: "Assigned",
    statusInProgress: "In Progress",
    statusPendingInfo: "Pending Info",
    statusForwarded: "Forwarded",
    statusAwaitingApproval: "Awaiting Approval",
    statusApproved: "Approved",
    statusResponsePrepared: "Response Prepared",
    statusDispatched: "Dispatched",
    statusCompleted: "Completed",
    statusArchived: "Archived",
    statusCancelled: "Cancelled",

    // Dashboard
    kpiIncoming: "Incoming Registered",
    kpiOutgoing: "Outgoing Dispatched",
    kpiMemos: "Internal Circulars",
    kpiPending: "Pending Action",
    kpiOverdue: "Overdue Correspondence",
    kpiCompleted: "Processed This Month",
    kpiAvgTurnaround: "Avg Turnaround",
    days: "days",
    branchPerformance: "19 Regional Branches Operational Summary",
    recentCorrespondence: "Recent System Activity",
    urgentActionQueue: "Urgent SLA Action Queue",

    // AI Assistant
    aiAssistantTitle: "Gemini Document Intelligence",
    aiAssistantPrompt: "Upload a scan or enter document text to auto-extract reference dates, sender, and suggested department assignment.",
    aiAnalyzing: "Analyzing document via Gemini...",
    aiSuggestedDept: "Recommended Directorate",
    aiSummary: "Executive Summary",
    aiApplyData: "Populate Form Fields",

    // Physical Tracking
    physicalFileCode: "Physical Binder ID",
    building: "Building",
    floor: "Floor",
    room: "Room",
    shelf: "Shelf / Rack",
    box: "Archive Box",
    currentCustodian: "Current Custodian",
    handoverAction: "Record Physical File Handover",
    handoverHistory: "Custody Movement Log",
    verifyHandover: "Confirm Handover Receipt",

    // Empty States
    noDocumentsFound: "No documents found matching the selected filter criteria.",
    noTasksPending: "Your workflow approval inbox is clear. No pending items.",
  },

  am: {
    // Brand & App
    appName: "ኢ.መ.አ.አ. ሰ.መ.አ.ስ",
    appFullName: "የኢትዮጵያ መድኃኒት አቅራቢ አገልግሎት",
    systemName: "የሰነድ እና መዛግብት አስተዳደር የኤሌክትሮኒክስ ሥርዓት",
    officialSeal: "ይፋዊ የኢ.መ.አ.አ ሰነድ ተረጋግጧል",

    // Top Bar & Global
    searchPlaceholder: "በመለያ ቁጥር፣ ርዕስ፣ ላኪ ወይም ቁልፍ ቃል ይፈልጉ...",
    language: "ቋንቋ",
    english: "English",
    amharic: "አማርኛ",
    theme: "ገጽታ",
    light: "ነጭ",
    dark: "ጨለማ",
    notifications: "ማሳወቂያዎች",
    userRole: "ሚና",
    switchRole: "ሚና ቀይር",
    headOffice: "የኢ.መ.አ.አ ዋና መሥሪያ ቤት (አዲስ አበባ)",

    // Navigation Menu
    navDashboard: "ዋና ዳሽቦርድ",
    navIncoming: "ገቢ ደብዳቤዎች",
    navOutgoing: "ወጪ ደብዳቤዎች",
    navMemos: "የውስጥ ማስታወሻዎች",
    navApplications: "ማመልከቻዎች እና ፈቃዶች",
    navWorkflows: "የሥራ ፍሰት እና ማጽደቂያ",
    navTracking: "የሰነድ አካላዊ ክትትል እና QR",
    navRepository: "ማዕከላዊ የሰነድ ማከማቻ",
    navSearch: "የላቀ ፍለጋ",
    navArchives: "መዛግብት እና ማህደር",
    navReports: "ሪፖርቶች እና ትንተና",
    navOrganization: "መዋቅር እና 19 ቅርንጫፎች",
    navIntegrations: "የድርጅት ሲስተሞች ግንኙነት (Integrations)",
    navSecurity: "የደህንነት እና ኦዲት መዝገብ",

    // Common Actions
    actions: "ተግባራት",
    view: "ዝርዝር ይመልከቱ",
    edit: "አስተካክል",
    delete: "ሰርዝ",
    save: "አስቀምጥ",
    cancel: "ይቅር",
    submit: "አስገባ",
    register: "መዝግብ",
    approve: "አጽድቅ",
    reject: "ውድቅ አድርግ",
    forward: "አስተላልፍ",
    returnForCorrection: "ለማስተካከያ መልስ",
    addMinutes: "ማስታወሻ/ውሳኔ አክል",
    dispatch: "ደብዳቤውን ላክ",
    printQr: "የQR ባርኮድ አትም",
    download: "አውርድ",
    exportCsv: "CSV አውጣ",
    exportPdf: "PDF አውጣ",
    filter: "አጣራ",
    reset: "ዳግም ጀምር",
    close: "ዝጋ",
    signDigitally: "ዲጂታል ፊርማ አድርግ",

    // Document Fields
    regNumber: "የምዝገባ ቁጥር",
    refNumber: "የደብዳቤ መለያ ቁጥር",
    documentType: "የሰነድ ዓይነት",
    subject: "ጉዳዩ / ርዕስ",
    sender: "ላኪ ድርጅት",
    senderPerson: "የላኪ ተወካይ / ስም",
    recipient: "ተቀባይ ድርጅት",
    receivedDate: "የተደረሰበት ቀን",
    registrationDate: "የተመዘገበበት ቀን",
    priority: "አስቸኳይነት",
    confidentiality: "ሚስጥራዊነት",
    status: "ሁኔታ",
    branch: "ቅርንጫፍ ማዕከል",
    department: "ዳይሬክቶሬት / የሥራ ክፍል",
    assignedTo: "የተመደበለት ባለሙያ",
    attachments: "አባሪ ሰነዶች",
    description: "አጭር መግለጫ",
    qrCode: "የማረጋገጫ QR ኮድ",
    timeline: "የሂደት ታሪክ እና ውሳኔዎች",
    physicalLocation: "የአካላዊ ሰነድ መገኛ ቦታ",
    retentionPolicy: "የማቆያ እና ማህደር መመሪያ",

    // Priorities
    priorityNormal: "መደበኛ",
    priorityUrgent: "አስቸኳይ",
    priorityVeryUrgent: "በጣም አስቸኳይ",

    // Confidentiality
    confidentialityPublic: "ግልጽ",
    confidentialityInternal: "ውስጣዊ",
    confidentialityConfidential: "ሚስጥራዊ",
    confidentialitySecret: "ከፍተኛ ሚስጥራዊ",

    // Statuses
    statusReceived: "ደርሷል",
    statusRegistered: "ተመዝግቧል",
    statusUnderReview: "በግምገማ ላይ",
    statusAssigned: "ተመድቧል",
    statusInProgress: "በሂደት ላይ",
    statusPendingInfo: "መረጃ በመጠባበቅ ላይ",
    statusForwarded: "ተላልፏል",
    statusAwaitingApproval: "ማጽደቂያ በመጠባበቅ ላይ",
    statusApproved: "ጸድቋል",
    statusResponsePrepared: "መልስ ተዘጋጅቷል",
    statusDispatched: "ተልኳል",
    statusCompleted: "ተጠናቋል",
    statusArchived: "ማህደር ገብቷል",
    statusCancelled: "ተሰርዟል",

    // Dashboard
    kpiIncoming: "የተመዘገቡ ገቢ ደብዳቤዎች",
    kpiOutgoing: "የተላኩ ወጪ ደብዳቤዎች",
    kpiMemos: "የውስጥ ሰርኩላሮች",
    kpiPending: "ውሳኔ የሚጠብቁ",
    kpiOverdue: "ጊዜ ያለፈባቸው ደብዳቤዎች",
    kpiCompleted: "በዚህ ወር የተጠናቀቁ",
    kpiAvgTurnaround: "አማካይ የማጠናቀቂያ ጊዜ",
    days: "ቀናት",
    branchPerformance: "የ19ቱ የክልል ቅርንጫፍ ማዕከላት የሥራ አፈጻጸም",
    recentCorrespondence: "የቅርብ ጊዜ የሰነዶች እንቅስቃሴ",
    urgentActionQueue: "አስቸኳይ ውሳኔ የሚሹ ሰነዶች",

    // AI Assistant
    aiAssistantTitle: "የጀሚኒ ሰነድ ረዳት ኢንተለጀንስ",
    aiAssistantPrompt: "የተቃኘ ሰነድ ወይም ጽሑፍ ያስገቡ፤ ቀን፣ ላኪ እና የሚመለከተውን ዳይሬክቶሬት በራስ-ሰር ይለያል።",
    aiAnalyzing: "ሰነዱ በጀሚኒ እየተተነተነ ነው...",
    aiSuggestedDept: "የተመከረለት ዳይሬክቶሬት",
    aiSummary: "አጠቃላይ ማጠቃለያ",
    aiApplyData: "ወደ ቅጹ መረጃውን ሙላ",

    // Physical Tracking
    physicalFileCode: "የአካላዊ ፋይል መለያ",
    building: "ህንፃ",
    floor: "ፎቅ",
    room: "ቢሮ/ክፍል",
    shelf: "መደርደሪያ",
    box: "የማህደር ሳጥን",
    currentCustodian: "የአሁኑ ኃላፊ ባለሙያ",
    handoverAction: "የሰነድ ርክክብ መዝግብ",
    handoverHistory: "የርክክብ እና ዝውውር ታሪክ",
    verifyHandover: "የርክክብ ማረጋገጫ",

    // Empty States
    noDocumentsFound: "ከተመረጠው መስፈርት ጋር የሚዛመድ ሰነድ አልተገኘም።",
    noTasksPending: "የሥራ ፍሰት ሳጥንዎ ንጹህ ነው። የሚጠብቅዎት ተግባር የለም።",
  }
};

/**
 * Format date with both Gregorian and Ethiopian approximate representations
 */
export function formatEthiopianDate(isoDateString: string, lang: 'en' | 'am' = 'en'): string {
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return isoDateString;
    
    const formattedGregorian = date.toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Simple approximate Ethiopian calendar offset (~7-8 years, Meskerem new year)
    const gYear = date.getFullYear();
    const gMonth = date.getMonth() + 1; // 1-12
    const gDay = date.getDate();
    
    let ethYear = gYear - 8;
    if (gMonth > 9 || (gMonth === 9 && gDay >= 11)) {
      ethYear = gYear - 7;
    }

    if (lang === 'am') {
      return `${formattedGregorian} (${ethYear} ዓ.ም)`;
    }
    return `${formattedGregorian} (EC ${ethYear})`;
  } catch {
    return isoDateString;
  }
}
