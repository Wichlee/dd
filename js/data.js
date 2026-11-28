/* Data extracted from Bender, Gebru et al. (2021), "On the Dangers of Stochastic Parrots" */

const MODELS = [
  { year: 2019, name: "BERT",            params: 3.40e8,  dataGB: 16,   color: "#5c9dff" },
  { year: 2019, name: "DistilBERT",      params: 6.60e7,  dataGB: 16,   color: "#5c9dff" },
  { year: 2019, name: "ALBERT",          params: 2.23e8,  dataGB: 16,   color: "#5c9dff" },
  { year: 2019, name: "XLNet (Large)",   params: 3.40e8,  dataGB: 126,  color: "#38b6a8" },
  { year: 2020, name: "ERNIE-Gen",       params: 3.40e8,  dataGB: 16,   color: "#8aa0f0" },
  { year: 2019, name: "RoBERTa (Large)", params: 3.55e8,  dataGB: 161,  color: "#38b6a8" },
  { year: 2019, name: "MegatronLM",      params: 8.30e9,  dataGB: 174,  color: "#38b6a8" },
  { year: 2020, name: "T5-11B",          params: 1.10e10, dataGB: 745,  color: "#f0a35e" },
  { year: 2020, name: "T-NLG",           params: 1.70e10, dataGB: 174,  color: "#38b6a8" },
  { year: 2020, name: "GPT-3",           params: 1.75e11, dataGB: 570,  color: "#ffd166" },
  { year: 2020, name: "GShard",          params: 6.00e11, dataGB: null, color: "#f0a35e" },
  { year: 2021, name: "Switch-C",        params: 1.57e12, dataGB: 745,  color: "#f05c7a" },
];

/* Timeline steps (in years) the bubble chart animates through */
const TIMELINE_YEARS = [2019, 2020, 2021];

/* Historical figures reported in Bender et al. (2021), §3, p. 612.
   The paper labels the training figure CO₂ and the human average CO₂e. */
const COST_FACTS = {
  transformerCO2: 284,    // tonnes CO₂, Transformer with architecture search
  humanYearCO2e: 5,       // tonnes CO₂e per person per year, 2017 global average
  bleuGain: 0.1,
  bleuCostDollars: 150000,
  computeGrowth: 300000,  // increase in compute over six years
};

/* Representativeness facts (§4) */
const BIAS_FACTS = {
  redditMale: 67,           // % male US reddit users (Pew 2016)
  redditYoung: 64,          // % aged 18-29
  wikiFemaleRange: [8.8, 15], // % women/girls Wikipedia editors
  languagesNoSupport: 90,   // % of world's low-resource languages w/o tech support
  badWordCount: 400,        // ~400 "bad words" in C4 filter
};

/* ------------------------------------------------------------------
   Next-word autocomplete simulator (Section 1, @Erik).
   ILLUSTRATIVE probabilities — plausible next-word distributions,
   NOT measured values from the paper. Kept static on purpose:
   the point is the *mechanism* (picking likely, not true, words).

   Branching tree: each key is the sentence-so-far, its value is the
   list of next candidates. Whichever word you pick, the branch always
   ends in a complete, sensible sentence — the model never had to know
   what it meant to get there.
------------------------------------------------------------------- */
const AUTOCOMPLETE_STEPS = {
  "The doctor said":              [["she", 41], ["he", 37], ["that", 14]],

  "The doctor said she":          [["was", 38], ["would", 27], ["had", 19]],
  "The doctor said he":           [["was", 36], ["would", 28], ["had", 21]],
  "The doctor said that":         [["she", 35], ["he", 30], ["it", 16]],

  "The doctor said she was":      [["tired", 22], ["fine", 18], ["wrong", 12]],
  "The doctor said she would":    [["leave", 20], ["agree", 16], ["wait", 13]],
  "The doctor said she had":      [["a fever", 24], ["surgery", 17], ["a point", 13]],
  "The doctor said he was":       [["right", 19], ["wrong", 14], ["there", 13]],
  "The doctor said he would":     [["wait", 18], ["leave", 16], ["come", 13]],
  "The doctor said he had":       [["a fever", 22], ["surgery", 16], ["a point", 12]],

  "The doctor said that she":     [["was", 34], ["would", 25], ["had", 18]],
  "The doctor said that he":      [["was", 33], ["would", 26], ["had", 19]],
  "The doctor said that it":      [["was", 36], ["would", 22], ["had", 15]],

  "The doctor said that she was": [["tired", 20], ["fine", 16], ["wrong", 11]],
  "The doctor said that she would": [["leave", 18], ["agree", 15], ["wait", 12]],
  "The doctor said that she had": [["a fever", 20], ["surgery", 15], ["a point", 11]],
  "The doctor said that he was":  [["right", 17], ["wrong", 13], ["there", 12]],
  "The doctor said that he would": [["wait", 17], ["leave", 15], ["come", 12]],
  "The doctor said that he had":  [["a fever", 20], ["surgery", 15], ["a point", 11]],
  "The doctor said that it was":  [["true", 21], ["raining", 15], ["too late", 12]],
  "The doctor said that it would": [["rain", 18], ["work", 15], ["hurt", 11]],
  "The doctor said that it had":  [["started", 16], ["to hurt", 13], ["been long", 10]],
};
const AUTOCOMPLETE_ENDING =
  "…and it never once wondered which word it chose — or what it meant.";
