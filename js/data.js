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

/* Environmental / financial cost facts (§3) */
const COST_FACTS = {
  transformerCO2: 284,      // tonnes CO2e to train Transformer (big) with NAS
  humanYearCO2: 5,          // average human emissions per year (2017)
  bertFlight: "1 trans-Atlantic flight", // energy to train single BERT base
  bleuGain: 0.1,            // BLEU improvement
  bleuCostDollars: 150000,  // compute cost for +0.1 BLEU, EN->DE
  computeGrowth: 300000,    // x compute growth in 6 years
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
------------------------------------------------------------------- */
const AUTOCOMPLETE_STEPS = [
  { sentence: "The doctor said", options: [["she", 41], ["he", 37], ["that", 14]] },
  { sentence: "The doctor said she", options: [["was", 38], ["would", 27], ["had", 19]] },
  { sentence: "The doctor said she was", options: [["tired", 22], ["fine", 18], ["wrong", 12]] },
];
const AUTOCOMPLETE_ENDING =
  "…and it never once wondered which word it chose — or what it meant.";
