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
const copyBuffer = document.querySelector("#copy-buffer");

let manualNames = [];

function normalizeSubject(subject) {
  return subject.trim().replace(/\s+/g, " ");
}

function foldText(text) {
  return normalizeSubject(text).toLocaleLowerCase("az");
}

function makeSlideId(label) {
  return `slide-${encodeURIComponent(foldText(label))}`;
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
}

function buildButtonFields(count) {
  buttonInputsContainer.innerHTML = "";

  if (!count) {
    return;
  }

  const suggestions = getSuggestions(subjectInput.value);
  manualNames = Array.from({ length: count }, (_, index) => {
    return manualNames[index]?.trim() || suggestions[index] || "";
  });

  manualNames.forEach((value, index) => {
    const wrapper = document.createElement("label");
    wrapper.className = "button-field";

    const indexBadge = document.createElement("span");
    indexBadge.className = "button-field__index";
    indexBadge.textContent = String(index + 1).padStart(2, "0");

    const input = document.createElement("input");
    input.type = "text";
    input.name = `buttonName-${index}`;
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

  const emptyIndex = manualNames.findIndex((name) => !name.trim());
  if (emptyIndex < 0) {
    updateFormMessage(
      "Bütün düymə sahələri doludur. Dəyişiklik üçün mövcud adlardan birini redaktə edin.",
    );
    return;
  }

  const targetIndex = emptyIndex;
  manualNames[targetIndex] = suggestion;
  textInputs[targetIndex].value = suggestion;
  textInputs[targetIndex].focus();
  syncActiveChips();
  updateFormMessage(`"${suggestion}" düymə siyahısına əlavə edildi.`);
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
    const isActive = selectedNames.includes(foldText(chip.textContent));
    chip.classList.toggle("is-active", isActive);
  });
}

function collectButtonNames() {
  return Array.from(buttonInputsContainer.querySelectorAll("input"))
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function getCanonicalSubject(subject) {
  const matchedSubject = curriculumSubjects.find(
    (item) => foldText(item) === foldText(subject),
  );
  return matchedSubject || normalizeSubject(subject);
}

function buildCopyText(subject, grade, buttons) {
  const lines = [];
  lines.push("Sizin təqdimat strukturunuz hazırdır!");
  lines.push("");
  lines.push(`Fənn: ${subject}`);
  lines.push(`Sinif: ${grade}`);
  lines.push("");
  lines.push("SLAYD 1 — Giriş (Menu)");
  buttons.forEach((button) => lines.push(`- ${button}`));
  lines.push("");
  buttons.forEach((button, index) => {
    lines.push(`SLAYD ${index + 2} — ${button}`);
  });
  lines.push("");
  lines.push("Keçid qaydaları:");
  lines.push("- Hər giriş düyməsini aid olduğu slayda bağlayın.");
  lines.push('- Hər slaydın üzərində "⬅ Geri" düyməsi yerləşdirin.');
  lines.push("- “⬅ Geri” düyməsi əsas menyuya qayıtsın.");
  lines.push("");
  lines.push("Müəllim üçün qeyd:");
  lines.push("- Dərs məzmunu avtomatik yaradılmır.");
  lines.push("- İzahlar, suallar, çalışmalar və videolar müəllim tərəfindən əlavə olunur.");
  return lines.join("\n");
}

function renderResult(subject, grade, buttons) {
  emptyState.classList.add("hidden");
  resultArea.classList.remove("hidden");

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
    <p><strong>SLAYD 1 — Giriş (Menu)</strong></p>
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
      <p><strong>SLAYD ${index + 2} — ${button}</strong></p>
      <span>Bu hissənin məzmununu müəllim dolduracaq.</span>
      <button type="button" class="back-chip">⬅ Geri</button>
    `;
    slideCard.querySelector(".back-chip").addEventListener("click", () => {
      document.querySelector(".menu-preview").scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    slidePlan.appendChild(slideCard);
  });

  copyBuffer.value = buildCopyText(subject, grade, buttons);
}

function resetPlanner() {
  form.reset();
  manualNames = [];
  buttonInputsContainer.innerHTML = "";
  emptyState.classList.remove("hidden");
  resultArea.classList.add("hidden");
  updateFormMessage("");
  renderSuggestionChips();
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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateFormMessage("");

  const subject = normalizeSubject(subjectInput.value);
  const grade = classInput.value.trim();
  const count = getButtonCount();
  const buttons = collectButtonNames();

  if (!subject || !grade || !count) {
    updateFormMessage("Zəhmət olmasa bütün əsas sahələri doldurun.");
    return;
  }

  if (buttons.length !== count || buttons.some((button) => !button.trim())) {
    updateFormMessage("Seçilmiş say qədər düymə adı yazılmalıdır.");
    return;
  }

  const uniqueButtons = new Set(
    buttons.map((button) => foldText(button)),
  );

  if (uniqueButtons.size !== buttons.length) {
    updateFormMessage("Düymə adları bir-birindən fərqli olmalıdır.");
    return;
  }

  renderResult(getCanonicalSubject(subject), grade, buttons);
  resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
});

renderSuggestionChips();
