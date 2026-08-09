#!/usr/bin/env python3
"""Align an audiobook transcript to its audio and emit SRT + JSON timings.

Works without ASR: the transcript already matches the narration word for word,
so timings come from three measured signals instead of a model -- the container
chapter marks (exact anchors), ffmpeg silence detection (candidate boundaries),
and mora count (relative duration within a chapter).
"""

import argparse
import json
import re
import subprocess
import sys
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path

PAUSE_MARKS = "、,"
DROPPED_CHARS = set("。「」『』（）()・！？!?…‥　 \t\r\n,、.")
SMALL_KANA = set("ャュョァィゥェォヮゃゅょぁぃぅぇぉゎ")
COMMA_MORA_EQUIV = 2.5
SHORT_PAUSE_SEC = 0.75
PAUSE_PENALTY_WEIGHT = 4.0
BAND_MIN_SEC = 8.0
BAND_MAX_SEC = 45.0
BAND_SPAN_RATIO = 0.3
MIN_TITLE_SCORE = 0.55
TITLE_MATCH_SPANS = (1, 2, 3)
TITLE_SEARCH_WINDOW = 90
SPOKEN_FORMS = {"content": "コンテンツ"}


@dataclass
class Chapter:
    start: float
    end: float
    title: str


@dataclass
class Silence:
    start: float
    end: float

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass
class Cue:
    index: int
    start: float
    end: float
    text: str


def run(command: list[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise RuntimeError(f"command failed: {' '.join(command[:2])}\n{result.stderr[-2000:]}")
    return result


def probe_chapters(audio: Path) -> list[Chapter]:
    # stdout only: ffprobe can emit warnings while still exiting 0, and mixing them
    # into the payload turns valid output into a JSON decode error.
    raw = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_chapters", str(audio)]).stdout
    payload = json.loads(raw)
    return [
        Chapter(float(c["start_time"]), float(c["end_time"]), c.get("tags", {}).get("title", ""))
        for c in payload["chapters"]
    ]


def probe_duration(audio: Path) -> float:
    raw = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", str(audio),
    ]).stdout.strip()
    try:
        return float(raw.splitlines()[0])
    except (IndexError, ValueError):
        return 0.0


def detect_silences(audio: Path, noise_db: int, min_silence: float) -> list[Silence]:
    # silencedetect reports on stderr, so this one genuinely needs both streams.
    result = run([
        "ffmpeg", "-hide_banner", "-nostats", "-i", str(audio), "-map", "0:a:0",
        "-af", f"silencedetect=noise={noise_db}dB:d={min_silence}", "-f", "null", "-",
    ])
    raw = result.stdout + result.stderr
    starts = [float(m) for m in re.findall(r"silence_start: (-?[0-9.]+)", raw)]
    ends = [float(m) for m in re.findall(r"silence_end: (-?[0-9.]+)", raw)]
    return [Silence(s, e) for s, e in zip(starts, ends)]


def read_lines(transcript: Path) -> list[str]:
    text = transcript.read_text(encoding="utf-8")
    return [line.strip() for line in text.splitlines() if line.strip()]


def normalize(text: str) -> str:
    folded = unicodedata.normalize("NFKC", text).lower()
    for written, spoken in SPOKEN_FORMS.items():
        folded = folded.replace(written, spoken)
    folded = re.sub(r"\b0+(\d)", r"\1", folded)
    return "".join(ch for ch in folded if ch not in DROPPED_CHARS)


def match_chapter_starts(chapters: list[Chapter], lines: list[str]) -> tuple[list[int], list[int]]:
    """Transcript line index each chapter starts at, monotonically, plus the
    indices of chapters whose title never matched well enough to trust.

    The first chapter always starts at line 0 regardless of its title, since any
    front matter ahead of it still belongs to that chapter's audio.
    """
    starts: list[int] = []
    weak: list[int] = []
    cursor = 0
    for chapter_index, chapter in enumerate(chapters):
        target = normalize(chapter.title)
        window = lines[cursor:cursor + TITLE_SEARCH_WINDOW]
        best_score, best_index = -1.0, cursor
        for offset in range(len(window)):
            for span in TITLE_MATCH_SPANS:
                joined = normalize("".join(window[offset:offset + span]))
                # Two empty strings score a perfect 1.0, so an untitled chapter
                # would otherwise anchor to the first punctuation-only line.
                score = SequenceMatcher(None, target, joined).ratio() if target and joined else 0.0
                if score > best_score:
                    best_score, best_index = score, cursor + offset
        starts.append(best_index)
        cursor = max(cursor, best_index + 1)
        # Chapter 0 starts at line 0 no matter what its title says, so a weak
        # match there costs nothing.
        if chapter_index == 0 or best_score >= MIN_TITLE_SCORE:
            continue
        weak.append(chapter_index)
        print(
            f"  chapter {chapter_index} title matched weakly ({best_score:.2f}): {chapter.title[:48]}",
            file=sys.stderr,
        )
    starts[0] = 0
    return starts, weak


@lru_cache(maxsize=1)
def tagger():
    """MeCab reading tagger, or None when unavailable (falls back to character count)."""
    try:
        import MeCab
    except ImportError:
        print(
            "MeCab is unavailable; predicting duration from character counts, which "
            "aligns kanji-dense lines noticeably worse. Install mecab-python3 + unidic-lite.",
            file=sys.stderr,
        )
        return None
    return MeCab.Tagger()


def count_mora(reading: str) -> int:
    return sum(1 for ch in reading if ch not in SMALL_KANA and ch not in DROPPED_CHARS)


@lru_cache(maxsize=4096)
def speech_weight(line: str) -> float:
    """Relative time a line takes to narrate, in mora-equivalents."""
    pauses = sum(1 for ch in line if ch in PAUSE_MARKS)
    parser = tagger()
    if parser is None:
        return sum(1 for ch in line if ch not in DROPPED_CHARS) + pauses * COMMA_MORA_EQUIV

    mora = 0
    for token in parser.parse(line).splitlines():
        if token == "EOS" or not token.strip():
            continue
        fields = token.split("\t")
        reading = fields[1] if len(fields) > 1 and fields[1] else fields[0]
        mora += count_mora(reading)
    return mora + pauses * COMMA_MORA_EQUIV


def line_cost(actual: float, predicted: float) -> float:
    if actual <= 0:
        return float("inf")
    return (actual - predicted) ** 2 / max(predicted, 0.5)


def pause_cost(silence: Silence) -> float:
    return max(0.0, SHORT_PAUSE_SEC - silence.duration) * PAUSE_PENALTY_WEIGHT


def interpolate(predicted: list[float], span_start: float) -> list[tuple[float, float]]:
    spans, clock = [], span_start
    for duration in predicted:
        spans.append((clock, clock + duration))
        clock += duration
    return spans


def align_segment(
    lines: list[str],
    silences: list[Silence],
    span: tuple[float, float],
    *,
    band_max: float = BAND_MAX_SEC,
) -> tuple[list[tuple[float, float]], bool]:
    """Returns cue spans plus whether they came from proportional interpolation
    rather than real silence boundaries. Interpolated spans look plausible and
    cover the chapter evenly, so callers must report them instead of trusting them.
    """
    span_start, span_end = span
    total = len(lines)
    if total == 1:
        return [(span_start, span_end)], False

    weights = [speech_weight(line) for line in lines]
    total_weight = sum(weights) or 1.0
    available = max(span_end - span_start, 1e-6)
    predicted = [w / total_weight * available for w in weights]

    inner = [s for s in silences if span_start < s.start and s.end < span_end]
    if len(inner) < total - 1:
        return interpolate(predicted, span_start), True

    cumulative, clock = [], span_start
    for duration in predicted[:-1]:
        clock += duration
        cumulative.append(clock)
    band = min(band_max, max(BAND_MIN_SEC, available * BAND_SPAN_RATIO))

    allowed = [
        [j for j, s in enumerate(inner) if abs(s.start - target) <= band]
        for target in cumulative
    ]
    if any(not candidates for candidates in allowed):
        return interpolate(predicted, span_start), True

    infinity = float("inf")
    best = [[infinity] * len(inner) for _ in range(total - 1)]
    previous = [[-1] * len(inner) for _ in range(total - 1)]

    for j in allowed[0]:
        best[0][j] = line_cost(inner[j].start - span_start, predicted[0]) + pause_cost(inner[j])

    for step in range(1, total - 1):
        for j in allowed[step]:
            candidate_best, candidate_from = infinity, -1
            for k in allowed[step - 1]:
                # allowed[] is ascending, so nothing past this point can precede j.
                if k >= j:
                    break
                if best[step - 1][k] == infinity:
                    continue
                cost = best[step - 1][k] + line_cost(inner[j].start - inner[k].end, predicted[step])
                if cost < candidate_best:
                    candidate_best, candidate_from = cost, k
            if candidate_from < 0:
                continue
            best[step][j] = candidate_best + pause_cost(inner[j])
            previous[step][j] = candidate_from

    last = total - 2
    final_best, final_index = infinity, -1
    for j in allowed[last]:
        if best[last][j] == infinity:
            continue
        cost = best[last][j] + line_cost(span_end - inner[j].end, predicted[-1])
        if cost < final_best:
            final_best, final_index = cost, j
    if final_index < 0:
        return interpolate(predicted, span_start), True

    chosen = [final_index]
    for step in range(last, 0, -1):
        chosen.append(previous[step][chosen[-1]])
    chosen.reverse()

    spans = [(span_start, inner[chosen[0]].start)]
    for step in range(1, total - 1):
        spans.append((inner[chosen[step - 1]].end, inner[chosen[step]].start))
    spans.append((inner[chosen[-1]].end, span_end))
    return spans, False


def trim_span(span: tuple[float, float], silences: list[Silence]) -> tuple[float, float]:
    start, end = span
    for silence in silences:
        if silence.start <= start + 0.05 < silence.end < end:
            start = silence.end
        if start < silence.start < end <= silence.end + 0.05:
            end = silence.start
    return (start, end)


def build_cues(
    lines: list[str],
    chapters: list[Chapter],
    silences: list[Silence],
    *,
    band_max: float = BAND_MAX_SEC,
) -> tuple[list[Cue], list[int], list[int]]:
    """Cues for every line, plus the chapters that fell back to interpolation and
    the chapters whose title match was too weak to anchor confidently."""
    starts, weak_titles = match_chapter_starts(chapters, lines)
    bounds = starts + [len(lines)]
    cues: list[Cue] = []
    interpolated: list[int] = []
    for chapter_index, chapter in enumerate(chapters):
        segment = lines[bounds[chapter_index]:bounds[chapter_index + 1]]
        if not segment:
            continue
        span = trim_span((chapter.start, chapter.end), silences)
        spans, was_interpolated = align_segment(segment, silences, span, band_max=band_max)
        if was_interpolated:
            interpolated.append(chapter_index)
        for (start, end), text in zip(spans, segment):
            cues.append(Cue(len(cues) + 1, start, end, text))
    return cues, interpolated, weak_titles


def timestamp(seconds: float) -> str:
    millis = max(0, round(seconds * 1000))
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def write_srt(cues: list[Cue], path: Path) -> None:
    blocks = [
        f"{cue.index}\n{timestamp(cue.start)} --> {timestamp(cue.end)}\n{cue.text}\n"
        for cue in cues
    ]
    path.write_text("\n".join(blocks), encoding="utf-8")


def write_json(cues: list[Cue], path: Path) -> None:
    payload = [
        {"index": cue.index, "start": round(cue.start, 3), "end": round(cue.end, 3), "text": cue.text}
        for cue in cues
    ]
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def report(cues: list[Cue], duration: float) -> None:
    rates = [speech_weight(c.text) / (c.end - c.start) for c in cues if c.end > c.start]
    if not rates or duration <= 0:
        print("no cues with a positive duration; nothing to report", file=sys.stderr)
        return
    rates.sort()
    median = rates[len(rates) // 2]
    outliers = [r for r in rates if r < median * 0.5 or r > median * 2.0]
    covered = sum(c.end - c.start for c in cues)
    print(f"cues:            {len(cues)}")
    print(f"audio duration:  {duration:.1f}s")
    print(f"covered:         {covered:.1f}s ({covered / duration * 100:.1f}%)")
    print(f"median rate:     {median:.2f} mora/s")
    print(f"rate p05..p95:   {rates[len(rates) // 20]:.2f} .. {rates[-len(rates) // 20]:.2f}")
    print(f"rate outliers:   {len(outliers)} ({len(outliers) / len(rates) * 100:.1f}%)")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", type=Path)
    parser.add_argument("transcript", type=Path)
    parser.add_argument("--out-dir", type=Path)
    parser.add_argument("--noise-db", type=int, default=-40)
    parser.add_argument("--min-silence", type=float, default=0.15)
    parser.add_argument(
        "--max-interpolated-chapters",
        type=int,
        default=0,
        help="how many chapters may fall back to proportional timings before the run fails",
    )
    parser.add_argument(
        "--max-weak-titles",
        type=int,
        default=0,
        help="how many chapter titles may match the transcript poorly before the run fails",
    )
    parser.add_argument(
        "--band-max",
        type=float,
        default=BAND_MAX_SEC,
        help="widest search window around a predicted boundary; raise it for long chapters",
    )
    args = parser.parse_args()

    out_dir = args.out_dir or args.audio.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    chapters = probe_chapters(args.audio)
    if not chapters:
        print("no chapters found in container; cannot anchor alignment", file=sys.stderr)
        return 1

    lines = read_lines(args.transcript)
    if not lines:
        print(f"{args.transcript} has no non-empty lines", file=sys.stderr)
        return 1

    # ffmpeg exits 0 when silencedetect simply matches nothing, so an unusable
    # threshold or stream mapping would otherwise sail through as "no silences"
    # and interpolate every chapter.
    silences = detect_silences(args.audio, args.noise_db, args.min_silence)
    if len(silences) < len(lines) - 1:
        print(
            f"only {len(silences)} silences for {len(lines)} lines; alignment would be guesswork. "
            f"Try a higher --noise-db than {args.noise_db} or a shorter --min-silence than {args.min_silence}.",
            file=sys.stderr,
        )
        return 1
    print(f"chapters={len(chapters)} lines={len(lines)} silences={len(silences)}")

    cues, interpolated, weak_titles = build_cues(lines, chapters, silences, band_max=args.band_max)
    report(cues, probe_duration(args.audio))

    # Interpolated cues cover their chapter evenly, so they look healthy in the
    # report while landing mid-speech. Refuse to leave either kind on disk unseen.
    failures = []
    if len(interpolated) > args.max_interpolated_chapters:
        print(f"interpolated chapters: {len(interpolated)} -> {interpolated[:10]}", file=sys.stderr)
        failures.append(f"--max-interpolated-chapters (currently {args.max_interpolated_chapters})")
    if len(weak_titles) > args.max_weak_titles:
        print(f"weak title matches: {len(weak_titles)} -> {weak_titles[:10]}", file=sys.stderr)
        failures.append(f"--max-weak-titles (currently {args.max_weak_titles})")
    if failures:
        print(
            f"alignment is not trustworthy; nothing written. Raise {' or '.join(failures)} to accept it anyway.",
            file=sys.stderr,
        )
        return 1

    write_srt(cues, out_dir / f"{args.audio.stem}.srt")
    write_json(cues, out_dir / f"{args.audio.stem}.timings.json")
    print(f"wrote {out_dir / (args.audio.stem + '.srt')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
