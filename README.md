# Newhope Screenplay Platform

منصة Newhope توفر محرر سيناريوهات متقدم وخدمات خلفية لمعالجة الملفات، التعرف الضوئي على الحروف (OCR)، وتصنيف أسطر السيناريو. يحتوي المستودع على واجهات أمامية مبنية بـ Vite/React وخدمات خلفية تعمل بـ Express مع مجموعة من الخدمات المشتركة (Shared Services).

## المتطلبات المسبقة

- Node.js 18 أو أحدث
- npm 9 أو أحدث
- Docker (اختياري للتشغيل بالحاويات)

## خطوات الإعداد والتشغيل

```bash
# تثبيت الاعتمادات
npm install

# تشغيل الواجهة الأمامية (Vite)
npm run dev:frontend

# تشغيل الواجهة الخلفية (Express)
npm run dev:backend

# بناء المشروع الكامل (واجهة + خلفية)
npm run build

# تشغيل نسخة الإنتاج بعد البناء
npm start
```

## متغيرات البيئة

انسخ الملف `.env.example` إلى `.env` ثم عدّل القيم بما يناسب بيئتك. أهم المتغيرات المقسّمة حسب الفئة:

- **قاعدة البيانات**: `DATABASE_URL`, `POSTGRES_*`
- **Redis**: `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`
- **Firebase**: `FIREBASE_*`
- **خدمات الذكاء الاصطناعي**: `GEMINI_API_KEY`, `OPENAI_API_KEY`
- **المصادقة**: `JWT_SECRET`, `SESSION_SECRET`
- **البريد الإلكتروني**: `SMTP_*`
- **إعدادات OCR**: `TESSERACT_CACHE_SIZE`, `OCR_TIMEOUT`
- **إعدادات الأداء والأمان**: `RATE_LIMIT_*`, `CSP_*`, `LOG_*`

لمزيد من التفاصيل راجع `.env.example` حيث تم توثيق جميع المتغيرات المتاحة.

## الاختبارات

```bash
# تشغيل اختبارات الوحدات والتكامل (Vitest)
npm test

# تشغيل تغطية الاختبارات
npm run test:coverage

# تشغيل اختبارات End-to-End (Playwright)
npm run test:e2e
```

- اختبارات الوحدات تغطي الخدمات الأساسية مثل `ocrService`, `classificationService`, و `geminiService`.
- اختبارات التكامل تتحقق من ربط الخدمات مع واجهات API (`/api/ocr/process`, `/api/screenplay/classify`).
- اختبارات E2E (Playwright) تتحقق من تدفق المستخدم في الواجهة الأمامية (الكتابة، استيراد الملفات، التحكم بخيارات الذكاء الاصطناعي).

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
        "options": { "language": "ara+eng" }
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
