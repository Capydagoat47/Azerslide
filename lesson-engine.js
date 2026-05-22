(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.KNSLessonEngine = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createLessonEngine() {
  const curriculumSubjects = [
    "Az\u0259rbaycan dili",
    "Riyaziyyat",
    "H\u0259yat bilgisi",
    "\u0130ngilis dili",
    "Rus dili",
    "\u0130nformatika",
    "Musiqi",
    "T\u0259sviri inc\u0259s\u0259n\u0259t",
    "Fiziki t\u0259rbiy\u0259",
    "Tarix",
    "Co\u011frafiya",
    "Biologiya",
    "Kimya",
    "Fizika",
  ];

  const topicMarkers = ["m\u00f6vzu", "tema", "topic", "lesson", "d\u0259rs", "chapter", "b\u00f6lm\u0259"];
  const activityMarkers = [
    "tap\u015f\u0131r\u0131q",
    "m\u00fczakir\u0259",
    "oyun",
    "f\u0259aliyy\u0259t",
    "activity",
    "exercise",
    "practice",
    "sual",
    "problem",
    "m\u00fc\u015fahid\u0259",
    "t\u0259cr\u00fcb\u0259",
  ];

  const stopwords = new Set([
    "v\u0259",
    "il\u0259",
    "\u00fc\u00e7\u00fcn",
    "olan",
    "olanlar",
    "h\u0259m",
    "bu",
    "bir",
    "iki",
    "\u00fc\u00e7",
    "d\u00f6rd",
    "be\u015f",
    "kimi",
    "daha",
    "\u00e7ox",
    "az",
    "ya",
    "v\u0259ya",
    "sonra",
    "\u0259g\u0259r",
    "is\u0259",
    "the",
    "and",
    "for",
    "from",
    "your",
    "that",
    "have",
    "will",
    "lesson",
    "m\u00f6vzu",
    "tema",
    "d\u0259rs",
    "sinif",
    "s\u0259hif\u0259",
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
    return normalizeSourceText(value)
      .split(/\n+/)
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
        label: "\ud83c\udfa8 Dizayn: ?btidai sinif rejimi",
        shortLabel: "?btidai sinif rejimi",
        description: "1-4-c? sinifl?r ???n daha r?ngli, iri v? canl? t?qdimat g?r?n???.",
      };
    }

    return {
      mode: "academic",
      label: "\ud83c\udfa8 Dizayn: Akademik rejim",
      shortLabel: "Akademik rejim",
      description: "5-11-ci sinifl?r ???n daha s?liq?li, m?asir v? fokuslu t?qdimat g?r?n???.",
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

    const normalizedFallback = normalizeText(fallbackTopic);
    if (normalizedFallback) {
      return normalizedFallback;
    }

    const lines = splitLines(text);
    const candidate = lines.find((line) => {
      if (line.length < 6 || line.length > 90) {
        return false;
      }

      const folded = foldText(line);
      return !folded.includes(foldText(subject)) && !/^\d+$/.test(line);
    });

    return candidate || "";
  }

  function extractTitle(text, subject, topic) {
    const explicitTitle = detectLessonLine(text);
    if (explicitTitle) {
      return explicitTitle;
    }

    if (normalizeText(topic)) {
      return `${subject} - ${normalizeText(topic)}`;
    }

    const lines = splitLines(text);
    const firstUseful = lines.find((line) => line.length >= 8 && line.length <= 100);
    return firstUseful || `${subject} d\u0259rsi`;
  }

  function tokenize(text) {
    return foldText(text)
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .map((word) => normalizeText(word))
      .filter((word) => word.length >= 3 && !stopwords.has(word));
  }

  function capitalizeWord(word) {
    const normalized = normalizeText(word);
    return normalized ? normalized.charAt(0).toLocaleUpperCase("az") + normalized.slice(1) : "";
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
    return uniq([...topicWords.map(capitalizeWord), ...ranked.map(capitalizeWord)]).slice(0, 8);
  }

  function extractQuestions(text) {
    const lines = splitLines(text);
    const explicit = lines.filter(
      (line) => line.includes("?") || /^(sual|question)\b/i.test(line) || /^\d+\./.test(line),
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
        folded.startsWith("anlay\u0131\u015f") ||
        folded.startsWith("qayda") ||
        folded.startsWith("t\u0259rif") ||
        folded.startsWith("vacib") ||
        folded.startsWith("\u0259sas")
      );
    });

    if (conceptLines.length) {
      return uniq(conceptLines).slice(0, 5);
    }

    return uniq(
      keywords.slice(0, 5).map((keyword) => `${keyword} anlay\u0131\u015f\u0131 \u00fcz\u0259rind\u0259 dayanmaq`),
    );
  }

  function buildTeacherFill(primaryMode, smartboardMode) {
    const base = primaryMode
      ? ["Vizual material", "Q\u0131sa izah", "\u015eagird aktivliyi"]
      : ["\u0130zah v\u0259 n\u00fcmun\u0259", "M\u00fczakir\u0259 suallar\u0131", "Tap\u015f\u0131r\u0131q v\u0259 yoxlama"];

    if (smartboardMode) {
      return uniq([...base, "\u0130ri v\u0259 ayd\u0131n t\u0259qdimat elementl\u0259ri"]);
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
    if (folded.includes("k\u0259sr")) {
      return "K\u0259srl\u0259r";
    }
    if (folded.includes("faiz")) {
      return "Faizl\u0259r";
    }
    if (folded.includes("ondal\u0131q")) {
      return "Ondal\u0131q k\u0259srl\u0259r";
    }
    if (folded.includes("t\u0259nlik")) {
      return "T\u0259nlikl\u0259r";
    }

    return normalizeText(topic) || "M\u00f6vzu";
  }

  function buildLanguageSections(primaryMode, topic, concepts, activities, teacherFill) {
    const focusPool = concepts.length ? concepts : [topic || "M\u0259tn \u00fcz\u0259rind\u0259 i\u015f"];

    return [
      buildSection(
        "Motivasiya",
        "D\u0259rsi m\u00f6vzuya ba\u011flayan q\u0131sa dan\u0131\u015f\u0131q, \u015f\u0259kil v\u0259 ya sual il\u0259 ba\u015flamaq.",
        teacherFill,
        [topic || "M\u00f6vzuya giri\u015f", ...activities],
      ),
      buildSection(
        "Dinl\u0259yib anlama",
        "M\u0259tn v\u0259 ya audio il\u0259 dinl\u0259m\u0259 tap\u015f\u0131r\u0131\u011f\u0131 qurmaq.",
        teacherFill,
        focusPool,
      ),
      buildSection(
        "Oxuyub anlama",
        "Oxu zaman\u0131 \u0259sas fikri v\u0259 detallar\u0131n tutulmas\u0131na k\u00f6m\u0259k etm\u0259k.",
        teacherFill,
        focusPool,
      ),
      buildSection(
        primaryMode ? "S\u00f6z \u00fcz\u0259rind\u0259 i\u015f" : "Dil qaydas\u0131 v\u0259 s\u00f6z i\u015fi",
        "Yeni s\u00f6zl\u0259ri, ifad\u0259l\u0259ri v\u0259 dil vahidl\u0259rini vur\u011fulamaq.",
        teacherFill,
        concepts,
      ),
      buildSection(
        "Tap\u015f\u0131r\u0131q",
        "M\u0259tnl\u0259 ba\u011fl\u0131 f\u0259rdi v\u0259 ya qrup tap\u015f\u0131r\u0131qlar\u0131 yerl\u0259\u015fdirm\u0259k.",
        teacherFill,
        activities,
      ),
      buildSection(
        "Refleksiya",
        "Sonda \u00f6z\u00fcn\u00fcqiym\u0259tl\u0259ndirm\u0259 v\u0259 q\u0131sa yekun suallar\u0131 verm\u0259k.",
        teacherFill,
        ["Bu g\u00fcn n\u0259 \u00f6yr\u0259ndik?", "\u00c7\u0259tin olan hiss\u0259 n\u0259 idi?"],
      ),
    ];
  }

  function buildMathSections(primaryMode, topic, keywords, activities, teacherFill) {
    const topicLabel = mathLabel(topic);

    return [
      buildSection(
        "Motivasiya",
        "G\u00fcnd\u0259lik h\u0259yatdan m\u00f6vzuya giri\u015f ed\u0259n q\u0131sa problem v\u0259 ya vizual n\u00fcmun\u0259 se\u00e7m\u0259k.",
        teacherFill,
        [topicLabel, ...keywords],
      ),
      buildSection(
        "M\u00f6vzunun izah\u0131",
        "Yeni qaydan\u0131 m\u0259rh\u0259l\u0259li v\u0259 ayd\u0131n formada g\u00f6st\u0259rm\u0259k.",
        teacherFill,
        [`${topicLabel} qaydas\u0131`, ...keywords],
      ),
      buildSection(
        primaryMode ? "N\u00fcmun\u0259l\u0259r" : "Misallar v\u0259 n\u00fcmun\u0259l\u0259r",
        "\u018fn az\u0131 iki model n\u00fcmun\u0259 il\u0259 h\u0259ll yolunu g\u00f6st\u0259rm\u0259k.",
        teacherFill,
        keywords,
      ),
      buildSection(
        "Praktika",
        "\u015eagirdl\u0259rin h\u0259ll etm\u0259si \u00fc\u00e7\u00fcn tap\u015f\u0131r\u0131qlar v\u0259 qrup i\u015fi yerl\u0259\u015fdirm\u0259k.",
        teacherFill,
        activities,
      ),
      buildSection(
        primaryMode ? "Oyun" : "Yoxlama tap\u015f\u0131r\u0131\u011f\u0131",
        primaryMode
          ? "M\u00f6vzuya uy\u011fun oyunvari f\u0259aliyy\u0259t v\u0259 ya yar\u0131\u015f haz\u0131rlamaq."
          : "Yoxlama \u00fc\u00e7\u00fcn q\u0131sa m\u00fcst\u0259qil tap\u015f\u0131r\u0131q \u0259lav\u0259 etm\u0259k.",
        teacherFill,
        activities.length ? activities : ["S\u00fcr\u0259tli yoxlama", "C\u00fctl\u0259rl\u0259 h\u0259ll"],
      ),
      buildSection(
        "Refleksiya",
        "Sonda qaydan\u0131n nec\u0259 i\u015fl\u0259ndiyini q\u0131sa yekunla ba\u011flamaq.",
        teacherFill,
        ["Bug\u00fcnk\u00fc qayda", "\u018fn u\u011furlu h\u0259ll \u00fcsulu"],
      ),
    ];
  }

  function buildForeignLanguageSections(primaryMode, keywords, activities, teacherFill) {
    const finalSectionTitle = primaryMode ? "Oyun" : "M??q";

    return [
      buildSection("M?vzuya giri?", "M?vzuya giri? ???n q?sa dan???q v? ya ??kil f?aliyy?ti.", teacherFill, keywords),
      buildSection("S?z ehtiyat?", "Yeni s?zl?ri v? ifad?l?ri sistemli ??kild? t?qdim etm?k.", teacherFill, keywords),
      buildSection("Oxu", "Q?sa m?tn ?z?rind? ba?a d??m? i?i qurmaq.", teacherFill, activities),
      buildSection("Dinl?m?", "Audio v? ya m??llim oxusu il? dinl?m? tap??r??? verm?k.", teacherFill, activities),
      buildSection("Dan???q", "C?t v? ya qrup dan???q f?aliyy?ti t??kil etm?k.", teacherFill, activities),
      buildSection(
        finalSectionTitle,
        primaryMode
          ? "Oyuna \u0259saslanan tap\u015f\u0131r\u0131qla m\u00f6vzunu m\u00f6hk\u0259ml\u0259ndirm\u0259k."
          : "M\u00f6vzunu praktik t\u0259tbiq ed\u0259n tap\u015f\u0131r\u0131qla d\u0259rsi toplamaq.",
        teacherFill,
        activities,
      ),
    ];
  }

  function buildScienceSections(primaryMode, topic, concepts, activities, teacherFill) {
    return [
      buildSection("Motivasiya", "M\u00f6vzuya aid maraql\u0131 fakt, \u015f\u0259kil v\u0259 ya m\u00fc\u015fahid\u0259 il\u0259 ba\u015flamaq.", teacherFill, [topic]),
      buildSection("M\u00f6vzunun izah\u0131", "\u018fsas anlay\u0131\u015flar\u0131 ard\u0131c\u0131l \u015f\u0259kild\u0259 t\u0259qdim etm\u0259k.", teacherFill, concepts),
      buildSection(
        primaryMode ? "Vacib anlay\u0131\u015flar" : "Qayda v\u0259 \u0259sas anlay\u0131\u015flar",
        "Terminl\u0259ri v\u0259 \u0259laq\u0259l\u0259ri vizual \u015f\u0259kild\u0259 g\u00f6st\u0259rm\u0259k.",
        teacherFill,
        concepts,
      ),
      buildSection(
        primaryMode ? "Praktik f\u0259aliyy\u0259t" : "T\u0259cr\u00fcb\u0259 v\u0259 m\u00fc\u015fahid\u0259",
        "M\u00fc\u015fahid\u0259, t\u0259cr\u00fcb\u0259 v\u0259 ya n\u00fcmayi\u015f hiss\u0259sini haz\u0131rlamaq.",
        teacherFill,
        activities,
      ),
      buildSection("Tap\u015f\u0131r\u0131q", "M\u00f6vzu \u00fczr\u0259 m\u00f6hk\u0259ml\u0259ndirm\u0259 tap\u015f\u0131r\u0131qlar\u0131 yerl\u0259\u015fdirm\u0259k.", teacherFill, activities),
      buildSection("Refleksiya", "\u018fsas n\u0259tic\u0259l\u0259ri \u015fagirdl\u0259rl\u0259 birlikd\u0259 yekunla\u015fd\u0131rmaq.", teacherFill, concepts),
    ];
  }

  function buildHistoryGeographySections(subject, concepts, activities, teacherFill) {
    const spatial = foldText(subject).includes(foldText("Co\u011frafiya"));

    return [
      buildSection("Motivasiya", "\u015e\u0259kil, x\u0259rit\u0259, hadis\u0259 v\u0259 ya sual il\u0259 m\u00f6vzuya giri\u015f etm\u0259k.", teacherFill, concepts),
      buildSection("M\u00f6vzunun izah\u0131", "M\u0259lumat\u0131 s\u0259b\u0259b-n\u0259tic\u0259 v\u0259 ya m\u0259kan \u0259laq\u0259si il\u0259 t\u0259qdim etm\u0259k.", teacherFill, concepts),
      buildSection(
        spatial ? "X\u0259rit\u0259 v\u0259 m\u0259kanla i\u015f" : "M\u0259nb\u0259 v\u0259 zaman x\u0259tti",
        spatial
          ? "X\u0259rit\u0259, sxem v\u0259 m\u00fcqayis\u0259 vasit\u0259sil\u0259 m\u0259kan \u0259laq\u0259l\u0259rini g\u00f6st\u0259rm\u0259k."
          : "Tarixi m\u0259nb\u0259, tarixl\u0259r v\u0259 xronologiya il\u0259 i\u015fl\u0259m\u0259k.",
        teacherFill,
        activities,
      ),
      buildSection("M\u00fczakir\u0259", "\u015eagirdl\u0259rin s\u0259b\u0259b, n\u0259tic\u0259 v\u0259 m\u00f6vqe bildirm\u0259sini t\u0259\u015fviq etm\u0259k.", teacherFill, activities),
      buildSection("Tap\u015f\u0131r\u0131q", "M\u00f6vzu \u00fczr\u0259 t\u0259tbiq v\u0259 ara\u015fd\u0131rma tap\u015f\u0131r\u0131\u011f\u0131 qurmaq.", teacherFill, activities),
      buildSection("Refleksiya", "Yekun sual v\u0259 q\u0131sa \u00f6z\u00fcn\u00fcqiym\u0259tl\u0259ndirm\u0259 aparmaq.", teacherFill, concepts),
    ];
  }

  function buildArtSections(subject, primaryMode, teacherFill) {
    const music = foldText(subject).includes(foldText("Musiqi"));

    return [
      buildSection("Motivasiya", "D\u0259rs\u0259 q\u0131sa emosional giri\u015f qurmaq.", teacherFill, [music ? "Ritm" : "Vizual diqq\u0259t"]),
      buildSection(
        music ? "Dinl\u0259m\u0259 v\u0259 m\u00fc\u015fahid\u0259" : "N\u00fcmayi\u015f v\u0259 m\u00fc\u015fahid\u0259",
        music ? "Musiqi n\u00fcmun\u0259sini v\u0259 onun hiss\u0259l\u0259rini dinl\u0259tm\u0259k." : "N\u00fcmun\u0259 i\u015f v\u0259 texnikan\u0131 g\u00f6st\u0259rm\u0259k.",
        teacherFill,
        ["N\u00fcmun\u0259", "M\u00fc\u015fahid\u0259"],
      ),
      buildSection(
        music ? "\u0130zah v\u0259 ritm i\u015fi" : "Texnika v\u0259 izah",
        "\u018fsas \u00fcsullar\u0131 v\u0259 qaydalar\u0131 \u015fagird\u0259 ayd\u0131nla\u015fd\u0131rmaq.",
        teacherFill,
        ["\u018fsas texnika", "\u0130cra qaydas\u0131"],
      ),
      buildSection(
        primaryMode ? "Yarad\u0131c\u0131l\u0131q vaxt\u0131" : "Praktik f\u0259aliyy\u0259t",
        "F\u0259rdi v\u0259 ya qrup i\u015fi \u00fc\u00e7\u00fcn yarad\u0131c\u0131 m\u0259kan verm\u0259k.",
        teacherFill,
        ["Yarad\u0131c\u0131 i\u015f", "T\u0259qdimat"],
      ),
      buildSection("Payla\u015f\u0131m", "\u0130\u015fl\u0259rin n\u00fcmayi\u015fi v\u0259 qar\u015f\u0131l\u0131ql\u0131 fikir bildirm\u0259 aparmaq.", teacherFill, ["T\u0259qdimat", "R\u0259y"]),
      buildSection("Refleksiya", "Yekunda n\u0259yin u\u011furlu al\u0131nd\u0131\u011f\u0131n\u0131 toplamaq.", teacherFill, ["\u00d6z\u00fcn\u00fcqiym\u0259tl\u0259ndirm\u0259"]),
    ];
  }

  function buildPeSections(primaryMode, teacherFill) {
    return [
      buildSection("Motivasiya", "D\u0259rs\u0259 qayda v\u0259 t\u0259hl\u00fck\u0259sizlik xat\u0131rlatmas\u0131 il\u0259 ba\u015flamaq.", teacherFill, ["\u0130sinm\u0259", "Qayda"]),
      buildSection("\u0130sinm\u0259", "\u018fz\u0259l\u0259l\u0259ri haz\u0131rlayan q\u0131sa isinm\u0259 m\u0259rh\u0259l\u0259si qurmaq.", teacherFill, ["\u0130sinm\u0259 h\u0259r\u0259k\u0259tl\u0259ri"]),
      buildSection("Texnika", "\u018fsas h\u0259r\u0259k\u0259t v\u0259 ya oyun texnikas\u0131n\u0131 g\u00f6st\u0259rm\u0259k.", teacherFill, ["N\u00fcmayi\u015f", "M\u0259rh\u0259l\u0259li izah"]),
      buildSection(
        primaryMode ? "Oyun v\u0259 h\u0259r\u0259k\u0259t" : "M\u0259\u015fq v\u0259 t\u0259tbiq",
        "T\u0259tbiq v\u0259 komanda i\u015fi \u00fc\u00e7\u00fcn geni\u015f praktik hiss\u0259 yaratmaq.",
        teacherFill,
        ["Praktika", "Komanda i\u015fi"],
      ),
      buildSection("Yoxlama", "Bacar\u0131qlar\u0131n icras\u0131n\u0131 m\u00fc\u015fahid\u0259 v\u0259 q\u0131sa yoxlama il\u0259 qiym\u0259tl\u0259ndirm\u0259k.", teacherFill, ["M\u00fc\u015fahid\u0259"]),
      buildSection("Refleksiya", "D\u0259rsi sakitl\u0259\u015fm\u0259 v\u0259 q\u0131sa geribildiriml\u0259 ba\u011flamaq.", teacherFill, ["Geribildirim"]),
    ];
  }

  function buildDefaultSections(primaryMode, topic, concepts, activities, teacherFill) {
    return [
      buildSection("Motivasiya", "M\u00f6vzuya maraql\u0131 giri\u015f v\u0259 \u0259vv\u0259lki bilikl\u0259ri aktivl\u0259\u015fdirm\u0259k.", teacherFill, [topic]),
      buildSection("M\u00f6vzunun izah\u0131", "\u018fsas m\u0259zmunu m\u0259rh\u0259l\u0259li \u015f\u0259kild\u0259 t\u0259qdim etm\u0259k.", teacherFill, concepts),
      buildSection(
        primaryMode ? "\u018fsas anlay\u0131\u015flar" : "M\u0259tn v\u0259 \u0259sas anlay\u0131\u015flar",
        "Vacib terminl\u0259ri v\u0259 fikirl\u0259ri qrupla\u015fd\u0131rmaq.",
        teacherFill,
        concepts,
      ),
      buildSection("Tap\u015f\u0131r\u0131q", "M\u00f6hk\u0259ml\u0259ndirm\u0259 v\u0259 t\u0259tbiq i\u015fi qurmaq.", teacherFill, activities),
      buildSection(
        primaryMode ? "Oyun v\u0259 aktivlik" : "M\u00fczakir\u0259 v\u0259 yoxlama",
        "\u015eagirdl\u0259rin i\u015ftirak\u0131 il\u0259 m\u00f6vzunu canl\u0131 saxlamaq.",
        teacherFill,
        activities,
      ),
      buildSection("Refleksiya", "D\u0259rs sonu yekun v\u0259 \u00f6z\u00fcn\u00fcqiym\u0259tl\u0259ndirm\u0259 aparmaq.", teacherFill, ["Bug\u00fcnk\u00fc n\u0259tic\u0259"]),
    ];
  }

  function generateSections(input) {
    const teacherFill = buildTeacherFill(input.primaryMode, input.smartboardMode);
    const foldedSubject = foldText(input.subject);

    if (foldedSubject === foldText("Az\u0259rbaycan dili")) {
      return buildLanguageSections(input.primaryMode, input.topic, input.concepts, input.activities, teacherFill);
    }

    if (foldedSubject === foldText("Riyaziyyat")) {
      return buildMathSections(input.primaryMode, input.topic, input.keywords, input.activities, teacherFill);
    }

    if (foldedSubject === foldText("\u0130ngilis dili") || foldedSubject === foldText("Rus dili")) {
      return buildForeignLanguageSections(input.primaryMode, input.keywords, input.activities, teacherFill);
    }

    if ([foldText("Biologiya"), foldText("Kimya"), foldText("Fizika"), foldText("\u0130nformatika"), foldText("H\u0259yat bilgisi")].includes(foldedSubject)) {
      return buildScienceSections(input.primaryMode, input.topic, input.concepts, input.activities, teacherFill);
    }

    if (foldedSubject === foldText("Tarix") || foldedSubject === foldText("Co\u011frafiya")) {
      return buildHistoryGeographySections(input.subject, input.concepts, input.activities, teacherFill);
    }

    if (foldedSubject === foldText("Musiqi") || foldedSubject === foldText("T\u0259sviri inc\u0259s\u0259n\u0259t")) {
      return buildArtSections(input.subject, input.primaryMode, teacherFill);
    }

    if (foldedSubject === foldText("Fiziki t\u0259rbiy\u0259")) {
      return buildPeSections(input.primaryMode, teacherFill);
    }

    return buildDefaultSections(input.primaryMode, input.topic, input.concepts, input.activities, teacherFill);
  }

  function buildSourceSummary(sourceType, keywords, concepts, activities) {
    if (sourceType === "none") {
      return "Struktur f\u0259nn, sinif v\u0259 m\u00f6vzuya \u0259sas\u0259n avtomatik quruldu.";
    }

    return `M\u0259nb\u0259d\u0259n ${keywords.length} a\u00e7ar s\u00f6z, ${concepts.length} anlay\u0131\u015f v\u0259 ${activities.length} f\u0259aliyy\u0259t ipucu se\u00e7ildi.`;
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
      sourceLabel: normalizeText(options.sourceLabel) || "F\u0259nn v\u0259 m\u00f6vzu \u0259sasl\u0131 avtomatik qurulu\u015f",
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
