type Pattern = "3" | "4" | "5" | "3-3" | "2-2-2-2" | "3-2-3" | "3-3-2";

interface RuleBreakdownItem {
  points: number;
  reason: string;
}

interface ScoredGrouping {
  pattern: Pattern;
  groups: string[];
  formatted: string;
  score: number;
  breakdown: RuleBreakdownItem[];
}

interface NumberSeries {
  name: string;
  rangeStart: string;
  rangeEnd: string;
  validPatterns: Pattern[];
}

const TIE_BREAK_ORDER: Partial<Record<Pattern, number>> = {
  "2-2-2-2": 0,
  "3-2-3": 1,
  "3-3-2": 2,
};

// Ordered: specific sub-ranges before catch-all ranges
const NUMBER_SERIES: NumberSeries[] = [
  { name: "Spesialnummer", rangeStart: "100", rangeEnd: "115", validPatterns: ["3"] },
  { name: "Spesialnummer", rangeStart: "117", rangeEnd: "179", validPatterns: ["3"] },
  { name: "Spesialnummer", rangeStart: "190", rangeEnd: "199", validPatterns: ["3"] },
  { name: "Opplysningstjeneste", rangeStart: "1800", rangeEnd: "1899", validPatterns: ["4"] },
  { name: "Spesialnummer", rangeStart: "02000", rangeEnd: "09999", validPatterns: ["5"] },
  { name: "Spesialnummer", rangeStart: "116000", rangeEnd: "116999", validPatterns: ["3-3"] },
  { name: "Fastnettnummer", rangeStart: "20000000", rangeEnd: "39999999", validPatterns: ["2-2-2-2"] },
  { name: "Mobilnummer", rangeStart: "40000000", rangeEnd: "49999999", validPatterns: ["2-2-2-2", "3-2-3"] },
  { name: "Fastnettnummer", rangeStart: "50000000", rangeEnd: "57999999", validPatterns: ["2-2-2-2"] },
  { name: "Fastnettnummer", rangeStart: "60000000", rangeEnd: "79999999", validPatterns: ["2-2-2-2"] },
  { name: "Gratisnummer", rangeStart: "80000000", rangeEnd: "80099999", validPatterns: ["3-2-3"] },
  { name: "Spesialnummer", rangeStart: "81000000", rangeEnd: "81099999", validPatterns: ["3-2-3"] },
  { name: "Spesialnummer", rangeStart: "81500000", rangeEnd: "81599999", validPatterns: ["3-2-3", "3-3-2"] },
  { name: "Spesialnummer", rangeStart: "82000000", rangeEnd: "82099999", validPatterns: ["3-2-3"] },
  { name: "Spesialnummer", rangeStart: "80100000", rangeEnd: "89999999", validPatterns: ["2-2-2-2"] },
  { name: "Mobilnummer", rangeStart: "90000000", rangeEnd: "99999999", validPatterns: ["2-2-2-2", "3-2-3"] },
];

function classifyNumber(digits: string): NumberSeries | null {
  for (const series of NUMBER_SERIES) {
    const len = series.rangeStart.length;
    if (digits.length === len && digits >= series.rangeStart && digits <= series.rangeEnd) {
      return series;
    }
  }
  return null;
}

function couldMatchSeries(digits: string): boolean {
  for (const series of NUMBER_SERIES) {
    const len = series.rangeStart.length;
    if (digits.length > len) continue;
    const minPadded = digits.padEnd(len, "0");
    const maxPadded = digits.padEnd(len, "9");
    if (maxPadded >= series.rangeStart && minPadded <= series.rangeEnd) {
      return true;
    }
  }
  return false;
}

function getExpectedLength(digits: string): number {
  const possibleLengths = new Set<number>();
  for (const series of NUMBER_SERIES) {
    const len = series.rangeStart.length;
    if (digits.length > len) continue;
    const minPadded = digits.padEnd(len, "0");
    const maxPadded = digits.padEnd(len, "9");
    if (maxPadded >= series.rangeStart && minPadded <= series.rangeEnd) {
      possibleLengths.add(len);
    }
  }
  if (possibleLengths.size === 0) return 8;
  return Math.max(...possibleLengths);
}

const DEFAULT_PATTERN_FOR_LENGTH: Record<number, Pattern> = {
  3: "3",
  4: "4",
  5: "5",
  6: "3-3",
  8: "2-2-2-2",
};

const DIGIT_POSITIONS_BY_PATTERN: Record<Pattern, number[]> = {
  "3": [0, 1, 2],
  "4": [0, 1, 2, 3],
  "5": [0, 1, 2, 3, 4],
  "3-3": [0, 1, 2, 4, 5, 6],
  "2-2-2-2": [0, 1, 3, 4, 6, 7, 9, 10],
  "3-2-3": [0, 1, 2, 4, 5, 7, 8, 9],
  "3-3-2": [0, 1, 2, 4, 5, 6, 8, 9],
};

const MAXLENGTH_BY_PATTERN: Record<Pattern, number> = {
  "3": 3,
  "4": 4,
  "5": 5,
  "3-3": 7,
  "2-2-2-2": 11,
  "3-2-3": 10,
  "3-3-2": 10,
};

const GROUP_SIZES_BY_PATTERN: Record<Pattern, number[]> = {
  "3": [3],
  "4": [4],
  "5": [5],
  "3-3": [3, 3],
  "2-2-2-2": [2, 2, 2, 2],
  "3-2-3": [3, 2, 3],
  "3-3-2": [3, 3, 2],
};

let currentDisplayPattern: Pattern = "2-2-2-2";
let currentExpectedLength = 8;

function getDigitPositions(): number[] {
  return DIGIT_POSITIONS_BY_PATTERN[currentDisplayPattern];
}

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required DOM element is missing: ${id}`);
  }
  return element as T;
}

function splitByPattern(input: string, pattern: Pattern): string[] | null {
  const sizes = GROUP_SIZES_BY_PATTERN[pattern];
  const expectedLen = sizes.reduce((a, b) => a + b, 0);
  if (input.length !== expectedLen) return null;

  const groups: string[] = [];
  let offset = 0;
  for (const size of sizes) {
    groups.push(input.slice(offset, offset + size));
    offset += size;
  }
  return groups;
}

function scoreGroups(
  groups: string[],
  pattern: Pattern,
): { score: number; breakdown: RuleBreakdownItem[] } {
  const breakdown: RuleBreakdownItem[] = [];
  let score = 0;

  function addRule(points: number, reason: string): void {
    score += points;
    breakdown.push({ points, reason });
  }

  if (pattern === "2-2-2-2") {
    addRule(10, "Grunnrytme: jevn 2-2-2-2");
  }

  if (pattern === "3-2-3") {
    addRule(10, "Grunnrytme: symmetrisk 3-2-3");
  }

  if (pattern === "3-3-2") {
    addRule(10, "Grunnrytme: vektet 3-3-2");
  }

  if (pattern === "2-2-2-2") {
    for (let i = 0; i < groups.length - 1; i += 1) {
      const left = groups[i];
      const right = groups[i + 1];
      if (left[0] === right[1] && left[1] === right[0]) {
        addRule(3, `Speilvendte nabogrupper: ${left} og ${right}`);
      }
    }

    const endingDigitCounts: Record<string, number> = {};
    for (const group of groups) {
      const endDigit = group[group.length - 1];
      endingDigitCounts[endDigit] = (endingDigitCounts[endDigit] ?? 0) + 1;
    }

    for (const [digit, count] of Object.entries(endingDigitCounts)) {
      if (count >= 2) {
        addRule(2, `${count} grupper slutter med sifferet ${digit}`);
        break;
      }
    }
  }

  for (const group of groups) {
    if (new Set(group).size === 1) {
      addRule(2, `Repeterte sifre i gruppen ${group}`);
    }

    if (group === "123" || group === "321") {
      addRule(3, `Enkel sekvens i gruppen ${group}`);
    }

    if (group.length === 3 && /^[1-9]00$/.test(group)) {
      addRule(1, `Rund hundrergruppe ${group}`);
    }

    if (group.length === 2 && /^[1-9]0$/.test(group)) {
      addRule(1, `Rund tiergruppe ${group}`);
    }
  }

  if (pattern === "3-2-3") {
    const first = groups[0];
    const middle = groups[1];
    const last = groups[2];

    if (first === "123" || first === "321") {
      addRule(2, `Gjenkjennelig startgruppe ${first}`);
    }
    if (last === "123" || last === "321") {
      addRule(2, `Gjenkjennelig sluttgruppe ${last}`);
    }

    if (first[0] === first[1] || first[1] === first[2]) {
      addRule(1, `Repeterte nabosifre i ${first}`);
    }
    if (last[0] === last[1] || last[1] === last[2]) {
      addRule(1, `Repeterte nabosifre i ${last}`);
    }

    if (
      first[first.length - 1] === middle[middle.length - 1] &&
      middle[middle.length - 1] === last[last.length - 1]
    ) {
      addRule(2, "Alle grupper slutter med samme siffer");
    }
  }

  if (pattern === "3-3-2" && groups.join("") === "81549300") {
    addRule(10, "Kykelikokos");
  }

  return { score, breakdown };
}

function evaluatePattern(
  input: string,
  pattern: Pattern,
): ScoredGrouping | null {
  const groups = splitByPattern(input, pattern);
  if (!groups) {
    return null;
  }

  const scoring = scoreGroups(groups, pattern);

  return {
    pattern,
    groups,
    formatted: groups.join(" "),
    score: scoring.score,
    breakdown: scoring.breakdown,
  };
}

function evaluateForSeries(input: string, series: NumberSeries): {
  best: ScoredGrouping;
  lessIdeal: ScoredGrouping | null;
} {
  const candidates: ScoredGrouping[] = [];
  for (const pattern of series.validPatterns) {
    const result = evaluatePattern(input, pattern);
    if (result) candidates.push(result);
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (TIE_BREAK_ORDER[a.pattern] ?? 0) - (TIE_BREAK_ORDER[b.pattern] ?? 0);
  });

  return {
    best: candidates[0],
    lessIdeal: candidates.length > 1 ? candidates[1] : null,
  };
}

function formatMask(rawDigits: string, len: number): string {
  const padded = rawDigits.padEnd(len, "0").slice(0, len);
  const sizes = GROUP_SIZES_BY_PATTERN[currentDisplayPattern];
  const groups: string[] = [];
  let offset = 0;
  for (const size of sizes) {
    groups.push(padded.slice(offset, offset + size));
    offset += size;
  }
  return groups.join(" ");
}

const phoneInput = getRequiredElement<HTMLInputElement>("phone-input");
const phoneOverlay = getRequiredElement<HTMLElement>("phone-overlay");
const inputWrapper = phoneInput.closest(".input-wrapper") as HTMLElement;
const result = getRequiredElement<HTMLElement>("result");
const rulesList = getRequiredElement<HTMLUListElement>("rules-list");

let digitSlots: Array<string | null> = Array(8).fill(null);
let lastResult: {
  series: NumberSeries;
  best: ScoredGrouping;
  lessIdeal: ScoredGrouping | null;
} | null = null;

function isComplete(): boolean {
  return digitSlots.length === currentExpectedLength &&
    digitSlots.every((value) => value !== null);
}

function slotsToNumber(): string {
  return digitSlots.map((value) => value ?? "0").join("");
}

function formatMaskFromSlots(): string {
  return formatMask(slotsToNumber(), currentExpectedLength);
}

function getLeadingDigits(): string {
  let digits = "";
  for (const slot of digitSlots) {
    if (slot === null) break;
    digits += slot;
  }
  return digits;
}

function resizeSlots(newLength: number): void {
  if (newLength === digitSlots.length) return;
  if (newLength < digitSlots.length) {
    digitSlots = digitSlots.slice(0, newLength);
  } else {
    digitSlots = [...digitSlots, ...Array(newLength - digitSlots.length).fill(null) as null[]];
  }
}

function recalcExpectedLength(): void {
  const leading = getLeadingDigits();
  const newExpected = leading.length > 0 ? getExpectedLength(leading) : 8;
  if (newExpected !== currentExpectedLength) {
    currentExpectedLength = newExpected;
    resizeSlots(newExpected);
    lastResult = null;
    const defaultPattern = DEFAULT_PATTERN_FOR_LENGTH[newExpected];
    if (defaultPattern) {
      applyPattern(defaultPattern);
    }
  }
}

function visualPosToDigitIndex(visualPos: number): number {
  const positions = getDigitPositions();
  let idx = 0;
  while (idx < positions.length && positions[idx] < visualPos) {
    idx += 1;
  }
  return idx;
}

function digitIndexToVisualPos(digitIndex: number): number {
  const positions = getDigitPositions();
  if (digitIndex <= 0) {
    return positions[0];
  }
  if (digitIndex >= positions.length) {
    return positions[positions.length - 1] + 1;
  }
  return positions[digitIndex];
}

let activeDigitIndex = 0;
let allSelected = false;

function firstEmptyIndex(): number {
  const idx = digitSlots.indexOf(null);
  return idx === -1 ? currentExpectedLength : idx;
}

function clampToFilled(digitIndex: number): number {
  const maxPos = firstEmptyIndex();
  return Math.min(digitIndex, maxPos);
}

function setCaretByDigitIndex(digitIndex: number): void {
  allSelected = false;
  const clamped = clampToFilled(digitIndex);
  activeDigitIndex = Math.max(0, Math.min(currentExpectedLength - 1, clamped));
  const pos = digitIndexToVisualPos(clamped);
  requestAnimationFrame(() => {
    phoneInput.setSelectionRange(pos, pos);
  });
  updateHighlight();
}

function selectAllDigits(): void {
  allSelected = true;
  const endPos = digitIndexToVisualPos(currentExpectedLength);
  phoneInput.setSelectionRange(0, endPos);
  phoneOverlay.querySelectorAll(".digit, .placeholder").forEach((el) => {
    el.classList.add("active");
  });
}

function clearAllSlots(): void {
  digitSlots.fill(null);
  lastResult = null;
  allSelected = false;
}

function clearRange(startVisual: number, endVisual: number): number {
  const startIdx = visualPosToDigitIndex(startVisual);
  const endIdx = visualPosToDigitIndex(endVisual);
  for (let i = startIdx; i < endIdx; i += 1) {
    digitSlots[i] = null;
  }
  return startIdx;
}

function normalizeCaretFromCurrentPosition(): void {
  const start = phoneInput.selectionStart ?? 0;
  const idx = visualPosToDigitIndex(start);
  setCaretByDigitIndex(idx);
}

function updateHighlight(): void {
  const digitSpans = phoneOverlay.querySelectorAll(".digit, .placeholder");
  digitSpans.forEach((span, i) => {
    span.classList.toggle("active", i === activeDigitIndex);
  });
}

function renderResult(
  series: NumberSeries,
  best: ScoredGrouping,
): void {
  rulesList.innerHTML = "";

  const seriesLi = document.createElement("li");
  seriesLi.textContent = series.name;
  rulesList.appendChild(seriesLi);

  for (const item of best.breakdown) {
    if (item.reason.startsWith("Grunnrytme:")) continue;
    const li = document.createElement("li");
    li.textContent = item.reason;
    rulesList.appendChild(li);
  }

  result.classList.remove("hidden");
}

function renderOverlay(): void {
  const sizes = GROUP_SIZES_BY_PATTERN[currentDisplayPattern];
  let digitIdx = 0;
  const spans: string[] = [];

  for (let g = 0; g < sizes.length; g += 1) {
    if (g > 0) {
      spans.push('<span class="space"> </span>');
    }
    for (let i = 0; i < sizes[g]; i += 1) {
      const filled = digitSlots[digitIdx] !== null;
      const char = digitSlots[digitIdx] ?? "0";
      const cls = filled ? "digit" : "placeholder";
      spans.push(`<span class="${cls}">${char}</span>`);
      digitIdx += 1;
    }
  }

  phoneOverlay.innerHTML = spans.join("");
}

function applyPattern(pattern: Pattern): void {
  currentDisplayPattern = pattern;
  phoneInput.maxLength = MAXLENGTH_BY_PATTERN[pattern];
}

function resizeInputToFit(): void {
  const charCount = MAXLENGTH_BY_PATTERN[currentDisplayPattern];
  inputWrapper.style.width = `min(calc(${charCount}ch + 300px), 100%)`;
}

function refreshView(): void {
  recalcExpectedLength();

  if (isComplete()) {
    const digits = slotsToNumber();
    const series = classifyNumber(digits);

    if (series) {
      const evaluation = evaluateForSeries(digits, series);
      lastResult = { series, best: evaluation.best, lessIdeal: evaluation.lessIdeal };
      applyPattern(evaluation.best.pattern);
      phoneInput.value = formatMaskFromSlots();
      renderOverlay();
      resizeInputToFit();
      updateHighlight();
      renderResult(series, evaluation.best);
      return;
    }

    // Complete but invalid number
    lastResult = null;
  }

  if (lastResult) {
    applyPattern(lastResult.best.pattern);
    phoneInput.value = formatMaskFromSlots();
    renderOverlay();
    resizeInputToFit();
    updateHighlight();
    result.classList.add("hidden");
    return;
  }

  const defaultPattern = DEFAULT_PATTERN_FOR_LENGTH[currentExpectedLength] ?? "2-2-2-2";
  applyPattern(defaultPattern);
  phoneInput.value = formatMaskFromSlots();
  renderOverlay();
  resizeInputToFit();
  updateHighlight();
  result.classList.add("hidden");
}

phoneInput.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  const start = phoneInput.selectionStart ?? 0;
  const end = phoneInput.selectionEnd ?? start;
  const hasSelection = start !== end;

  if (/^\d$/.test(event.key)) {
    event.preventDefault();

    if (allSelected) {
      clearAllSlots();
      recalcExpectedLength();
      digitSlots[0] = event.key;
      refreshView();
      setCaretByDigitIndex(1);
      return;
    }

    const insertionIdx =
      hasSelection ? clearRange(start, end) : visualPosToDigitIndex(start);

    if (insertionIdx < currentExpectedLength) {
      digitSlots[insertionIdx] = event.key;
      refreshView();
      setCaretByDigitIndex(insertionIdx + 1);
    }
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();

    if (allSelected) {
      clearAllSlots();
      recalcExpectedLength();
      refreshView();
      setCaretByDigitIndex(0);
      return;
    }

    if (hasSelection) {
      const idx = clearRange(start, end);
      refreshView();
      setCaretByDigitIndex(idx);
      return;
    }

    const caretIdx = visualPosToDigitIndex(start);
    const targetIdx = caretIdx - 1;
    if (targetIdx >= 0) {
      digitSlots[targetIdx] = null;
      refreshView();
      setCaretByDigitIndex(targetIdx);
    }
    return;
  }

  if (event.key === "Delete") {
    event.preventDefault();

    if (allSelected) {
      clearAllSlots();
      recalcExpectedLength();
      refreshView();
      setCaretByDigitIndex(0);
      return;
    }

    if (hasSelection) {
      const idx = clearRange(start, end);
      refreshView();
      setCaretByDigitIndex(idx);
      return;
    }

    const targetIdx = visualPosToDigitIndex(start);
    if (targetIdx < currentExpectedLength) {
      digitSlots[targetIdx] = null;
      refreshView();
      setCaretByDigitIndex(targetIdx);
    }
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (allSelected) {
      setCaretByDigitIndex(0);
      return;
    }
    const idx = visualPosToDigitIndex(start);
    setCaretByDigitIndex(Math.max(0, idx - 1));
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    if (allSelected) {
      setCaretByDigitIndex(firstEmptyIndex());
      return;
    }
    const idx = visualPosToDigitIndex(start);
    setCaretByDigitIndex(idx + 1);
    return;
  }

  if (event.key === "Home") {
    event.preventDefault();
    setCaretByDigitIndex(0);
    return;
  }

  if (event.key === "End") {
    event.preventDefault();
    setCaretByDigitIndex(firstEmptyIndex());
    return;
  }

  if (event.key === "Tab") {
    return;
  }

  event.preventDefault();
});

phoneInput.addEventListener("paste", (event: ClipboardEvent) => {
  event.preventDefault();

  if (allSelected) {
    clearAllSlots();
    recalcExpectedLength();
  }

  const start = phoneInput.selectionStart ?? 0;
  const end = phoneInput.selectionEnd ?? start;
  const insertionIdx =
    start !== end ? clearRange(start, end) : visualPosToDigitIndex(start);

  const pastedText = event.clipboardData?.getData("text") ?? "";
  const pasted = pastedText.replace(/\D/g, "");
  let writeIdx = insertionIdx;
  for (const ch of pasted) {
    if (writeIdx >= currentExpectedLength) {
      break;
    }
    digitSlots[writeIdx] = ch;
    writeIdx += 1;
  }

  refreshView();
  setCaretByDigitIndex(writeIdx);
});

phoneInput.addEventListener("click", () => {
  if (allSelected) return;
  const start = phoneInput.selectionStart ?? 0;
  const idx = visualPosToDigitIndex(start);
  setCaretByDigitIndex(idx);
});

phoneInput.addEventListener("mouseup", () => {
  if (allSelected) return;
  const start = phoneInput.selectionStart ?? 0;
  const idx = visualPosToDigitIndex(start);
  setCaretByDigitIndex(idx);
});

phoneInput.addEventListener("focus", () => {
  if (isComplete()) {
    selectAllDigits();
    return;
  }

  const nextEmpty = firstEmptyIndex();
  if (nextEmpty === 0) {
    setCaretByDigitIndex(0);
  } else {
    setCaretByDigitIndex(nextEmpty);
  }
});

phoneInput.addEventListener("blur", () => {
  allSelected = false;
  phoneOverlay.querySelectorAll(".active").forEach((el) => {
    el.classList.remove("active");
  });
});

phoneInput.addEventListener("input", () => {
  // Keep the component controlled even if browser/autofill mutates the value.
  refreshView();
  normalizeCaretFromCurrentPosition();
});

refreshView();
phoneInput.focus();
setCaretByDigitIndex(0);
