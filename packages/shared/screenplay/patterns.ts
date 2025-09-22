// Core Recognition Patterns
export const Patterns = (() => {
  const c = (s: string | RegExp, flags = "") => new RegExp(s, flags);
  return {
    basmala: new RegExp("^\\s*[\\{\\}]?\\s*بسم\\s+الله\\s+الرحمن\\s+الرحيم\\s*[\\{\\}]?\\s*$", "i"),
    actionBullet: new RegExp("^([•○●◦▪▫■□◼◻⚫⚪🔴🔵⭕]+|[-–—*+])\\s*"),
    // This pattern now optionally matches a bullet point before the character name.
    characterNames: new RegExp("^\\s*(?:[•○●◦▪▫■□◼◻⚫⚪🔴🔵⭕]+|[-–—*+])?\\s*([\\u0600-\\u06FFا-ي\\s]+)\\s*[:：]\\s*"),
    sceneKeywords: c("^(مشهد|لقطة|منظر|مكان|زمن|وقت|SCENE|LOCATION|TIME)\\s*", "i"),
    locationWords: new RegExp("^(مسجد|بيت|منزل|دار|شقة|فيلا|مكتب|محل|دكان|مقهى|مطعم|فندق|مستشفى|مدرسة|جامعة|كلية|شارع|طريق|ميدان|حديقة|نيل|بحر|صحراء|جبل|قرية|مدينة|سيارة|أتوبيس|قطار|طائرة|باب|نافذة|سلم|سطح|بلكونة|حمام|مطبخ|صالة|غرفة)", "i"),
    timeIndicators: new RegExp("(ليل|نهار|صباح|ظهر|عصر|مغرب|عشاء|فجر|ضحى|صيف|شتاء|ربيع|خريف|أمس|اليوم|غدا|الآن|لاحقا|بعدها|قبلها|morning|night|day|evening)", "i"),
    actionKeywords: c("^(نرى|يدخل|يخرج|يقف|يجلس|يمشي|يجري|ينظر|يبتسم|يضحك|يبكي|يصرخ|يهمس|يفكر|يتذكر|فجأة|ببطء|بسرعة|بهدوء|بعنف)", "i"),
    directorNotes: c("^\\s*\\(.*\\)\\s*$"),
    transitionCut: c("^\\s*قطع\\s*$", "i"),
    transitions: c("^(قطع|قطع إلى|انتقال إلى|تلاشي|تلاشي أسود|CUT TO|FADE IN|FADE OUT|DISSOLVE TO)", "i"),
    numberedScene: c("^(مشهد|لقطة)\\s*(\\d+)\\s*[:：\\-–—]?\\s*(.*)", "i"),
    sceneHeader1: c(/^مشهد\s*\d+\s*$/i),
    sceneHeader2: {
      time: /(ليل|نهار|صباح|مساء)/i,
      inOut: /(داخلي|خارجي)/i,
    },
    // Updated sceneHeader3 to be more flexible, looking for keywords rather than just the start of the line.
    sceneHeader3: c(/(مسجد|بيت|منزل|شارع|حديقة|مدرسة|جامعة|مكتب|محل|مستشفى|مطعم|فندق|سيارة|غرفة|قاعة|ممر|سطح|ساحة|مقبرة|مخبز|مكتبة|قصر|كهف|عنوان)/i),
  };
})();
