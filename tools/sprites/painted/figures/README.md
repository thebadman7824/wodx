One JSON file per figure. The pipeline is the same for every era; only this spec changes.
- era: the year or period (1197 to the World of Future Darkness).
- role, person, dress: go into the FLUX prompt. Name every garment and the footwear plainly, with what must NOT be there (laces, heels, zips).
- check / expect: questions for the local vision model (qwen2.5vl) on each reference draft. A draft that misses any expected answer is dropped before TRELLIS.
