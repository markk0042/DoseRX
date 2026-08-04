# DoseRX — Medication & Controlled Drug Tracker

EMS medication inventory system aligned to the **PHECC 2026 Medication Formulary**.

## What's included

**10 drug bags**
| Code | Type |
|------|------|
| DRX-EMT-01 / 02 | EMT standard bags |
| DRX-P-01 / 02 / 03 | Paramedic standard bags |
| DRX-AP-01 / 02 / 03 | Advanced Paramedic standard bags |
| DRX-CD-P-01 | Paramedic controlled drugs (Midazolam) |
| DRX-CD-AP-01 | AP controlled drugs (Morphine, Fentanyl, Ketamine, Midazolam, Diazepam, Lorazepam) |

**Features**
- Management-only stock entry & restock
- Staff administrations deduct from management stock
- Dual-signature verification checks (no stock overwrite)
- **QR Scan** — bag shift sign-out/return + medication vial scan → administer
- **Print Labels** — printable bag QR + per-medication QR (batch, expiry)
- Medication administration & waste with dose / route / indication dropdowns
- Controlled drugs register with witness sign-out
- Seal tracking & audit activity log
- Expiry warnings
- Full PHECC formulary browser by clinical grade

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually http://localhost:5173).

Sign in as **management** to set bag quantities, or as **clinical staff** to administer / verify.
