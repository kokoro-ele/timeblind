"""
Pre-render Yuriko's lines to speech with Kokoro-82M (Apache-2.0), locally on Apple Silicon.

    uv venv --python 3.12 ~/.venvs/tts && source ~/.venvs/tts/bin/activate
    uv pip install mlx-audio "misaki[en,ja,zh]" soundfile && python -m unidic download
    python scripts/gen-voice.py            # only renders lines that changed
    python scripts/gen-voice.py --force    # re-render everything

Reads data/companion.json. A line may carry a "say" map with the text to speak when it
differs from the text shown (names, English words in ja/zh), or "say": false to stay silent.
Writes public/companion/voice/<locale>/<hash>.mp3 and data/companion-voice.json, which maps
each shown text to its clip.
"""

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "companion.json"
MANIFEST = ROOT / "data" / "companion-voice.json"
OUT = ROOT / "public" / "companion" / "voice"

MODEL = "prince-canuma/Kokoro-82M"
VOICES = {
    "en": {"voice": "af_heart", "lang_code": "a", "speed": 1.0},
    "ja": {"voice": "jf_alpha", "lang_code": "j", "speed": 1.0},
    "zh": {"voice": "zf_xiaoyi", "lang_code": "z", "speed": 1.0},
}

# The "cute" pass, ffmpeg only. asetrate raises pitch and formants together (a smaller,
# younger-sounding voice), atempo brings the duration back (a touch quicker), then the EQ
# thins the chest, lifts presence and air, and a light compressor keeps it even.
CUTE = {"pitch": 1.13, "tempo": 1.04}
TRIM = (
    "silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
    "silenceremove=start_periods=1:start_threshold=-50dB,areverse"
)


def cute_filter(rate: int) -> str:
    pitch, tempo = CUTE["pitch"], CUTE["tempo"]
    return ",".join([
        f"asetrate={rate}*{pitch}",
        f"aresample={rate}",
        f"atempo={tempo}/{pitch}",
        "equalizer=f=220:t=q:w=1:g=-4",
        "equalizer=f=3200:t=q:w=1.2:g=3",
        "highshelf=f=7500:g=3",
        "deesser=i=0.4",
        "acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2",
    ])


def iter_lines(node):
    if isinstance(node, list):
        for item in node:
            yield from iter_lines(item)
    elif isinstance(node, dict) and "en" in node:
        yield node
    elif isinstance(node, dict):
        for value in node.values():
            yield from iter_lines(value)


def main():
    force = "--force" in sys.argv
    lines = list(iter_lines(json.loads(DATA.read_text())["lines"]))

    jobs = []  # (locale, shown, spoken, file)
    for line in lines:
        say = line.get("say", {})
        if say is False:
            continue
        for locale, cfg in VOICES.items():
            shown = line.get(locale) or line["en"]
            if locale not in line and locale != "en":
                continue  # falls back to English on the page, and so does the voice
            spoken = (say or {}).get(locale, shown)
            spoken = spoken.replace("~", "").replace("〜", "").strip()
            key = json.dumps([MODEL, cfg, CUTE, spoken], ensure_ascii=False)
            name = hashlib.sha1(key.encode()).hexdigest()[:12] + ".mp3"
            jobs.append((locale, shown, spoken, OUT / locale / name))

    todo = [j for j in jobs if force or not j[3].exists()]
    print(f"{len(jobs)} clips, {len(todo)} to render")

    if todo:
        from mlx_audio.tts.utils import load_model

        model = load_model(MODEL)
        for locale, shown, spoken, file in todo:
            cfg = VOICES[locale]
            chunks = [
                np.asarray(r.audio)
                for r in model.generate(text=spoken, **cfg)
            ]
            audio = np.concatenate(chunks)
            file.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
                sf.write(wav.name, audio, model.sample_rate)
                subprocess.run(
                    ["ffmpeg", "-loglevel", "error", "-y", "-i", wav.name,
                     "-af", f"{TRIM},{cute_filter(model.sample_rate)}",
                     "-ac", "1", "-b:a", "56k", str(file)],
                    check=True,
                )
            print(f"  {locale} {file.name}  {spoken}")

    manifest = {locale: {} for locale in VOICES}
    for locale, shown, _, file in jobs:
        manifest[locale][shown] = f"/companion/voice/{locale}/{file.name}"
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    used = {file.resolve() for *_, file in jobs}
    for stale in OUT.glob("*/*.mp3"):
        if stale.resolve() not in used:
            stale.unlink()
            print(f"  removed {stale.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
