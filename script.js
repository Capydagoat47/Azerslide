const APP_NAME = "KNSlides Pro";
const engine = window.KNSLessonEngine;

if (!engine) {
  throw new Error("KNSLessonEngine yüklənmədi.");
}

const form = document.querySelector("#planner-form");
const subjectInput = document.querySelector("#subject-input");
const gradeInput = document.querySelector("#grade-input");
const topicInput = document.querySelector("#topic-input");
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
  const label = isEnabled ? "🖥 Smart Board Mode: On" : "🖥 Smart Board Mode: Off";
  const previewLabel = isEnabled ? "🖥 Smart Board: On" : "🖥 Smart Board: Off";

  smartboardIndicator.textContent = label;
  previewSmartboardBadge.textContent = previewLabel;
}

function updateResourceHint() {
  const hasPdf = Boolean(pdfInput.files && pdfInput.files[0]);
  const hasUrl = Boolean(normalizeText(resourceUrlInput.value));
  const hasText = Boolean(normalizeText(sourceTextInput.value));

  if (hasPdf) {
    resourceHint.textContent = "PDF seçilib. Plan qurularkən əvvəlcə yüklənmiş PDF analiz olunacaq.";
    return;
  }

  if (hasUrl) {
    resourceHint.textContent = "TRIMS və ya mənbə linki daxil edilib. Məzmun əvvəlcə server üzərindən çıxarılacaq.";
    return;
  }

  if (hasText) {
    resourceHint.textContent = "Daxil edilən dərslik mətni analiz ediləcək və struktur həmin mətnə uyğun qurulacaq.";
    return;
  }

  resourceHint.textContent =
    "Mənbə əlavə edilməsə, KNSlides Pro yalnız fənn + sinif + mövzuya əsasən plan quracaq.";
}

function createInfoListItem(text) {
  const item = document.createElement("li");
  item.textContent = text;
  return item;
}

function renderList(target, values, fallbackText) {
  target.innerHTML = "";
  const listValues = values.length ? values : [fallbackText];
  listValues.forEach((value) => target.appendChild(createInfoListItem(value)));
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
      "SLAYD 1 — Başlıq slaydı",
      "Dərsin adı, fənn, sinif və təqdimat tonu",
      [plan.subject, plan.grade, plan.theme.shortLabel],
      plan.topic ? [plan.topic] : [],
    ),
  );

  slidePlan.appendChild(
    createSlideCard(
      "SLAYD 2 — Dərsin marşrutu",
      "Avtomatik qurulan bölmələr və keçid düymələri",
      plan.sections.map((section) => section.title),
      plan.smartboardMode ? ["Smart Board üçün iri keçidlər"] : [],
    ),
  );

  plan.sections.forEach((section, index) => {
    const card = createSlideCard(
      `SLAYD ${index + 3} — ${section.title}`,
      section.prompt,
      section.focus,
      section.teacherFill,
    );
    slidePlan.appendChild(card);
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
    ? "🖥 Smart Board: On"
    : "🖥 Smart Board: Off";

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
    pageTexts.push(normalizeText(pageText));
  }

  return {
    sourceText: pageTexts.join("\n"),
    sourceLabel: `${file.name} (${documentRef.numPages} səhifə)` ,
    sourceType: "pdf",
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
    sourceText: payload.text || "",
    sourceLabel: payload.sourceLabel || url,
    sourceType: payload.sourceType || "url",
  };
}

async function collectSourceData() {
  const manualText = normalizeSourceInput(sourceTextInput.value);
  const remoteUrl = normalizeText(resourceUrlInput.value);
  const selectedFile = pdfInput.files && pdfInput.files[0] ? pdfInput.files[0] : null;

  if (selectedFile) {
    try {
      return await extractTextFromPdf(selectedFile);
    } catch (error) {
      console.error(error);
      setMessage("PDF analiz olunmadı. Fallback olaraq digər məlumatlardan istifadə ediləcək.", "error");
    }
  }

  if (remoteUrl) {
    try {
      return await fetchRemoteSource(remoteUrl);
    } catch (error) {
      console.error(error);
      setMessage("TRIMS və ya mənbə linki oxunmadı. Fallback olaraq digər məlumatlardan istifadə ediləcək.", "error");
    }
  }

  if (manualText) {
    return {
      sourceText: manualText,
      sourceLabel: "Müəllimin daxil etdiyi dərslik mətni",
      sourceType: "text",
    };
  }

  return {
    sourceText: "",
    sourceLabel: "Fənn və mövzu əsaslı avtomatik quruluş",
    sourceType: "none",
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
    setMessage("Sizin təqdimat strukturunuz hazırdır!", "success");
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
  const smartScale = plan.smartboardMode ? 1.18 : 1;

  if (primaryMode) {
    return {
      primaryMode,
      smartScale,
      bg: "FFF7E8",
      surface: "FFFFFF",
      surfaceSoft: "FFF1DB",
      accent: "FF8F3F",
      accent2: "3DA4FF",
      accent3: "68C36B",
      accent4: "FFD86B",
      text: "21415B",
      muted: "5C7488",
      titleFont: "Arial Rounded MT Bold",
      bodyFont: "Trebuchet MS",
      coverTitle: 28 * smartScale,
      sectionTitle: 24 * smartScale,
      bodySize: 16 * smartScale,
      smallSize: 12 * smartScale,
      navSize: 14 * smartScale,
    };
  }

  return {
    primaryMode,
    smartScale,
    bg: "F4F7FB",
    surface: "FFFFFF",
    surfaceSoft: "EEF3FB",
    accent: "2F6DF6",
    accent2: "19A485",
    accent3: "FF9D2F",
    accent4: "D9E5FF",
    text: "162338",
    muted: "5F6F86",
    titleFont: "Aptos Display",
    bodyFont: "Aptos",
    coverTitle: 25 * smartScale,
    sectionTitle: 22 * smartScale,
    bodySize: 14 * smartScale,
    smallSize: 11 * smartScale,
    navSize: 13 * smartScale,
  };
}

function addBackgroundDecor(slide, pptx, theme) {
  slide.background = { color: theme.bg };

  if (theme.primaryMode) {
    slide.addShape(shapeType(pptx, "ellipse", "rect"), {
      x: -0.2,
      y: 5.1,
      w: 2.1,
      h: 1.8,
      fill: { color: theme.accent4, transparency: 8 },
      line: { color: theme.accent4, transparency: 100 },
    });
    slide.addShape(shapeType(pptx, "ellipse", "rect"), {
      x: 10.4,
      y: -0.15,
      w: 2,
      h: 1.7,
      fill: { color: theme.accent2, transparency: 18 },
      line: { color: theme.accent2, transparency: 100 },
    });
    slide.addShape(shapeType(pptx, "ellipse", "rect"), {
      x: 8.8,
      y: 5.2,
      w: 1.6,
      h: 1.4,
      fill: { color: theme.accent3, transparency: 18 },
      line: { color: theme.accent3, transparency: 100 },
    });
    return;
  }

  slide.addShape(shapeType(pptx, "rect", "rect"), {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.58,
    fill: { color: theme.accent },
    line: { color: theme.accent, transparency: 100 },
  });
  slide.addShape(shapeType(pptx, "rect", "rect"), {
    x: 11.2,
    y: 0,
    w: 2.13,
    h: 7.5,
    fill: { color: theme.accent4, transparency: 20 },
    line: { color: theme.accent4, transparency: 100 },
  });
}

function addPill(slide, pptx, text, x, y, width, theme, fillColor) {
  slide.addText(text, {
    x,
    y,
    w: width,
    h: 0.42,
    align: "center",
    valign: "mid",
    color: theme.text,
    fontFace: theme.bodyFont,
    fontSize: theme.smallSize,
    bold: true,
    shape: shapeType(pptx, "roundRect", "rect"),
    fill: { color: fillColor || theme.surfaceSoft },
    line: { color: fillColor || theme.surfaceSoft, transparency: 100 },
    margin: 0.05,
  });
}

function addSlideTitle(slide, pptx, title, subtitle, theme) {
  slide.addText(title, {
    x: 0.65,
    y: 0.52,
    w: 7.8,
    h: 0.6,
    color: theme.text,
    fontFace: theme.titleFont,
    fontSize: theme.sectionTitle,
    bold: true,
    margin: 0,
  });

  slide.addText(subtitle, {
    x: 0.68,
    y: 1.16,
    w: 7.4,
    h: 0.48,
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
    x: 0.8,
    y: 1.18,
    w: 7.7,
    h: 1.25,
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
      x: 0.82,
      y: 2.5,
      w: 5.3,
      h: 0.46,
      fontFace: theme.bodyFont,
      fontSize: theme.bodySize,
      color: theme.text,
      margin: 0,
    },
  );

  addPill(slide, pptx, plan.theme.shortLabel, 0.82, 3.12, 2.3, theme, theme.surfaceSoft);
  addPill(
    slide,
    pptx,
    plan.smartboardMode ? "Smart Board Mode" : "Standart Görünüş",
    3.28,
    3.12,
    2.35,
    theme,
    theme.surfaceSoft,
  );

  slide.addText(plan.sourceSummary, {
    x: 0.84,
    y: 4.02,
    w: 5.6,
    h: 1.05,
    fontFace: theme.bodyFont,
    fontSize: theme.bodySize,
    color: theme.muted,
    margin: 0,
    valign: "mid",
  });

  slide.addShape(shapeType(pptx, "roundRect", "rect"), {
    x: 7.8,
    y: 1.25,
    w: 3.8,
    h: 3.75,
    fill: { color: theme.surface },
    line: { color: theme.accent4 || theme.surfaceSoft, width: 1 },
    radius: 0.18,
  });

  slide.addText("Bu təqdimatda yaradılacaq bölmələr", {
    x: 8.1,
    y: 1.58,
    w: 3.1,
    h: 0.4,
    fontFace: theme.titleFont,
    fontSize: theme.bodySize + 1,
    bold: true,
    color: theme.text,
    margin: 0,
  });

  slide.addText(
    plan.sections.map((section, index) => `${index + 1}. ${section.title}`).join("\n"),
    {
      x: 8.1,
      y: 2.1,
      w: 2.95,
      h: 2.5,
      fontFace: theme.bodyFont,
      fontSize: theme.bodySize,
      color: theme.text,
      breakLine: false,
      margin: 0,
      bullet: { indent: 12 },
    },
  );
}

function addRouteSlide(pptx, plan, theme) {
  const slide = pptx.addSlide();
  addBackgroundDecor(slide, pptx, theme);
  addSlideTitle(slide, pptx, "Dərsin marşrutu", "Bölmələr avtomatik yaradılıb və interaktiv keçidlər əlavə olunub.", theme);

  const rows = plan.sections.length > 4 ? 3 : 2;
  const columns = Math.ceil(plan.sections.length / rows);
  const buttonWidth = theme.primaryMode || plan.smartboardMode ? 2.6 : 2.35;
  const buttonHeight = plan.smartboardMode ? 0.92 : 0.76;
  const gapX = 0.24;
  const gapY = 0.26;
  const startX = 0.8;
  const startY = 2.0;
  const palette = [theme.accent, theme.accent2, theme.accent3, "7A78FF", "F26B8A", "17A34A"];

  plan.sections.forEach((section, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;

    slide.addText(section.title, {
      x: startX + column * (buttonWidth + gapX),
      y: startY + row * (buttonHeight + gapY),
      w: buttonWidth,
      h: buttonHeight,
      fontFace: theme.titleFont,
      fontSize: theme.bodySize,
      bold: true,
      color: "FFFFFF",
      align: "center",
      valign: "mid",
      shape: shapeType(pptx, "roundRect", "rect"),
      fill: { color: palette[index % palette.length] },
      line: { color: palette[index % palette.length], transparency: 100 },
      hyperlink: { slide: index + 3 },
      margin: 0.08,
      fit: "shrink",
    });
  });

  slide.addText(
    "Müəllim hər bölmədə izah, sual, məşq, video və ya smartboard aktivliyini özü doldurur.",
    {
      x: 0.82,
      y: 5.55,
      w: 8.1,
      h: 0.42,
      fontFace: theme.bodyFont,
      fontSize: theme.smallSize,
      color: theme.muted,
      margin: 0,
    },
  );
}

function addSectionSlide(pptx, plan, section, index, theme) {
  const slide = pptx.addSlide();
  addBackgroundDecor(slide, pptx, theme);
  addSlideTitle(slide, pptx, section.title, section.prompt, theme);

  const focusItems = (section.focus.length ? section.focus : plan.keywords).slice(
    0,
    plan.smartboardMode ? 3 : 4,
  );
  const teacherItems = section.teacherFill.slice(0, plan.smartboardMode ? 3 : 4);

  slide.addShape(shapeType(pptx, "roundRect", "rect"), {
    x: 0.74,
    y: 1.95,
    w: 5.05,
    h: 2.7,
    fill: { color: theme.surface },
    line: { color: theme.accent4 || theme.surfaceSoft, width: 1 },
    radius: 0.18,
  });

  slide.addText("Bu bölmədə vurğulansın", {
    x: 1.02,
    y: 2.18,
    w: 2.8,
    h: 0.3,
    fontFace: theme.titleFont,
    fontSize: theme.bodySize + 1,
    bold: true,
    color: theme.text,
    margin: 0,
  });

  slide.addText(focusItems.map((item) => `• ${item}`).join("\n"), {
    x: 1.02,
    y: 2.6,
    w: 4.2,
    h: 1.55,
    fontFace: theme.bodyFont,
    fontSize: theme.bodySize,
    color: theme.text,
    margin: 0,
    breakLine: false,
  });

  slide.addShape(shapeType(pptx, "roundRect", "rect"), {
    x: 6.08,
    y: 1.95,
    w: 4.25,
    h: 2.7,
    fill: { color: theme.surfaceSoft },
    line: { color: theme.surfaceSoft, transparency: 100 },
    radius: 0.18,
  });

  slide.addText("Müəllim əlavə edəcək", {
    x: 6.36,
    y: 2.18,
    w: 2.7,
    h: 0.3,
    fontFace: theme.titleFont,
    fontSize: theme.bodySize + 1,
    bold: true,
    color: theme.text,
    margin: 0,
  });

  slide.addText(teacherItems.map((item) => `• ${item}`).join("\n"), {
    x: 6.36,
    y: 2.6,
    w: 3.35,
    h: 1.5,
    fontFace: theme.bodyFont,
    fontSize: theme.bodySize,
    color: theme.text,
    margin: 0,
    breakLine: false,
  });

  slide.addText(plan.smartboardMode ? "İri mətn və geniş boşluq aktivdir." : "Standart təqdimat axını istifadə olunur.", {
    x: 0.82,
    y: 4.92,
    w: 4.2,
    h: 0.34,
    fontFace: theme.bodyFont,
    fontSize: theme.smallSize,
    color: theme.muted,
    margin: 0,
  });

  slide.addText("Marşruta qayıt", {
    x: 0.82,
    y: 5.42,
    w: plan.smartboardMode ? 2.4 : 2.08,
    h: plan.smartboardMode ? 0.64 : 0.56,
    fontFace: theme.titleFont,
    fontSize: theme.navSize,
    bold: true,
    color: "FFFFFF",
    align: "center",
    valign: "mid",
    shape: shapeType(pptx, "roundRect", "rect"),
    fill: { color: theme.accent },
    line: { color: theme.accent, transparency: 100 },
    hyperlink: { slide: 2 },
    margin: 0.08,
  });

  const hasNextSlide = index < plan.sections.length - 1;
  slide.addText(hasNextSlide ? "Növbəti bölmə" : "Yekun", {
    x: 9.2,
    y: 5.42,
    w: plan.smartboardMode ? 2.4 : 2.08,
    h: plan.smartboardMode ? 0.64 : 0.56,
    fontFace: theme.titleFont,
    fontSize: theme.navSize,
    bold: true,
    color: "FFFFFF",
    align: "center",
    valign: "mid",
    shape: shapeType(pptx, "roundRect", "rect"),
    fill: { color: theme.accent2 },
    line: { color: theme.accent2, transparency: 100 },
    hyperlink: { slide: hasNextSlide ? index + 4 : 2 },
    margin: 0.08,
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
  addRouteSlide(pptx, plan, theme);
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

updateThemeIndicator();
updateSmartboardIndicator();
updateResourceHint();
renderKeywords([]);
renderList(conceptList, [], "Əsas anlayışlar mövzuya əsasən qurulacaq.");
renderList(activityList, [], "Fəaliyyət hissəsi fənnə uyğun avtomatik hazırlanacaq.");
renderList(questionList, [], "Sual istiqamətləri mövzuya uyğun müəllim tərəfindən doldurulacaq.");

