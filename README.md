# Newhope Screenplay Platform

منصة Newhope توفر محرر سيناريوهات متقدم وخدمات خلفية لمعالجة الملفات، التعرف الضوئي على الحروف (OCR)، وتصنيف أسطر السيناريو. يحتوي المستودع على واجهات أمامية مبنية بـ Vite/React وخدمات خلفية تعمل بـ Express مع مجموعة من الخدمات المشتركة (Shared Services).

## المتطلبات المسبقة

| الأداة | الإصدار المقترح |
|-------|----------------|
| Node.js | ≥ 18.17 (لاستخدام `fetch` المدمجة ودعم مكتبة `sharp`) |
| npm | ≥ 9.0 |
| Docker | اختياري للتشغيل داخل حاويات |

## خطوات الإعداد والتشغيل

```bash
# 1) تثبيت الاعتمادات لجميع الحزم داخل الـ monorepo
npm install

# 2) تشغيل الواجهة الأمامية (Vite)
npm run dev:frontend

# 3) تشغيل الخادم الخلفي (Express/Firebase Functions)
npm run dev:backend

# 4) بناء واجهة المستخدم والخلفية في خطوة واحدة
npm run build

# 5) تشغيل نسخة الإنتاج بعد البناء
npm start
```

> **ملاحظة:** واجهات `/api/*` تستخدم الخادم الخلفي. أثناء التطوير شغّل الأمرين `npm run dev:frontend` و `npm run dev:backend` معًا أو عيّن المتغير `VITE_API_BASE_URL` للإشارة إلى خدمة منشورة.

## متغيرات البيئة

انسخ الملف `.env.example` إلى `.env` ثم عدّل القيم بما يناسب بيئتك:

- **قاعدة البيانات**: `DATABASE_URL`, `POSTGRES_*`
- **Redis والطوابير**: `REDIS_URL`, `BULL_*`
- **Firebase**: مفاتيح الخدمة (`FIREBASE_*`, `GOOGLE_APPLICATION_CREDENTIALS`)
- **خدمات الذكاء الاصطناعي**: `GEMINI_API_KEY` (في حال تركه فارغًا سيعمل النظام بالتصنيف المحلي فقط)
- **الأمان والمصادقة**: `JWT_SECRET`, `SESSION_SECRET`, إعدادات حدود المعدل `RATE_LIMIT_*`
- **ضبط OCR**: مثل `OCR_MAX_PAGES`, `OCR_CONFIDENCE_THRESHOLD`, مسارات بيانات Tesseract

## الاختبارات وتشغيل أدوات التحقق

```bash
# اختبارات الوحدات والتكامل (Vitest)
npm test

# تغطية الاختبارات عبر Vitest
npm run test:coverage

# اختبارات End-to-End (Playwright) — تتطلب تشغيل الخوادم التطويرية
npm run test:e2e
```

- اختبارات الوحدات تغطي خدمات `ocrService`, `classificationService`, `geminiService` بالإضافة إلى وحدات الأداء (`PerformanceOptimizer`, `CacheManager`, `MemoryManager`).
- اختبارات التكامل تضمن نجاح واجهات `/api/ocr/process` و `/api/screenplay/classify` باستخدام طبقة OCR الخلفية الجديدة وخدمات التصنيف.
- اختبارات E2E تم توسيعها لتشمل التدفق الكامل: لصق النص، استيراد الملفات، تنفيذ OCR، ثم إعادة استخدام الناتج في واجهة التصنيف.

## ملاحظات حول البنية الحالية والحدود المعروفة

- تم إنشاء طبقة OCR خاصة بالخادم تعتمد على **Tesseract.js** (بيئة Node) مع تحويل صفحات PDF إلى صور عبر `sharp`. عند انخفاض الثقة أو فشل المحرك يتم التحويل تلقائيًا إلى **Scribe.js** أو استدعاء الخادم كـ fallback موثوق.
- بعض أدوات الأداء (مثل `PerformanceOptimizer`) لا تزال تعتمد على بيئة المتصفح (`window`, `document`). تم عزل الخدمات الخلفية عنها، لكن يجب مراعاة ذلك عند تشغيل الشيفرة داخل بيئات Node صرفة.
- في حال غياب مفتاح `GEMINI_API_KEY` يعمل التصنيف بوضع محلي مع إرجاع بيانات إحصائية تشير إلى الاعتماد على الحل المحلي بدلاً من الفشل.

## تشغيل Docker

```bash
# بناء صورة Docker
docker build -t newhope-app .

# تشغيل الحاوية على المنفذ 8080 مثلاً
docker run -p 8080:8080 --env-file .env newhope-app
```

تأكد من توفير متغيرات البيئة اللازمة داخل الحاوية (`--env-file .env`).

## تجربة واجهات API باستخدام curl

```bash
# معالجة OCR لملف صورة (Base64)
curl -X POST http://localhost:5000/api/ocr/process \
  -H "Content-Type: application/json" \
  -d '{
        "fileData": "data:image/png;base64,BASE64_IMAGE_DATA",
        "originalName": "scene.png",
        "mimetype": "image/png",
        "options": { "language": "ara+eng", "confidenceThreshold": 0.7 }
      }'

# تصنيف نص سيناريو
curl -X POST http://localhost:5000/api/screenplay/classify \
  -H "Content-Type: application/json" \
  -d '{
        "text": "INT. HOUSE - DAY",
        "context": { "previousFormat": "action" },
        "options": { "useAI": false }
      }'
```

ستعيد كلا الواجهتين استجابة JSON تحتوي على حالة النجاح `success` والبيانات الناتجة ضمن الحقل `data` أو رسالة خطأ ضمن `error`.
