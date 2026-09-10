# ผลตรวจ Verdant · 10 กันยายน 2026

## สถานะ

เว็บตัวอย่างพร้อมเปิดใช้งานในเครื่อง เป็นการจำลองเท่านั้น ไม่มีการเชื่อมต่ออุปกรณ์จริง ไม่ได้ deploy สาธารณะ

- Production preview: http://127.0.0.1:4174/
- Development server: http://127.0.0.1:4173/
- Build: ผ่านด้วย Vite 8.2.2
- Node tests: ผ่าน 5 ชุด
- Browser interaction checks: ผ่านบน Chromium ทั้ง desktop 1440 × 1050 และ mobile viewport 390 × 844
- รอบตรวจ browser สุดท้าย: `passed: true`, `failures: []`, `errors: []` รวม JavaScript exception และ console error
- Dependency audit (`npm audit --omit=dev`): ไม่มีช่องโหว่ที่รายงาน ณ เวลาตรวจ
- HawkScan DAST: **ไม่ได้รัน / ถูกขวางที่ prerequisites**

## ตรวจอะไรแล้ว

1. สูตรทุกแบบ × ขนาดรอบทุกแบบ รักษามวลระหว่างจ่ายทีละช่อง → ชั่ง → ผสม → ปล่อย
2. รอการกดปล่อยจากผู้ใช้หลังผสมเสร็จ ไม่ปล่อยเอง
3. E-Stop ระหว่างจ่าย รอน้ำหนัก ผสม และปล่อย: ค่าน้ำหนัก/ผลผลิตคงเดิม มอเตอร์หยุด วาล์วจำลองปิด เริ่มซ้ำและปล่อยไม่ได้จนรีเซ็ต
4. ล็อกสูตรและน้ำหนักขณะมีรอบงาน ปฏิเสธการตั้งค่าที่ไม่ถูกต้อง
5. ความเร็วเร่งจำลองรักษาลำดับและผลรวมเวลา ข้ามเฟรมไม่ข้ามเงื่อนไขรอกดปล่อย
6. Browser ทดลองสัดส่วน 2:1:1 รอบ 2 กก. ผลส่งออกเป็น 1.0 / 0.5 / 0.5 กก. น้ำหนักปลายทาง 2.0 กก. ถังผสมเหลือ 0
7. Export JSON, เปิด–ปิดประตู, แยก/ประกอบ, component dialog, ปุ่มดูตำแหน่ง, แท็บอุปกรณ์และระบบ
8. Mobile viewport ไม่มี horizontal overflow และกล้องปรับระยะภาพตามสัดส่วนหน้าจอ
9. HTTP response 200 และ headers: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
10. แก้ console warning ของ Three.js shadow mode และแก้ฟอนต์ฝังใน CSS ที่ขัดกับ CSP โดยแยกเป็นไฟล์ self-hosted

11. ทดสอบปุ่มบนโมเดล 3D โดยคลิกจากภาพ: เลือกสูตร เริ่ม และ E-Stop ทำงานผ่าน raycasting ครบ
12. จอ 3D แสดงสัดส่วนและน้ำหนักเป้าหมายของแต่ละช่อง พร้อมน้ำหนักสะสม; smoke test build สุดท้ายไม่มี console error

## หลักฐานในเครื่อง

- [Desktop](output/playwright/desktop-final.png)
- [Mobile](output/playwright/mobile.png)
- [ตู้ปิด / หน้าจอไม่สัมผัส](output/playwright/closed-cabinet.png)
- [แยกชิ้นส่วน](output/playwright/exploded.png)
- [ตัวอย่างผลส่งออก](output/playwright/test-export.json)
- [Browser checks](output/playwright/browser-check.js)
- [Build log](output/build.log)

หลักฐานใน output เป็นไฟล์ในเครื่องและถูก ignore จาก Git

## ข้อจำกัดความปลอดภัยและการตรวจ

[HawkScan SKILL.md](/Users/knight/.codex/plugins/cache/claude-cowork/hawkscan/2.5.0/skills/hawkscan/SKILL.md) ระบุว่า “This skill requires **hawk v6.0.0 or newer**.”

ตรวจ `hawk version`, `hawk config --help`, `hawk skills status` แล้วได้ `command not found: hawk` ทั้งหมด พบ Docker CLI แต่ไม่มีไฟล์ `~/.hawk/hawk.properties` และ environment แจ้งว่าไม่มี HAWK_API_KEY จึงไม่สร้าง app/scanner configuration ที่ใช้ ID สมมติ ไม่เริ่ม scan และไม่อ้างว่าผ่าน DAST การรันต่อจำเป็นต้องมี Hawk CLI รุ่นที่รองรับและข้อมูลล็อกอิน StackHawk ที่พร้อมใช้

Dependency audit และ browser tests ไม่ทดแทน DAST และไม่รับรองความปลอดภัยของเครื่องจักร ไม่มี backend/API/auth route ในโครงการนี้ หากเพิ่มฮาร์ดแวร์หรือ API ต้องตรวจเพิ่ม

Build มีคำเตือน bundle เกิน 500 kB (Three.js renderer เป็นส่วนหลัก; gzip รวมประมาณ 164 kB) ไม่ใช่ build failure ยังไม่ได้วัดประสิทธิภาพบนมือถือจริง ทดสอบ responsive ด้วย desktop Chromium ที่จำลองขนาดหน้าจอ
