# Humo AI brand kit

Everything for the Humo AI identity. The full rules are in the brand book:
[`guidelines/humo-ai-brand-guidelines.pdf`](guidelines/humo-ai-brand-guidelines.pdf) (also as HTML).

| Folder | What's inside |
| --- | --- |
| `logo/svg`, `logo/png` | Horizontal and stacked logo (on-dark, on-light, navy, white, gold), the Humo mark, the round Seal, the wordmark |
| `icon/` | App icon, favicon, Apple touch icon, maskable PWA icon |
| `mascot/` | Humo the mascot: 6 poses and 7 expressions (SVG + PNG) |
| `social/` | Instagram profile, post and story templates; Telegram avatar and post cover; link preview |
| `fonts/` | Onest and Literata (SIL Open Font License) |
| `concepts/` | The three logo concepts that were presented |
| `source/` | The scripts that draw every file |

## Colours

| Name | HEX | Use |
| --- | --- | --- |
| Humo Navy | `#03244A` | Main brand colour |
| Humo Gold | `#F2B630` | The bird, highlights, key buttons |
| Midnight | `#03142C` | Deepest background |
| Royal Navy | `#0E2F5C` | Navy gradient start |
| Gold Light | `#FFE29A` | Gold gradient top |
| Gold Deep | `#C98A12` | Gold gradient bottom, "AI" on light |
| Crimson | `#BB0937` | Small accents only |

Gold gradient: `linear-gradient(180deg, #FFE29A 0%, #F2B630 55%, #C98A12 100%)`.
Gold text goes only on navy or dark backgrounds.

## Rebuilding

```bash
cd brand/source
npm i --no-save opentype.js@1.3.4 playwright
node build.mjs   # logos, icons, mascot, social (SVG + PNG)
node guide.mjs   # brand book HTML + PDF
```
