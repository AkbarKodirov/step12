#!/usr/bin/env python3
"""Voice every step with edge-tts. Usage: tts.py steps.json outdir  (writes <key>.mp3 and durations.json)"""
import asyncio, json, subprocess, sys, os
import edge_tts
VOICE = os.environ.get("VOICE", "en-US-AndrewNeural")
RATE = os.environ.get("RATE", "-3%")
steps = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
sem = asyncio.Semaphore(int(os.environ.get("CONC","2")))
async def one(s):
    f = f"{out}/{s['key']}.mp3"
    if os.path.exists(f) and os.path.getsize(f) > 1000 and not os.environ.get("FORCE"): return
    async with sem:
        for attempt in range(15):
            try:
                await edge_tts.Communicate(s["say"], VOICE, rate=RATE).save(f); return
            except Exception as e:
                print("retry", s["key"], e); await asyncio.sleep(1.5)
        raise SystemExit("tts failed " + s["key"])
async def main(): await asyncio.gather(*[one(s) for s in steps])
asyncio.run(main())
d = {}
for s in steps:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{out}/{s['key']}.mp3"], capture_output=True, text=True)
    d[s["key"]] = float(r.stdout.strip())
json.dump(d, open(f"{out}/durations.json", "w"), indent=1)
print("total", round(sum(d.values()) / 60, 1), "min narration")
