import type { StudyNotes, TranscriptSegment, TranslationLanguage, WordToken } from '../types';

export interface DemoStep {
  delayMs: number;
  kind: 'interim' | 'final' | 'gap_drop' | 'gap_recover' | 'command_highlight' | 'command_translate' | 'command_bookmark';
  text?: string;
  words?: WordToken[];
  hasConfidenceData?: boolean;
  isUnclearAudio?: boolean;
  languageDetected?: string;
  targetLanguage?: TranslationLanguage;
  bookmarkLabel?: string;
}

function makeWords(text: string, lowConfWord?: string, lowScore = 0.42): WordToken[] {
  return text.split(/\s+/).map((token) => {
    const clean = token.replace(/[.,!?]/g, '');
    const isLow = lowConfWord && clean.toLowerCase() === lowConfWord.toLowerCase();
    return {
      word: clean,
      punctuatedWord: token,
      confidence: isLow ? lowScore : 0.94,
    };
  });
}

export const DEMO_PHOTOSYNTHESIS_STEPS: DemoStep[] = [
  {
    delayMs: 1200,
    kind: 'interim',
    text: 'Good morning everyone. Today we are learning about...',
  },
  {
    delayMs: 2200,
    kind: 'final',
    text: 'Good morning everyone. Today we are learning about photosynthesis. Plants sunlight ni use chesi food prepare chestayi.',
    words: makeWords(
      'Good morning everyone. Today we are learning about photosynthesis. Plants sunlight ni use chesi food prepare chestayi.'
    ),
    hasConfidenceData: true,
    languageDetected: 'en-IN / te',
  },
  {
    delayMs: 3200,
    kind: 'final',
    text: 'Photosynthesis is the biological process where green plants convert light energy into chemical energy stored as glucose.',
    words: makeWords(
      'Photosynthesis is the biological process where green plants convert light energy into chemical energy stored as glucose.'
    ),
    hasConfidenceData: true,
    languageDetected: 'en-IN',
  },
  {
    delayMs: 2400,
    kind: 'command_highlight',
    text: 'MyVoice, mark that definition as important.',
  },
  {
    delayMs: 3000,
    kind: 'interim',
    text: 'Ee process leaf lo unna chlorophyll...',
  },
  {
    delayMs: 2800,
    kind: 'final',
    text: 'Ee process leaf lo unna chlorophyll and stroma lo jarugutundi. Water roots nundi, carbon dioxide stomata nundi vastundi.',
    words: makeWords(
      'Ee process leaf lo unna chlorophyll and stroma lo jarugutundi. Water roots nundi, carbon dioxide stomata nundi vastundi.',
      'stroma',
      0.43
    ),
    hasConfidenceData: true,
    languageDetected: 'te / en-IN',
  },
  {
    delayMs: 2600,
    kind: 'command_translate',
    text: 'MyVoice, translate the last explanation into Telugu.',
    targetLanguage: 'te',
  },
  {
    delayMs: 3000,
    kind: 'gap_drop',
  },
  {
    delayMs: 2800,
    kind: 'gap_recover',
  },
  {
    delayMs: 2500,
    kind: 'final',
    text: 'Audio unclear — please check this section.',
    words: [],
    hasConfidenceData: true,
    isUnclearAudio: true,
  },
  {
    delayMs: 3000,
    kind: 'final',
    text: 'Remember the two main stages: Light-dependent reactions happen in the thylakoid membrane, and the Calvin Cycle happens in the stroma.',
    words: makeWords(
      'Remember the two main stages: Light-dependent reactions happen in the thylakoid membrane, and the Calvin Cycle happens in the stroma.'
    ),
    hasConfidenceData: true,
    languageDetected: 'en-IN',
  },
  {
    delayMs: 2200,
    kind: 'command_bookmark',
    text: 'MyVoice, bookmark this topic.',
    bookmarkLabel: 'Light Reactions & Calvin Cycle',
  },
  {
    delayMs: 3000,
    kind: 'final',
    text: 'Finally, oxygen is released as a byproduct, which supports all aerobic life on Earth.',
    words: makeWords(
      'Finally, oxygen is released as a byproduct, which supports all aerobic life on Earth.'
    ),
    hasConfidenceData: true,
    languageDetected: 'en-IN',
  },
];

export const DEMO_TRANSLATIONS: Record<string, Partial<Record<TranslationLanguage, string>>> = {
  'Good morning everyone. Today we are learning about photosynthesis. Plants sunlight ni use chesi food prepare chestayi.': {
    te: 'అందరికీ శుభోదయం. ఈ రోజు మనం కిరణజన్య సంయోగక్రియ (photosynthesis) గురించి నేర్చుకుంటున్నాము. మొక్కలు సూర్యరశ్మిని ఉపయోగించి ఆహారాన్ని తయారు చేస్తాయి.',
    hi: 'सुप्रभात सभी को। आज हम प्रकाश संश्लेषण (photosynthesis) के बारे में सीख रहे हैं। पौधे सूरज की रोशनी का उपयोग करके भोजन तैयार करते हैं।',
    en: 'Good morning everyone. Today we are learning about photosynthesis. Plants use sunlight to prepare food.',
  },
  'Photosynthesis is the biological process where green plants convert light energy into chemical energy stored as glucose.': {
    te: 'కిరణజన్య సంయోగక్రియ (Photosynthesis) అనేది ఆకుపచ్చ మొక్కలు కాంతి శక్తిని గ్లూకోజ్ రూపంలో రసాయన శక్తిగా మార్చే జీవ ప్రక్రియ.',
    hi: 'प्रकाश संश्लेषण (Photosynthesis) वह जैविक प्रक्रिया है जिसमें हरे पौधे प्रकाश ऊर्जा को ग्लूकोज के रूप में रासायनिक ऊर्जा में बदलते हैं।',
    en: 'Photosynthesis is the biological process where green plants convert light energy into chemical energy stored as glucose.',
  },
  'Ee process leaf lo unna chlorophyll and stroma lo jarugutundi. Water roots nundi, carbon dioxide stomata nundi vastundi.': {
    te: 'ఈ ప్రక్రియ ఆకులోని క్లోరోఫిల్ మరియు స్ట్రోమాలో జరుగుతుంది. నీరు వేర్ల నుండి, కార్బన్ డయాక్సైడ్ స్టొమాటా నుండి వస్తుంది.',
    hi: 'यह प्रक्रिया पत्ती में मौजूद क्लोरोफिल और स्ट्रोमा में होती है। पानी जड़ों से और कार्बन डाइऑक्साइड स्टोमाटा से आता है।',
    en: 'This process occurs in the chlorophyll and stroma of the leaf. Water comes from the roots, and carbon dioxide enters through the stomata.',
  },
  'Remember the two main stages: Light-dependent reactions happen in the thylakoid membrane, and the Calvin Cycle happens in the stroma.': {
    te: 'రెండు ప్రధాన దశలను గుర్తుంచుకోండి: కాంతి ఆధారిత చర్యలు థైలకోయిడ్ పొరలో జరుగుతాయి, మరియు కాల్విన్ చక్రం స్ట్రోమాలో జరుగుతుంది.',
    hi: 'दो मुख्य चरणों को याद रखें: प्रकाश-निर्भर अभिक्रियाएँ थायलाकोइड झिल्ली में होती हैं, और केल्विन चक्र स्ट्रोमा में होता है।',
    en: 'Remember the two main stages: Light-dependent reactions happen in the thylakoid membrane, and the Calvin Cycle happens in the stroma.',
  },
};

export function getDemoTranslation(text: string, targetLanguage: TranslationLanguage): string {
  const exact = DEMO_TRANSLATIONS[text]?.[targetLanguage];
  if (exact) return exact;
  const labels: Record<TranslationLanguage, string> = {
    en: 'English (Demo)',
    hi: 'हिन्दी (डेमो अनुवाद)',
    te: 'తెలుగు (డెమో అనువాదం)',
  };
  return `[Demo ${labels[targetLanguage]}] ${text}`;
}

export function buildDemoStudyNotes(sessionId: string, segments: TranscriptSegment[]): StudyNotes {
  const educational = segments.filter((s) => s.isFinal && !s.isVoiceCommand && !s.isGapMarker);
  const findBySubstring = (sub: string) =>
    educational.find((s) => (s.correctedText ?? s.originalText).toLowerCase().includes(sub.toLowerCase()));

  const introSeg = findBySubstring('sunlight ni use chesi') ?? educational[0];
  const defSeg = findBySubstring('biological process') ?? educational[1] ?? educational[0];
  const stromaSeg = findBySubstring('chlorophyll') ?? educational[2] ?? educational[0];
  const stagesSeg = findBySubstring('calvin cycle') ?? educational[3] ?? educational[0];
  const oxygenSeg = findBySubstring('oxygen is released') ?? educational[educational.length - 1];
  const unclearSeg = educational.find((s) => s.isUnclearAudio);

  const makeRef = (seg: TranscriptSegment | undefined) =>
    seg
      ? [
          {
            segmentId: seg.id,
            timestampMs: seg.timestampMs,
            excerpt: (seg.correctedText ?? seg.originalText).slice(0, 130),
          },
        ]
      : [];

  return {
    sessionId,
    generatedAtIso: new Date().toISOString(),
    isDemo: true,
    topicHeadings: [
      'Introduction to Photosynthesis (English & Telugu-English)',
      'Inputs & Cellular Location (Chlorophyll, Stroma, Stomata)',
      'Two Stages: Light Reactions & Calvin Cycle',
    ],
    keyConcepts: [
      ...(introSeg
        ? [
            {
              id: 'demo-note-1',
              title: 'Solar-Driven Food Preparation',
              content:
                'Plants use sunlight to prepare their own food through photosynthesis (explained in both English and Telugu-English).',
              unverified: false,
              references: makeRef(introSeg),
            },
          ]
        : []),
      ...(stromaSeg
        ? [
            {
              id: 'demo-note-2',
              title: 'Inputs & Leaf Structures',
              content:
                'The process takes place in chlorophyll and stroma. Water enters from roots, and carbon dioxide enters through stomata.',
              unverified: false,
              references: makeRef(stromaSeg),
            },
          ]
        : []),
      ...(stagesSeg
        ? [
            {
              id: 'demo-note-3',
              title: 'Two Main Stages of Photosynthesis',
              content:
                'Light-dependent reactions occur in the thylakoid membrane, while the Calvin Cycle occurs in the stroma.',
              unverified: false,
              references: makeRef(stagesSeg),
            },
          ]
        : []),
    ],
    importantDefinitions: defSeg
      ? [
          {
            id: 'demo-def-1',
            title: 'Photosynthesis',
            content:
              'The biological process where green plants convert light energy into chemical energy stored as glucose.',
            unverified: false,
            references: makeRef(defSeg),
          },
        ]
      : [],
    lessonSummary: oxygenSeg
      ? [
          {
            id: 'demo-sum-1',
            title: 'Core Takeaway',
            content:
              'Green plants convert sunlight, water, and carbon dioxide into glucose inside chloroplasts and release oxygen as a vital byproduct.',
            unverified: false,
            references: [...makeRef(defSeg), ...makeRef(oxygenSeg)],
          },
        ]
      : [],
    highlightedExplanations: educational
      .filter((s) => s.highlightType)
      .map((s, idx) => ({
        id: `demo-hl-${idx + 1}`,
        title: `Highlighted ${s.highlightType ?? 'explanation'}`,
        content: s.correctedText ?? s.originalText,
        unverified: Boolean(s.isUnclearAudio),
        references: makeRef(s),
      })),
    bookmarkedMoments: educational
      .filter((s) => s.isBookmarked)
      .map((s, idx) => ({
        id: `demo-bm-${idx + 1}`,
        title: s.bookmarkLabel || 'Bookmarked Moment',
        content: s.correctedText ?? s.originalText,
        unverified: Boolean(s.isUnclearAudio),
        references: makeRef(s),
      })),
    unclearOrUnverified: unclearSeg
      ? [
          {
            id: 'demo-unclear-1',
            title: 'Audio Unclear — Verify With Teacher',
            content:
              'One brief segment had unrecognizable audio during the simulated lecture and is flagged as unverified.',
            unverified: true,
            references: makeRef(unclearSeg),
          },
        ]
      : [],
  };
}
