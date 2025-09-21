// Core Recognition Patterns
export const Patterns = (() => {
  const c = (s: string | RegExp, flags = "") => new RegExp(s, flags);
  return {
    basmala: new RegExp("^\\s*بسم\\s+الله\\s+الرحمن\\s+الرحيم\\s*$", "i"),
    // Expanded to include a wide range of Unicode bullets, list markers, and asterisks/dashes at the start of a line.
    characterBullets: new RegExp("^[\\s\\t]*[\\u25A0-\\u25FF\\u2610-\\u2612\\•\\◦\\▪\\▫\\▸\\◂\\‣\\*\\-–—]+\\s*"),
    characterNames: new RegExp("^([\\u0600-\\u26FFا-ي\\s]+)\\s*[:：]\\s*"),
    dialogueHeuristics: new RegExp("^(أنا|أنت|نعم|لا|ربما|آه|أوه)|[؟!]$"),
    sceneKeywords: c("^(مشهد|لقطة|منظر|مكان|زمن|وقت|SCENE|LOCATION|TIME|INT\\.|EXT\\.)\\s*", "i"),
    // Regex to detect if a line is likely a character name (ALL CAPS, short)
    isCharacter: new RegExp("^[A-Z\\s]{2,50}$"),
    locationWords: new RegExp("^(مسجد|بيت|منزل|دار|شقة|فيلا|مكتب|محل|دكان|مقهى|مطعم|فندق|مستشفى|مدرسة|جامعة|كلية|شارع|طريق|ميدان|حديقة|نيل|بحر|صحراء|جبل|قرية|مدينة|سيارة|أتوبيس|قطار|طائرة|باب|نافذة|سلم|سطح|بلكونة|حمام|مطبخ|صالة|غرفة)", "i"),
    timeIndicators: new RegExp("(ليل|نهار|صباح|ظهر|عصر|مغرب|عشاء|فجر|ضحى|صيف|شتاء|ربيع|خريف|أمس|اليوم|غدا|الآن|لاحقا|بعدها|قبلها|morning|night|day|evening)", "i"),
    actionKeywords: c("^(يدخل|يخرج|يقف|يجلس|يمشي|يجري|ينظر|يبتسم|يضحك|يبكي|يصرخ|يهمس|يفكر|يتذكر|فجأة|ببطء|بسرعة|بهدوء|بعنف)", "i"),
    directorNotes: c("^\\s*\\(.*\\)\\s*$"),
    transitions: c("^(قطع|قطع إلى|انتقال إلى|تلاشي|تلاشي أسود|CUT TO|FADE IN|FADE OUT|DISSOLVE TO)", "i"),
    numberedScene: c("^(مشهد|لقطة)\\s*(\\d+)\\s*[:：\\-–—]?\\s*(.*)", "i"),
    sceneHeader1: c(/^مشهد\s*\d+\s*$/i),
    sceneHeader2: {
      time: /(ليل|نهار|صباح|مساء)/i,
      inOut: /(داخلي|خارجي)/i,
    },
    sceneHeader3: c(/^(مسجد|بيت|منزل|شارع|حديقة|مدرسة|جامعة|مكتب|محل|مستشفى|مطعم|فندق|سيارة|غرفة|قاعة|ممر|سطح|ساحة|مقبرة|مخبز|مكتبة)/i),
  };
})();
