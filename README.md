# پای منبر مولا (Moulla) — نسخه فعال واحد v150

**تنها مرجع فعال توسعه و ساخت اندروید: شاخه `main`، نسخه `v150`.** این سیاست پس از تکمیل PR شماره ۱ در `main` اعمال می‌شود. شاخه‌ها و قفل‌های پیشین صرفاً سوابق تاریخی‌اند و بدون پشتیبان مستقل و مجوز دقیق مالک حذف نمی‌شوند.

- مخزن: [kazeminiamohamad110-wq/moulla](https://github.com/kazeminiamohamad110-wq/moulla)
- منبع وضعیت واحد: [`design/owner-active-version.json`](design/owner-active-version.json)
- قفل فعلی سورس: [`design/owner-v150-full-source-lock.json`](design/owner-v150-full-source-lock.json)
- بررسی دقیق فایل‌های سورس: `python3 scripts/verify_owner_v150_full_source_lock.py`
- بررسی دارایی‌های محتوا: `python3 scripts/verify_owner_v150_assets.py`
- Workflow آزمون نسخه فعال: [`.github/workflows/verify-layout-lock.yml`](.github/workflows/verify-layout-lock.yml)
- ساخت خودکار Android نسخه ۱۵۰: [`.github/workflows/owner-v150-android-ci.yml`](.github/workflows/owner-v150-android-ci.yml)
- ساخت دستی نسخه آزمایشی از `main`: [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml)
- ساخت Release بدون امضا جهت امضای امن خارج از GitHub: [`.github/workflows/owner-v150-build-unsigned-handoff.yml`](.github/workflows/owner-v150-build-unsigned-handoff.yml)

## قفل و حفاظت منابع

قفل v150 شامل **۴۲۰ مسیر** است: **۴۱۲ مسیر زیر `app/`، پنج مسیر `online-content/` و سه فایل تنظیمات Gradle**. داخل برنامه **۳۹۵ فایل دارایی زمان اجرا** وجود دارد که **۲۰۱ پوستر کلیپ** زیرمجموعه همان دارایی‌هاست، نه یک مجموعه مستقل. Git Blob SHA-1 و SHA-256 دارایی‌ها مستقل از هم اعتبارسنجی می‌شوند.

**هیچ فایل برنامه، فونت، پوستر، آرشیو، تاریخچه، شاخه، Tag یا Release نباید به دلیل قدیمی‌بودن به طور خودکار حذف شود.** کنترل‌های تاریخی v129 و نسخه‌های پیشین محفوظ‌اند. Workflow تاریخی v129 فقط با اجرای دستی و در Commit تاریخی ثابت اجرا می‌شود؛ در ساخت فعال v150 دخالت ندارد.

## نسخه قابل نصب و انتشار

خروجی CI با `assembleDebug` برنامه v150 را با شناسه **`ir.nahj.towhidkarbordi.ownerrebuilddebug`** می‌سازد؛ این APK فقط برای آزمون مستقل است و نسخه رسمی بازار را جایگزین نمی‌کند. کد Release دارای شناسه اصلی **`ir.nahj.towhidkarbordi`** و `versionCode 150` است. امضای رسمی Release نیازمند Keystore و Secrets امن و بررسی گواهی امضاست؛ سبز بودن Debug یا ساخت بدون امضا، اثبات انتشار رسمی نیست.

برای خروجی نصب‌شدنی، آخرین اجرای موفق [GitHub Actions](https://github.com/kazeminiamohamad110-wq/moulla/actions) را باز کنید. تنها خروجی مبتنی بر Commit نهایی موفق و با SHA-256 تأییدشده معتبر است.

## سیاست نسخه واحد

وجود شاخه‌ها و قفل‌های تاریخی به معنی چند نسخه فعال نیست. **فقط `main` فعال است** و هر نسخه بعدی پس از آزمون، بررسی تغییرات، تأیید مالک و ادغام مجاز، جایگزین نسخه فعال خواهد شد. حفاظت مدیریتی `main` از طریق Rulesets جدا از موفقیت Actions است و باید مستقلاً بررسی شود.

[سیاست حفاظت و حذف ایمن](docs/OWNER_SINGLE_ACTIVE_VERSION_POLICY_FA.md) | [PR یکپارچه‌سازی v150](https://github.com/kazeminiamohamad110-wq/moulla/pull/1)
