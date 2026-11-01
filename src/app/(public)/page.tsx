import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark, BrandWord } from "@/components/Brand";
import { Icon, type IconName } from "@/components/Icon";
import { LandingDayLine } from "@/components/landing/LandingDayLine";
import { LandingNav } from "@/components/landing/LandingNav";
import { PaletteGrid } from "@/components/landing/PaletteGrid";

export const metadata: Metadata = {
  title: { absolute: "روزنگار — هر روز، یک کار بزرگ" },
  description:
    "برنامه‌ریز شخصی فارسی با خط روز، باغ هفتگی، مسیر زبان و تمرکز عمیق. آفلاین، بدون تبلیغ، با حساب شخصی.",
};

const FEATURES: { icon: IconName; title: string; copy: string }[] = [
  {
    icon: "today",
    title: "خط روز",
    copy: "بلوک‌ها با ساعت واقعی زندگی تو می‌چینند؛ صبح، مسیر، کار و شب.",
  },
  {
    icon: "leaf",
    title: "باغ هفته",
    copy: "هفت روز، یک باغ؛ روز سبک هم گل دارد و هیچ روزی صفر نمی‌شود.",
  },
  {
    icon: "book",
    title: "مسیر زبان",
    copy: "دقیقه‌ها جمع می‌شوند تا سطح CEFR بعدی؛ رفت‌وآمد هم حساب است.",
  },
  {
    icon: "target",
    title: "تمرکز عمیق",
    copy: "تایمر ساده برای کار عمیق، بدون فشار و بدون شمارش معکوس قرمز.",
  },
  {
    icon: "dumbbell",
    title: "باشگاه",
    copy: "چرخش عضلات، روزهای منعطف و جبران پنجشنبه، بدون احساس بدهی.",
  },
  {
    icon: "linkedin",
    title: "لینکدین",
    copy: "ایده را ذخیره کن، زمان بگذار و آرام منتشر کن؛ پیوسته بهتر از زیاد.",
  },
  {
    icon: "pen",
    title: "ژورنال یک‌خطی",
    copy: "یک جمله برای نگه‌داشتن روز؛ کوتاه، بی‌قضاوت و همیشه کافی.",
  },
  {
    icon: "wifiOff",
    title: "آفلاین",
    copy: "روی صفحه‌ی خانه نصب کن؛ بعد از اولین بازدید، بدون اینترنت هم باز می‌شود.",
  },
];

const PROFESSIONS: { title: string; icon: IconName; tags: string[]; note: string }[] = [
  {
    title: "برنامه‌نویس",
    icon: "target",
    tags: ["زبان صبح", "کار", "کد عمیق", "باشگاه"],
    note: "دو بلوک رشد، کنار کار روزانه.",
  },
  {
    title: "ورزشکار",
    icon: "dumbbell",
    tags: ["تمرین صبح", "کار", "تمرین دوم", "کشش شبانه"],
    note: "ریتم تمرین، جبران و استراحت.",
  },
  {
    title: "خیاط",
    icon: "sparkle",
    tags: ["کارگاه", "سفارش‌ها", "اندازه‌گیری", "ژورنال"],
    note: "بلوک‌های کاری و سفارش‌های خودت.",
  },
  {
    title: "دانشجو",
    icon: "book",
    tags: ["کلاس", "مطالعه", "پروژه", "مرور"],
    note: "درس، تمرکز و مرور هفتگی.",
  },
  {
    title: "دلخواه",
    icon: "feather",
    tags: ["دسته‌ی خودت", "بلوک خودت", "گل خودت", "ریتم خودت"],
    note: "هر چیزی که زندگی توست، نه قالب ما.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "بدون اینترنت کار می‌کند؟",
    a: "بله؛ بعد از اولین بازدید، پوسته و داده‌ی محلی باز می‌شوند. تغییرها همان لحظه روی دستگاه ذخیره می‌شوند.",
  },
  {
    q: "داده‌ام کجاست؟",
    a: "روی دستگاه خودت و در حساب خودت. داده‌ی هر حساب جدا نگه داشته می‌شود و کسی دیگر به آن دسترسی ندارد.",
  },
  {
    q: "چطور وارد شوم؟",
    a: "با کد ۶ رقمی که به ایمیلت می‌آید، یا با ایمیل و رمز عبور. تأیید ایمیل هم با همان کد انجام می‌شود.",
  },
  {
    q: "برای حرفه‌ی من هم مناسب است؟",
    a: "دسته‌ها و بلوک‌های خودت را می‌سازی؛ خیاط، ورزشکار، دانشجو و برنامه‌نویس، همه با یک دفتر.",
  },
];

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              روزنگار · دفتر روزهای تو
            </p>
            <h1 id="landing-title" className="landing-title">
              هر روز، فقط یک کار بزرگ.
            </h1>
            <p className="landing-sub">
              برنامه‌ات با واقعیت جابه‌جا می‌شود؛ نه با گناه. زبان، کار عمیق و یک
              خط ژورنال، حتی در شلوغ‌ترین روز هم جا می‌شوند.
            </p>
            <div className="landing-actions">
              <Link href="/auth/?mode=signup" className="btn btn-primary">
                شروع رایگان
              </Link>
              <a href="#features" className="btn btn-outline">
                دیدن امکانات
              </a>
            </div>
            <p className="landing-fineprint">
              آفلاین بعد از اولین بازدید · بدون تبلیغ · داده‌ی تو، مال تو
            </p>
          </div>
          <LandingDayLine />
        </section>

        <section className="landing-section" id="story" aria-labelledby="story-title">
          <div className="landing-section-head">
            <p className="eyebrow">
              <Icon name="clock" size={13} />
              یک روز، سه نفس
            </p>
            <h2 id="story-title">روز از سه جای کوچک نفس می‌کشد.</h2>
          </div>
          <div className="landing-story">
            <article>
              <span className="landing-story-time">صبح</span>
              <h3>از بیداری تا کار</h3>
              <p>یک بلوک زبان، بی‌عجله. روز قبل از شلوغی، سهم خودش را می‌گیرد.</p>
            </article>
            <article>
              <span className="landing-story-time">مسیر</span>
              <h3>زمان مرده، مرده نمی‌ماند</h3>
              <p>گوش دادن در رفت‌وآمد؛ همان دقایقی که فکر می‌کردی از دست رفته‌اند.</p>
            </article>
            <article>
              <span className="landing-story-time">شب</span>
              <h3>یک بلوک عمیق، یک خط</h3>
              <p>کار عمیق که تمام شد، یک جمله بنویس و بعد خواب. همین.</p>
            </article>
          </div>
        </section>

        <section
          className="landing-section"
          id="features"
          aria-labelledby="features-title"
        >
          <div className="landing-section-head">
            <p className="eyebrow">
              <Icon name="sparkle" size={13} />
              امکانات
            </p>
            <h2 id="features-title">همه‌ی چیزهایی که یک دفتر آرام لازم دارد.</h2>
            <p>
              هیچ عددی تو را سرزنش نمی‌کند. هر بخش را می‌توانی روشن یا خاموش کنی و
              به ریتم خودت برگردانی.
            </p>
          </div>
          <div className="landing-features">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="landing-feature">
                <span className="landing-feature-icon">
                  <Icon name={feature.icon} size={18} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="landing-section"
          id="professions"
          aria-labelledby="professions-title"
        >
          <div className="landing-section-head">
            <p className="eyebrow">
              <Icon name="me" size={13} />
              برای هر حرفه
            </p>
            <h2 id="professions-title">یک نقطه‌ی شروع، بعد دفتر خودت.</h2>
            <p>
              قالب فقط شروع است. دسته، بلوک، ساعت و حتی گل‌های باغ را خودت تعریف
              می‌کنی.
            </p>
          </div>
          <div className="landing-professions">
            {PROFESSIONS.map((profession) => (
              <article key={profession.title} className="landing-pro-card">
                <div className="landing-pro-head">
                  <span className="landing-feature-icon">
                    <Icon name={profession.icon} size={17} />
                  </span>
                  <h3>{profession.title}</h3>
                </div>
                <div className="landing-pro-tags">
                  {profession.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>
                <p>{profession.note}</p>
              </article>
            ))}
          </div>
          <p className="landing-note">
            نقطه‌ی شروع؛ همه‌چیز قابل تغییر. هیچ قالبی به تو تحمیل نمی‌شود.
          </p>
        </section>

        <section
          className="landing-section"
          id="themes"
          aria-labelledby="themes-title"
        >
          <div className="landing-section-head">
            <p className="eyebrow">
              <Icon name="moon" size={13} />
              تم‌ها
            </p>
            <h2 id="themes-title">شش پالت، دو حالت، یک رنگ تاکیدی.</h2>
            <p>
              از باغ و کاغذ تا شب و آسمان. رنگ تاکیدی را هم خودت انتخاب می‌کنی؛
              هیچ قرمزی‌ای تو را سرزنش نمی‌کند.
            </p>
          </div>
          <PaletteGrid />
        </section>

        <section
          className="landing-section"
          id="privacy"
          aria-labelledby="privacy-title"
        >
          <div className="landing-section-head">
            <p className="eyebrow">
              <Icon name="check" size={13} />
              حریم خصوصی
            </p>
            <h2 id="privacy-title">دفترت، مال خودت است.</h2>
          </div>
          <div className="landing-privacy">
            <ul>
              <li>
                <Icon name="check" size={15} />
                داده‌ی هر حساب جدا نگه داشته می‌شود؛ ورود بدون ایمیل، بدون دفتر.
              </li>
              <li>
                <Icon name="check" size={15} />
                برنامه اول روی دستگاه تو ذخیره می‌شود؛ اینترنت لازم نیست.
              </li>
              <li>
                <Icon name="check" size={15} />
                خروجی JSON همیشه در دسترس است؛ دفترت را می‌توانی ببری.
              </li>
            </ul>
            <div className="landing-privacy-note">
              <p className="eyebrow">
                <Icon name="leaf" size={13} />
                بدون سر و صدا
              </p>
              <p>
                بدون تبلیغ، بدون فروش داده، بدون اعلان‌های بی‌مورد. فقط سه یادآور
                که خودت روشن می‌کنی.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-section" id="faq" aria-labelledby="faq-title">
          <div className="landing-section-head">
            <p className="eyebrow">
              <Icon name="list" size={13} />
              پرسش‌های کوتاه
            </p>
            <h2 id="faq-title">چند سؤال، چند جواب صادقانه.</h2>
          </div>
          <div className="landing-faq">
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-cta" aria-labelledby="cta-title">
          <div>
            <p className="eyebrow">
              <Icon name="calendar" size={13} />
              امروز
            </p>
            <h2 id="cta-title">امروز، فقط یک کار بزرگ.</h2>
            <p>دفترت را باز کن؛ بقیه‌ی روز، مسیر است.</p>
          </div>
          <div className="landing-actions">
            <Link href="/auth/?mode=signup" className="btn btn-primary">
              ساختن حساب
            </Link>
            <Link href="/auth/" className="btn btn-outline">
              وارد شدن
            </Link>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--green)" }}>
              <BrandMark size={22} />
            </span>
            <BrandWord compact />
          </div>
          <p>بدون تبلیغ · بدون فروش داده · ساخته‌شده برای یک نفر: تو</p>
          <div className="flex items-center gap-4">
            <Link href="/auth/">ورود</Link>
            <Link href="/auth/?mode=signup">شروع</Link>
          </div>
        </footer>
      </main>
    </>
  );
}
