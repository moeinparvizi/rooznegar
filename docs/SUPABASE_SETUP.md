# راه‌اندازی حساب‌ها با Supabase

روزنگار یک خروجی استاتیک است؛ ورود و ایمیل واقعی را Supabase انجام می‌دهد و دفتر هر کاربر با RLS از بقیه جدا می‌ماند. این راهنما را یک‌بار انجام بده؛ بعد از آن هر push روی `main` سایت را با همان تنظیمات می‌سازد.

> فقط **anon key** عمومی در مرورگر قرار می‌گیرد. کلید `service_role`، رمز SMTP و هیچ توکن شخصی دیگری نباید در مخزن، فایل محیطی، یا GitHub Actions نوشته شود.

## ۱. پروژه را بساز

1. در [supabase.com](https://supabase.com) یک پروژه‌ی جدید بساز.
2. از **Project Settings → API** این دو مقدار را بردار:
   - `Project URL`
   - `anon public` key
3. این‌ها را فعلاً جایی امن نگه دار؛ در مرحله‌ی ۷ به GitHub اضافه می‌شوند.

## ۲. جدول داده و RLS را بساز

در **SQL Editor** پروژه، محتوای فایل [`supabase/migrations/0001_planner_data.sql`](../supabase/migrations/0001_planner_data.sql) را اجرا کن. این فایل:

- جدول `public.planner_data` را می‌سازد (هر کاربر یک ردیف).
- RLS را روشن می‌کند و فقط `select / insert / update / delete` روی ردیف خودِ کاربر را اجازه می‌دهد.
- `updated_at` را با تریگر روی زمان سرور نگه می‌دارد.
- دسترسی `anon` را می‌بندد و فقط نقش `authenticated` را مجاز می‌کند.

بعد از اجرا در **Table Editor** جدول `planner_data` را ببین و مطمئن شو **RLS enabled** است.

اگر Postgres محلی داری، همین سیاست‌ها را می‌توانی بدون پروژه هم ثابت کنی. فایل [`supabase/tests/rls-local.sql`](../supabase/tests/rls-local.sql) همان مهاجرت را روی یک دیتابیس موقت با نقش‌های `anon` / `authenticated` / `service_role` می‌زند و بررسی می‌کند که هیچ کاربری ردیف دیگری را نمی‌بیند یا عوض نمی‌کند:

```bash
createdb rz_rls_test
psql -d postgres -qc "create role anon nologin" \
                   -qc "create role authenticated nologin" \
                   -qc "create role service_role nologin bypassrls"
psql -d rz_rls_test -v ON_ERROR_STOP=1 -f supabase/tests/rls-local.sql
dropdb rz_rls_test
```

خروجی باید هشت خط `OK` بدهد و `rls_enabled` روی `t` باشد.

## ۳. ورود با ایمیل را روشن کن

در **Authentication → Providers → Email**:

- **Enable Email provider** روشن باشد.
- **Confirm email** روشن باشد؛ روزنگار حساب را فقط بعد از وارد کردن کد شش‌رقمی فعال می‌کند.
- ورود با رمز و ورود با کد هر دو از همین بخش کار می‌کنند.

## ۴. قالب ایمیل‌ها را کد‌محور کن

روزنگار کد شش‌رقمی را داخل خود صفحه وارد می‌کند و لینک ایمیل را پردازش نمی‌کند. پس در **Authentication → Emails** این سه قالب را طوری بازنویسی کن که **`{{ .Token }}`** را نشان دهند و لینک تأیید را حذف کنند:

| قالب | کاربرد در روزنگار |
| --- | --- |
| **Confirm signup** | کد تأیید بعد از ساخت حساب با رمز |
| **Magic Link** | کد ورود بدون رمز |
| **Reset Password** | کد بازیابی رمز |

نمونه‌ی متن (برای هر سه قالب قابل استفاده است):

```html
<div dir="rtl" style="font-family:Tahoma,sans-serif;line-height:2;color:#22372e">
  <h2 style="margin:0 0 12px">روزنگار</h2>
  <p>کد شش‌رقمی تو:</p>
  <p style="font-size:28px;letter-spacing:8px;font-weight:bold">{{ .Token }}</p>
  <p style="color:#6b7a72">این کد چند دقیقه معتبر است. اگر درخواست ندادی، این ایمیل را نادیده بگیر.</p>
</div>
```

نکته‌ها:

- `{{ .Token }}` همان کد شش‌رقمی است؛ `{{ .ConfirmationURL }}` لینک است و در این اپ لازم نیست.
- اگر لینک را نگه داشتی، کاربر نباید روی آن بزند؛ ورود از راه کد انجام می‌شود.
- قالب **Change Email** اختیاری است و در این نسخه استفاده نمی‌شود.

## ۵. SMTP واقعی وصل کن

سرویس ایمیل پیش‌فرض Supabase برای تست است و سقف ارسال کمی دارد. برای ایمیل واقعی:

1. در یک سرویس SMTP (مثلاً Resend، Brevo، Postmark یا SMTP2GO) دامنه/فرستنده را تأیید کن.
2. در Supabase برو به **Authentication → Emails → SMTP Settings** و Host، Port، Username، Password و Sender را وارد کن.
3. **Save** بزن و با دکمه‌ی ارسال ایمیل تست، دریافت را بررسی کن.

رمز SMTP فقط در داشبورد Supabase می‌ماند. آن را در `.env`، کد، لاگ یا چت نگذار.

در **Authentication → Rate Limits** هم سقف ارسال ایمیل را با سرویس خودت هماهنگ کن؛ سقف پیش‌فرض برای استفاده‌ی واقعی کم است.

## ۶. آدرس‌های بازگشت را تنظیم کن

در **Authentication → URL Configuration**:

- **Site URL**:
  ```text
  https://moeinparvizi.github.io/rooznegar/
  ```
- **Redirect URLs**:
  ```text
  http://localhost:3000/**
  https://moeinparvizi.github.io/rooznegar/**
  ```

اگر مخزن یا دامنه‌ی دیگری داری، همان آدرس را با `/**` اضافه کن. این آدرس‌ها برای `emailRedirectTo` و بازیابی رمز استفاده می‌شوند.

## ۷. متغیرهای GitHub Actions را اضافه کن

در GitHub → **Settings → Secrets and variables → Actions → Variables** این دو **Variable** (نه Secret) را بساز:

| نام | مقدار |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

Workflow موجود در [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) همین دو را در زمان build به اپ می‌دهد. `service_role` را اینجا نگذار؛ حتی به‌عنوان Secret هم در build استاتیک لازم نیست.

## ۸. اجرای محلی

```bash
cp .env.example .env.local
```

در `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
NEXT_PUBLIC_BASE_PATH=
```

بعد:

```bash
npm run dev
```

- با این دو مقدار، حتی روی `localhost` هم ورود واقعی Supabase فعال می‌شود و ایمیل واقعی می‌رود.
- بدون این دو مقدار و روی `localhost` در حالت توسعه، ورود آزمایشی فعال است و کد همیشه `123456` است.
- در خروجی تولید بدون این دو مقدار، صفحه‌ی ورود پیام «هنوز فعال نشده» نشان می‌دهد و اپ قفل می‌ماند؛ عمداً تا وقتی Supabase تنظیم نشده منتشر نشود.

## ۹. انتشار

بعد از تنظیم متغیرها:

```bash
git push origin main
```

Workflow سایت را می‌سازد و روی GitHub Pages منتشر می‌کند. قبل از انتشار مطمئن شو **Settings → Pages → Source** روی **GitHub Actions** است.

## ۱۰. چک‌لیست پذیرش

- [ ] با یک ایمیل واقعی ثبت‌نام کن؛ کد شش‌رقمی برسد.
- [ ] کد را وارد کن؛ حساب تأیید و وارد شود و به گام‌های شروع برود.
- [ ] یک بلوک را علامت بزن و صفحه را رفرش کن؛ تغییر بماند.
- [ ] خارج شو و با رمز وارد شو.
- [ ] «رمز را فراموش کردی؟» را بزن؛ کد بازیابی برسد و رمز تازه کار کند.
- [ ] با دو حساب مختلف وارد شو؛ هر کدام فقط دفتر خودش را ببیند (RLS).
- [ ] در یک مرورگر دیگر وارد همان حساب شو؛ snapshot ابری بیاید.
- [ ] بعد از اولین بازدید، اینترنت را قطع کن و صفحه را رفرش کن؛ پوسته‌ی آفلاین بیاید.

## عیب‌یابی

| نشانه | علت احتمالی | کار |
| --- | --- | --- |
| کد نمی‌رسد | SMTP تنظیم نشده یا سقف ارسال پر است | SMTP و Rate Limits را بررسی کن؛ پوشه‌ی اسپم را هم ببین. |
| «کد نامعتبر» | قالب ایمیل `{{ .Token }}` ندارد یا کد منقضی شده | قالب را اصلاح کن و کد تازه بگیر. |
| بعد از ورود، حساب تأیید نشده می‌ماند | Confirm email خاموش است یا نوع OTP اشتباه است | Confirm email را روشن کن؛ برای ثبت‌نام نوع `signup` و برای ورود نوع `email` است. |
| خطای Redirect | آدرس در Redirect URLs نیست | آدرس دقیق با `/**` اضافه کن. |
| داده‌ها بین دستگاه‌ها نمی‌آیند | RLS یا ورود انجام نشده | در Table Editor ردیف کاربر را ببین؛ RLS و توکن نشست را بررسی کن. |
| در production صفحه‌ی ورود می‌گوید فعال نیست | متغیرهای build خالی‌اند | Variableها را اضافه و workflow را دوباره اجرا کن. |

## امنیت

- anon key عمومی است و بودنش در باندل اشکالی ندارد؛ امنیت از RLS می‌آید.
- `service_role` هرگز در کلاینت، مخزن یا CI قرار نگیرد.
- رمز SMTP و کلیدهای خصوصی فقط در داشبورد سرویس ایمیل/Supabase بمانند.
- اگر توکنی جایی عمومی شد، همان لحظه باطلش کن؛ پاک کردن فایل کافی نیست.
- خروجی JSON دفتر در اختیار کاربر است؛ پشتیبان‌گیری و انتقال با خودش.
