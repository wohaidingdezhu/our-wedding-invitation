"""Generate the original, royalty-free demonstration melody bundled with this project."""
from pathlib import Path
import math
import struct
import wave

sample_rate = 16000
beat = 0.5
notes = [64, 67, 71, 67, 62, 66, 69, 66, 60, 64, 67, 64, 62, 66, 69, 71,
         64, 67, 72, 71, 69, 67, 66, 62, 60, 64, 67, 69, 67, 64, 62, 60]
chords = [(48, 55, 60), (50, 57, 62), (45, 52, 60), (43, 50, 59)] * 2
duration = len(notes) * beat

def tone(note, time, amp):
    frequency = 440 * 2 ** ((note - 69) / 12)
    envelope = (1 - math.exp(-time * 60)) * math.exp(-time * 3.5)
    return amp * envelope * (math.sin(2 * math.pi * frequency * time) + .22 * math.sin(4 * math.pi * frequency * time))

path = Path(__file__).resolve().parents[1] / 'src/assets/wedding.wav'
with wave.open(str(path), 'wb') as output:
    output.setparams((1, 2, sample_rate, 0, 'NONE', 'not compressed'))
    for index in range(int(duration * sample_rate)):
        t = index / sample_rate
        value = 0.0
        current = int(t / beat)
        for n in range(max(0, current - 4), min(current + 1, len(notes))):
            value += tone(notes[n], t - n * beat, .17)
        chord_index = min(int(t / (4 * beat)), len(chords) - 1)
        for c in range(max(0, chord_index - 1), chord_index + 1):
            age = t - c * 4 * beat
            for note in chords[c]:
                value += tone(note, age, .045)
        value *= min(1, t / .1, (duration - t) / .7)
        output.writeframesraw(struct.pack('<h', int(max(-1, min(1, value)) * 32767)))
print(path)
