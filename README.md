# پای منبر مولا (Moulla) — v152 R5

پس از ادغام PR #7، تنها مرجع فعال توسعه شاخه main است. تا پیش از ادغام، main نسخه v150 باقی می‌ماند.

- قفل فعال پیشنهادی: [قفل v152](design/owner-v152-candidate-lock.json)، ۱۲۲۰ فایل سورس و تنظیمات، ۱۱۹۵ دارایی، ۲۰۱ پوستر اصلی، ۱۰۱۶ بخش متن.
- آزمون: `bash scripts/run_v152_local_checks.sh`
- ساخت کم‌حجم: `python3 optimization/prepare_lossless_assets.py` سپس `gradle :app:assembleDebug -PpmmLosslessAssets=true`؛ تصاویر اصلی محفوظ‌اند.
- APK مستقل آزمایشی، نه انتشار بازار: [ساخت تأییدشده R5](https://github.com/kazeminiamohamad110-wq/moulla/actions/runs/45783977752).
- نسخه تاریخی ۱۵۰: [مرجع ثابت](https://github.com/kazeminiamohamad110-wq/moulla/tree/1281fabbb59adce4391828a6f50e9738423c396d)؛ قفل‌ها، شاخه‌ها، تگ‌ها، منابع و آرشیوهای قبلی حذف نمی‌شوند.
- [سیاست مالک](docs/OWNER_SINGLE_ACTIVE_VERSION_POLICY_FA.md) همچنان معتبر است؛ آزمون دستگاه و تأیید همان APK قبل از ادغام، بدون تغییر امضای رسمی و بدون مجوز حذف.
