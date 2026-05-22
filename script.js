const engine = window.KNSLessonEngine;

if (!engine) {
  throw new Error("KNSLessonEngine yüklənmədi.");
}

const form = document.querySelector("#planner-form");
const subjectInput = document.querySelector("#subject-input");
const gradeInput = document.querySelector("#grade-input");
const topicInput = document.querySelector("#topic-input");
const dailyPlanInput = document.querySelector("#daily-plan-input");
const resourceUrlInput = document.querySelector("#resource-url-input");
const pdfInput = document.querySelector("#pdf-input");
const sourceTextInput = document.querySelector("#source-text-input");
const smartboardToggle = document.querySelector("#smartboard-toggle");
const previewButton = document.querySelector("#preview-button");
const downloadButton = document.querySelector("#download-button");
const resetButton = document.querySelector("#reset-button");
const formMessage = document.querySelector("#form-message");
const resourceHint = document.querySelector("#resource-hint");
const themeIndicator = document.querySelector("#theme-indicator");
const smartboardIndicator = document.querySelector("#smartboard-indicator");
const emptyState = document.querySelector("#empty-state");
const resultArea = document.querySelector("#result-area");
const resultSubject = document.querySelector("#result-subject");
const resultGrade = document.querySelector("#result-grade");
const resultTopic = document.querySelector("#result-topic");
const lessonTitle = document.querySelector("#lesson-title");
const sourceSummary = document.querySelector("#source-summary");
const sourceLabel = document.querySelector("#source-label");
const slidePlan = document.querySelector("#slide-plan");
const keywordList = document.querySelector("#keyword-list");
const conceptList = document.querySelector("#concept-list");
const activityList = document.querySelector("#activity-list");
const questionList = document.querySelector("#question-list");
const previewThemeBadge = document.querySelector("#preview-theme-badge");
const previewSmartboardBadge = document.querySelector("#preview-smartboard-badge");

const plannerState = {
  plan: null,
};

let pdfJsPromise = null;

function normalizeText(value) {
  return engine.normalizeText(value);
}

function normalizeSourceInput(value) {
  return engine.normalizeSourceText
    ? engine.normalizeSourceText(value)
    : String(value || "").replace(/\r\n/g, "\n").trim();
}

function slugify(value) {
  return engine.slugify(value);
}

function setMessage(message = "", tone = "info") {
  formMessage.textContent = message;
  if (!message || tone === "info") {
    delete formMessage.dataset.tone;
    return;
  }
  formMessage.dataset.tone = tone;
}

function getSelectedTheme() {
  return engine.getThemeMode(gradeInput.value || "5-ci sinif");
}

function updateThemeIndicator() {
  const theme = getSelectedTheme();
  themeIndicator.textContent = theme.label;
  previewThemeBadge.textContent = theme.label;
}

function updateSmartboardIndicator() {
  const isEnabled = smartboardToggle.checked;
  const label = isEnabled ? "🖥 Smart lövhə: aktiv" : "🖥 Smart lövhə: deaktiv";
  smartboardIndicator.textContent = label;
  previewSmartboardBadge.textContent = label;
}

function updateResourceHint() {
  const parts = [];

  if (dailyPlanInput.files && dailyPlanInput.files[0]) {
    parts.push("günlük dərs faylı seçilib");
  }

  if (resourceUrlInput.value.trim()) {
    parts.push("TRIMS linki əlavə edilib");
  }

  if (pdfInput.files && pdfInput.files[0]) {
    parts.push("dərslik faylı seçilib");
  }

  if (sourceTextInput.value.trim()) {
    parts.push("mətn əlavə edilib");
  }

  if (!parts.length) {
    resourceHint.textContent =
      "Günlük dərs, TRIMS və dərslik mənbələri birlikdə istifadə oluna bilər. Fayl üçün PDF, DOCX və TXT dəstəklənir.";
    return;
  }

  resourceHint.textContent = `Hazırkı mənbələr: ${parts.join(", ")}. Bütün bu məlumatlar birlikdə analiz olunacaq.`;
}

function createInfoListItem(text) {
  const item = document.createElement("li");
  item.textContent = text;
  return item;
}

function renderList(target, values, fallbackText) {
  target.innerHTML = "";
  const items = values.length ? values : [fallbackText];
  items.forEach((value) => target.appendChild(createInfoListItem(value)));
}

function renderKeywords(values) {
  keywordList.innerHTML = "";
  const items = values.length ? values : ["Açar sözlər plan qurulduqdan sonra görünəcək."];

  items.forEach((value) => {
    const chip = document.createElement("span");
    chip.className = "keyword-chip";
    chip.textContent = value;
    keywordList.appendChild(chip);
  });
}

function createChipRow(values, accent = false) {
  const row = document.createElement("div");
  row.className = "slide-card__chips";

  values.forEach((value) => {
    const chip = document.createElement("span");
    chip.className = accent ? "slide-chip slide-chip--outline" : "slide-chip";
    chip.textContent = value;
    row.appendChild(chip);
  });

  return row;
}

function createSlideCard(title, subtitle, chips, secondaryChips) {
  const card = document.createElement("article");
  card.className = "slide-card";

  const meta = document.createElement("div");
  meta.className = "slide-card__meta";

  const titleNode = document.createElement("strong");
  titleNode.textContent = title;
  meta.appendChild(titleNode);

  if (subtitle) {
    const subtitleNode = document.createElement("span");
    subtitleNode.textContent = subtitle;
    meta.appendChild(subtitleNode);
  }

  card.appendChild(meta);

  if (chips && chips.length) {
    card.appendChild(createChipRow(chips));
  }

  if (secondaryChips && secondaryChips.length) {
    card.appendChild(createChipRow(secondaryChips, true));
  }

  return card;
}

function renderSlidePlan(plan) {
  slidePlan.innerHTML = "";

  slidePlan.appendChild(
    createSlideCard(
      "SLAYD 1 — Başlıq",
      "Dərsin adı, fənn, sinif və mövzu",
      [plan.subject, plan.grade],
      plan.topic ? [plan.topic] : [],
    ),
  );

  slidePlan.appendChild(
    createSlideCard(
      "SLAYD 2 — Dərsin planı",
      "Təqdimatda istifadə olunacaq hissələrin ümumi görünüşü",
      plan.sections.map((section) => section.title),
      plan.smartboardMode ? ["Smart lövhə üçün iri görünüş"] : [],
    ),
  );

  plan.sections.forEach((section, index) => {
    slidePlan.appendChild(
      createSlideCard(
        `SLAYD ${index + 3} — ${section.title}`,
        section.prompt,
        section.focus,
        section.teacherFill,
      ),
    );
  });
}

function renderPreview(plan) {
  plannerState.plan = plan;
  emptyState.classList.add("hidden");
  resultArea.classList.remove("hidden");

  resultSubject.textContent = plan.subject;
  resultGrade.textContent = plan.grade;
  resultTopic.textContent = plan.topic || "Avtomatik mövzu axını";
  lessonTitle.textContent = plan.lessonTitle;
  sourceSummary.textContent = plan.sourceSummary;
  sourceLabel.textContent = `Mənbə: ${plan.sourceLabel}`;
  previewThemeBadge.textContent = plan.theme.label;
  previewSmartboardBadge.textContent = plan.smartboardMode
    ? "🖥 Smart lövhə: aktiv"
    : "🖥 Smart lövhə: deaktiv";

  renderSlidePlan(plan);
  renderKeywords(plan.keywords);
  renderList(conceptList, plan.concepts, "Əsas anlayışlar mövzuya əsasən qurulacaq.");
  renderList(activityList, plan.activities, "Fəaliyyət hissəsi fənnə uyğun avtomatik hazırlanacaq.");
  renderList(questionList, plan.questions, "Sual istiqamətləri mövzuya uyğun müəllim tərəfindən doldurulacaq.");

  downloadButton.disabled = false;
}

async function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs").then(
      (pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc =
          "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";
        return pdfjs;
      },
    );
  }

  return pdfJsPromise;
}

async function extractTextFromPdf(file) {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const documentRef = await pdfjs.getDocument({ data: buffer }).promise;
  const pageTexts = [];

  for (let pageNumber = 1; pageNumber <= documentRef.numPages; pageNumber += 1) {
    const page = await documentRef.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    pageTexts.push(normalizeSourceInput(pageText));
  }

  return {
    sourceText: pageTexts.join("\n\n"),
    sourceLabel: `${file.name} (${documentRef.numPages} səhifə)`,
    sourceType: "pdf",
  };
}

async function extractTextFromDocx(file) {
  if (!window.mammoth || typeof window.mammoth.extractRawText !== "function") {
    throw new Error("DOCX oxuyucu yüklənmədi.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });

  return {
    sourceText: normalizeSourceInput(result.value || ""),
    sourceLabel: file.name,
    sourceType: "docx",
  };
}

async function extractTextFromPlainFile(file) {
  const text = await file.text();
  return {
    sourceText: normalizeSourceInput(text),
    sourceLabel: file.name,
    sourceType: "text",
  };
}

async function extractTextFromSupportedFile(file) {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".pdf")) {
    return extractTextFromPdf(file);
  }

  if (lowerName.endsWith(".docx")) {
    return extractTextFromDocx(file);
  }

  if (lowerName.endsWith(".txt") || lowerName.endsWith(".md")) {
    return extractTextFromPlainFile(file);
  }

  return {
    sourceText: "",
    sourceLabel: file.name,
    sourceType: "unsupported",
  };
}

async function fetchRemoteSource(url) {
  const response = await fetch("/api/fetch-resource", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({ error: "Mənbə oxunmadı." }));
    throw new Error(errorPayload.error || "Mənbə oxunmadı.");
  }

  const payload = await response.json();
  return {
    sourceText: normalizeSourceInput(payload.text || ""),
    sourceLabel: payload.sourceLabel || url,
    sourceType: payload.sourceType || "url",
  };
}

async function collectSourceData() {
  const sourceParts = [];
  const warnings = [];

  const dailyPlanFile = dailyPlanInput.files && dailyPlanInput.files[0] ? dailyPlanInput.files[0] : null;
  const textbookFile = pdfInput.files && pdfInput.files[0] ? pdfInput.files[0] : null;
  const remoteUrl = normalizeText(resourceUrlInput.value);
  const manualText = normalizeSourceInput(sourceTextInput.value);

  if (dailyPlanFile) {
    try {
      const parsed = await extractTextFromSupportedFile(dailyPlanFile);
      if (parsed.sourceText) {
        sourceParts.push({
          sourceText: parsed.sourceText,
          sourceLabel: `Günlük dərs: ${parsed.sourceLabel}`,
          sourceType: parsed.sourceType,
        });
      } else {
        warnings.push("Günlük dərs faylı oxunmadı.");
      }
    } catch (error) {
      console.error(error);
      warnings.push("Günlük dərs faylı tam oxunmadı.");
    }
  }

  if (remoteUrl) {
    try {
      const parsed = await fetchRemoteSource(remoteUrl);
      if (parsed.sourceText) {
        sourceParts.push(parsed);
      }
    } catch (error) {
      console.error(error);
      warnings.push("TRIMS və ya link mənbəsi oxunmadı.");
    }
  }

  if (textbookFile) {
    try {
      const parsed = await extractTextFromSupportedFile(textbookFile);
      if (parsed.sourceText) {
        sourceParts.push({
          sourceText: parsed.sourceText,
          sourceLabel: `Dərslik faylı: ${parsed.sourceLabel}`,
          sourceType: parsed.sourceType,
        });
      } else {
        warnings.push("Dərslik faylı oxunmadı.");
      }
    } catch (error) {
      console.error(error);
      warnings.push("Dərslik faylı tam oxunmadı.");
    }
  }

  if (manualText) {
    sourceParts.push({
      sourceText: manualText,
      sourceLabel: "Müəllimin daxil etdiyi dərslik mətni",
      sourceType: "text",
    });
  }

  if (!sourceParts.length) {
    return {
      sourceText: "",
      sourceLabel: "Fənn və mövzu əsaslı avtomatik quruluş",
      sourceType: "none",
      warnings,
    };
  }

  return {
    sourceText: sourceParts.map((part) => part.sourceText).filter(Boolean).join("\n\n"),
    sourceLabel: sourceParts.map((part) => part.sourceLabel).join(" + "),
    sourceType: sourceParts.length > 1 ? "combined" : sourceParts[0].sourceType,
    warnings,
  };
}

async function generatePlan() {
  const subject = engine.getCanonicalSubject(subjectInput.value);
  const grade = gradeInput.value;
  const topic = normalizeText(topicInput.value);

  if (!normalizeText(subject) || !normalizeText(grade)) {
    setMessage("Zəhmət olmasa ən azı fənn və sinif sahələrini doldurun.", "error");
    return null;
  }

  setMessage("Plan hazırlanır...");
  previewButton.disabled = true;
  downloadButton.disabled = true;

  try {
    const sourceData = await collectSourceData();
    const plan = engine.buildLessonPlan({
      subject,
      grade,
      topic,
      smartboardMode: smartboardToggle.checked,
      sourceText: sourceData.sourceText,
      sourceType: sourceData.sourceType,
      sourceLabel: sourceData.sourceLabel,
    });

    renderPreview(plan);

    if (sourceData.warnings.length) {
      setMessage(`Plan quruldu. Qeyd: ${sourceData.warnings.join(" ")}`, "success");
    } else {
      setMessage("Sizin təqdimat strukturunuz hazırdır!", "success");
    }

    resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
    return plan;
  } catch (error) {
    console.error(error);
    setMessage("Plan qurularkən xəta baş verdi.", "error");
    return null;
  } finally {
    previewButton.disabled = false;
    if (plannerState.plan) {
      downloadButton.disabled = false;
    }
  }
}

function shapeType(pptx, preferred, fallback) {
  return pptx.ShapeType[preferred] || pptx.ShapeType[fallback];
}

function getPresentationTheme(plan) {
  const primaryMode = plan.theme.mode === "primary";
  const smartScale = plan.smartboardMode ? 1.2 : 1;

  if (primaryMode) {
    return {
      primaryMode,
      smartScale,
      bg: "FFF7E9",
      surface: "FFFFFF",
      surfaceSoft: "FFF2DE",
      accent: "FF8F3F",
      accent2: "4A9FFF",
      accent3: "6CC96E",
      accent4: "F3D45B",
      text: "203D59",
      muted: "5C7488",
      titleFont: "Arial Rounded MT Bold",
      bodyFont: "Trebuchet MS",
      coverTitle: 28 * smartScale,
      sectionTitle: 24 * smartScale,
      bodySize: 16 * smartScale,
      smallSize: 12 * smartScale,
    };
  }

  return {
    primaryMode,
    smartScale,
    bg: "F4F7FB",
    surface: "FFFFFF",
    surfaceSoft: "EEF3FB",
    accent: "2F6DF6",
    accent2: "1A9C80",
    accent3: "E69B2E",
    accent4: "D8E3F5",
    text: "162338",
    muted: "5F6F86",
    titleFont: "Aptos Display",
    bodyFont: "Aptos",
    coverTitle: 25 * smartScale,
    sectionTitle: 22 * smartScale,
    bodySize: 14 * smartScale,
    smallSize: 11 * smartScale,
  };
}

function addBackgroundDecor(slide, pptx, theme) {
  slide.background = { color: theme.bg };

  if (theme.primaryMode) {
    slide.addShape(shapeType(pptx, "ellipse", "rect"), {
      x: -0.1,
      y: 5.05,
      w: 1.95,
      h: 1.75,
      fill: { color: theme.accent4, transparency: 8 },
      line: { color: theme.accent4, transparency: 100 },
    });
    slide.addShape(shapeType(pptx, "ellipse", "rect"), {
      x: 10.5,
      y: -0.12,
      w: 1.95,
      h: 1.7,
      fill: { color: theme.accent2, transparency: 12 },
      line: { color: theme.accent2, transparency: 100 },
    });
    slide.addShape(shapeType(pptx, "ellipse", "rect"), {
      x: 9.0,
      y: 5.2,
      w: 1.5,
      h: 1.35,
      fill: { color: theme.accent3, transparency: 15 },
      line: { color: theme.accent3, transparency: 100 },
    });
    return;
  }

  slide.addShape(shapeType(pptx, "rect", "rect"), {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.55,
    fill: { color: theme.accent },
    line: { color: theme.accent, transparency: 100 },
  });
  slide.addShape(shapeType(pptx, "rect", "rect"), {
    x: 11.18,
    y: 0,
    w: 2.15,
    h: 7.5,
    fill: { color: theme.accent4, transparency: 18 },
    line: { color: theme.accent4, transparency: 100 },
  });
}

function addSlideTitle(slide, pptx, title, subtitle, theme) {
  slide.addText(title, {
    x: 0.68,
    y: 0.55,
    w: 7.8,
    h: 0.58,
    color: theme.text,
    fontFace: theme.titleFont,
    fontSize: theme.sectionTitle,
    bold: true,
    margin: 0,
  });

  slide.addText(subtitle, {
    x: 0.7,
    y: 1.16,
    w: 7.45,
    h: 0.46,
    color: theme.muted,
    fontFace: theme.bodyFont,
    fontSize: theme.bodySize - 1,
    margin: 0,
  });
}

function addCoverSlide(pptx, plan, theme) {
  const slide = pptx.addSlide();
  addBackgroundDecor(slide, pptx, theme);

  slide.addText(plan.lessonTitle, {
    x: 0.82,
    y: 1.12,
    w: 7.15,
    h: 1.15,
    fontFace: theme.titleFont,
    fontSize: theme.coverTitle,
    bold: true,
    color: theme.text,
    margin: 0,
    fit: "shrink",
  });

  slide.addText(
    plan.topic
      ? `${plan.subject} • ${plan.grade} • ${plan.topic}`
      : `${plan.subject} • ${plan.grade}`,
    {
      x: 0.85,
      y: 2.36,
      w: 5.5,
      h: 0.44,
      fontFace: theme.bodyFont,
      fontSize: theme.bodySize,
      color: theme.text,
      margin: 0,
    },
  );

  slide.addText(plan.sourceSummary, {
    x: 0.86,
    y: 3.18,
    w: 5.6,
    h: 1.0,
    fontFace: theme.bodyFont,
    fontSize: theme.bodySize,
    color: theme.muted,
    margin: 0,
  });

  slide.addShape(shapeType(pptx, "roundRect", "rect"), {
    x: 7.78,
    y: 1.18,
    w: 3.95,
    h: 3.65,
    fill: { color: theme.surface },
    line: { color: theme.accent4, width: 1 },
    radius: 0.18,
  });

  slide.addText("Bu təqdimatda istifadə olunacaq hissələr", {
    x: 8.06,
    y: 1.5,
    w: 3.15,
    h: 0.44,
    fontFace: theme.titleFont,
    fontSize: theme.bodySize + 1,
    bold: true,
    color: theme.text,
    margin: 0,
  });

  slide.addText(
    plan.sections.map((section, index) => `${index + 1}. ${section.title}`).join("\n"),
    {
      x: 8.08,
      y: 2.04,
      w: 3.0,
      h: 2.4,
      fontFace: theme.bodyFont,
      fontSize: theme.bodySize,
      color: theme.text,
      breakLine: false,
      margin: 0,
    },
  );
}

function addPlanSlide(pptx, plan, theme) {
  const slide = pptx.addSlide();
  addBackgroundDecor(slide, pptx, theme);
  addSlideTitle(slide, pptx, "Dərsin planı", "Təqdimatın ümumi axını və müəllim üçün qısa qeyd.", theme);

  slide.addShape(shapeType(pptx, "roundRect", "rect"), {
    x: 0.78,
    y: 1.95,
    w: 5.1,
    h: 3.25,
    fill: { color: theme.surface },
    line: { color: theme.accent4, width: 1 },
    radius: 0.18,
  });

  slide.addText("Slayd hissələri", {
    x: 1.05,
    y: 2.18,
    w: 2.6,
    h: 0.34,
    fontFace: theme.titleFont,
    fontSize: theme.bodySize + 1,
    bold: true,
    color: theme.text,
    margin: 0,
  });

  slide.addText(
    plan.sections.map((section, index) => `${index + 1}. ${section.title}`).join("\n"),
    {
      x: 1.06,
      y: 2.6,
      w: 4.25,
      h: 2.2,
      fontFace: theme.bodyFont,
      fontSize: theme.bodySize,
      color: theme.text,
      margin: 0,
      breakLine: false,
    },
  );

  slide.addShape(shapeType(pptx, "roundRect", "rect"), {
    x: 6.15,
    y: 1.95,
    w: 4.35,
    h: 3.25,
    fill: { color: theme.surfaceSoft },
    line: { color: theme.surfaceSoft, transparency: 100 },
    radius: 0.18,
  });

  slide.addText("Müəllim üçün qeyd", {
    x: 6.42,
    y: 2.18,
    w: 2.8,
    h: 0.34,
    fontFace: theme.titleFont,
    fontSize: theme.bodySize + 1,
    bold: true,
    color: theme.text,
    margin: 0,
  });

  slide.addText(
    [
      "• Hər bölmənin məzmununu siz dolduracaqsınız.",
      "• İzah, sual, məşq və video əlavə edə bilərsiniz.",
      plan.smartboardMode
        ? "• Bu təqdimat smart lövhə üçün daha iri ölçülərlə hazırlanıb."
        : "• Standart təqdimat görünüşü istifadə olunur.",
    ].join("\n"),
    {
      x: 6.42,
      y: 2.62,
      w: 3.4,
      h: 2.0,
      fontFace: theme.bodyFont,
      fontSize: theme.bodySize,
      color: theme.text,
      margin: 0,
      breakLine: false,
    },
  );
}

function addSectionSlide(pptx, plan, section, index, theme) {
  const slide = pptx.addSlide();
  addBackgroundDecor(slide, pptx, theme);
  addSlideTitle(slide, pptx, section.title, section.prompt, theme);

  const focusItems = (section.focus.length ? section.focus : plan.keywords).slice(
    0,
    plan.smartboardMode ? 4 : 5,
  );
  const teacherItems = section.teacherFill.slice(0, plan.smartboardMode ? 4 : 5);

  slide.addShape(shapeType(pptx, "roundRect", "rect"), {
    x: 0.78,
    y: 1.95,
    w: 5.05,
    h: 2.95,
    fill: { color: theme.surface },
    line: { color: theme.accent4, width: 1 },
    radius: 0.18,
  });

  slide.addText("Bu slaydda vurğulansın", {
    x: 1.06,
    y: 2.2,
    w: 2.85,
    h: 0.32,
    fontFace: theme.titleFont,
    fontSize: theme.bodySize + 1,
    bold: true,
    color: theme.text,
    margin: 0,
  });

  slide.addText(focusItems.map((item) => `• ${item}`).join("\n"), {
    x: 1.06,
    y: 2.62,
    w: 4.15,
    h: 1.9,
    fontFace: theme.bodyFont,
    fontSize: theme.bodySize,
    color: theme.text,
    margin: 0,
    breakLine: false,
  });

  slide.addShape(shapeType(pptx, "roundRect", "rect"), {
    x: 6.1,
    y: 1.95,
    w: 4.28,
    h: 2.95,
    fill: { color: theme.surfaceSoft },
    line: { color: theme.surfaceSoft, transparency: 100 },
    radius: 0.18,
  });

  slide.addText("Müəllim əlavə edəcək", {
    x: 6.38,
    y: 2.2,
    w: 2.7,
    h: 0.32,
    fontFace: theme.titleFont,
    fontSize: theme.bodySize + 1,
    bold: true,
    color: theme.text,
    margin: 0,
  });

  slide.addText(teacherItems.map((item) => `• ${item}`).join("\n"), {
    x: 6.38,
    y: 2.62,
    w: 3.28,
    h: 1.85,
    fontFace: theme.bodyFont,
    fontSize: theme.bodySize,
    color: theme.text,
    margin: 0,
    breakLine: false,
  });

  slide.addText(
    plan.smartboardMode ? "Smart lövhə üçün iri mətn və geniş boşluq aktivdir." : "Standart təqdimat görünüşü istifadə olunur.",
    {
      x: 0.86,
      y: 5.38,
      w: 5.0,
      h: 0.3,
      fontFace: theme.bodyFont,
      fontSize: theme.smallSize,
      color: theme.muted,
      margin: 0,
    },
  );

  slide.addText(`${index + 3} / ${plan.sections.length + 2}`, {
    x: 10.55,
    y: 5.34,
    w: 1.2,
    h: 0.32,
    fontFace: theme.bodyFont,
    fontSize: theme.smallSize,
    bold: true,
    color: theme.muted,
    align: "right",
    margin: 0,
  });
}

function buildPresentation(plan) {
  if (typeof window.PptxGenJS !== "function") {
    throw new Error("PowerPoint kitabxanası yüklənmədi.");
  }

  const pptx = new window.PptxGenJS();
  const theme = getPresentationTheme(plan);

  pptx.layout = "LAYOUT_WIDE";
  pptx.lang = "az-Latn-AZ";
  pptx.subject = plan.subject;
  pptx.title = plan.lessonTitle;
  pptx.author = "";
  pptx.company = "";

  addCoverSlide(pptx, plan, theme);
  addPlanSlide(pptx, plan, theme);
  plan.sections.forEach((section, index) => addSectionSlide(pptx, plan, section, index, theme));

  return pptx;
}

function createPptxFileName(plan) {
  const topicPart = slugify(plan.topic || plan.lessonTitle || plan.grade) || "ders";
  const subjectPart = slugify(plan.subject) || "fenn";
  return `${subjectPart}_${topicPart}.pptx`;
}

async function downloadPresentation() {
  const plan = plannerState.plan || (await generatePlan());
  if (!plan) {
    return;
  }

  downloadButton.disabled = true;
  setMessage("PowerPoint hazırlanır...");

  try {
    const pptx = buildPresentation(plan);
    await pptx.writeFile({ fileName: createPptxFileName(plan) });
    setMessage("PowerPoint uğurla yükləndi.", "success");
  } catch (error) {
    console.error(error);
    setMessage("PowerPoint yaradılarkən xəta baş verdi.", "error");
  } finally {
    downloadButton.disabled = false;
  }
}

function resetApp() {
  form.reset();
  plannerState.plan = null;
  downloadButton.disabled = true;
  emptyState.classList.remove("hidden");
  resultArea.classList.add("hidden");
  slidePlan.innerHTML = "";
  renderKeywords([]);
  renderList(conceptList, [], "Əsas anlayışlar mövzuya əsasən qurulacaq.");
  renderList(activityList, [], "Fəaliyyət hissəsi fənnə uyğun avtomatik hazırlanacaq.");
  renderList(questionList, [], "Sual istiqamətləri mövzuya uyğun müəllim tərəfindən doldurulacaq.");
  updateThemeIndicator();
  updateSmartboardIndicator();
  updateResourceHint();
  setMessage("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await generatePlan();
});

downloadButton.addEventListener("click", downloadPresentation);
resetButton.addEventListener("click", resetApp);
gradeInput.addEventListener("change", updateThemeIndicator);
smartboardToggle.addEventListener("change", updateSmartboardIndicator);
resourceUrlInput.addEventListener("input", updateResourceHint);
sourceTextInput.addEventListener("input", updateResourceHint);
pdfInput.addEventListener("change", updateResourceHint);
dailyPlanInput.addEventListener("change", updateResourceHint);

updateThemeIndicator();
updateSmartboardIndicator();
updateResourceHint();
renderKeywords([]);
renderList(conceptList, [], "Əsas anlayışlar mövzuya əsasən qurulacaq.");
renderList(activityList, [], "Fəaliyyət hissəsi fənnə uyğun avtomatik hazırlanacaq.");
renderList(questionList, [], "Sual istiqamətləri mövzuya uyğun müəllim tərəfindən doldurulacaq.");
