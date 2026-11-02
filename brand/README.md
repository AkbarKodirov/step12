# Humo AI brand kit

Everything for the Humo AI identity. The full rules are in the brand book:
[`guidelines/humo-ai-brand-guidelines.pdf`](guidelines/humo-ai-brand-guidelines.pdf) (also as HTML).

| Folder | What's inside |
| --- | --- |
| `logo/svg`, `logo/png` | Horizontal and stacked logo (on-dark, on-light, navy, white, crimson), the Humo mark, the round Seal (navy and light), the wordmark |
| `icon/` | Logo and mascot app icons: iOS, Android (square, round, adaptive, Play Store), web favicons, Apple touch, maskable; mascot mood icons |
| `mascot/` | Humo the mascot (light red): turnaround, 8 poses, 8 expressions (SVG + PNG) |
| `social/` | Instagram profile, post and story templates; Telegram avatar, post cover and 16 stickers; link preview |
| `fonts/` | Onest and Literata (SIL Open Font License) |
| `source/` | The scripts that draw every file |

## Colours

| Name | HEX | Use |
| --- | --- | --- |
| Humo Navy | `#03244A` | Main brand colour |
| Humo Crimson | `#C8103F` | "AI", key buttons, highlights (same red as the 3D Humo) |
| Midnight | `#03142C` | Deepest background |
| Royal Navy | `#0E2F5C` | Navy gradient start |
| Ruby | `#A8092F` | Bottom of the Humo gradient (the 3D Humo's body) |
| Rose | `#E0456B` | Middle of the Humo gradient, accents on dark |
| Light Red | `#FF6F86` | The mascot's body (och qizil) |
| Sheen | `#FF7A98` | Top of the Humo gradient, glows |
| Petal | `#FFC2D1` | Soft fills, the mascot's tail tips |

Humo gradient: `linear-gradient(180deg, #FF8FA6 0%, #E0456B 50%, #A8092F 100%)`.
The logo is never all red: navy tile or navy/white "Humo", red bird and "AI".

## Rebuilding

```bash
cd brand/source
npm i --no-save opentype.js@1.3.4 playwright
node build.mjs   # logos, icons, mascot, social (SVG + PNG)
node guide.mjs   # brand book HTML + PDF
```
