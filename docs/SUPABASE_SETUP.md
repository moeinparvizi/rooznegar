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
- **Confirm email** روشن باشد؛ روزنگار حساب را فقط بعد از تایید ایمیل فعال می‌کند (با باز کردن لینک یا وارد کردن کد).
- ورود با رمز و ورود بدون رمز هر دو از همین بخش کار می‌کنند.
- **Allow anonymous sign-ins** و **Allow manual linking** را خاموش بگذار.

## ۴. بدรู้ ایمیل: لینک یا کد؟

پلن رایگان Supabase با فرستنده‌ی پیش‌فرض اجازه‌ی **ویرایش قالب ایمیل‌ها** را نمی‌دهد و این خطا را می‌گیری:

> Email template modification is not available for free tier projects using the default email provider.

پس با فرستنده‌ی پیش‌فرض ایمیل‌ها **لینکی** هستند و روزنگار همین را می‌پسندد: بعد از ثبت‌نام صفحه می‌گوید «ایمیلت را باز کن» و وقتی لینک را در همان مرورگر باز کنی، `supabase-js` همان‌جا نشست را می‌سازد و وارد می‌کند (`detectSessionInUrl`). در بازیابی رمز هم بعد از باز کردن لینک، مستقیم صفحه‌ی «رمز تازه» می‌آید.

اگر **SMTP سفارشی** وصل کنی (مرحله‌ی ۵) می‌توانی قالب‌ها را کد‌محور کنی تا کاربر به‌جای لینک کد شش‌رقمی ببیند؛ همان صفحه دکمه‌ی «کد شش‌رقمی داری؟» دارد و کار می‌کند. سه قالبی که باید `{{ .Token }}` نشان دهند:

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

- در حالت لینکی، لینک را باید در **همان مرورگری** باز کنی که ثبت‌نام کرده‌ای؛ کلید PKCE در حافظه‌ی همان مرورگر می‌ماند.
- `{{ .Token }}` همان کد شش‌رقمی است و فقط با SMTP سفارشی قابل نمایش است.
- طول کد در **Authentication → Emails / Security** (OTP length) روی ۶ باشد؛ روزنگار کد شش‌رقمی می‌خواهد.
- قالب **Change Email** اختیاری است و در این نسخه استفاده نمی‌شود.

## ۵. SMTP واقعی وصل کن

سرویس ایمیل پیش‌فرض Supabase برای تست است و سقف ارسال کمی دارد. برای ایمیل واقعی:

1. در یک سرویس SMTP (مثلاً Resend، Brevo، Postmark یا SMTP2GO) دامنه/فرستنده را تأیید کن.
2. در Supabase برو به **Authentication → Emails → SMTP Settings** و Host، Port، Username، Password و Sender را وارد کن.
3. **Save** بزن و با دکمه‌ی ارسال ایمیل تست، دریافت را بررسی کن.

رمز SMTP فقط در داشبورد Supabase می‌ماند. آن را در `.env`، کد، لاگ یا چت نگذار.

در **Authentication → Rate Limits** هم سقف ارسال ایمیل را با سرویس خودت هماهنگ کن؛ سقف پیش‌فرض برای استفاده‌ی واقعی کم است.

## ۶. Site URL را تنظیم کن

در **Authentication → Sign In / Providers** (یا **URL Configuration** در نسخه‌های قدیمی‌تر) فقط یک آدرس لازم است:

- **Site URL**:
  ```text
  https://moeinparvizi.github.io/rooznegar/
  ```

Supabase دیگر فهرست «Redirect URLs» را در داشبورد نگه نمی‌دارد؛ لینک ایمیل به `redirect_to` خود اپ می‌رود و اگر آن آدرس با پیشوند Site URL هم‌خوان نباشد، Supabase بی‌صدا به Site URL برمی‌گردد. روزنگار `redirect_to` را از همان `window.location.origin` + basePath می‌سازد، پس:

- روی GitHub Pages: `https://moeinparvizi.github.io/rooznegar/auth/`
- روی localhost: `http://localhost:3000/auth/` (تست محلی لینک به هر حال به Site URL می‌رود؛ برای لینک، نسخه‌ی منتشرشده را تست کن.)

## ۷. متغیرهای GitHub Actions را اضافه کن

در GitHub → **Settings → Secrets and variables → Actions → Variables** این دو **Variable** (نه Secret) را بساز:

| نام | مقدار |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | کلید عمومی: `anon` یا `sb_publishable_…` (هر دو یکی‌اند) |

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

- [ ] با یک ایمیل واقعی ثبت‌نام کن؛ صفحه‌ی «ایمیلت را باز کن» بیاید.
- [ ] لینک ایمیل را در همان مرورگر باز کن؛ حساب تأیید و خودکار وارد شود و به گام‌های شروع برود.
- [ ] یک بلوک را علامت بزن و صفحه را رفرش کن؛ تغییر بماند.
- [ ] خارج شو و با رمز وارد شو.
- [ ] «رمز را فراموش کردی؟» را بزن؛ لینک بازیابی برسد و بعد از باز کردنش صفحه‌ی «رمز تازه» بیاید.
- [ ] با دو حساب مختلف وارد شو؛ هر کدام فقط دفتر خودش را ببیند (RLS).
- [ ] در یک مرورگر دیگر وارد همان حساب شو؛ snapshot ابری بیاید.
- [ ] بعد از اولین بازدید، اینترنت را قطع کن و صفحه را رفرش کن؛ پوسته‌ی آفلاین بیاید.

## عیب‌یابی

| نشانه | علت احتمالی | کار |
| --- | --- | --- |
| ایمیل نمی‌رسد | فرستنده‌ی پیش‌فرض سقف کم دارد و در عمل فقط به ایمیل صاحب پروژه می‌فرستد | اسپم را ببین؛ برای کاربر واقعی SMTP سفارشی وصل کن. |
| «کد نامعتبر» | کد را از قالب لینکی می‌خواهی، یا SMTP سفارشی کد را در ایمیل نمی‌گذارد | در حالت پیش‌فرض از لینک استفاده کن؛ برای کد، قالب را `{{ .Token }}`‌محور کن. |
| لینک را زدم ولی وارد نشدم | لینک را در مرورگر/دستگاه دیگری باز کرده‌ای | همان مرورگرِ ثبت‌نام لازم است (کلید PKCE آنجاست)، یا دوباره ایمیل بگیر. |
| بعد از ورود، حساب تأیید نشده می‌ماند | Confirm email خاموش است | Confirm email را روشن کن؛ روزنگار نشستِ تاییدنشده را به تایید ایمیل می‌فرستد. |
| لینک ایمیل به آدرس اشتباه می‌رود | Site URL تنظیم نشده | Site URL را کامل با `/` انتهایی ست کن. |
| داده‌ها بین دستگاه‌ها نمی‌آیند | RLS یا ورود انجام نشده | در Table Editor ردیف کاربر را ببین؛ RLS و توکن نشست را بررسی کن. |
| در production صفحه‌ی ورود می‌گوید فعال نیست | متغیرهای build خالی‌اند | Variableها را اضافه و workflow را دوباره اجرا کن. |

## امنیت

- anon / publishable key عمومی است و بودنش در باندل اشکالی ندارد؛ امنیت از RLS می‌آید.
- `service_role` هرگز در کلاینت، مخزن یا CI قرار نگیرد.
- رمز SMTP و کلیدهای خصوصی فقط در داشبورد سرویس ایمیل/Supabase بمانند.
- اگر توکنی جایی عمومی شد، همان لحظه باطلش کن؛ پاک کردن فایل کافی نیست.
- خروجی JSON دفتر در اختیار کاربر است؛ پشتیبان‌گیری و انتقال با خودش.
