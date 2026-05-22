(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.KNSLessonEngine = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createLessonEngine() {
  const curriculumSubjects = [
    "AzÉ™rbaycan dili",
    "Riyaziyyat",
    "HÉ™yat bilgisi",
    "Ä°ngilis dili",
    "Rus dili",
    "Ä°nformatika",
    "Musiqi",
    "TÉ™sviri incÉ™sÉ™nÉ™t",
    "Fiziki tÉ™rbiyÉ™",
    "Tarix",
    "CoÄŸrafiya",
    "Biologiya",
    "Kimya",
    "Fizika",
  ];

  const topicMarkers = ["mÃ¶vzu", "tema", "topic", "lesson", "dÉ™rs", "chapter", "bÃ¶lmÉ™"];
  const activityMarkers = [
    "tapÅŸÄ±rÄ±q",
    "mÃ¼zakirÉ™",
    "oyun",
    "fÉ™aliyyÉ™t",
    "activity",
    "exercise",
    "practice",
    "sual",
    "problem",
    "mÃ¼ÅŸahidÉ™",
    "tÉ™crÃ¼bÉ™",
  ];
  const stopwords = new Set([
    "vÉ™",
    "ilÉ™",
    "Ã¼Ã§Ã¼n",
    "olan",
    "olanlar",
    "hÉ™m",
    "bu",
    "bir",
    "iki",
    "Ã¼Ã§",
    "dÃ¶rd",
    "beÅŸ",
    "kimi",
    "daha",
    "Ã§ox",
    "az",
    "ya",
    "vÉ™ya",
    "vÉ™ya",
    "ilÉ™",
    "sonra",
    "É™gÉ™r",
    "isÉ™",
    "the",
    "and",
    "for",
    "from",
    "your",
    "that",
    "have",
    "will",
    "lesson",
    "mÃ¶vzu",
    "tema",
    "dÉ™rs",
    "sinif",
    "sÉ™hifÉ™",
  ]);

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeSourceText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function foldText(value) {
    return normalizeText(value).toLocaleLowerCase("az");
  }

  function slugify(value) {
    return foldText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function uniq(values) {
    const seen = new Set();
    const output = [];

    values.forEach((value) => {
      const text = normalizeText(value);
      if (!text) {
        return;
      }

      const folded = foldText(text);
      if (seen.has(folded)) {
        return;
      }

      seen.add(folded);
      output.push(text);
    });

    return output;
  }

  function splitLines(value) {
    return String(value || "")
      .split(/\r?\n+/)
      .map((line) => normalizeText(line))
      .filter(Boolean);
  }

  function getCanonicalSubject(subject) {
    const foldedSubject = foldText(subject);
    const matched = curriculumSubjects.find((item) => foldText(item) === foldedSubject);
    return matched || normalizeText(subject);
  }

  function getGradeNumber(grade) {
    const match = normalizeText(grade).match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  function getThemeMode(grade) {
    const gradeNumber = getGradeNumber(grade);
    const primaryMode = gradeNumber !== null && gradeNumber >= 1 && gradeNumber <= 4;

    if (primaryMode) {
      return {
        mode: "primary",
        label: "ðŸŽ¨ Theme: Primary School Mode",
        shortLabel: "Primary School Mode",
        description: "1â€“4-cÃ¼ siniflÉ™r Ã¼Ã§Ã¼n daha rÉ™ngli, iri vÉ™ smartboard-friendly vizual dil.",
      };
    }

    return {
      mode: "academic",
      label: "ðŸŽ¨ Theme: Academic Mode",
      shortLabel: "Academic Mode",
      description: "5â€“11-ci siniflÉ™r Ã¼Ã§Ã¼n daha sÉ™liqÉ™li, mÃ¼asir vÉ™ fokuslu tÉ™qdimat gÃ¶rÃ¼nÃ¼ÅŸÃ¼.",
    };
  }

  function detectLessonLine(text) {
    const lines = splitLines(text);
    const markedLine = lines.find((line) =>
      topicMarkers.some((marker) => foldText(line).startsWith(`${marker}:`)),
    );

    if (!markedLine) {
      return "";
    }

    const parts = markedLine.split(":");
    return normalizeText(parts.slice(1).join(":"));
  }

  function detectTopicFromSource(text, fallbackTopic, subject) {
    const directTopic = detectLessonLine(text);
    if (directTopic) {
      return directTopic;
    }

    const lines = splitLines(text);
    const candidate = lines.find((line) => {
      if (line.length < 6 || line.length > 90) {
        return false;
      }

      const folded = foldText(line);
      return !folded.includes(foldText(subject)) && !/^\d+$/.test(line);
    });

    return normalizeText(fallbackTopic) || candidate || "";
  }

  function extractTitle(text, subject, topic) {
    const explicitTitle = detectLessonLine(text);
    if (explicitTitle) {
      return explicitTitle;
    }

    if (normalizeText(topic)) {
      return `${subject} â€” ${normalizeText(topic)}`;
    }

    const lines = splitLines(text);
    const firstUseful = lines.find((line) => line.length >= 8 && line.length <= 100);
    return firstUseful || `${subject} dÉ™rsi`;
  }

  function tokenize(text) {
    return foldText(text)
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .map((word) => normalizeText(word))
      .filter((word) => word.length >= 3 && !stopwords.has(word));
  }

  function extractKeywords(text, topic) {
    const words = tokenize(text);
    const counts = new Map();

    words.forEach((word) => {
      counts.set(word, (counts.get(word) || 0) + 1);
    });

    const ranked = [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "az"))
      .slice(0, 8)
      .map(([word]) => word);

    const topicWords = tokenize(topic).slice(0, 3);
    return uniq([
      ...topicWords.map(capitalizeWord),
      ...ranked.map(capitalizeWord),
    ]).slice(0, 8);
  }

  function capitalizeWord(word) {
    const normalized = normalizeText(word);
    return normalized ? normalized.charAt(0).toLocaleUpperCase("az") + normalized.slice(1) : "";
  }

  function extractQuestions(text) {
    const lines = splitLines(text);
    const explicit = lines.filter(
      (line) =>
        line.includes("?") ||
        /^(sual|question)\b/i.test(line) ||
        /^\d+\./.test(line),
    );

    return uniq(explicit).slice(0, 5);
  }

  function extractActivities(text) {
    const lines = splitLines(text);
    const detected = lines.filter((line) =>
      activityMarkers.some((marker) => foldText(line).includes(marker)),
    );
    return uniq(detected).slice(0, 5);
  }

  function extractConcepts(text, keywords) {
    const lines = splitLines(text);
    const conceptLines = lines.filter((line) => {
      const folded = foldText(line);
      return (
        folded.startsWith("anlayÄ±ÅŸ") ||
        folded.startsWith("qayda") ||
        folded.startsWith("tÉ™rif") ||
        folded.startsWith("vacib") ||
        folded.startsWith("É™sas")
      );
    });

    if (conceptLines.length) {
      return uniq(conceptLines).slice(0, 5);
    }

    return uniq(
      keywords.slice(0, 5).map((keyword) => `${keyword} anlayÄ±ÅŸÄ± Ã¼zÉ™rindÉ™ dayanmaq`),
    );
  }

  function buildTeacherFill(primaryMode, smartboardMode) {
    const base = primaryMode
      ? ["Vizual material", "QÄ±sa izah", "Åžagird aktivliyi"]
      : ["Ä°zah vÉ™ nÃ¼munÉ™", "MÃ¼zakirÉ™ suallarÄ±", "TapÅŸÄ±rÄ±q vÉ™ yoxlama"];

    if (smartboardMode) {
      return uniq([...base, "Ä°ri vÉ™ aydÄ±n tÉ™qdimat elementlÉ™ri"]);
    }

    return base;
  }

  function buildSection(title, prompt, teacherFill, focus) {
    return {
      id: slugify(title) || `section-${Math.random().toString(36).slice(2, 8)}`,
      title,
      prompt,
      teacherFill: uniq(teacherFill),
      focus: uniq(focus).slice(0, 4),
    };
  }

  function mathLabel(topic) {
    const folded = foldText(topic);
    if (folded.includes("kÉ™sr")) {
      return "KÉ™srlÉ™r";
    }
    if (folded.includes("faiz")) {
      return "FaizlÉ™r";
    }
    if (folded.includes("ondalÄ±q")) {
      return "OndalÄ±q kÉ™srlÉ™r";
    }
    if (folded.includes("tÉ™nlik")) {
      return "TÉ™nliklÉ™r";
    }

    return normalizeText(topic) || "MÃ¶vzu";
  }

  function buildLanguageSections(primaryMode, topic, concepts, activities, teacherFill) {
    const focusPool = concepts.length ? concepts : [topic || "MÉ™tn Ã¼zÉ™rindÉ™ iÅŸ"];
    return [
      buildSection(
        "Motivasiya",
        "DÉ™rsi mÃ¶vzuya baÄŸlayan qÄ±sa danÄ±ÅŸÄ±q, ÅŸÉ™kil vÉ™ ya sual ilÉ™ baÅŸlamaq.",
        teacherFill,
        [topic || "MÃ¶vzuya giriÅŸ", ...activities],
      ),
      buildSection(
        "DinlÉ™yib anlama",
        "MÉ™tn vÉ™ ya audio ilÉ™ dinlÉ™mÉ™ tapÅŸÄ±rÄ±ÄŸÄ± qurmaq.",
        teacherFill,
        focusPool,
      ),
      buildSection(
        "Oxuyub anlama",
        "Oxu zamanÄ± É™sas fikri vÉ™ detallarÄ±n tutulmasÄ±na kÃ¶mÉ™k etmÉ™k.",
        teacherFill,
        focusPool,
      ),
      buildSection(
        primaryMode ? "SÃ¶z Ã¼zÉ™rindÉ™ iÅŸ" : "Dil qaydasÄ± vÉ™ sÃ¶z iÅŸi",
        "Yeni sÃ¶zlÉ™ri, ifadÉ™lÉ™ri vÉ™ dil vahidlÉ™rini vurÄŸulamaq.",
        teacherFill,
        concepts,
      ),
      buildSection(
        "TapÅŸÄ±rÄ±q",
        "MÉ™tnlÉ™ baÄŸlÄ± fÉ™rdi vÉ™ ya qrup tapÅŸÄ±rÄ±qlarÄ± yerlÉ™ÅŸdirmÉ™k.",
        teacherFill,
        activities,
      ),
      buildSection(
        "Refleksiya",
        "Sonda Ã¶zÃ¼nÃ¼qiymÉ™tlÉ™ndirmÉ™ vÉ™ qÄ±sa yekun suallarÄ± vermÉ™k.",
        teacherFill,
        ["Bu gÃ¼n nÉ™ Ã¶yrÉ™ndik?", "Ã‡É™tin olan hissÉ™ nÉ™ idi?"],
      ),
    ];
  }

  function buildMathSections(primaryMode, topic, keywords, activities, teacherFill) {
    const topicLabel = mathLabel(topic);
    return [
      buildSection(
        "Motivasiya",
        "GÃ¼ndÉ™lik hÉ™yatdan mÃ¶vzuya giriÅŸ edÉ™n qÄ±sa problem vÉ™ ya vizual nÃ¼munÉ™ seÃ§mÉ™k.",
        teacherFill,
        [topicLabel, ...keywords],
      ),
      buildSection(
        "MÃ¶vzunun izahÄ±",
        "Yeni qaydanÄ± mÉ™rhÉ™lÉ™li vÉ™ aydÄ±n formada gÃ¶stÉ™rmÉ™k.",
        teacherFill,
        [`${topicLabel} qaydasÄ±`, ...keywords],
      ),
      buildSection(
        primaryMode ? "NÃ¼munÉ™lÉ™r" : "Misallar vÉ™ nÃ¼munÉ™lÉ™r",
        "Æn azÄ± iki model nÃ¼munÉ™ ilÉ™ hÉ™ll yolunu gÃ¶stÉ™rmÉ™k.",
        teacherFill,
        keywords,
      ),
      buildSection(
        "Praktika",
        "ÅžagirdlÉ™rin hÉ™ll etmÉ™si Ã¼Ã§Ã¼n tapÅŸÄ±rÄ±qlar vÉ™ qrup iÅŸi yerlÉ™ÅŸdirmÉ™k.",
        teacherFill,
        activities,
      ),
      buildSection(
        primaryMode ? "Oyun" : "Yoxlama tapÅŸÄ±rÄ±ÄŸÄ±",
        primaryMode
          ? "MÃ¶vzuya uyÄŸun oyunvari fÉ™aliyyÉ™t vÉ™ ya yarÄ±ÅŸ hazÄ±rlamaq."
          : "Yoxlama Ã¼Ã§Ã¼n qÄ±sa mÃ¼stÉ™qil tapÅŸÄ±rÄ±q É™lavÉ™ etmÉ™k.",
        teacherFill,
        activities.length ? activities : ["SÃ¼rÉ™tli yoxlama", "CÃ¼tlÉ™rlÉ™ hÉ™ll"],
      ),
      buildSection(
        "Refleksiya",
        "Sonda qaydanÄ±n necÉ™ iÅŸlÉ™ndiyini qÄ±sa yekunla baÄŸlamaq.",
        teacherFill,
        ["BugÃ¼nkÃ¼ qayda", "Æn uÄŸurlu hÉ™ll Ã¼sulu"],
      ),
    ];
  }

  function buildForeignLanguageSections(primaryMode, keywords, activities, teacherFill) {
    const finalSectionTitle = primaryMode ? "Game" : "Practice";
    return [
      buildSection("Warm-up", "MÃ¶vzuya giriÅŸ Ã¼Ã§Ã¼n qÄ±sa danÄ±ÅŸÄ±q vÉ™ ya ÅŸÉ™kil fÉ™aliyyÉ™ti.", teacherFill, keywords),
      buildSection("Vocabulary", "Yeni sÃ¶zlÉ™ri vÉ™ ifadÉ™lÉ™ri sistemli ÅŸÉ™kildÉ™ tÉ™qdim etmÉ™k.", teacherFill, keywords),
      buildSection("Reading", "QÄ±sa mÉ™tn Ã¼zÉ™rindÉ™ baÅŸa dÃ¼ÅŸmÉ™ iÅŸi qurmaq.", teacherFill, activities),
      buildSection("Listening", "Audio vÉ™ ya mÃ¼É™llim oxusu ilÉ™ dinlÉ™mÉ™ tapÅŸÄ±rÄ±ÄŸÄ± vermÉ™k.", teacherFill, activities),
      buildSection("Speaking", "CÃ¼t vÉ™ ya qrup danÄ±ÅŸÄ±q fÉ™aliyyÉ™ti tÉ™ÅŸkil etmÉ™k.", teacherFill, activities),
      buildSection(
        finalSectionTitle,
        primaryMode
          ? "Oyuna É™saslanan tapÅŸÄ±rÄ±qla mÃ¶vzunu mÃ¶hkÉ™mlÉ™ndirmÉ™k."
          : "MÃ¶vzunu praktik tÉ™tbiq edÉ™n tapÅŸÄ±rÄ±qla dÉ™rsi toplamaq.",
        teacherFill,
        activities,
      ),
    ];
  }

  function buildScienceSections(primaryMode, topic, concepts, activities, teacherFill) {
    return [
      buildSection("Motivasiya", "MÃ¶vzuya aid maraqlÄ± fakt, ÅŸÉ™kil vÉ™ ya mÃ¼ÅŸahidÉ™ ilÉ™ baÅŸlamaq.", teacherFill, [topic]),
      buildSection("MÃ¶vzunun izahÄ±", "Æsas anlayÄ±ÅŸlarÄ± ardÄ±cÄ±l ÅŸÉ™kildÉ™ tÉ™qdim etmÉ™k.", teacherFill, concepts),
      buildSection(
        primaryMode ? "Vacib anlayÄ±ÅŸlar" : "Qayda vÉ™ É™sas anlayÄ±ÅŸlar",
        "TerminlÉ™ri vÉ™ É™laqÉ™lÉ™ri vizual ÅŸÉ™kildÉ™ gÃ¶stÉ™rmÉ™k.",
        teacherFill,
        concepts,
      ),
      buildSection(
        primaryMode ? "Praktik fÉ™aliyyÉ™t" : "TÉ™crÃ¼bÉ™ vÉ™ mÃ¼ÅŸahidÉ™",
        "MÃ¼ÅŸahidÉ™, tÉ™crÃ¼bÉ™ vÉ™ ya nÃ¼mayiÅŸ hissÉ™sini hazÄ±rlamaq.",
        teacherFill,
        activities,
      ),
      buildSection("TapÅŸÄ±rÄ±q", "MÃ¶vzu Ã¼zrÉ™ mÃ¶hkÉ™mlÉ™ndirmÉ™ tapÅŸÄ±rÄ±qlarÄ± yerlÉ™ÅŸdirmÉ™k.", teacherFill, activities),
      buildSection("Refleksiya", "Æsas nÉ™ticÉ™lÉ™ri ÅŸagirdlÉ™rlÉ™ birlikdÉ™ yekunlaÅŸdÄ±rmaq.", teacherFill, concepts),
    ];
  }

  function buildHistoryGeographySections(subject, concepts, activities, teacherFill) {
    const spatial = foldText(subject).includes("coÄŸrafiya");
    return [
      buildSection("Motivasiya", "ÅžÉ™kil, xÉ™ritÉ™, hadisÉ™ vÉ™ ya sual ilÉ™ mÃ¶vzuya giriÅŸ etmÉ™k.", teacherFill, concepts),
      buildSection("MÃ¶vzunun izahÄ±", "MÉ™lumatÄ± sÉ™bÉ™b-nÉ™ticÉ™ vÉ™ ya mÉ™kan É™laqÉ™si ilÉ™ tÉ™qdim etmÉ™k.", teacherFill, concepts),
      buildSection(
        spatial ? "XÉ™ritÉ™ vÉ™ mÉ™kanla iÅŸ" : "MÉ™nbÉ™ vÉ™ zaman xÉ™tti",
        spatial
          ? "XÉ™ritÉ™, sxem vÉ™ mÃ¼qayisÉ™ vasitÉ™silÉ™ mÉ™kan É™laqÉ™lÉ™rini gÃ¶stÉ™rmÉ™k."
          : "Tarixi mÉ™nbÉ™, tarixlÉ™r vÉ™ xronologiya ilÉ™ iÅŸlÉ™mÉ™k.",
        teacherFill,
        activities,
      ),
      buildSection("MÃ¼zakirÉ™", "ÅžagirdlÉ™rin sÉ™bÉ™b, nÉ™ticÉ™ vÉ™ mÃ¶vqe bildirmÉ™sini tÉ™ÅŸviq etmÉ™k.", teacherFill, activities),
      buildSection("TapÅŸÄ±rÄ±q", "MÃ¶vzu Ã¼zrÉ™ tÉ™tbiq vÉ™ araÅŸdÄ±rma tapÅŸÄ±rÄ±ÄŸÄ± qurmaq.", teacherFill, activities),
      buildSection("Refleksiya", "Yekun sual vÉ™ qÄ±sa Ã¶zÃ¼nÃ¼qiymÉ™tlÉ™ndirmÉ™ aparmaq.", teacherFill, concepts),
    ];
  }

  function buildArtSections(subject, primaryMode, teacherFill) {
    const music = foldText(subject).includes("musiqi");
    return [
      buildSection("Motivasiya", "DÉ™rsÉ™ qÄ±sa emosional giriÅŸ qurmaq.", teacherFill, [music ? "Ritm" : "Vizual diqqÉ™t"]),
      buildSection(
        music ? "DinlÉ™mÉ™ vÉ™ mÃ¼ÅŸahidÉ™" : "NÃ¼mayiÅŸ vÉ™ mÃ¼ÅŸahidÉ™",
        music
          ? "Musiqi nÃ¼munÉ™sini vÉ™ onun hissÉ™lÉ™rini dinlÉ™tmÉ™k."
          : "NÃ¼munÉ™ iÅŸ vÉ™ texnikanÄ± gÃ¶stÉ™rmÉ™k.",
        teacherFill,
        ["NÃ¼munÉ™", "MÃ¼ÅŸahidÉ™"],
      ),
      buildSection(
        music ? "Ä°zah vÉ™ ritm iÅŸi" : "Texnika vÉ™ izah",
        "Æsas Ã¼sullarÄ± vÉ™ qaydalarÄ± ÅŸagirdÉ™ aydÄ±nlaÅŸdÄ±rmaq.",
        teacherFill,
        ["Æsas texnika", "Ä°cra qaydasÄ±"],
      ),
      buildSection(
        primaryMode ? "YaradÄ±cÄ±lÄ±q vaxtÄ±" : "Praktik fÉ™aliyyÉ™t",
        "FÉ™rdi vÉ™ ya qrup iÅŸi Ã¼Ã§Ã¼n yaradÄ±cÄ± mÉ™kan vermÉ™k.",
        teacherFill,
        ["YaradÄ±cÄ± iÅŸ", "TÉ™qdimat"],
      ),
      buildSection("PaylaÅŸÄ±m", "Ä°ÅŸlÉ™rin nÃ¼mayiÅŸi vÉ™ qarÅŸÄ±lÄ±qlÄ± fikir bildirmÉ™ aparmaq.", teacherFill, ["TÉ™qdimat", "RÉ™y"]),
      buildSection("Refleksiya", "Yekunda nÉ™yin uÄŸurlu alÄ±ndÄ±ÄŸÄ±nÄ± toplamaq.", teacherFill, ["Ã–zÃ¼nÃ¼qiymÉ™tlÉ™ndirmÉ™"]),
    ];
  }

  function buildPeSections(primaryMode, teacherFill) {
    return [
      buildSection("Motivasiya", "DÉ™rsÉ™ qayda vÉ™ tÉ™hlÃ¼kÉ™sizlik xatÄ±rlatmasÄ± ilÉ™ baÅŸlamaq.", teacherFill, ["Ä°sinmÉ™", "Qayda"]),
      buildSection("Ä°sinmÉ™", "ÆzÉ™lÉ™lÉ™ri hazÄ±rlayan qÄ±sa isinmÉ™ mÉ™rhÉ™lÉ™si qurmaq.", teacherFill, ["Ä°sinmÉ™ hÉ™rÉ™kÉ™tlÉ™ri"]),
      buildSection("Texnika", "Æsas hÉ™rÉ™kÉ™t vÉ™ ya oyun texnikasÄ±nÄ± gÃ¶stÉ™rmÉ™k.", teacherFill, ["NÃ¼mayiÅŸ", "MÉ™rhÉ™lÉ™li izah"]),
      buildSection(
        primaryMode ? "Oyun vÉ™ hÉ™rÉ™kÉ™t" : "MÉ™ÅŸq vÉ™ tÉ™tbiq",
        "TÉ™tbiq vÉ™ komanda iÅŸi Ã¼Ã§Ã¼n geniÅŸ praktik hissÉ™ yaratmaq.",
        teacherFill,
        ["Praktika", "Komanda iÅŸi"],
      ),
      buildSection("Yoxlama", "BacarÄ±qlarÄ±n icrasÄ±nÄ± mÃ¼ÅŸahidÉ™ vÉ™ qÄ±sa yoxlama ilÉ™ qiymÉ™tlÉ™ndirmÉ™k.", teacherFill, ["MÃ¼ÅŸahidÉ™"]),
      buildSection("Refleksiya", "DÉ™rsi sakitlÉ™ÅŸmÉ™ vÉ™ qÄ±sa geribildirimlÉ™ baÄŸlamaq.", teacherFill, ["Geribildirim"]),
    ];
  }

  function buildDefaultSections(primaryMode, topic, concepts, activities, teacherFill) {
    return [
      buildSection("Motivasiya", "MÃ¶vzuya maraqlÄ± giriÅŸ vÉ™ É™vvÉ™lki biliklÉ™ri aktivlÉ™ÅŸdirmÉ™k.", teacherFill, [topic]),
      buildSection("MÃ¶vzunun izahÄ±", "Æsas mÉ™zmunu mÉ™rhÉ™lÉ™li ÅŸÉ™kildÉ™ tÉ™qdim etmÉ™k.", teacherFill, concepts),
      buildSection(
        primaryMode ? "Æsas anlayÄ±ÅŸlar" : "MÉ™tn vÉ™ É™sas anlayÄ±ÅŸlar",
        "Vacib terminlÉ™ri vÉ™ fikirlÉ™ri qruplaÅŸdÄ±rmaq.",
        teacherFill,
        concepts,
      ),
      buildSection("TapÅŸÄ±rÄ±q", "MÃ¶hkÉ™mlÉ™ndirmÉ™ vÉ™ tÉ™tbiq iÅŸi qurmaq.", teacherFill, activities),
      buildSection(
        primaryMode ? "Oyun vÉ™ aktivlik" : "MÃ¼zakirÉ™ vÉ™ yoxlama",
        "ÅžagirdlÉ™rin iÅŸtirakÄ± ilÉ™ mÃ¶vzunu canlÄ± saxlamaq.",
        teacherFill,
        activities,
      ),
      buildSection("Refleksiya", "DÉ™rs sonu yekun vÉ™ Ã¶zÃ¼nÃ¼qiymÉ™tlÉ™ndirmÉ™ aparmaq.", teacherFill, ["BugÃ¼nkÃ¼ nÉ™ticÉ™"]),
    ];
  }

  function generateSections({ subject, primaryMode, topic, keywords, concepts, activities, smartboardMode }) {
    const teacherFill = buildTeacherFill(primaryMode, smartboardMode);
    const foldedSubject = foldText(subject);

    if (foldedSubject === foldText("AzÉ™rbaycan dili")) {
      return buildLanguageSections(primaryMode, topic, concepts, activities, teacherFill);
    }

    if (foldedSubject === foldText("Riyaziyyat")) {
      return buildMathSections(primaryMode, topic, keywords, activities, teacherFill);
    }

    if (
      foldedSubject === foldText("Ä°ngilis dili") ||
      foldedSubject === foldText("Rus dili")
    ) {
      return buildForeignLanguageSections(primaryMode, keywords, activities, teacherFill);
    }

    if (
      ["biologiya", "kimya", "fizika", "informatika", "hÉ™yat bilgisi"].includes(foldedSubject)
    ) {
      return buildScienceSections(primaryMode, topic, concepts, activities, teacherFill);
    }

    if (foldedSubject === foldText("Tarix") || foldedSubject === foldText("CoÄŸrafiya")) {
      return buildHistoryGeographySections(subject, concepts, activities, teacherFill);
    }

    if (foldedSubject === foldText("Musiqi") || foldedSubject === foldText("TÉ™sviri incÉ™sÉ™nÉ™t")) {
      return buildArtSections(subject, primaryMode, teacherFill);
    }

    if (foldedSubject === foldText("Fiziki tÉ™rbiyÉ™")) {
      return buildPeSections(primaryMode, teacherFill);
    }

    return buildDefaultSections(primaryMode, topic, concepts, activities, teacherFill);
  }

  function buildSourceSummary(sourceType, keywords, concepts, activities) {
    if (sourceType === "none") {
      return "Struktur fÉ™nn, sinif vÉ™ mÃ¶vzuya É™sasÉ™n avtomatik quruldu.";
    }

    return `MÉ™nbÉ™dÉ™n ${keywords.length} aÃ§ar sÃ¶z, ${concepts.length} anlayÄ±ÅŸ vÉ™ ${activities.length} fÉ™aliyyÉ™t ipucu seÃ§ildi.`;
  }

  function buildLessonPlan(options) {
    const subject = getCanonicalSubject(options.subject);
    const grade = normalizeText(options.grade);
    const theme = getThemeMode(grade);
    const sourceText = normalizeSourceText(options.sourceText);
    const sourceType = normalizeText(options.sourceType) || (sourceText ? "text" : "none");
    const topic = detectTopicFromSource(sourceText, options.topic, subject);
    const lessonTitle = extractTitle(sourceText, subject, topic);
    const keywords = extractKeywords(sourceText, topic);
    const questions = extractQuestions(sourceText);
    const activities = extractActivities(sourceText);
    const concepts = extractConcepts(sourceText, keywords);
    const sections = generateSections({
      subject,
      primaryMode: theme.mode === "primary",
      topic,
      keywords,
      concepts,
      activities,
      smartboardMode: Boolean(options.smartboardMode),
    });

    return {
      subject,
      grade,
      gradeNumber: getGradeNumber(grade),
      topic,
      lessonTitle,
      theme,
      smartboardMode: Boolean(options.smartboardMode),
      sourceType,
      sourceLabel: normalizeText(options.sourceLabel) || "FÉ™nn vÉ™ mÃ¶vzu É™saslÄ± avtomatik quruluÅŸ",
      sourceSummary: buildSourceSummary(sourceType, keywords, concepts, activities),
      excerpt: splitLines(sourceText).slice(0, 4).join(" "),
      keywords,
      concepts,
      questions,
      activities,
      sections,
    };
  }

  return {
    curriculumSubjects,
    normalizeText,
    normalizeSourceText,
    foldText,
    slugify,
    getCanonicalSubject,
    getGradeNumber,
    getThemeMode,
    buildLessonPlan,
  };
});

