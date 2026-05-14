const APP_NAME = "KNSlides";
const AUTHOR_NAME = "Novruzov Kənan";

const curriculumSubjects = [
  "Azərbaycan dili",
  "Riyaziyyat",
  "Həyat bilgisi",
  "İngilis dili",
  "Rus dili",
  "İnformatika",
  "Musiqi",
  "Təsviri incəsənət",
  "Fiziki tərbiyə",
  "Tarix",
  "Coğrafiya",
  "Biologiya",
  "Kimya",
  "Fizika",
];

const suggestionMap = {
  "Azərbaycan dili": [
    "Dərslik",
    "Motivasiya",
    "Söz Boğçası",
    "Dinləyib anlama",
    "Oxuyub anlama",
    "Refleksiya",
    "Oyun",
  ],
  Riyaziyyat: [
    "Dərslik",
    "Motivasiya",
    "Məsələ həlli",
    "İş dəftəri",
    "Refleksiya",
    "Oyun",
  ],
  "İngilis dili": [
    "Vocabulary",
    "Reading",
    "Listening",
    "Speaking",
    "Practice",
    "Game",
  ],
  "Rus dili": [
    "Vocabulary",
    "Reading",
    "Listening",
    "Speaking",
    "Practice",
    "Game",
  ],
};

const defaultSuggestions = [
  "Dərslik",
  "Motivasiya",
  "Tapşırıq",
  "Refleksiya",
  "Oyun",
];

const form = document.querySelector("#planner-form");
const subjectInput = document.querySelector("#subject-input");
const classInput = document.querySelector("#class-input");
const countInputs = document.querySelectorAll('input[name="buttonCount"]');
const suggestionList = document.querySelector("#suggestion-list");
const buttonInputsContainer = document.querySelector("#button-inputs");
const fillSuggestionsButton = document.querySelector("#fill-suggestions");
const formMessage = document.querySelector("#form-message");
const resetButton = document.querySelector("#reset-button");
const emptyState = document.querySelector("#empty-state");
const resultArea = document.querySelector("#result-area");
const resultSubject = document.querySelector("#result-subject");
const resultGrade = document.querySelector("#result-grade");
const resultCount = document.querySelector("#result-count");
const menuButtons = document.querySelector("#menu-buttons");
const slidePlan = document.querySelector("#slide-plan");
const copyButton = document.querySelector("#copy-button");
const downloadButton = document.querySelector("#download-button");
const copyBuffer = document.querySelector("#copy-buffer");

const plannerState = {
  subject: "",
  grade: "",
  buttons: [],
};

let manualNames = [];

function normalizeText(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

function foldText(text) {
  return normalizeText(text).toLocaleLowerCase("az");
}

function slugify(text) {
  return foldText(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeSlideId(label) {
  return `slide-${slugify(label) || "bolme"}`;
}

function getButtonCount() {
  const selected = document.querySelector('input[name="buttonCount"]:checked');
  return selected ? Number(selected.value) : 0;
}

function getSuggestions(subject) {
  const matchedEntry = Object.entries(suggestionMap).find(
    ([key]) => foldText(key) === foldText(subject),
  );
  return matchedEntry ? matchedEntry[1] : defaultSuggestions;
}

function getCanonicalSubject(subject) {
  const matchedSubject = curriculumSubjects.find(
    (item) => foldText(item) === foldText(subject),
  );
  return matchedSubject || normalizeText(subject);
}

function getGradeNumber(grade) {
  const match = normalizeText(grade).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function isKidsGrade(grade) {
  const gradeNumber = getGradeNumber(grade);
  return gradeNumber !== null && gradeNumber >= 1 && gradeNumber <= 4;
}

function getPresentationTheme(grade) {
  if (isKidsGrade(grade)) {
    return {
      modeLabel: "1-4-cü sinif üçün rəngli və oyunvari",
      background: "FFF6D8",
      surface: "FFFFFF",
      accent: "FF8A3D",
      accentTwo: "57B7E5",
      accentThree: "7AC74F",
      accentFour: "FFD166",
      text: "20435C",
      muted: "4A6776",
      buttonText: "FFFFFF",
      note: "FFFDF6",
      noteBorder: "F1D38B",
      titleFont: "Arial Rounded MT Bold",
      bodyFont: "Aptos",
    };
  }

  return {
    modeLabel: "5-ci sinif və yuxarı üçün səliqəli və yüngül dinamik",
    background: "F4F6FA",
    surface: "FFFFFF",
    accent: "2D5B87",
    accentTwo: "4E9B8E",
    accentThree: "D98E3D",
    accentFour: "DEE6F0",
    text: "17324D",
    muted: "536476",
    buttonText: "FFFFFF",
    note: "FFFFFF",
    noteBorder: "D9E2EF",
    titleFont: "Aptos Display",
    bodyFont: "Aptos",
  };
}

function updateFormMessage(message = "") {
  formMessage.textContent = message;
}

function renderSuggestionChips() {
  const suggestions = getSuggestions(subjectInput.value);
  suggestionList.innerHTML = "";

  suggestions.forEach((suggestion) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = suggestion;
    chip.addEventListener("click", () => applySuggestion(suggestion));
    suggestionList.appendChild(chip);
  });

  syncActiveChips();
}

function buildButtonFields(count) {
  buttonInputsContainer.innerHTML = "";

  if (!count) {
    return;
  }

  const suggestions = getSuggestions(subjectInput.value);
  manualNames = Array.from({ length: count }, (_, index) => {
    return normalizeText(manualNames[index]) || suggestions[index] || "";
  });

  manualNames.forEach((value, index) => {
    const wrapper = document.createElement("label");
    wrapper.className = "button-field";

    const indexBadge = document.createElement("span");
    indexBadge.className = "button-field__index";
    indexBadge.textContent = String(index + 1).padStart(2, "0");

    const input = document.createElement("input");
    input.type = "text";
    input.name = `button-name-${index}`;
    input.placeholder = `Düymə ${index + 1}`;
    input.value = value;
    input.maxLength = 40;
    input.required = true;
    input.addEventListener("input", (event) => {
      manualNames[index] = event.target.value;
      syncActiveChips();
    });

    wrapper.append(indexBadge, input);
    buttonInputsContainer.appendChild(wrapper);
  });

  syncActiveChips();
}

function applySuggestion(suggestion) {
  const textInputs = buttonInputsContainer.querySelectorAll("input");

  if (!textInputs.length) {
    updateFormMessage("Əvvəlcə düymə sayını seçin.");
    return;
  }

  const duplicateIndex = manualNames.findIndex(
    (name) => foldText(name) === foldText(suggestion),
  );

  if (duplicateIndex >= 0) {
    textInputs[duplicateIndex].focus();
    updateFormMessage(`"${suggestion}" artıq siyahıda var.`);
    return;
  }

  const emptyIndex = manualNames.findIndex((name) => !normalizeText(name));
  if (emptyIndex < 0) {
    updateFormMessage("Bütün düymə sahələri doludur. Mövcud adlardan birini dəyişin.");
    return;
  }

  manualNames[emptyIndex] = suggestion;
  textInputs[emptyIndex].value = suggestion;
  textInputs[emptyIndex].focus();
  syncActiveChips();
  updateFormMessage(`"${suggestion}" əlavə edildi.`);
}

function fillFromSuggestions() {
  const count = getButtonCount();

  if (!count) {
    updateFormMessage("Əvvəlcə 3, 5 və ya 7 düymədən birini seçin.");
    return;
  }

  const suggestions = getSuggestions(subjectInput.value);
  manualNames = Array.from({ length: count }, (_, index) => suggestions[index] || "");
  buildButtonFields(count);
  updateFormMessage("Tövsiyələr sahələrə yerləşdirildi. İstəsəniz, adları dəyişə bilərsiniz.");
}

function syncActiveChips() {
  const selectedNames = manualNames.map((name) => foldText(name)).filter(Boolean);

  suggestionList.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("is-active", selectedNames.includes(foldText(chip.textContent)));
  });
}

function collectButtonNames() {
  return Array.from(buttonInputsContainer.querySelectorAll("input"))
    .map((input) => normalizeText(input.value))
    .filter(Boolean);
}

function buildCopyText(subject, grade, buttons) {
  const lines = [];
  lines.push("Sizin PowerPoint strukturunuz hazırdır!");
  lines.push("");
  lines.push(`Layihə: ${APP_NAME}`);
  lines.push(`By: ${AUTHOR_NAME}`);
  lines.push(`Fənn: ${subject}`);
  lines.push(`Sinif: ${grade}`);
  lines.push("");
  lines.push("SLAYD 1 - Giriş (Menu)");
  buttons.forEach((button) => lines.push(`- ${button}`));
  lines.push("");
  buttons.forEach((button, index) => {
    lines.push(`SLAYD ${index + 2} - ${button}`);
  });
  lines.push("");
  lines.push("Naviqasiya:");
  lines.push("- Hər giriş düyməsi uyğun slayda keçid verir.");
  lines.push('- Hər ayrıca slaydda "⬅ Geri" düyməsi əsas menyuya qayıdır.');
  lines.push("");
  lines.push("Müəllim dolduracaq:");
  lines.push("- izahlar");
  lines.push("- suallar");
  lines.push("- çalışmalar");
  lines.push("- videolar");
  return lines.join("\n");
}

function renderResult(subject, grade, buttons) {
  emptyState.classList.add("hidden");
  resultArea.classList.remove("hidden");

  plannerState.subject = subject;
  plannerState.grade = grade;
  plannerState.buttons = [...buttons];

  resultSubject.textContent = subject;
  resultGrade.textContent = grade;
  resultCount.textContent = `${buttons.length} düymə`;

  menuButtons.innerHTML = "";
  slidePlan.innerHTML = "";

  buttons.forEach((button) => {
    const targetSlideId = makeSlideId(button);
    const menuChip = document.createElement("button");
    menuChip.type = "button";
    menuChip.className = "menu-chip";
    menuChip.textContent = button;
    menuChip.addEventListener("click", () => {
      const targetSlide = document.getElementById(targetSlideId);
      if (!targetSlide) {
        return;
      }

      targetSlide.scrollIntoView({ behavior: "smooth", block: "center" });
      targetSlide.classList.remove("is-emphasized");
      window.requestAnimationFrame(() => {
        targetSlide.classList.add("is-emphasized");
      });
    });
    menuButtons.appendChild(menuChip);
  });

  const menuSlide = document.createElement("article");
  menuSlide.className = "slide-card";
  menuSlide.innerHTML = `
    <p><strong>SLAYD 1 - Giriş (Menu)</strong></p>
    <span>Bütün giriş düymələri bu slaydda görünəcək.</span>
  `;
  slidePlan.appendChild(menuSlide);

  buttons.forEach((button, index) => {
    const targetSlideId = makeSlideId(button);
    const slideCard = document.createElement("article");
    slideCard.className = "slide-card";
    slideCard.id = targetSlideId;
    slideCard.style.animationDelay = `${index * 70}ms`;
    slideCard.innerHTML = `
      <p><strong>SLAYD ${index + 2} - ${button}</strong></p>
      <span>Bu hissənin məzmununu müəllim PowerPoint daxilində dolduracaq.</span>
      <button type="button" class="back-chip">⬅ Geri</button>
    `;
    slideCard.querySelector(".back-chip").addEventListener("click", () => {
      document.querySelector(".menu-preview")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    slidePlan.appendChild(slideCard);
  });

  copyBuffer.value = buildCopyText(subject, grade, buttons);
  downloadButton.disabled = false;
}

function resetPlanner() {
  form.reset();
  manualNames = [];
  plannerState.subject = "";
  plannerState.grade = "";
  plannerState.buttons = [];
  buttonInputsContainer.innerHTML = "";
  emptyState.classList.remove("hidden");
  resultArea.classList.add("hidden");
  downloadButton.disabled = true;
  updateFormMessage("");
  renderSuggestionChips();
}

function createPptxFileName(subject, grade) {
  const safeSubject = slugify(subject) || "ders";
  const safeGrade = slugify(grade) || "sinif";
  return `KNSlides_${safeSubject}_${safeGrade}.pptx`;
}

function addAuthorMark(slide, theme) {
  slide.addText(`By: ${AUTHOR_NAME}`, {
    x: 9.2,
    y: 0.25,
    w: 2.6,
    h: 0.3,
    fontFace: theme.bodyFont,
    fontSize: 9,
    color: theme.muted,
    align: "right",
    margin: 0,
  });
}

function addBackgroundDecor(slide, pptx, theme, kidsMode) {
  slide.background = { color: theme.background };

  if (kidsMode) {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: -0.1,
      y: 5.0,
      w: 2.2,
      h: 1.8,
      fill: { color: theme.accentFour, transparency: 12 },
      line: { color: theme.accentFour, transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 10.0,
      y: -0.15,
      w: 2.1,
      h: 1.9,
      fill: { color: theme.accentTwo, transparency: 14 },
      line: { color: theme.accentTwo, transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 8.2,
      y: 5.2,
      w: 1.7,
      h: 1.5,
      fill: { color: theme.accentThree, transparency: 12 },
      line: { color: theme.accentThree, transparency: 100 },
    });
  } else {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.55,
      fill: { color: theme.accent },
      line: { color: theme.accent, transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 10.9,
      y: 0,
      w: 2.43,
      h: 7.5,
      fill: { color: theme.accentFour, transparency: 5 },
      line: { color: theme.accentFour, transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 10.2,
      y: 5.1,
      w: 1.8,
      h: 1.5,
      fill: { color: theme.accentTwo, transparency: 18 },
      line: { color: theme.accentTwo, transparency: 100 },
    });
  }
}

function addHeader(slide, pptx, theme, subject, grade, title, subtitle) {
  slide.addText(title, {
    x: 0.6,
    y: 0.45,
    w: 7.8,
    h: 0.55,
    fontFace: theme.titleFont,
    fontSize: 24,
    bold: true,
    color: theme.text,
    margin: 0,
  });

  slide.addText(`Fənn: ${subject}     Sinif: ${grade}`, {
    x: 0.62,
    y: 1.07,
    w: 4.7,
    h: 0.4,
    fontFace: theme.bodyFont,
    fontSize: 12,
    color: theme.text,
    align: "center",
    valign: "mid",
    shape: pptx.ShapeType.rect,
    fill: { color: theme.surface, transparency: 8 },
    line: { color: theme.accentFour, transparency: 30, width: 1 },
    margin: 0.07,
  });

  slide.addText(subtitle, {
    x: 0.62,
    y: 1.55,
    w: 7.4,
    h: 0.45,
    fontFace: theme.bodyFont,
    fontSize: 15,
    color: theme.muted,
    margin: 0,
  });

  addAuthorMark(slide, theme);
}

function addTeacherPlaceholder(slide, pptx, theme, kidsMode) {
  slide.addText(
    [
      { text: "Bu slayd müəllim tərəfindən doldurulacaq.\n", options: { bold: true } },
      { text: "\nƏlavə ediləcək hissələr:\n" },
      { text: "• izahlar\n• suallar\n• çalışmalar\n• videolar" },
    ],
    {
      x: 0.72,
      y: 2.15,
      w: 6.1,
      h: 2.75,
      fontFace: theme.bodyFont,
      fontSize: kidsMode ? 20 : 18,
      color: theme.text,
      breakLine: false,
      margin: 0.16,
      shape: pptx.ShapeType.rect,
      fill: { color: theme.note, transparency: 0 },
      line: { color: theme.noteBorder, width: 1.2 },
      valign: "mid",
    },
  );

  slide.addText(
    "Bu bölmədə interaktiv tapşırıq, şəkil, audio və ya qısa video yerləşdirə bilərsiniz.",
    {
      x: 7.25,
      y: 2.15,
      w: 2.95,
      h: 2.75,
      fontFace: theme.bodyFont,
      fontSize: 15,
      color: theme.muted,
      margin: 0.16,
      shape: pptx.ShapeType.rect,
      fill: { color: theme.surface, transparency: 0 },
      line: { color: theme.accentFour, width: 1 },
      valign: "mid",
    },
  );
}

function addMenuButtonsToSlide(slide, pptx, theme, buttons) {
  const palette = [
    theme.accent,
    theme.accentTwo,
    theme.accentThree,
    "C76363",
    "7A6FF0",
    "00A7A0",
    "F29E4C",
  ];

  const rows =
    buttons.length === 3
      ? [[0, 1, 2]]
      : buttons.length === 5
        ? [[0, 1, 2], [3, 4]]
        : [[0, 1, 2], [3, 4, 5], [6]];

  const buttonWidth = 2.2;
  const buttonHeight = 0.76;
  const gap = 0.2;
  const startY = buttons.length === 7 ? 2.35 : 2.55;

  rows.forEach((row, rowIndex) => {
    const totalWidth = row.length * buttonWidth + (row.length - 1) * gap;
    const startX = (13.33 - totalWidth) / 2;

    row.forEach((buttonIndex, itemIndex) => {
      const buttonTitle = buttons[buttonIndex];
      slide.addText(buttonTitle, {
        x: startX + itemIndex * (buttonWidth + gap),
        y: startY + rowIndex * 1.0,
        w: buttonWidth,
        h: buttonHeight,
        fontFace: theme.titleFont,
        fontSize: 18,
        bold: true,
        color: theme.buttonText,
        align: "center",
        valign: "mid",
        shape: pptx.ShapeType.rect,
        fill: { color: palette[buttonIndex % palette.length] },
        line: { color: palette[buttonIndex % palette.length], transparency: 100 },
        hyperlink: { slide: buttonIndex + 2, tooltip: `${buttonTitle} slaydına keç` },
        margin: 0.06,
      });
    });
  });
}

function buildPresentation(subject, grade, buttons) {
  if (typeof window.PptxGenJS !== "function") {
    throw new Error("PowerPoint kitabxanası yüklənmədi. Səhifəni yeniləyib yenidən cəhd edin.");
  }

  const theme = getPresentationTheme(grade);
  const kidsMode = isKidsGrade(grade);
  const pptx = new window.PptxGenJS();

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = AUTHOR_NAME;
  pptx.company = APP_NAME;
  pptx.subject = subject;
  pptx.title = `${APP_NAME} - ${subject}`;
  pptx.lang = "az-Latn-AZ";

  const menuSlide = pptx.addSlide();
  addBackgroundDecor(menuSlide, pptx, theme, kidsMode);
  addHeader(
    menuSlide,
    pptx,
    theme,
    subject,
    grade,
    `${APP_NAME} dərs menyusu`,
    `${theme.modeLabel} dizayn ilə interaktiv təqdimat`,
  );

  menuSlide.addText("Düyməyə klik edin və uyğun bölməyə keçin.", {
    x: 0.64,
    y: 1.98,
    w: 5.1,
    h: 0.44,
    fontFace: theme.bodyFont,
    fontSize: 14,
    color: theme.muted,
    shape: pptx.ShapeType.rect,
    fill: { color: theme.surface, transparency: 10 },
    line: { color: theme.accentFour, transparency: 30, width: 1 },
    margin: 0.07,
  });

  addMenuButtonsToSlide(menuSlide, pptx, theme, buttons);
  menuSlide.addNotes(
    "Bu təqdimat skeleti avtomatik yaradılıb. Müəllim izahlar, suallar, çalışmalar və videoları sonradan əlavə edəcək.",
  );

  buttons.forEach((button, index) => {
    const slide = pptx.addSlide();
    addBackgroundDecor(slide, pptx, theme, kidsMode);
    addHeader(
      slide,
      pptx,
      theme,
      subject,
      grade,
      `SLAYD ${index + 2} - ${button}`,
      "Məzmunu müəllim sonradan PowerPoint daxilində doldurur.",
    );
    addTeacherPlaceholder(slide, pptx, theme, kidsMode);

    slide.addText("⬅ Geri", {
      x: 0.74,
      y: 5.55,
      w: 1.75,
      h: 0.5,
      fontFace: theme.titleFont,
      fontSize: 16,
      bold: true,
      color: theme.buttonText,
      align: "center",
      valign: "mid",
      shape: pptx.ShapeType.rect,
      fill: { color: theme.accent },
      line: { color: theme.accent, transparency: 100 },
      hyperlink: { slide: 1, tooltip: "Əsas menyuya qayıt" },
      margin: 0.06,
    });

    slide.addNotes(
      [
        `Bölmə: ${button}`,
        "Müəllim burada izahlar, suallar, çalışmalar və videolar yerləşdirə bilər.",
      ].join("\n"),
    );
  });

  return pptx;
}

async function downloadPresentation() {
  const subject = plannerState.subject;
  const grade = plannerState.grade;
  const buttons = plannerState.buttons;

  if (!subject || !grade || !buttons.length) {
    updateFormMessage("Əvvəlcə təqdimat quruluşunu hazırlayın.");
    return;
  }

  updateFormMessage("PowerPoint hazırlanır...");
  downloadButton.disabled = true;

  try {
    const pptx = buildPresentation(subject, grade, buttons);
    const fileName = createPptxFileName(subject, grade);
    await pptx.writeFile({ fileName });
    updateFormMessage("PowerPoint uğurla yükləndi.");
  } catch (error) {
    updateFormMessage("PowerPoint yaradılarkən xəta baş verdi.");
    console.error(error);
  } finally {
    downloadButton.disabled = false;
  }
}

subjectInput.addEventListener("input", () => {
  renderSuggestionChips();
  if (getButtonCount()) {
    buildButtonFields(getButtonCount());
  }
});

countInputs.forEach((input) => {
  input.addEventListener("change", () => {
    updateFormMessage("");
    buildButtonFields(getButtonCount());
  });
});

fillSuggestionsButton.addEventListener("click", fillFromSuggestions);
resetButton.addEventListener("click", resetPlanner);
downloadButton.addEventListener("click", downloadPresentation);

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(copyBuffer.value);
    updateFormMessage("Plan mətni panoya kopyalandı.");
  } catch (error) {
    copyBuffer.select();
    document.execCommand("copy");
    updateFormMessage("Plan mətni panoya kopyalandı.");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  updateFormMessage("");

  const subject = getCanonicalSubject(subjectInput.value);
  const grade = normalizeText(classInput.value);
  const count = getButtonCount();
  const buttons = collectButtonNames();

  if (!subject || !grade || !count) {
    updateFormMessage("Zəhmət olmasa bütün əsas sahələri doldurun.");
    return;
  }

  if (buttons.length !== count || buttons.some((button) => !button)) {
    updateFormMessage("Seçilmiş say qədər düymə adı yazılmalıdır.");
    return;
  }

  if (new Set(buttons.map((button) => foldText(button))).size !== buttons.length) {
    updateFormMessage("Düymə adları bir-birindən fərqli olmalıdır.");
    return;
  }

  renderResult(subject, grade, buttons);
  resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
  await downloadPresentation();
});

downloadButton.disabled = true;
renderSuggestionChips();
